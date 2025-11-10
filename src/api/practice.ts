import api from "./axios";
import {Challenge, PreviousSubmission} from "../pages/PracticePage/types";
import {useAuth} from "../contexts/AuthContext";




export const getChallenges = async (filters?: { category?: string; difficulty?: string }): Promise<Challenge[]> => {
    // Call backend API with query params
    const params: Record<string, string> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.difficulty) params.difficulty = filters.difficulty;

    const resp = await api.get("/api/challenges/challenges", {params});

    // override response for dummy data (optional for now)
    return resp.data
};


export const getChallengeById = async (id: number): Promise<Challenge> => {
    const resp = await api.get(`/api/challenges/challenges/${id}`);
    if (!resp) throw new Error("Challenge not found");
    return resp.data!;
};

export const createChallenge = async (data: FormData) => {
    const resp = await api.post("/api/challenges/challenges/", data, {
        headers: {"Content-Type": "multipart/form-data"},
    });


    return resp.data;
};

export const updateChallenge = async (id: number, data: FormData) => {
    const resp = await api.patch(`/api/challenges/challenges/${id}/`, data, {
        headers: {"Content-Type": "multipart/form-data"},
    });

    return resp.data;

};

export const deleteChallenge = async (id: number) => {
    const resp = await api.delete(`/api/challenges/${id}/`);

    return {success: resp.status};
};

// Fetch all available categories from backend
export const getCategories = async (): Promise<string[]> => {
    const resp = await api.get("/api/challenges/categories");
    return resp.data; // expects an array of strings
};

// Fetch all available difficulties from backend
export const getDifficulties = async (): Promise<string[]> => {
    const resp = await api.get("/api/challenges/difficulties");
    return resp.data; // expects an array of strings
};

// Fetch all available difficulties from backend
export const getSolutionTypes = async (): Promise<string[]> => {
    const resp = await api.get("/api/challenges/solution-types");
    return resp.data; // expects an array of strings
};


export const submitFlag = async (id: number, flagText: string): Promise<string[]> => {
    const resp = await api.get("/api/challenges/difficulties");
    return resp.data; // expects an array of strings
};


export const getPreviousSubmissions = async (challengeId: number): Promise<{
    flag_submissions: PreviousSubmission[],
    text_submissions: PreviousSubmission[]
}> => {
    try {
        const response = await api.get(`/api/submissions/previous-submissions/${challengeId}/`);
        return response.data;
    } catch (error: any) {
        console.error("Error fetching previous submissions:", error);
        return {flag_submissions: [], text_submissions: []};
    }
};


export const submitTextSolution = async (
    challengeId: number,
    content: string
): Promise<{ message: string }> => {
    try {
        const response = await api.post(`/api/practice/${challengeId}/submit-text/`, {
            content,
        });
        return response.data;
    } catch (error: any) {
        console.error("Error submitting text solution:", error);
        throw new Error(error?.response?.data?.message || "Failed to submit text solution.");
    }
};