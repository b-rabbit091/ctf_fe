// src/api/practice.ts

import api from "./axios";
import {
    Challenge,

    CategoryTypes,
    DifficultyTypes,
    SolutionTypes,
} from "../pages/PracticePage/types";
import {PreviousSubmission, PreviousSubmissionsApiResponse, SubmissionApiItem} from "../pages/CompetitionPage/types";

// ----------------- Core challenge APIs (shared) -----------------

export const getChallenges = async (filters?: {
    category?: string;
    difficulty?: string;
    type?: string; // "practice" | "competition"
}): Promise<Challenge[]> => {
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    if (filters?.type) params.type = filters.type;

    const resp = await api.get("/challenges/challenges", { params });
    return resp.data;
};

export const getChallengeById = async (id: number): Promise<Challenge> => {
    const resp = await api.get(`/challenges/challenges/${id}`);
    if (!resp) throw new Error("Challenge not found");
    return resp.data!;
};

export const createChallenge = async (data: FormData) => {
    const resp = await api.post("/challenges/challenges/", data, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return resp.data;
};

export const updateChallenge = async (id: number, data: FormData) => {
    const resp = await api.patch(`/challenges/challenges/${id}/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return resp.data;
};

export const deleteChallenge = async (id: number) => {
    const resp = await api.delete(`/challenges/challenges/${id}/`);
    return { success: resp.status };
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

        // DRF errors are often in error.response.data (dict)
        const data = error?.response?.data;

        // try to produce a readable message
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
    submitSolution(challengeId, { value });

export const submitTextSolution = async (challengeId: number, content: string) =>
    submitSolution(challengeId, { content });


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
        return { flag_submissions: [], text_submissions: [] };
    }
};


// ✅ ADD BELOW CODE at the bottom of src/api/practice.ts
// (Do NOT modify existing code above)

export type ReportGeneratePayload = {
    challenge_id: number;
    from?: string; // ISO: "2026-01-14T00:00:00Z" (optional)
    to?: string;   // ISO: "2026-01-17T23:59:59Z" (optional)
};

export type ReportEntity =
    | { username: string } // user
    | { name: string };    // group

export type ReportAttempt = {
    type: "flag" | "procedure";
    submitted_at: string;
    status: string | null;
    score: number;

    // user submissions
    submitted_value?: string | null;
    submitted_content?: string | null;

    // group submissions (optional)
    submitted_by?: { id?: number; username?: string | null } | null;
};

export type ReportResponse = {
    challenge: {
        id: number;
        title: string;
        solution_type: "flag" | "procedure" | "flag and procedure";
        group_only: boolean;
    };
    count: number;
    rows: Array<{
        row_id: string;
        entity_type: "user" | "group";
        entity: ReportEntity;
        solution_type: "flag" | "procedure" | "flag and procedure";
        summary: {
            flag: {
                best_score: number;
                latest_status: string | null;
                latest_submitted_at: string | null;
            };
            procedure: {
                best_score: number;
                latest_status: string | null;
                latest_submitted_at: string | null;
            };
            total_score: number;
            date: string | null;
        };
        see_more: {
            // ADMIN ONLY: your backend returns correct solutions
            correct_solution: {
                solution_type: "flag" | "procedure" | "flag and procedure";
                flag_solution: string | null;
                procedure_solution: string | null;
            };
            attempts: {
                flag: ReportAttempt[];
                procedure: ReportAttempt[];
            };
        };
    }>;
};

/**
 * Generate report for a challenge (Admin-only endpoint).
 * Backend: POST /reports/generate/
 *
 * SECURITY NOTE:
 * This endpoint returns correct solutions + full submission contents, so it MUST be admin-only.
 */
export const generateChallengeReport = async (
    payload: ReportGeneratePayload
): Promise<ReportResponse> => {
    try {
        if (!payload?.challenge_id || typeof payload.challenge_id !== "number") {
            throw new Error("challenge_id is required and must be a number.");
        }

        // Optional: minimal sanity checks for ISO strings
        const from = payload.from;
        const to = payload.to;

        if (from && typeof from !== "string") throw new Error("from must be an ISO string.");
        if (to && typeof to !== "string") throw new Error("to must be an ISO string.");

        const res = await api.post("submissions/reports/generate/", payload);

        if (!res || !res.data) throw new Error("No response received from report API.");
        return res.data as ReportResponse;
    } catch (error: any) {
        console.error("Error generating report:", error);

        const data = error?.response?.data;

        // DRF-style friendly message extraction
        const msg =
            typeof data === "string"
                ? data
                : data?.detail
                    ? data.detail
                    : data?.challenge_id?.[0]
                        ? data.challenge_id[0]
                        : data?.from?.[0]
                            ? data.from[0]
                            : data?.to?.[0]
                                ? data.to[0]
                                : data?.non_field_errors?.[0]
                                    ? data.non_field_errors[0]
                                    : error?.message
                                        ? error.message
                                        : "Failed to generate report.";

        throw new Error(msg);
    }
};

/**
 * Convenience wrapper: generate report by challenge id and optional date range.
 */
export const generateReportByChallengeId = async (
    challengeId: number,
    from?: string,
    to?: string
): Promise<ReportResponse> => {
    return generateChallengeReport({
        challenge_id: challengeId,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
    });
};
