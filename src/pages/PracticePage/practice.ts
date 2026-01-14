import api from "../../api/axios";
import {
    Challenge,
    CategoryTypes,
    DifficultyTypes,
    SolutionTypes,
} from "./types";
import {PreviousSubmission, PreviousSubmissionsApiResponse, SubmissionApiItem} from "./types";


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


export type SubmitPayload = {
    value?: string;      // flag
    content?: string;    // procedure
};

export type SubmitResponse = {
    challenge_id: number;
    question_type: "practice" | "competition";
    contest_id: number | null;
    results: Array<{
        type: "flag" | "text"; // backend returns "text" for content submissions (we can rename on UI)
        submission_id: number;
        correct: boolean;
        status: string; // "correct" | "incorrect"
        submitted_at: string;
    }>;
};

export const submitSolution = async (
    challengeId: number,
    payload: SubmitPayload
): Promise<SubmitResponse> => {
    try {
        const res = await api.post(`/submissions/${challengeId}/`, payload);
        return res.data;
    } catch (error: any) {
        console.error("Error submitting solution:", error);

        const data = error?.response?.data;

        const msg =
            typeof data === "string"
                ? data
                : data?.detail
                    ? data.detail
                    : data?.value?.[0]
                        ? data.value[0]
                        : data?.content?.[0]
                            ? data.content[0]
                            : data?.non_field_errors?.[0]
                                ? data.non_field_errors[0]
                                : "Failed to submit solution.";

        throw new Error(msg);
    }
};

export const submitFlag = async (challengeId: number, value: string) =>
    submitSolution(challengeId, {value});

export const submitTextSolution = async (challengeId: number, content: string) =>
    submitSolution(challengeId, {content});


export const normalizeFlag = (s: SubmissionApiItem): PreviousSubmission => ({
    id: s.id,
    username: s.user?.username ?? "",
    email: s.user?.email ?? "",
    challengeTitle: s.challenge?.title ?? "",
    submittedAt: s.submitted_at,
    status: s.status?.status ?? null,
    value: s.value ?? null,
    content: null,
});

export const normalizeText = (s: SubmissionApiItem): PreviousSubmission => ({
    id: s.id,
    username: s.user?.username ?? "",
    email: s.user?.email ?? "",
    challengeTitle: s.challenge?.title ?? "",
    submittedAt: s.submitted_at,
    status: s.status?.status ?? null,
    value: null,
    content: s.content ?? null,
});

export const getPreviousSubmissions = async (
    challengeId: number
): Promise<{
    flag_submissions: PreviousSubmission[];
    text_submissions: PreviousSubmission[];
}> => {
    try {
        const response = await api.get<PreviousSubmissionsApiResponse>(
            `/submissions/previous-submissions/${challengeId}/`
        );

        const flagRaw = response.data.flag_submissions ?? [];
        const textRaw = response.data.text_submissions ?? [];

        return {
            flag_submissions: flagRaw.map(normalizeFlag),
            text_submissions: textRaw.map(normalizeText),
        };
    } catch (error) {
        console.error("Error fetching previous submissions:", error);
        return {flag_submissions: [], text_submissions: []};
    }
};

// src/components/chat/api.ts
import type {
    ApiResult,
    ChatHistoryApiResponse,
    ChatHistoryPage,
    ChatMessage,
    ChatSendApiResponse,
} from "./types";

function toMessageFromTurn(t: any): ChatMessage {
    return {
        id: String(t.id ?? ""),
        role: t.role,
        content: String(t.content ?? ""),
        createdAt: String(t.created_at ?? t.createdAt ?? ""),
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

function humanAxiosError(e: any): string {
    const data = e?.response?.data;
    if (typeof data === "string") return data;
    if (data?.detail) return String(data.detail);
    return e?.message || "Request failed.";
}

export function getChallengeIdFromContext(context?: Record<string, any>): number | null {
    const v =
        context?.challenge_id ??
        context?.challengeId ??
        context?.challenge?.id ??
        null;

    const n = typeof v === "string" ? Number(v) : v;
    if (!Number.isFinite(n) || n <= 0) return null;
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

        return { ok: true, data: toHistoryPage(resp.data as any) };
    } catch (e: any) {
        const aborted = e?.name === "CanceledError" || e?.name === "AbortError";
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
    } catch (e: any) {
        const aborted = e?.name === "CanceledError" || e?.name === "AbortError";
        return { ok: false, error: aborted ? "aborted" : humanAxiosError(e) };
    }
}

/**
 * Send a message to practice chat endpoint.
 * Backend response is your safe_ok shape: { reply, id, created_at, percent_on_track }
 */
export async function sendChatMessage(
    args: { text: string; context?: Record<string, any> },
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
    } catch (e: any) {
        const aborted = e?.name === "CanceledError" || e?.name === "AbortError";
        return { ok: false, error: aborted ? "aborted" : humanAxiosError(e) };
    }
}
