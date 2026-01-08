import type {ApiErrorShape} from "./types";

type AnyObj = Record<string, any>;

function isObject(v: any): v is AnyObj {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function flattenErrors(data: any): string[] {
    if (data == null) return [];
    if (typeof data === "string") return [data];

    if (Array.isArray(data)) return data.flatMap(flattenErrors);

    if (isObject(data)) {
        const direct =
            data.error ?? data.detail ?? data.message ?? data.non_field_errors ?? null;

        const out: string[] = [];
        if (direct) out.push(...flattenErrors(direct));

        for (const [key, val] of Object.entries(data)) {
            if (["error", "detail", "message", "non_field_errors"].includes(key))
                continue;
            flattenErrors(val).forEach((m) => out.push(`${key}: ${m}`));
        }
        return out;
    }

    return ["Something went wrong."];
}

export function humanApiError(err: any, fallback: string): string {
    const data: ApiErrorShape | undefined = err?.response?.data;
    const msgs = flattenErrors(data);
    return msgs.length ? msgs.join(" • ") : fallback;
}

export const safeTrim = (v: any) => (typeof v === "string" ? v.trim() : "");

export function isEmailLike(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function fmtDateTime(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}

export function initialFromUser(u: {
    first_name?: string;
    last_name?: string;
    username?: string;
}) {
    const a = (u.first_name || "").trim();
    const b = (u.last_name || "").trim();
    if (a || b) return `${a.slice(0, 1)}${b.slice(0, 1)}`.toUpperCase();
    return (u.username || "U").slice(0, 2).toUpperCase();
}
