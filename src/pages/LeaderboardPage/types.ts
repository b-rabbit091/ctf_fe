
export type LeaderboardMode = "practice" | "competition";

export interface LeaderboardContest {
    id: number;
    name: string;
}

export interface LeaderboardEntry {
    rank: number;
    userId: number | null;
    username: string;
    email?: string;
    score: number;
    solved: number;
    last_submission_at: string | null;
    contest_id?: number | null;
    contest_name?: string | null;
}

export type LeaderboardApiResponse = {
    contest: { id: number; slug?: string; name?: string } | null;
    results: Array<{
        rank: number;
        user: { id: number; username: string; email?: string };
        solved: number;
        flag_submissions?: number;
        text_submissions?: number;
        last_solved_at?: string | null;
    }>;
};
