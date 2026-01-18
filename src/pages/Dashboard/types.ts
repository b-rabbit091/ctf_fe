// src/pages/dashboard/types.ts

export type ISODateString = string;

/* ==== Difficulty ==== */
export type DifficultyKey = "Easy" | "Medium" | "Hard" ;
export type DifficultyMap = Record<DifficultyKey, number>;

export interface DifficultyBreakdown extends DifficultyMap {
}

/* ==== Category ==== */
export interface CategoryStat {
    category_id: number | null;
    category: string | null;
    solved_count: number;
}

/* ==== Submissions ==== */
export interface SubmissionItem {
    id: number;
    type: "flag" | "text" | string;
    challenge_id: number;
    challenge_title: string | null;
    question_type: "practice" | "competition" | null | string;
    contest_id: number | null;
    contest_name: string | null;
    status: string | null;
    submitted_at: ISODateString; // ISO
}

export type RecentSubmission = SubmissionItem;

/* ==== Contests ==== */
export interface ContestItem {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    contest_type: string;
    start_time: ISODateString;
    end_time: ISODateString;
    is_active: boolean;
}

export interface ContestsBlock {
    ongoing: ContestItem[];
    upcoming: ContestItem[];
    recent_past: ContestItem[];
}

/* ==== Main dashboard payload ==== */
export interface DashboardOverview {
    user: {
        id: number;
        username: string;
        email: string;
        role: string | null;
        is_admin: boolean;
        is_student: boolean;
        date_joined: ISODateString;
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
    contests: ContestsBlock;
}

export type DashboardOverviewResponse = DashboardOverview;

/* ==== Admin totals types ==== */
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

export type LoadingState = "idle" | "loading" | "success" | "error";
export type LoadResult =
    | { ok: true; data: DashboardOverviewResponse }
    | { ok: false; message: string; recoverable: boolean };


