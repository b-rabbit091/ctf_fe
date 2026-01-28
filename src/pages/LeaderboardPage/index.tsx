// src/pages/LeaderboardPage/index.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Navbar from "../../components/Navbar";
import {fetchLeaderboard, getContests, LeaderboardError} from "./api";
import type {LeaderboardContest, LeaderboardEntry, LeaderboardMode} from "./types";
import {FiAlertCircle, FiInfo, FiRefreshCw} from "react-icons/fi";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}

type PageMeta = {
    count: number;
    next: string | null;
    previous: string | null;
    page: number;
    pageSize: number;
};

const DEFAULT_PAGE_SIZE = 20;

const Card = memo(function Card({
                                    title,
                                    right,
                                    children,
                                }: {
    title?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
            {title ? (
                <>
                    <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                        <h2 className="min-w-0 truncate text-base sm:text-lg font-normal tracking-tight text-slate-700">
                            {title}
                        </h2>
                        {right}
                    </div>
                    <div className="h-px bg-slate-200/70" />
                </>
            ) : null}
            <div className={cx("px-4 sm:px-5", title ? "py-4" : "py-4")}>{children}</div>
        </section>
    );
});

const pill = (active: boolean) =>
    cx(
        "rounded-full border px-4 py-2 text-sm sm:text-base font-normal transition",
        focusRing,
        active
            ? "border-sky-200/70 bg-sky-50 text-sky-700"
            : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90"
    );

function safeInt(n: unknown, fallback = 0) {
    const x = typeof n === "number" ? n : Number(n);
    return Number.isFinite(x) ? x : fallback;
}

function safeString(s: unknown, fallback = "—") {
    return typeof s === "string" && s.trim() ? s : fallback;
}

const LeaderboardPage: React.FC = () => {
    const [mode, setMode] = useState<LeaderboardMode>("practice");

    const [contests, setContests] = useState<LeaderboardContest[]>([]);
    const [selectedContestId, setSelectedContestId] = useState<number | null>(null);

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [meta, setMeta] = useState<PageMeta>({
        count: 0,
        next: null,
        previous: null,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
    });

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState<string>("");

    // avoid setState after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const selectedContestName = useMemo(() => {
        if (!selectedContestId) return null;
        return contests.find((x) => x.id === selectedContestId)?.name ?? null;
    }, [selectedContestId, contests]);

    const showingFrom = meta.count === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
    const showingTo = Math.min(meta.count, meta.page * meta.pageSize);

    const reloadContests = useCallback(async () => {
        try {
            const list = await getContests();
            if (!alive.current) return;

            const normalized: LeaderboardContest[] = (list ?? [])
                .map((c: any) => {
                    const id = safeInt(c?.id, NaN);
                    if (!Number.isFinite(id)) return null;

                    const name =
                        (typeof c?.name === "string" && c.name.trim()) ||
                        (typeof c?.slug === "string" && c.slug.trim()) ||
                        `Contest #${id}`;

                    return {id, name};
                })
                .filter(Boolean) as LeaderboardContest[];

            setContests(normalized);

            // Keep existing selection if still valid; else default to first
            setSelectedContestId((prev) => {
                if (prev != null && normalized.some((x) => x.id === prev)) return prev;
                return normalized.length > 0 ? normalized[0].id : null;
            });
        } catch (e) {
            console.error(e);
            if (!alive.current) return;
            setContests([]);
            // don't force error UI for contests only; competition mode will handle no contests.
        }
    }, []);

    // Load contests once
    useEffect(() => {
        reloadContests();
    }, [reloadContests]);

    // Ensure contest selected in competition mode (backend expects contest_id)
    useEffect(() => {
        if (mode !== "competition") return;
        if (selectedContestId != null) return;
        if (contests.length === 0) return;
        setSelectedContestId(contests[0].id);
    }, [mode, selectedContestId, contests]);

    // Reset to page 1 on mode/contest change
    useEffect(() => {
        setMeta((m) => ({...m, page: 1, next: null, previous: null}));
    }, [mode, selectedContestId]);

    // Reset to page 1 on search change
    useEffect(() => {
        setMeta((m) => ({...m, page: 1}));
    }, [search]);

    const loadLeaderboard = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const resp = await fetchLeaderboard({
                mode,
                contestId: mode === "competition" ? selectedContestId : null,
                contestName: mode === "competition" ? selectedContestName : null,
                page: meta.page,
                pageSize: meta.pageSize,
                search: search.trim() || undefined,
            });

            if (!alive.current) return;

            setEntries(resp.entries || []);
            setMeta((m) => ({
                ...m,
                count: safeInt(resp.count, 0),
                next: resp.next ?? null,
                previous: resp.previous ?? null,
            }));
        } catch (e) {
            console.error(e);
            if (!alive.current) return;

            if (e instanceof LeaderboardError) setError(e.message);
            else setError("Failed to load leaderboard data. Please try again.");

            setEntries([]);
            setMeta((m) => ({...m, count: 0, next: null, previous: null}));
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, [mode, selectedContestId, selectedContestName, meta.page, meta.pageSize, search]);

    // Load leaderboard for current page
    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    const onPrev = useCallback(() => {
        if (!meta.previous) return;
        setMeta((m) => ({...m, page: Math.max(1, m.page - 1)}));
        window.scrollTo({top: 0, behavior: "smooth"});
    }, [meta.previous]);

    const onNext = useCallback(() => {
        if (!meta.next) return;
        setMeta((m) => ({...m, page: m.page + 1}));
        window.scrollTo({top: 0, behavior: "smooth"});
    }, [meta.next]);

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                {/* Header */}
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                            Leaderboard
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-500">
                            Track performance across practice and published contests.
                        </p>

                        {mode === "competition" && selectedContestName ? (
                            <p className="mt-1 text-sm sm:text-base text-slate-500">
                                Contest: <span className="font-normal text-slate-700">{selectedContestName}</span>
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setMode("practice")} className={pill(mode === "practice")}>
                            Practice
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("competition")}
                            className={pill(mode === "competition")}
                        >
                            Competition
                        </button>

                        <button
                            type="button"
                            onClick={loadLeaderboard}
                            className={cx(
                                "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                                "ring-1 ring-slate-200/60 hover:bg-white/90 disabled:opacity-60",
                                focusRing
                            )}
                            disabled={loading}
                            aria-label="Refresh leaderboard"
                            title="Refresh"
                        >
                            <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </header>

                {/* Filters */}
                <Card>
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-[240px] flex-1">
                                <label className="sr-only" htmlFor="leaderboard-search">
                                    Search leaderboard
                                </label>
                                <input
                                    id="leaderboard-search"
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by username or email…"
                                    className={cx(
                                        "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                        "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                    )}
                                />
                            </div>

                            {mode === "competition" ? (
                                <div className="shrink-0">
                                    <label className="sr-only" htmlFor="leaderboard-contest">
                                        Contest filter
                                    </label>
                                    <select
                                        id="leaderboard-contest"
                                        value={selectedContestId ?? ""}
                                        onChange={(e) => setSelectedContestId(e.target.value ? Number(e.target.value) : null)}
                                        className={cx(
                                            "h-10 w-[240px] max-w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
                                        disabled={contests.length === 0}
                                    >
                                        {contests.length === 0 ? (
                                            <option value="">No contests available</option>
                                        ) : (
                                            contests.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            ) : null}

                            <div className="ml-auto inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-white/60 px-3 text-sm sm:text-base text-slate-600 ring-1 ring-slate-200/60">
                                {meta.count === 0 ? (
                                    <>
                                        <span className="text-slate-500">Showing:</span>
                                        <span className="ml-2 text-slate-700">0</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-slate-500">Showing:</span>
                                        <span className="ml-2 text-slate-700">
                      {showingFrom}–{showingTo}
                    </span>
                                        <span className="mx-2 text-slate-300">•</span>
                                        <span className="text-slate-500">Total:</span>
                                        <span className="ml-2 text-slate-700">{meta.count}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {mode === "competition" && contests.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50/60 ring-1 ring-slate-200/60 p-4 text-slate-600">
                                No contests found. Competition leaderboard may be empty until contests are created.
                                <button
                                    type="button"
                                    onClick={reloadContests}
                                    className={cx(
                                        "ml-3 inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-slate-200/60 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    <FiRefreshCw size={14} />
                                    Reload contests
                                </button>
                            </div>
                        ) : null}
                    </div>
                </Card>

                {/* Loading */}
                {loading ? (
                    <div className="mt-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                            <div className="min-w-0 space-y-2">
                                <div className="h-4 w-44 bg-slate-200/80 rounded animate-pulse" />
                                <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                            </div>
                        </div>
                        <p className="mt-3 text-center text-sm text-slate-500">Loading leaderboard…</p>
                    </div>
                ) : null}

                {/* Error */}
                {error ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load leaderboard</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                                <button
                                    type="button"
                                    onClick={loadLeaderboard}
                                    className={cx(
                                        "mt-3 inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-rose-200 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    <FiRefreshCw size={14} />
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Table */}
                {!loading && !error ? (
                    <>
                        {entries.length === 0 ? (
                            <div className="mt-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                    <FiInfo className="text-slate-500" />
                                </div>
                                <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                    No leaderboard data
                                </div>
                                <div className="mt-1 text-sm sm:text-base text-slate-500">
                                    Try switching mode or adjusting your search.
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                <table className="min-w-full text-sm sm:text-base">
                                    <thead className="bg-slate-50/60">
                                    <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-600">
                                        <th className="px-5 py-3 font-normal">Rank</th>
                                        <th className="px-5 py-3 font-normal">Player</th>
                                        <th className="px-5 py-3 font-normal">Score</th>
                                        <th className="px-5 py-3 font-normal">Solved</th>
                                        {mode === "competition" ? (
                                            <th className="px-5 py-3 font-normal">Contest</th>
                                        ) : null}
                                        <th className="px-5 py-3 font-normal">Last Submission</th>
                                    </tr>
                                    </thead>

                                    <tbody className="bg-white/40">
                                    {entries.map((e) => {
                                        const key = `${safeString((e as any).userId, safeString(e.username, "u"))}-${safeInt(e.rank, 0)}`;
                                        return (
                                            <tr key={key} className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition">
                                                <td className="px-5 py-3 align-top font-normal text-slate-700 whitespace-nowrap">
                                                    #{safeInt(e.rank, 0)}
                                                </td>

                                                <td className="px-5 py-3 align-top">
                                                    <div className="font-normal text-slate-700">
                                                        {safeString(e.username, "Unknown")}
                                                    </div>
                                                    {e.email ? (
                                                        <div className="text-xs sm:text-sm text-slate-500 break-all">{e.email}</div>
                                                    ) : null}
                                                </td>

                                                <td className="px-5 py-3 align-top text-slate-600">
                                                    {safeInt((e as any).score, 0)}
                                                </td>
                                                <td className="px-5 py-3 align-top text-slate-600">
                                                    {safeInt((e as any).solved, 0)}
                                                </td>

                                                {mode === "competition" ? (
                                                    <td className="px-5 py-3 align-top text-slate-600">
                                                        {safeString((e as any).contest_name, "—")}
                                                    </td>
                                                ) : null}

                                                <td className="px-5 py-3 align-top text-xs sm:text-sm text-slate-500 whitespace-nowrap">
                                                    {formatDateTime((e as any).last_submission_at)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={!meta.previous}
                                        onClick={onPrev}
                                        className={cx(
                                            "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                            focusRing
                                        )}
                                    >
                                        Prev
                                    </button>

                                    <span className="text-sm sm:text-base text-slate-600">
                    Page <span className="text-slate-700">{meta.page}</span>
                  </span>

                                    <button
                                        type="button"
                                        disabled={!meta.next}
                                        onClick={onNext}
                                        className={cx(
                                            "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                            focusRing
                                        )}
                                    >
                                        Next
                                    </button>
                                </div>

                                <div className="text-sm sm:text-base text-slate-600">
                                    {meta.count === 0 ? (
                                        <>
                                            Showing <span className="text-slate-700">0</span>
                                        </>
                                    ) : (
                                        <>
                                            Showing{" "}
                                            <span className="text-slate-700">
                        {showingFrom}–{showingTo}
                      </span>{" "}
                                            of <span className="text-slate-700">{meta.count}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
};

export default LeaderboardPage;
