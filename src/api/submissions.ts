import api from "./axios";
import { normalizeApiError } from "../utils/apiError";

export type SubmitPayload = {
    value?: string;
    content?: string;
};

export type SubmitResultItem = {
    type: "flag" | "procedure" | string;
    submission_id?: number;
    correct?: boolean | string | null;
    status: string;
    submitted_at: string;
    submitted_value?: string;
    submitted_content?: string;
    score?: number | null;
    user_score?: number | null;
};

export type SubmitResponse = {
    challenge_id: number;
    question_type: "practice" | "competition";
    contest_id?: number | null;
    results: SubmitResultItem[];
};

export type SubmissionApiItem = {
    id: number;
    user?: {
        username?: string;
        email?: string;
    };
    challenge?: {
        title?: string;
    };
    status?: {
        status?: string;
    };
    value?: string | null;
    content?: string | null;
    submitted_at: string;
};

export type PreviousSubmission = {
    id: number;
    username: string;
    email: string;
    challengeTitle: string;
    submittedAt: string;
    status: string | null;
    value: string | null;
    content: string | null;
};

export type PreviousSubmissionsApiResponse = {
    flag_submissions: SubmissionApiItem[];
    text_submissions: SubmissionApiItem[];
};

export const normalizeFlagSubmission = (item: SubmissionApiItem): PreviousSubmission => ({
    id: item.id,
    username: item.user?.username ?? "",
    email: item.user?.email ?? "",
    challengeTitle: item.challenge?.title ?? "",
    submittedAt: item.submitted_at,
    status: item.status?.status ?? null,
    value: item.value ?? null,
    content: null,
});

export const normalizeTextSubmission = (item: SubmissionApiItem): PreviousSubmission => ({
    id: item.id,
    username: item.user?.username ?? "",
    email: item.user?.email ?? "",
    challengeTitle: item.challenge?.title ?? "",
    submittedAt: item.submitted_at,
    status: item.status?.status ?? null,
    value: null,
    content: item.content ?? null,
});

export async function submitChallengeSolution(
    challengeId: number,
    payload: SubmitPayload
): Promise<SubmitResponse> {
    try {
        const res = await api.post<SubmitResponse>(`/submissions/${challengeId}/`, payload);
        return res.data;
    } catch (error: unknown) {
        const normalized = normalizeApiError(error, "Failed to submit solution.");
        throw new Error(normalized.message);
    }
}

export async function getChallengePreviousSubmissions(
    challengeId: number
): Promise<{
    flag_submissions: PreviousSubmission[];
    text_submissions: PreviousSubmission[];
}> {
    try {
        const response = await api.get<PreviousSubmissionsApiResponse>(
            `/submissions/previous-submissions/${challengeId}/`
        );

        return {
            flag_submissions: (response.data.flag_submissions ?? []).map(normalizeFlagSubmission),
            text_submissions: (response.data.text_submissions ?? []).map(normalizeTextSubmission),
        };
    } catch (error: unknown) {
        const normalized = normalizeApiError(error, "Failed to load previous submissions.");
        throw new Error(normalized.message);
    }
}
