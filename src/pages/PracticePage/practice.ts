import api from "../../api/axios";
import {
    getChallengePreviousSubmissions,
    normalizeFlagSubmission,
    normalizeTextSubmission,
    submitChallengeSolution,
    type SubmitPayload,
    type SubmitResponse,
} from "../../api/submissions";
import {
    Challenge,
    CategoryTypes,
    DifficultyTypes,
    SolutionTypes,
} from "./types";
import {PreviousSubmission} from "./types";


export const getChallenges = async (filters?: {
    category?: string;
    difficulty?: string;
    type?: string; // "practice" | "competition"
}): Promise<Challenge[]> => {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    if (filters?.type) params.type = filters.type;

    const resp = await api.get("/challenges/challenges", {params});
    return resp.data;
};

export const getChallengeById = async (id: number): Promise<Challenge> => {
    const resp = await api.get(`/challenges/challenges/${id}`);
    if (!resp) throw new Error("Challenge not found");
    return resp.data!;
};

export const createChallenge = async (data: FormData) => {
    const resp = await api.post("/challenges/challenges/", data, {
        headers: {"Content-Type": "multipart/form-data"},
    });
    return resp.data;
};

export const updateChallenge = async (id: number, data: FormData) => {
    const resp = await api.patch(`/challenges/challenges/${id}/`, data, {
        headers: {"Content-Type": "multipart/form-data"},
    });
    return resp.data;
};

export type BulkUpdateChallengesPayload = {
    ids: number[]; // required
    // any fields you want to patch across all items:
    question_type?: "practice" | "competition" | "N/A";
};

export const bulkUpdateChallenges = async (
    ids: number | number[],
    patch: Omit<BulkUpdateChallengesPayload, "ids">
) => {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 0) throw new Error("ids cannot be empty.");

    const res = await api.patch("/challenges/challenges/bulk-update/", {
        ids: list,
        ...patch,
    });

    return res.data;
};

export const deleteChallenge = async (id: number) => {
    const resp = await api.delete(`/challenges/challenges/${id}/`);
    return {success: resp.status};
};

// ----------------- Taxonomy APIs -----------------

// Categories
export const getCategories = async (): Promise<CategoryTypes[]> => {
    const resp = await api.get("/challenges/categories");
    // expects array of { id, name, description }
    return resp.data;
};

// Difficulties
export const getDifficulties = async (): Promise<DifficultyTypes[]> => {
    const resp = await api.get("/challenges/difficulties");
    // expects array of { id, level, description }
    return resp.data;
};

// Solution types
export const getSolutionTypes = async (): Promise<SolutionTypes[]> => {
    const resp = await api.get("/challenges/solution-types");
    // expects array of { id, type, description }
    return resp.data;
};

// ----------------- Practice-specific helpers (for admin UI) -----------------

/**
 * List only practice challenges (used by AdminPracticeList)
 */
export const getPracticeChallenges = async (filters?: {
    category?: string;
    difficulty?: string;
}): Promise<Challenge[]> => {
    return getChallenges({
        ...(filters || {}),
        type: "practice",
    });
};

/**
 * Single practice challenge detail (AdminPracticeEdit / PracticeDetail)
 */
export const getPracticeChallengeById = async (
    id: number
): Promise<Challenge> => {
    return getChallengeById(id);
};

/**
 * Delete a practice challenge (alias for deleteChallenge for clarity)
 */
export const deletePracticeChallenge = async (id: number) => {
    return deleteChallenge(id);
};


export const submitSolution = async (
    challengeId: number,
    payload: SubmitPayload
): Promise<SubmitResponse> => {
    return submitChallengeSolution(challengeId, payload);
};

export const submitFlag = async (challengeId: number, value: string) =>
     submitSolution(challengeId, {value});

export const submitTextSolution = async (challengeId: number, content: string) =>
    submitSolution(challengeId, {content});


export const normalizeFlag = normalizeFlagSubmission;

export const normalizeText = normalizeTextSubmission;

export const getPreviousSubmissions = async (
    challengeId: number
): Promise<{
    flag_submissions: PreviousSubmission[];
    text_submissions: PreviousSubmission[];
}> => {
    return getChallengePreviousSubmissions(challengeId);
};

// src/components/chat/api.ts
import type {
    ApiResult,
    ChatHistoryApiResponse,
    ChatTurnApi,
    ChatHistoryPage,
    ChatMessage,
    ChatSendApiResponse,
} from "./types";

type AxiosLikeError = {
    name?: string;
    message?: string;
    response?: {
        data?: unknown;
    };
};

function toMessageFromTurn(t: ChatTurnApi): ChatMessage {
    return {
        id: String(t.id ?? ""),
        role: t.role,
        content: String(t.content ?? ""),
        createdAt: String(t.created_at ?? ""),
        meta: t.meta ?? {},
    };
}

function toHistoryPage(raw: ChatHistoryApiResponse): ChatHistoryPage {
    const msgs = Array.isArray(raw.messages) ? raw.messages.map(toMessageFromTurn) : [];
    return {
        threadId: raw.thread_id ?? null,
        challengeId: raw.challenge_id,
        next: raw.next ?? null,
        previous: raw.previous ?? null,
        messages: msgs,
    };
}

function humanAxiosError(e: unknown): string {
    const error = (e ?? {}) as AxiosLikeError;
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null && "detail" in data) {
        return String((data as {detail?: unknown}).detail ?? "Request failed.");
    }
    return error.message || "Request failed.";
}

type ChatContext = Record<string, unknown> & {
    challenge_id?: number | string;
    challengeId?: number | string;
    challenge?: {
        id?: number | string;
    };
};

export function getChallengeIdFromContext(context?: ChatContext): number | null {
    const v =
        context?.challenge_id ??
        context?.challengeId ??
        context?.challenge?.id ??
        null;

    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : null;
    if (n === null || !Number.isFinite(n) || n <= 0) return null;
    return n as number;
}

/**
 * Load chat history page (cursor-based).
 *
 * If cursorUrl is provided, we call it directly (it already contains cursor & challenge_id).
 * Otherwise we call /api/chat/thread/?challenge_id=...
 */
export async function fetchChatHistory(args: {
    challengeId: number;
    pageSize?: number;
    cursorUrl?: string | null;
    signal?: AbortSignal;
}): Promise<ApiResult<ChatHistoryPage>> {
    const { challengeId, pageSize = 20, cursorUrl, signal } = args;

    try {
        const resp = cursorUrl
            ? await api.get(cursorUrl, { signal })
            : await api.get<ChatHistoryApiResponse>("/chat/thread/", {
                params: { challenge_id: challengeId, page_size: pageSize },
                signal,
            });

        return { ok: true, data: toHistoryPage(resp.data as ChatHistoryApiResponse) };
    } catch (e: unknown) {
        const error = (e ?? {}) as AxiosLikeError;
        const aborted = error.name === "CanceledError" || error.name === "AbortError";
        return { ok: false, error: aborted ? "aborted" : humanAxiosError(e) };
    }
}

export async function clearChatThread(args: {
    challengeId: number;
    signal?: AbortSignal;
}): Promise<ApiResult<{ cleared: boolean }>> {
    const { challengeId, signal } = args;

    try {
        const resp = await api.delete("/chat/thread/clear/", {
            params: { challenge_id: challengeId },
            signal,
        });
        const cleared = !!resp.data?.cleared;
        return { ok: true, data: { cleared } };
    } catch (e: unknown) {
        const error = (e ?? {}) as AxiosLikeError;
        const aborted = error.name === "CanceledError" || error.name === "AbortError";
        return { ok: false, error: aborted ? "aborted" : humanAxiosError(e) };
    }
}

/**
 * Send a message to practice chat endpoint.
 * Backend response is your safe_ok shape: { reply, id, created_at, percent_on_track }
 */
export async function sendChatMessage(
    args: { text: string; context?: ChatContext },
    signal?: AbortSignal
): Promise<ApiResult<ChatMessage>> {
    const challengeId = getChallengeIdFromContext(args.context);
    if (!challengeId) return { ok: false, error: "Missing challenge_id in chatContext." };

    try {
        const resp = await api.post<ChatSendApiResponse>(
            "/chat/practice/",
            { text: args.text, challenge_id: challengeId },
            { signal }
        );

        const d = resp.data;
        const msg: ChatMessage = {
            id: String(d.id ?? Date.now()),
            role: "assistant",
            content: String(d.reply ?? ""),
            createdAt: String(d.created_at ?? new Date().toISOString()),
            meta: d.percent_on_track != null ? { percent_on_track: d.percent_on_track } : {},
        };

        return { ok: true, data: msg };
    } catch (e: unknown) {
        const error = (e ?? {}) as AxiosLikeError;
        const aborted = error.name === "CanceledError" || error.name === "AbortError";
        return { ok: false, error: aborted ? "aborted" : humanAxiosError(e) };
    }
}
