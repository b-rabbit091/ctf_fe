
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
