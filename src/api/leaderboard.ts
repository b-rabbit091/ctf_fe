// src/api/leaderboard.ts
import api from "./axios";

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

/**
 * Backend response shape:
 * {
 *   contest: { id, slug, name } | null,
 *   results: [
 *     {
 *       rank,
 *       user: { id, username },
 *       solved,
 *       flag_submissions,
 *       text_submissions,
 *       last_solved_at
 *     }
 *   ]
 * }
 */
type LeaderboardApiResponse = {
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

function mapLeaderboardResponseToEntries(
    payload: LeaderboardApiResponse,
    requestedContest?: { id?: number | null; name?: string | null }
): LeaderboardEntry[] {
    const contest_id =
        requestedContest?.id ??
        (payload.contest ? payload.contest.id : null) ??
        null;

    const contest_name =
        requestedContest?.name ??
        (payload.contest ? payload.contest.name || payload.contest.slug || null : null) ??
        null;

    return (payload.results ?? []).map((r) => {
        const solved = Number(r.solved ?? 0);
        const score = solved; // keep same logic: 1 point per solved (backend can change later)
        return {
            rank: Number(r.rank ?? 0),
            userId: typeof r.user?.id === "number" ? r.user.id : null,
            username: r.user?.username || "Unknown",
            email: r.user?.email,
            score,
            solved,
            last_submission_at: r.last_solved_at ?? null,
            contest_id: contest_id ?? undefined,
            contest_name: contest_name ?? undefined,
        };
    });
}

export async function fetchLeaderboard(opts: {
    mode: LeaderboardMode;
    contestId?: number | null;
    contestName?: string | null;
}): Promise<LeaderboardEntry[]> {
    const {mode, contestId, contestName} = opts;

    const params: Record<string, any> = {};

    if (mode === "competition" && contestId) {
        params.contest_id = contestId;
    }

    const resp = await api.get("/api/submissions/leaderboard/", {
        params: {
            mode,
            ...(mode === "competition" && contestId ? { contest_id: contestId } : {}),
        },
    });    const data = (resp.data ?? {}) as LeaderboardApiResponse;

    return mapLeaderboardResponseToEntries(data, {
        id: mode === "competition" ? contestId ?? null : null,
        name: mode === "competition" ? contestName ?? null : null,
    });
}

// ---- contests (dropdown) ----
export interface ContestDTO {
    id: number;
    name?: string;
    slug?: string;

    [key: string]: any;
}

export const getContests = async (): Promise<ContestDTO[]> => {
    const resp = await api.get("/api/challenges/contests/");
    return resp.data ?? [];
};
