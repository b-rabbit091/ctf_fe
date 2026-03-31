// src/pages/leaderboard/api.ts
import axios, {AxiosError} from "axios";
import api from "../../api/axios";
import type {LeaderboardApiResponse, LeaderboardEntry, LeaderboardMode} from "./types";

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

type UnknownRecord = Record<string, unknown>;

type LeaderboardContestPayload = {
    id?: number | null;
    name?: string | null;
    slug?: string | null;
};

type LeaderboardUserPayload = {
    id?: number;
    username?: string;
    email?: string;
};

type LeaderboardRowPayload = {
    rank?: number;
    user?: LeaderboardUserPayload;
    user_id?: number;
    username?: string;
    solved?: number;
    total_score?: number;
    score?: number;
    last_solved_at?: string | null;
    last_submission_at?: string | null;
};

type PaginatedEnvelope = {
    count: number;
    next: string | null;
    previous: string | null;
    results: unknown;
};

function isObject(v: unknown): v is UnknownRecord {
    return typeof v === "object" && v !== null;
}

function extractServerMessage(data: unknown): string | null {
    if (!isObject(data)) return null;

    const candidates = [data.detail, data.error, data.message, data.msg, data.non_field_errors];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
        if (Array.isArray(candidate) && typeof candidate[0] === "string" && candidate[0].trim()) {
            return candidate[0].trim();
        }
    }

    return null;
}

function toFriendlyAxiosError(err: unknown, fallback: string): LeaderboardError {
    if (!axios.isAxiosError(err)) {
        return new LeaderboardError("We could not reach the server. Please check your internet connection.");
    }

    const error = err as AxiosError<unknown>;
    const status = error.response?.status;
    const data = error.response?.data;

    const serverMsg = extractServerMessage(data);
    if (serverMsg) return new LeaderboardError(serverMsg, status);

    if (status === 400) return new LeaderboardError("Invalid request. Please check your inputs and try again.", 400);
    if (status === 401) return new LeaderboardError("Your session has expired. Please sign in again.", 401);
    if (status === 403) return new LeaderboardError("You do not have permission to view this leaderboard.", 403);
    if (status === 404) return new LeaderboardError("Requested resource was not found.", 404);
    if (status && status >= 500) {
        return new LeaderboardError("Something went wrong on our side. Please try again shortly.", status);
    }

    if (error.code === "ECONNABORTED") return new LeaderboardError("The request timed out. Please try again.", status);
    if (!error.response) return new LeaderboardError("Unable to connect to the server. Please check your network.", status);

    return new LeaderboardError(error.message || fallback, status);
}

function isPaginatedEnvelope(data: unknown): data is PaginatedEnvelope {
    return isObject(data) && typeof data.count === "number" && "results" in data && ("next" in data || "previous" in data);
}

function unwrapLeaderboardPayload(data: unknown): LeaderboardApiResponse {
    if (!isObject(data)) return {contest: null, results: []};

    const maybeNestedResults = data.results;
    if (isObject(maybeNestedResults) && Array.isArray(maybeNestedResults.results)) {
        return maybeNestedResults as unknown as LeaderboardApiResponse;
    }

    if (Array.isArray(data.results)) {
        return data as unknown as LeaderboardApiResponse;
    }

    return {contest: null, results: []};
}

function mapLeaderboardResponseToEntries(
    payload: LeaderboardApiResponse,
    requestedContest?: {id?: number | null; name?: string | null}
): LeaderboardEntry[] {
    const payloadContest = payload.contest as LeaderboardContestPayload | null;
    const contestId = requestedContest?.id ?? payloadContest?.id ?? null;
    const contestName = requestedContest?.name ?? payloadContest?.name ?? payloadContest?.slug ?? null;

    return (payload.results ?? []).map((result) => {
        const row = result as unknown as LeaderboardRowPayload;
        const solved = Number(row.solved ?? 0);
        const score = Number(row.total_score ?? row.score ?? solved);

        return {
            rank: Number(row.rank ?? 0),
            userId:
                typeof row.user?.id === "number"
                    ? row.user.id
                    : (typeof row.user_id === "number" ? row.user_id : null),
            username: row.user?.username || row.username || "Unknown",
            email: row.user?.email,
            score,
            solved,
            last_submission_at: row.last_solved_at ?? row.last_submission_at ?? null,
            contest_id: contestId ?? undefined,
            contest_name: contestName ?? undefined,
        };
    });
}

export async function fetchLeaderboard(opts: {
    mode: LeaderboardMode;
    contestId?: number | null;
    contestName?: string | null;
    page?: number;
    pageSize?: number;
    search?: string;
}): Promise<FetchLeaderboardResult> {
    const {mode, contestId, contestName, page = 1, pageSize = 20} = opts;

    try {
        const normalizedMode = (mode || "practice").toLowerCase() as LeaderboardMode;

        const resp = await api.get("/submissions/leaderboard/", {
            params: {
                mode: normalizedMode,
                page,
                page_size: pageSize,
                ...(normalizedMode === "competition" && contestId ? {contest_id: contestId} : {}),
            },
        });

        const raw = resp.data;

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

export interface ContestDTO {
    id: number;
    name?: string;
    slug?: string;
    [key: string]: unknown;
}

export const getContests = async (): Promise<ContestDTO[]> => {
    try {
        const resp = await api.get("/challenges/contests/");
        return Array.isArray(resp.data) ? (resp.data as ContestDTO[]) : [];
    } catch (err: unknown) {
        throw toFriendlyAxiosError(err, "Unable to load contests.");
    }
};
