// src/pages/LeaderboardPage/index.tsx
import React, {useEffect, useMemo, useState} from "react";
import Navbar from "../../components/Navbar";
import {fetchLeaderboard, getContests, LeaderboardError} from "./api";
import {LeaderboardContest, LeaderboardEntry, LeaderboardMode} from "./types";

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

    // Styles (match CompetitionList / PracticeList)
    const shell = "min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col";
    const mainPad = "flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8";

    const glassCard =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    const pill = (active: boolean) =>
        [
            "rounded-full border px-4 py-2 text-sm sm:text-base font-normal transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        ].join(" ");

    const modeChip = (m: LeaderboardMode) => pill(mode === m);

    const statChip = "inline-flex items-center rounded-2xl border border-white/30 bg-white/55 px-3 py-2 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

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
                        return {id, name};
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
        setMeta((m) => ({...m, page: 1, next: null, previous: null}));
    }, [mode, selectedContestId]);

    // Reset to page 1 on search change
    useEffect(() => {
        setMeta((m) => ({...m, page: 1}));
    }, [search]);

    // Load leaderboard for current page
    useEffect(() => {
        let mounted = true;

        setLoading(true);
        setError(null);

        (async () => {
            try {
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
                setMeta((m) => ({...m, count: 0, next: null, previous: null}));
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [mode, selectedContestId, selectedContestName, meta.page, meta.pageSize, search]);

    const showingFrom = meta.count === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
    const showingTo = Math.min(meta.count, meta.page * meta.pageSize);

    return (
        <div className={shell}>
            <Navbar/>

            <main className={mainPad}>
                <div className="w-full">
                    {/* Header (match: normal weight slate-700) */}
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight">
                                Leaderboard
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-600">
                                Track performance across practice and published contests.
                            </p>

                            {mode === "competition" && selectedContestName ? (
                                <p className="mt-1 text-sm sm:text-base text-slate-600">
                                    Contest: <span className="font-normal text-slate-700">{selectedContestName}</span>
                                </p>
                            ) : null}
                        </div>

                        {/* Mode pills (same chip style used elsewhere) */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setMode("practice")} className={modeChip("practice")}>
                                Practice
                            </button>
                            <button type="button" onClick={() => setMode("competition")}
                                    className={modeChip("competition")}>
                                Competition
                            </button>
                        </div>
                    </header>

                    {/* Filters panel (match CompetitionList layout) */}
                    <section className={cx("mb-6", glassCard)}>
                        <div className="px-4 py-4 space-y-3">
                            {/* Row 1 */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[260px] flex-1 max-w-[720px]">
                                    <label className="sr-only" htmlFor="leaderboard-search">
                                        Search leaderboard
                                    </label>
                                    <input
                                        id="leaderboard-search"
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by username or email…"
                                        className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>

                                {mode === "competition" && (
                                    <div className="shrink-0">
                                        <label className="sr-only" htmlFor="leaderboard-contest">
                                            Contest filter
                                        </label>
                                        <select
                                            id="leaderboard-contest"
                                            value={selectedContestId ?? ""}
                                            onChange={(e) => setSelectedContestId(e.target.value ? Number(e.target.value) : null)}
                                            className="h-10 w-[240px] rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                )}

                                <div
                                    className="ml-auto inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 text-sm sm:text-base text-slate-600">
                                    {meta.count === 0 ? (
                                        <>
                                            <span className="text-slate-500">Showing:</span>
                                            <span className="ml-2 text-slate-600">0</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-slate-500">Showing:</span>
                                            <span className="ml-2 text-slate-600">
                                                {showingFrom}–{showingTo}
                                            </span>
                                            <span className="mx-2 text-slate-300">•</span>
                                            <span className="text-slate-500">Total:</span>
                                            <span className="ml-2 text-slate-600">{meta.count}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                        </div>
                    </section>

                    {/* Loading / error */}
                    {loading && (
                        <div className={cx("mb-4 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600", glassCard)}>
                            Loading leaderboard...
                        </div>
                    )}

                    {error && (
                        <div
                            className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-rose-700 shadow-sm backdrop-blur-xl">
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <>
                            {entries.length === 0 ? (
                                <div className={cx("px-6 py-12 text-center text-slate-600", glassCard)}>
                                    <div className="text-base md:text-lg font-normal text-slate-700">No leaderboard
                                        data
                                    </div>
                                    <div className="mt-1 text-sm md:text-base text-slate-600">
                                        Try switching mode or adjusting your search.
                                    </div>
                                </div>
                            ) : (
                                <div className={cx("overflow-x-auto", glassCard)}>
                                    <table className="min-w-full divide-y divide-slate-200/70 text-sm sm:text-base">
                                        <thead className="bg-slate-50/60">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-600">
                                                Rank
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-600">
                                                Player
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-600">
                                                Score
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-600">
                                                Solved
                                            </th>
                                            {mode === "competition" && (
                                                <th className="px-5 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-600">
                                                    Contest
                                                </th>
                                            )}
                                            <th className="px-5 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-600">
                                                Last Submission
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100/70 bg-white/40">
                                        {entries.map((e) => (
                                            <tr key={`${e.userId ?? e.username}-${e.rank}`}
                                                className="hover:bg-white/60">
                                                <td className="px-5 py-3 align-top text-sm sm:text-base font-normal text-slate-700 whitespace-nowrap">
                                                    #{e.rank}
                                                </td>

                                                <td className="px-5 py-3 align-top">
                                                    <div
                                                        className="text-sm sm:text-base font-normal text-slate-700">{e.username}</div>
                                                    {e.email ? (
                                                        <div
                                                            className="text-xs sm:text-sm text-slate-500">{e.email}</div>
                                                    ) : null}
                                                </td>

                                                <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-600">{e.score}</td>
                                                <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-600">{e.solved}</td>

                                                {mode === "competition" && (
                                                    <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-600">
                                                        {e.contest_name || "—"}
                                                    </td>
                                                )}

                                                <td className="px-5 py-3 align-top text-xs sm:text-sm text-slate-500 whitespace-nowrap">
                                                    {formatDateTime(e.last_submission_at)}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination (match list pages) */}
                            <div
                                className={cx("mt-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600", glassCard)}>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={!meta.previous}
                                        onClick={() => setMeta((m) => ({...m, page: Math.max(1, m.page - 1)}))}
                                        className={cx(
                                            "rounded-2xl border px-4 py-2 text-sm sm:text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/15",
                                            !meta.previous
                                                ? "border-slate-200/70 bg-white/50 text-slate-400 disabled:cursor-not-allowed"
                                                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white"
                                        )}
                                    >
                                        Prev
                                    </button>

                                    <span className="text-sm sm:text-base md:text-lg text-slate-600">
                                        Page <span className="text-slate-600">{meta.page}</span>
                                    </span>

                                    <button
                                        type="button"
                                        disabled={!meta.next}
                                        onClick={() => setMeta((m) => ({...m, page: m.page + 1}))}
                                        className={cx(
                                            "rounded-2xl border px-4 py-2 text-sm sm:text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/15",
                                            !meta.next
                                                ? "border-slate-200/70 bg-white/50 text-slate-400 disabled:cursor-not-allowed"
                                                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white"
                                        )}
                                    >
                                        Next
                                    </button>
                                </div>

                                <div className="text-slate-600">
                                    {meta.count === 0 ? (
                                        <>
                                            Showing <span className="text-slate-600">0</span>
                                        </>
                                    ) : (
                                        <>
                                            Showing{" "}
                                            <span className="text-slate-600">
                                                {showingFrom}–{showingTo}
                                            </span>{" "}
                                            of <span className="text-slate-600">{meta.count}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LeaderboardPage;
