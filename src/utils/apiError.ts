type Primitive = string | number | boolean | null | undefined;
type JsonLike = Primitive | JsonLike[] | {[key: string]: JsonLike};
type AnyObj = Record<string, JsonLike>;
type ApiLikeError = {
    code?: string;
    message?: string;
    response?: {
        status?: number;
        data?: JsonLike;
    };
};

function isObject(v: unknown): v is AnyObj {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function flattenDRFErrors(data: JsonLike): string[] {

    if (data == null) return [];

    if (typeof data === "string") return [data];

    if (Array.isArray(data)) {
        return data.flatMap((x) => flattenDRFErrors(x));
    }

    if (isObject(data)) {
        const direct =
            data.error ?? data.detail ?? data.message ?? data.non_field_errors ?? null;

        const out: string[] = [];
        if (direct) out.push(...flattenDRFErrors(direct));

        for (const [key, val] of Object.entries(data)) {
            if (["error", "detail", "message", "non_field_errors"].includes(key)) continue;
            const msgs = flattenDRFErrors(val);
            // Include field label for clarity
            msgs.forEach((m) => out.push(`${key}: ${m}`));
        }
        return out;
    }

    return [String(data)];
}

export type NormalizedApiError = {
    status?: number;
    code?: string;
    message: string;
    messages: string[];
    isNetworkError: boolean;
    isAuthError: boolean;
    raw?: unknown;
};

export function normalizeApiError(err: unknown, fallback: string): NormalizedApiError {
    const error = (err ?? {}) as ApiLikeError;
    const status = error.response?.status;
    const data = error.response?.data;

    // Network / CORS / server down / timeout
    const noResponse = !error.response;
    const isTimeout =
        error.code === "ECONNABORTED" ||
        String(error.message || "").toLowerCase().includes("timeout");

    if (noResponse) {
        const msg = isTimeout
            ? "Request timed out. Please try again."
            : "Network error. Please check your connection and try again.";
        return {
            status,
            code: error.code,
            message: msg,
            messages: [msg],
            isNetworkError: true,
            isAuthError: false,
            raw: err,
        };
    }

    const pieces = flattenDRFErrors(data);
    const baseMsg = pieces.filter(Boolean).join(" • ").trim() || fallback;

    // Status-based defaults (if backend gave nothing)
    const statusFallback =
        status === 401 ? "Session expired. Please log in again."
            : status === 403 ? "Access denied."
                : status === 404 ? "Not found."
                    : status === 409 ? "Conflict. Please refresh and try again."
                        : status === 429 ? "Too many requests. Try again shortly."
                            : status && status >= 500 ? "Server error. Please try again."
                                : null;

    const message = baseMsg || statusFallback || fallback;

    return {
        status,
        code: error.code,
        message,
        messages: pieces.length ? pieces : [message],
        isNetworkError: false,
        isAuthError: status === 401,
        raw: err,
    };
}

/**
 * Helper wrapper: runs an API call and returns [data, errorMessage]
 */
export async function safeApi<T>(
    fn: () => Promise<T>,
    fallback: string
): Promise<{ ok: true; data: T } | { ok: false; error: NormalizedApiError }> {
    try {
        const data = await fn();
        return { ok: true, data };
    } catch (e: unknown) {
        return { ok: false, error: normalizeApiError(e, fallback) };
    }
}
