// src/api/axios.ts
import axios, {AxiosError, AxiosRequestConfig} from "axios";
import {toast} from "react-toastify";
import {
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    clearTokens,
} from "../utils/token";
import {refreshToken as refreshTokenApi} from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL ;

const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    withCredentials: false, // JWT via Authorization header
});

/* ------------------------------------------------------------------
   Friendly error helpers (NEVER leak internal details)
------------------------------------------------------------------ */

function friendlyStatusMessage(status?: number): string {
    if (!status) return "Couldn’t reach the server. Check your connection and try again.";

    if (status === 400) return "Your request couldn’t be processed. Please check and try again.";
    if (status === 401) return "Your session has expired. Please log in again.";
    if (status === 403) return "You don’t have permission to do that.";
    if (status === 404) return "Service endpoint not found. Please contact support.";
    if (status === 408) return "The request timed out. Please try again.";
    if (status === 413) return "Request is too large. Please shorten it.";
    if (status === 429) return "Too many requests. Please wait a moment and try again.";
    if (status >= 500) return "Server error. Please try again in a bit.";

    return "Something went wrong. Please try again.";
}

function isObject(v: any): v is Record<string, any> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function looksLikeHtml(s: string) {
    const t = s.trim().toLowerCase();
    return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<body");
}

/** flatten unknown JSON (DRF + random APIs) into short readable messages */
function flattenUnknownErrors(input: any, path = "", out: string[] = []): string[] {
    if (input == null) return out;

    if (typeof input === "string") {
        const msg = input.trim();
        if (msg) out.push(path ? `${path}: ${msg}` : msg);
        return out;
    }

    if (typeof input === "number" || typeof input === "boolean") {
        out.push(path ? `${path}: ${String(input)}` : String(input));
        return out;
    }

    if (Array.isArray(input)) {
        for (const item of input) flattenUnknownErrors(item, path, out);
        return out;
    }

    if (isObject(input)) {
        const direct =
            input.detail ??
            input.error ??
            input.message ??
            input.msg ??
            input.reason ??
            input.description ??
            null;

        if (direct != null) flattenUnknownErrors(direct, path, out);

        if (input.non_field_errors != null) {
            flattenUnknownErrors(input.non_field_errors, path || "error", out);
        }

        for (const [k, v] of Object.entries(input)) {
            if (
                k === "detail" ||
                k === "error" ||
                k === "message" ||
                k === "msg" ||
                k === "reason" ||
                k === "description" ||
                k === "non_field_errors"
            ) {
                continue;
            }
            const nextPath = path ? `${path}.${k}` : k;
            flattenUnknownErrors(v, nextPath, out);
        }

        return out;
    }

    out.push(path ? `${path}: ${String(input)}` : String(input));
    return out;
}

function bestMessageFromData(data: any): string | null {
    if (data == null) return null;

    if (typeof data === "string") {
        const s = data.trim();
        if (!s) return null;
        if (looksLikeHtml(s)) return null; // don’t dump HTML error pages
        return s.length > 300 ? s.slice(0, 300) + "…" : s;
    }

    const msgs = flattenUnknownErrors(data)
        .map((m) => String(m).trim())
        .filter(Boolean)
        .map((m) => (m.length > 260 ? m.slice(0, 260) + "…" : m));

    if (!msgs.length) return null;

    // Prefer shortest/human-looking
    msgs.sort((a, b) => a.length - b.length);
    return msgs[0];
}

function humanAxiosError(error: any): string {
    // Abort / cancel
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return "Request cancelled.";
    }

    // Timeout (axios uses ECONNABORTED in many cases)
    if (error?.code === "ECONNABORTED") {
        return "The request timed out. Please try again.";
    }

    const status: number | undefined = error?.response?.status;
    const data = error?.response?.data;

    // Network / CORS / offline (no response)
    if (!error?.response) {
        return "Couldn’t reach the server. Check your connection and try again.";
    }

    const extracted = bestMessageFromData(data);
    const fallback = friendlyStatusMessage(status);

    if (extracted) {
        const lower = extracted.toLowerCase();
        const looksInternal =
            lower.includes("traceback") ||
            lower.includes("stack trace") ||
            lower.includes("exception") ||
            lower.includes("django") ||
            lower.includes("sql") ||
            lower.includes("typeerror") ||
            lower.includes("valueerror");

        if (looksInternal) return fallback;
        return extracted;
    }

    return fallback;
}

/** Only toast if request didn't ask to be silent */
function shouldToast(error: AxiosError): boolean {
    const cfg: any = error.config || {};
    const headers = cfg.headers || {};
    // Option 1: config flag
    if (cfg.silent === true) return false;
    // Option 2: header flag (easy to pass without TS headaches)
    const h = headers["x-silent-error"] ?? headers["X-Silent-Error"];
    return !(h === "1" || h === 1 || h === true);

}

/* ------------------------------------------------------------------
   REQUEST INTERCEPTOR
------------------------------------------------------------------ */
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        config.headers = config.headers ?? {};

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

/* ------------------------------------------------------------------
   RESPONSE INTERCEPTOR — REFRESH TOKEN LOGIC (+ friendly toasts)
------------------------------------------------------------------ */

// Track refresh state
let isRefreshing = false;

// Queue of requests waiting for token refresh
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: any) => void;
}> = [];

// Flush queued requests
const processQueue = (error: any, token?: string) => {
    failedQueue.forEach((p) => {
        if (error) p.reject(error);
        else p.resolve(token as string);
    });
    failedQueue = [];
};

// Extend Axios config to mark retried requests
type RetryConfig = AxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryConfig | undefined;

        // If Ensure we can safely get status
        const statusCode = error.response?.status;

        // No config → cannot retry; just toast + reject
        if (!originalRequest) {
            if (shouldToast(error)) toast.error(humanAxiosError(error));
            return Promise.reject(error);
        }

        // --------- 401 refresh path (NO toast here yet) ----------
        // Only handle 401 (Unauthorized) and only once
        if (statusCode === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refresh = getRefreshToken();

            // No refresh token → force logout + friendly toast
            if (!refresh) {
                clearTokens();
                if (shouldToast(error)) toast.error("Your session has expired. Please log in again.");
                return Promise.reject(error);
            }

            // If a refresh is already in progress, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({resolve, reject});
                })
                    .then((token) => {
                        originalRequest.headers = originalRequest.headers ?? {};
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest); // replay
                    })
                    .catch((err) => {
                        // Refresh ultimately failed — show toast once per rejected request (guarded)
                        if (shouldToast(error)) toast.error(humanAxiosError(err));
                        return Promise.reject(err);
                    });
            }

            isRefreshing = true;

            try {
                // Request new tokens
                const data = await refreshTokenApi(refresh);

                const newAccess = (data as any).access;
                const newRefresh = (data as any).refresh ?? refresh;

                // Persist tokens
                setAccessToken(newAccess);
                setRefreshToken(newRefresh);

                // Replay queued requests
                processQueue(null, newAccess);

                // Retry original request
                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;

                return api(originalRequest);
            } catch (refreshError: any) {
                // Refresh failed → logout + toast
                processQueue(refreshError, undefined);
                clearTokens();

                if (shouldToast(error)) {
                    toast.error("Your session expired. Please log in again.");
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // --------- Non-401 errors (or 401 after retry) ----------
        // At this point it’s a real failure the UI should know about
        if (shouldToast(error)) toast.error(humanAxiosError(error));

        return Promise.reject(error);
    }
);

export default api;
