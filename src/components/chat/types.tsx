export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
    id: string;
    role: ChatRole;
    content: string;
    createdAt?: string;
};

export type ChatSendPayload = {
    text: string;
    context?: Record<string, any>;
};

export type ChatSendResult =
    | { ok: true; message: ChatMessage }
    | { ok: false; error: string };

export type ChatSender = (
    payload: ChatSendPayload,
    signal: AbortSignal
) => Promise<ChatSendResult>;
