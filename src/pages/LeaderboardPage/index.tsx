// src/pages/LeaderboardPage/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { fetchLeaderboard, getContests, LeaderboardError } from "./api";
import { LeaderboardContest, LeaderboardEntry, LeaderboardMode } from "./types";

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

type PageMeta = {
    count: number;
    next: string | null;
    previous: string | null;
    page: number;
    pageSize: number;
};

const DEFAULT_PAGE_SIZE = 20;

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

    const selectedContestName = useMemo(() => {
        if (!selectedContestId) return null;
        return contests.find((x) => x.id === selectedContestId)?.name ?? null;
    }, [selectedContestId, contests]);

    // Load contests once
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const list = await getContests();
                if (!mounted) return;

                const normalized: LeaderboardContest[] = (list ?? [])
                    .map((c: any) => {
                        const id = Number(c?.id);
                        if (!Number.isFinite(id)) return null;
                        const name =
                            (typeof c?.name === "string" && c.name.trim()) ||
                            (typeof c?.slug === "string" && c.slug.trim()) ||
                            `Contest #${id}`;
                        return { id, name };
                    })
                    .filter(Boolean) as LeaderboardContest[];

                setContests(normalized);

                if (normalized.length > 0 && selectedContestId == null) {
                    setSelectedContestId(normalized[0].id);
                }
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setContests([]);
            }
        })();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ensure contest selected in competition mode (backend expects contest_id)
    useEffect(() => {
        if (mode !== "competition") return;
        if (selectedContestId != null) return;
        if (contests.length === 0) return;
        setSelectedContestId(contests[0].id);
    }, [mode, selectedContestId, contests]);

    // Reset to page 1 on mode/contest change
    useEffect(() => {
        setMeta((m) => ({ ...m, page: 1, next: null, previous: null }));
    }, [mode, selectedContestId]);

    // Reset to page 1 on search change (so user isn't stuck on page 3 of a filtered list)
    useEffect(() => {
        setMeta((m) => ({ ...m, page: 1 }));
    }, [search]);

    // Load leaderboard for current page
    useEffect(() => {
        let mounted = true;

        setLoading(true);
        setError(null);

        (async () => {
            try {
                // IMPORTANT: fetchLeaderboard must accept page + pageSize and return { entries, count, next, previous }
                const resp = await fetchLeaderboard({
                    mode,
                    contestId: mode === "competition" ? selectedContestId : null,
                    contestName: mode === "competition" ? selectedContestName : null,
                    page: meta.page,
                    pageSize: meta.pageSize,
                    search: search.trim() || undefined,
                });

                if (!mounted) return;

                setEntries(resp.entries);
                setMeta((m) => ({
                    ...m,
                    count: resp.count,
                    next: resp.next,
                    previous: resp.previous,
                }));
            } catch (e) {
                console.error(e);
                if (!mounted) return;

                if (e instanceof LeaderboardError) setError(e.message);
                else setError("Failed to load leaderboard data. Please try again.");

                setEntries([]);
                setMeta((m) => ({ ...m, count: 0, next: null, previous: null }));
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [mode, selectedContestId, selectedContestName, meta.page, meta.pageSize, search]);

    // Client-side search filtering is removed (search is sent to backend)
    // If your backend DOES NOT support search, tell me — I’ll switch it back.

    const showingFrom = meta.count === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
    const showingTo = Math.min(meta.count, meta.page * meta.pageSize);

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full">
                    {/* Header */}
                    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
                                Leaderboard
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-600">
                                Track performance across practice and published contests.
                            </p>
                            {mode === "competition" && selectedContestName ? (
                                <p className="mt-1 text-sm sm:text-base text-slate-700">
                                    Contest: <span className="font-semibold text-slate-900">{selectedContestName}</span>
                                </p>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                            <button
                                type="button"
                                onClick={() => setMode("practice")}
                                className={cx(
                                    "rounded-full border px-4 py-2 transition-colors",
                                    mode === "practice"
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                                )}
                            >
                                Practice
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("competition")}
                                className={cx(
                                    "rounded-full border px-4 py-2 transition-colors",
                                    mode === "competition"
                                        ? "border-sky-600 bg-sky-600 text-white"
                                        : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                                )}
                            >
                                Competition
                            </button>
                        </div>
                    </header>

                    {/* Filters */}
                    <section className="mb-5 rounded-2xl border border-white/30 bg-white/55 px-4 py-4 md:px-5 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by username or email…"
                                className="h-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 text-sm sm:text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />

                            {mode === "competition" && (
                                <select
                                    value={selectedContestId ?? ""}
                                    onChange={(e) => setSelectedContestId(e.target.value ? Number(e.target.value) : null)}
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                            )}

                            <div className="ml-auto text-sm sm:text-base text-slate-700">
                                {meta.count === 0 ? (
                                    <>
                                        Showing <span className="font-semibold text-slate-900">0</span>
                                    </>
                                ) : (
                                    <>
                                        Showing{" "}
                                        <span className="font-semibold text-slate-900">
                      {showingFrom}–{showingTo}
                    </span>{" "}
                                        of <span className="font-semibold text-slate-900">{meta.count}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Loading / error */}
                    {loading && (
                        <div className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            Loading leaderboard…
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm sm:text-base text-red-900 shadow-sm backdrop-blur-xl">
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <>
                            {entries.length === 0 ? (
                                <div className="rounded-2xl border border-white/30 bg-white/55 px-6 py-12 text-center text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <div className="text-base md:text-lg font-semibold text-slate-900">No leaderboard data</div>
                                    <div className="mt-1 text-sm md:text-base text-slate-700">
                                        Try switching mode or adjusting your search.
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm sm:text-base">
                                        <thead className="bg-slate-50/60">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-600">
                                                Rank
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-600">
                                                Player
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-600">
                                                Score
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-600">
                                                Solved
                                            </th>
                                            {mode === "competition" && (
                                                <th className="px-5 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-600">
                                                    Contest
                                                </th>
                                            )}
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-600">
                                                Last Submission
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100 bg-white/40">
                                        {entries.map((e) => (
                                            <tr key={`${e.userId ?? e.username}-${e.rank}`} className="hover:bg-white/60">
                                                <td className="px-5 py-3 align-top text-sm sm:text-base font-semibold text-slate-900 whitespace-nowrap">
                                                    #{e.rank}
                                                </td>

                                                <td className="px-5 py-3 align-top">
                                                    <div className="text-sm sm:text-base font-medium text-slate-900">{e.username}</div>
                                                    {e.email ? <div className="text-xs sm:text-sm text-slate-600">{e.email}</div> : null}
                                                </td>

                                                <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-800">{e.score}</td>
                                                <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-800">{e.solved}</td>

                                                {mode === "competition" && (
                                                    <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-700">
                                                        {e.contest_name || "—"}
                                                    </td>
                                                )}

                                                <td className="px-5 py-3 align-top text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                                                    {formatDateTime(e.last_submission_at)}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Bottom-right pagination (Prev / Next only) */}
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={!meta.previous}
                                    onClick={() => setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))}
                                    className={cx(
                                        "rounded-xl border px-4 py-2 text-sm font-medium shadow-sm",
                                        !meta.previous
                                            ? "border-slate-200 bg-white/50 text-slate-400"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    Previous
                                </button>

                                <button
                                    type="button"
                                    disabled={!meta.next}
                                    onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
                                    className={cx(
                                        "rounded-xl border px-4 py-2 text-sm font-medium shadow-sm",
                                        !meta.next
                                            ? "border-slate-200 bg-white/50 text-slate-400"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    )}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LeaderboardPage;
