// src/pages/leaderboard/api.ts
import axios, { AxiosError } from "axios";
import api from "../../api/axios";
import type { LeaderboardApiResponse, LeaderboardEntry, LeaderboardMode } from "./types";

export class LeaderboardError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
        super(message);
        this.name = "LeaderboardError";
        this.status = status;
    }
}

export type FetchLeaderboardResult = {
    entries: LeaderboardEntry[];
    count: number;
    next: string | null;
    previous: string | null;
};

function isObject(v: unknown): v is Record<string, any> {
    return typeof v === "object" && v !== null;
}

function extractServerMessage(data: unknown): string | null {
    if (!isObject(data)) return null;
    const candidates = [data.detail, data.error, data.message, data.msg, data.non_field_errors];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim();
        if (Array.isArray(c) && typeof c[0] === "string" && c[0].trim()) return c[0].trim();
    }
    return null;
}

function toFriendlyAxiosError(err: unknown, fallback: string): LeaderboardError {
    if (!axios.isAxiosError(err)) {
        return new LeaderboardError("We could not reach the server. Please check your internet connection.");
    }

    const e = err as AxiosError<any>;
    const status = e.response?.status;
    const data = e.response?.data;

    const serverMsg = extractServerMessage(data);
    if (serverMsg) return new LeaderboardError(serverMsg, status);

    if (status === 400) return new LeaderboardError("Invalid request. Please check your inputs and try again.", 400);
    if (status === 401) return new LeaderboardError("Your session has expired. Please sign in again.", 401);
    if (status === 403) return new LeaderboardError("You do not have permission to view this leaderboard.", 403);
    if (status === 404) return new LeaderboardError("Requested resource was not found.", 404);
    if (status && status >= 500)
        return new LeaderboardError("Something went wrong on our side. Please try again shortly.", status);

    if (e.code === "ECONNABORTED") return new LeaderboardError("The request timed out. Please try again.", status);
    if (!e.response) return new LeaderboardError("Unable to connect to the server. Please check your network.", status);

    return new LeaderboardError(e.message || fallback, status);
}

type PaginatedEnvelope = {
    count: number;
    next: string | null;
    previous: string | null;
    results: unknown;
};

function isPaginatedEnvelope(data: unknown): data is PaginatedEnvelope {
    return (
        isObject(data) &&
        typeof (data as any).count === "number" &&
        "results" in (data as any) &&
        ("next" in (data as any) || "previous" in (data as any))
    );
}

/**
 * Backend can return either:
 *  A) non-paginated: { type, contest, results: [...] }
 *  B) paginated:     { count, next, previous, results: { type, contest, results: [...] } }
 */
function unwrapLeaderboardPayload(data: unknown): LeaderboardApiResponse {
    if (!isObject(data)) return { type: "practice", contest: null, results: [] } as any;

    const maybePaginatedResults = (data as any).results;
    if (isObject(maybePaginatedResults) && Array.isArray((maybePaginatedResults as any).results)) {
        return maybePaginatedResults as LeaderboardApiResponse;
    }

    if (Array.isArray((data as any).results)) {
        return data as LeaderboardApiResponse;
    }

    return { type: "practice", contest: null, results: [] } as any;
}

function mapLeaderboardResponseToEntries(
    payload: LeaderboardApiResponse,
    requestedContest?: { id?: number | null; name?: string | null }
): LeaderboardEntry[] {
    const contest_id =
        requestedContest?.id ??
        (payload.contest ? (payload.contest as any).id : null) ??
        null;

    const contest_name =
        requestedContest?.name ??
        (payload.contest ? ((payload.contest as any).name || (payload.contest as any).slug || null) : null) ??
        null;

    return (payload.results ?? []).map((r: any) => {
        const solved = Number(r.solved ?? 0);

        // ✅ Prefer backend score if provided
        const score = Number(r.total_score ?? r.score ?? solved);

        return {
            rank: Number(r.rank ?? 0),
            userId: typeof r.user?.id === "number" ? r.user.id : (typeof r.user_id === "number" ? r.user_id : null),
            username: r.user?.username || r.username || "Unknown",
            email: r.user?.email,
            score,
            solved,
            last_submission_at: r.last_solved_at ?? r.last_submission_at ?? null,
            contest_id: contest_id ?? undefined,
            contest_name: contest_name ?? undefined,
        };
    });
}

export async function fetchLeaderboard(opts: {
    mode: LeaderboardMode;
    contestId?: number | null;
    contestName?: string | null;
    page?: number;
    pageSize?: number;
    search?: string
}): Promise<FetchLeaderboardResult> {
    const { mode, contestId, contestName, page = 1, pageSize = 20 } = opts;

    try {
        const normalizedMode = (mode || "practice").toLowerCase() as LeaderboardMode;

        const resp = await api.get("/submissions/leaderboard/", {
            params: {
                mode: normalizedMode,
                page,
                page_size: pageSize,
                ...(normalizedMode === "competition" && contestId ? { contest_id: contestId } : {}),
            },
        });

        const raw = resp.data;

        // If backend is paginated, we keep count/next/previous.
        if (isPaginatedEnvelope(raw)) {
            const payload = unwrapLeaderboardPayload(raw);
            const entries = mapLeaderboardResponseToEntries(payload, {
                id: normalizedMode === "competition" ? contestId ?? null : null,
                name: normalizedMode === "competition" ? contestName ?? null : null,
            });

            return {
                entries,
                count: raw.count ?? entries.length,
                next: raw.next ?? null,
                previous: raw.previous ?? null,
            };
        }

        // Non-paginated fallback
        const payload = unwrapLeaderboardPayload(raw);
        const entries = mapLeaderboardResponseToEntries(payload, {
            id: normalizedMode === "competition" ? contestId ?? null : null,
            name: normalizedMode === "competition" ? contestName ?? null : null,
        });

        return {
            entries,
            count: entries.length,
            next: null,
            previous: null,
        };
    } catch (err: unknown) {
        if (err instanceof LeaderboardError) throw err;
        throw toFriendlyAxiosError(err, "Unable to load leaderboard.");
    }
}

// ---- contests (dropdown) ----
export interface ContestDTO {
    id: number;
    name?: string;
    slug?: string;
    [key: string]: any;
}

export const getContests = async (): Promise<ContestDTO[]> => {
    try {
        const resp = await api.get("/challenges/contests/");
        return Array.isArray(resp.data) ? (resp.data as ContestDTO[]) : [];
    } catch (err: unknown) {
        throw toFriendlyAxiosError(err, "Unable to load contests.");
    }
};
