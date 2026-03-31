// src/api/adminSubmissions.ts
import api from "./axios";

export interface AdminSubmissionBase {
    id: number;
    user: {
        id: number;
        username: string;
        email: string;
    };
    challenge: {
        id: number;
        title: string;
    };
    contest: {
        id: number;
        name: string;
    } | null;
    status: {
        status: string;
        description: string;
    };
    submitted_at: string;
}

export interface AdminFlagSubmission extends AdminSubmissionBase {
    value: string;
    type: "flag";
}

export interface AdminTextSubmission extends AdminSubmissionBase {
    content: string;
    type: "text";
}

type AdminFlagSubmissionApi = Omit<AdminFlagSubmission, "type">;
type AdminTextSubmissionApi = Omit<AdminTextSubmission, "type">;

// Fetch all flag submissions
export async function getFlagSubmissions(): Promise<AdminFlagSubmission[]> {
    const res = await api.get<AdminFlagSubmissionApi[]>("/submissions/flag-submissions");
    return res.data.map((s) => ({
        ...s,
        type: "flag",
    }));
}

// Fetch all text submissions
export async function getTextSubmissions(): Promise<AdminTextSubmission[]> {
    const res = await api.get<AdminTextSubmissionApi[]>("/submissions/text-submissions");
    return res.data.map((s) => ({
        ...s,
        type: "text",
    }));
}

// Delete submission based on type
export async function deleteSubmission(id: number, type: "flag" | "text") {
    if (type === "flag") {
        return await api.delete(`/submissions/flag-submissions/${id}/`);
    }
    return await api.delete(`/submissions/text-submissions/${id}/`);
}
