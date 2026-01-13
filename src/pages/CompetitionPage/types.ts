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

}


// export interface PreviousSubmission {
//     value: string;
//     updated_at: string;
//     id: number;
//     type: "Procedure" | "Flag";
//     content: string;
//     created_at: string;
//     status: string;
// }

export interface ContestMeta {
    id: number;
    name: string;
    slug: string;
    description?: string;
    contest_type: "daily" | "weekly" | "monthly" | "custom" | string;
    start_time: string; // ISO strings from backend
    end_time: string;
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

