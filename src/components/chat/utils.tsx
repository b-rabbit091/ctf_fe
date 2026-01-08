// src/components/chat/utils.ts
export const cx = (...xs: Array<string | false | null | undefined>) =>
    xs.filter(Boolean).join(" ");

export const uid = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const nowIso = () => new Date().toISOString();

export const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));
