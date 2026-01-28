// src/components/chat/api.ts
// Uses your existing axios instance: src/api/axios.ts
import api from "../../api/axios";
import type { ChatMessage, ChatSendPayload, ChatSendResult } from "./types";
import { nowIso } from "./utils";

/**
 * Chat API (Practice)
 * - No fetch()
 * - No token wiring here (your axios.ts already does it via interceptors)
 * - Very defensive error extraction (DRF + anything)
 */

type ChatApiResponse =
    | {
    reply: string;
    id?: string | number;
    created_at?: string;
}
    | Record<string, any>;

const CHAT_ENDPOINT = "/chat/practice/";

/* -------------------- Friendly messages -------------------- */

function friendlyStatusMessage(status?: number): string {
    if (!status) return "Couldn’t reach the server. Check your connection and try again.";

    if (status === 400) return "Your message couldn’t be processed. Please try rephrasing.";
    if (status === 401) return "Your session has expired. Please log in again.";
    if (status === 403) return "You don’t have permission to do that.";
    if (status === 404) return "Chat service not available. Please contact support.";
    if (status === 408) return "The request timed out. Please try again.";
    if (status === 413) return "Your message is too large. Please shorten it.";
    if (status === 429) return "Too many requests. Please wait a moment and try again.";
    if (status >= 500) return "Server error. Please try again in a bit.";

    return "Something went wrong. Please try again.";
}

/* -------------------- Extraction helpers -------------------- */

function isObject(v: any): v is Record<string, any> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function looksLikeHtml(s: string) {
    const t = s.trim().toLowerCase();
    return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<body");
}

/**
 * Flatten any unknown JSON structure into short readable messages.
 * Handles nested objects/arrays, DRF patterns, and avoids noisy keys.
 */
function flattenUnknownErrors(input: any, path = "", out: string[] = []): string[] {
    if (input == null) return out;

    // string
    if (typeof input === "string") {
        const msg = input.trim();
        if (!msg) return out;
        out.push(path ? `${path}: ${msg}` : msg);
        return out;
    }

    // number/boolean
    if (typeof input === "number" || typeof input === "boolean") {
        out.push(path ? `${path}: ${String(input)}` : String(input));
        return out;
    }

    // array
    if (Array.isArray(input)) {
        for (const item of input) flattenUnknownErrors(item, path, out);
        return out;
    }

    // object
    if (isObject(input)) {
        // First: common direct message keys
        const direct =
            input.detail ??
            input.error ??
            input.message ??
            input.msg ??
            input.reason ??
            input.description ??
            null;

        if (direct != null) {
            flattenUnknownErrors(direct, path, out);
        }

        // DRF non_field_errors
        if (input.non_field_errors != null) {
            flattenUnknownErrors(input.non_field_errors, path || "error", out);
        }

        // Generic field errors
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

    // fallback (symbol, function, etc.)
    out.push(path ? `${path}: ${String(input)}` : String(input));
    return out;
}

function bestMessageFromData(data: any): string | null {
    if (data == null) return null;

    if (typeof data === "string") {
        const s = data.trim();
        if (!s) return null;
        if (looksLikeHtml(s)) return null; // avoid dumping HTML error pages
        return s.length > 300 ? s.slice(0, 300) + "…" : s;
    }

    // If backend returned {reply:""} that’s handled elsewhere.
    const msgs = flattenUnknownErrors(data);
    const cleaned = msgs
        .map((m) => String(m).trim())
        .filter(Boolean)
        // avoid super noisy nested path spam
        .map((m) => (m.length > 260 ? m.slice(0, 260) + "…" : m));

    if (!cleaned.length) return null;

    // Prefer shortest/most human-looking line
    cleaned.sort((a, b) => a.length - b.length);
    return cleaned[0];
}

/**
 * Convert ANY axios/DRF error into a friendly end-user message.
 * Never returns raw stack/errors.
 */
function humanAxiosError(error: any): string {
    // Abort / cancel
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return "Request aborted.";
    }

    const status: number | undefined = error?.response?.status;
    const data = error?.response?.data;

    // Network / CORS / offline (axios has no response)
    if (!error?.response) {
        // timeout in axios sometimes has code ECONNABORTED
        if (error?.code === "ECONNABORTED") {
            return "The request timed out. Please try again.";
        }
        return "Couldn’t reach the server. Check your connection and try again.";
    }

    // Try to extract something meaningful from backend body
    const extracted = bestMessageFromData(data);

    // If extracted message is generic/empty, use status-based message
    const fallback = friendlyStatusMessage(status);

    // If backend gives a *nice* message, show it, otherwise show fallback
    if (extracted) {
        // Avoid exposing internal stuff in common cases
        const lower = extracted.toLowerCase();
        const looksInternal =
            lower.includes("traceback") ||
            lower.includes("stack trace") ||
            lower.includes("exception") ||
            lower.includes("django") ||
            lower.includes("sql") ||
            lower.includes("undefined") ||
            lower.includes("null") ||
            lower.includes("typeerror") ||
            lower.includes("valueerror");

        if (looksInternal) return fallback;
        return extracted;
    }

    return fallback;
}

/* -------------------- API call -------------------- */

export async function sendChatMessage(
    payload: ChatSendPayload,
    signal?: AbortSignal
): Promise<ChatSendResult> {
    try {
        const res = await api.post<ChatApiResponse>(
            CHAT_ENDPOINT,
            {
                text: payload.text,
                context: payload.context ?? {},
            },
            signal ? { signal } : undefined
        );

        const data: any = res.data;

        const replyText =
            typeof data?.reply === "string"
                ? data.reply
                : typeof data?.message === "string"
                    ? data.message
                    : typeof data?.detail === "string"
                        ? data.detail
                        : "";

        const finalReply = (replyText || "").trim();

        if (!finalReply) {
            return { ok: false, error: "The assistant returned an empty response. Please try again." };
        }

        const message: ChatMessage = {
            id: String(data?.id ?? `srv_${Date.now()}`),
            role: "assistant",
            content: finalReply,
            createdAt: String(data?.created_at ?? nowIso()),
        };

        return { ok: true, message };
    } catch (error: any) {
        return { ok: false, error: humanAxiosError(error) };
    }
}
