// src/pages/LeaderboardPage/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { fetchLeaderboard, getContests } from "./api";
import { LeaderboardEntry, LeaderboardContest, LeaderboardMode } from "./types";

const LeaderboardPage: React.FC = () => {
    const [mode, setMode] = useState<LeaderboardMode>("practice");

    const [contests, setContests] = useState<LeaderboardContest[]>([]);
    const [selectedContestId, setSelectedContestId] = useState<number | null>(null);

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState<string>("");

    const selectedContestName = useMemo(() => {
        if (!selectedContestId) return null;
        const c = contests.find((x) => x.id === selectedContestId);
        return c?.name ?? null;
    }, [selectedContestId, contests]);

    // Load contests once (for dropdown)
    useEffect(() => {
        let mounted = true;

        const loadContests = async () => {
            try {
                const contestList = await getContests();
                if (!mounted) return;

                const normalized: LeaderboardContest[] = (contestList ?? []).map((c) => ({
                    id: c.id,
                    name: c.name || c.slug || `Contest #${c.id}`,
                }));

                setContests(normalized);

                // Default select first contest (only for competition UX)
                if (normalized.length > 0 && selectedContestId == null) {
                    setSelectedContestId(normalized[0].id);
                }
            } catch (e) {
                console.error(e);
                // contests failure shouldn't kill page; just keep dropdown empty
            }
        };

        loadContests();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load leaderboard whenever mode/contest changes
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        const load = async () => {
            try {
                const data = await fetchLeaderboard({
                    mode,
                    contestId: mode === "competition" ? selectedContestId : null,
                    contestName: mode === "competition" ? selectedContestName : null,
                });

                if (!mounted) return;
                setEntries(data);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load leaderboard data. Please try again.");
                setEntries([]);
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [mode, selectedContestId, selectedContestName]);

    const filteredEntries = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter((e) => {
            const u = e.username?.toLowerCase() || "";
            const em = e.email?.toLowerCase() || "";
            return u.includes(q) || em.includes(q);
        });
    }, [entries, search]);

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full">
                    {/* Header */}
                    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
                                Leaderboard
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-600">
                                See who is leading in practice and competition challenges.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                            <button
                                type="button"
                                onClick={() => setMode("practice")}
                                className={[
                                    "rounded-full border px-4 py-2 transition-colors",
                                    mode === "practice"
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white",
                                ].join(" ")}
                            >
                                Practice
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("competition")}
                                className={[
                                    "rounded-full border px-4 py-2 transition-colors",
                                    mode === "competition"
                                        ? "border-sky-600 bg-sky-600 text-white"
                                        : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white",
                                ].join(" ")}
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
                                    <option value="">All Contests</option>
                                    {contests.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="ml-auto text-sm sm:text-base text-slate-700">
                                Showing <span className="font-semibold text-slate-900">{filteredEntries.length}</span> players
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
                            {filteredEntries.length === 0 ? (
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
                                        {filteredEntries.map((e) => (
                                            <tr key={`${e.userId ?? e.username}-${e.rank}`} className="hover:bg-white/60">
                                                <td className="px-5 py-3 align-top text-sm sm:text-base font-semibold text-slate-900 whitespace-nowrap">
                                                    #{e.rank}
                                                </td>

                                                <td className="px-5 py-3 align-top">
                                                    <div className="text-sm sm:text-base font-medium text-slate-900">{e.username}</div>
                                                    {e.email && <div className="text-xs sm:text-sm text-slate-600">{e.email}</div>}
                                                </td>

                                                <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-800">{e.score}</td>
                                                <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-800">{e.solved}</td>

                                                {mode === "competition" && (
                                                    <td className="px-5 py-3 align-top text-sm sm:text-base text-slate-700">
                                                        {e.contest_name || "—"}
                                                    </td>
                                                )}

                                                <td className="px-5 py-3 align-top text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                                                    {e.last_submission_at ? new Date(e.last_submission_at).toLocaleString() : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LeaderboardPage;
