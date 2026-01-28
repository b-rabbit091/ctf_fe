// src/api/dashboard.ts
import api from "./axios";
import axios, {AxiosError} from "axios";

const API_URL = '/dashboard/'
/* ==== Types that match the backend payload ==== */

export interface DifficultyBreakdown {
    Easy: number;
    Medium: number;
    Hard: number;
}

export interface CategoryStat {
    category_id: number | null;
    category: string | null;
    solved_count: number;
}

export interface SubmissionItem {
    id: number;
    type: "flag" | "text";
    challenge_id: number;
    challenge_title: string | null;
    question_type: "practice" | "competition" | null;
    contest_id: number | null;
    contest_name: string | null;
    status: string | null;
    submitted_at: string; // ISO
}

export interface ContestItem {
    id: number;
    name: string;
    slug: string;
    description: string;
    contest_type: string;
    start_time: string;
    end_time: string;
    is_active: boolean;
}

export interface DashboardOverview {
    user: {
        id: number;
        username: string;
        email: string;
        role: string | null;
        is_admin: boolean;
        is_student: boolean;
        date_joined: string;
    };
    practice_stats: {
        total_solved: number;
        total_attempted: number;
        difficulty: DifficultyBreakdown;
        solved_challenge_ids: number[];
    };
    competition_stats: {
        total_solved: number;
        total_attempted: number;
        difficulty: DifficultyBreakdown;
        solved_challenge_ids: number[];
    };
    overall_stats: {
        total_solved: number;
        total_attempted: number;
        category_breakdown: CategoryStat[];
    };
    recent_submissions: SubmissionItem[];
    contests: {
        ongoing: ContestItem[];
        upcoming: ContestItem[];
        recent_past: ContestItem[];
    };
}

/* ==== Custom error type so UI can show friendly messages ==== */

export class DashboardError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = "DashboardError";
        this.status = status;
    }
}

/* ==== API call (uses axios instance `api`) ==== */

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
    try {
        const resp = await api.get<DashboardOverview>(`${API_URL}overview/`);
        return resp.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<any>;

            const status = axiosError.response?.status;
            const data = axiosError.response?.data;

            const detailFromServer =
                (data && typeof data === "object" && (data as any).detail) || null;

            let message = "Unable to load dashboard.";

            if (detailFromServer) {
                message = String(detailFromServer);
            } else if (status === 401) {
                message =
                    "Your session has expired or you are not logged in. Please sign in again.";
            } else if (status === 403) {
                message = "You do not have permission to access this dashboard.";
            } else if (status === 500) {
                message =
                    "Something went wrong on our side. Please try again in a few moments.";
            } else if (axiosError.message) {
                message = axiosError.message;
            }

            throw new DashboardError(message, status);
        }

        throw new DashboardError(
            "We could not reach the server. Please check your internet connection."
        );
    }
};

// src/api/dashboard.ts

export interface AdminDashboardTotalsResponse {
    users: {
        total_users: number;
        total_students: number;
        total_admins: number;
    };
    challenges: {
        total_challenges: number;
        total_practice_challenges: number;
        total_competition_challenges: number;
    };
    contests: {
        total_contests: number;
        active_contests: number;
        upcoming_contests: number;
        ended_contests: number;
    };
    submissions: {
        total_submissions: number;
        total_flag_submissions: number;
        total_text_submissions: number;
        solved_submissions: number;
        distinct_submitters: number;
    };
}

/**
 * Admin-only totals endpoint for dashboard summary cards.
 * Backend: GET {API_URL}admin/totals/
 */
export const getAdminDashboardTotals =
    async (): Promise<AdminDashboardTotalsResponse> => {
        const resp = await api.get<AdminDashboardTotalsResponse>(
            `${API_URL}admin/totals/`
        );
        return resp.data;
    };
