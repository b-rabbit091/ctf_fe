import { ContestMeta } from "../CompetitionPage/types";

export interface FileType {
    name: string;
    url: string;
    type?: string;
}

export interface SolutionTypes {
    id: number;
    type: string;
    description: string;
}

export interface CategoryTypes {
    id: number;
    name: string;
    description: string;
}

export interface DifficultyTypes {
    id: number;
    level: string;
    description: string;
}

/**
 * What backend returns for per-user submission status.
 * If it is anything other than "solved" or "partially_solved",
 * UI should treat it as "unsolved" (you'll do that mapping in UI).
 */
export type UserSubmissionStatus = "solved" | "partially_solved" | "attempted" | "not_attempted";

export interface Challenge {
    id: number;
    title: string;
    description: string;
    constraints?: any;
    input_format?: any;
    output_format?: any;
    sample_input?: any;
    sample_output?: any;
    files?: FileType[] | null;
    category: CategoryTypes;
    difficulty: DifficultyTypes;
    solution_type: SolutionTypes;
    active_contest?: ContestMeta | null;

    // ✅ NEW: returned by backend (per user)
    user_submission_status?: UserSubmissionStatus;
}

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

export type PreviousSubmissionsApiResponse = {
    flag_submissions: SubmissionApiItem[];
    text_submissions: SubmissionApiItem[];
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

// src/components/chat/types.ts

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
    id: string; // always string in UI
    role: ChatRole;
    content: string;
    createdAt: string; // ISO string
    meta?: Record<string, any>;
};

// -------- Backend DTOs --------
export type ChatTurnApi = {
    id: number;
    role: ChatRole;
    content: string;
    created_at: string;
    meta?: Record<string, any>;
};

export type ChatHistoryApiResponse = {
    thread_id: number | null;
    challenge_id: number;
    next: string | null;
    previous: string | null;
    messages: ChatTurnApi[];
};

export type ChatSendApiResponse = {
    reply: string;
    id?: string | number;
    created_at?: string;
    percent_on_track?: number;
};

// -------- UI helpers --------
export type ChatHistoryPage = {
    threadId: number | null;
    challengeId: number;
    next: string | null; // next cursor URL = older messages (because backend ordering is -created_at)
    previous: string | null;
    messages: ChatMessage[]; // normalized
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
