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
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <div className="w-full">
                    {/* Header */}
                    <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Leaderboard</h1>
                            <p className="mt-1 text-xs md:text-sm text-slate-500">
                                See who is leading in practice and competition challenges.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                            <button
                                type="button"
                                onClick={() => setMode("practice")}
                                className={[
                                    "rounded-full border px-3 py-1.5 transition-colors",
                                    mode === "practice"
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                                ].join(" ")}
                            >
                                Practice
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("competition")}
                                className={[
                                    "rounded-full border px-3 py-1.5 transition-colors",
                                    mode === "competition"
                                        ? "border-sky-600 bg-sky-600 text-white"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                                ].join(" ")}
                            >
                                Competition
                            </button>
                        </div>
                    </header>

                    {/* Filters */}
                    <section className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-4 md:px-5 md:py-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by username or email…"
                                className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />

                            {mode === "competition" && (
                                <select
                                    value={selectedContestId ?? ""}
                                    onChange={(e) => setSelectedContestId(e.target.value ? Number(e.target.value) : null)}
                                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All Contests</option>
                                    {contests.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <div className="ml-auto text-xs text-slate-500">
                                Showing <span className="font-medium text-slate-800">{filteredEntries.length}</span> players
                            </div>
                        </div>
                    </section>

                    {/* Loading / error */}
                    {loading && (
                        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            Loading leaderboard…
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <>
                            {filteredEntries.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-sm">
                                    No leaderboard data available.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Rank
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Player
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Score
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Solved
                                            </th>
                                            {mode === "competition" && (
                                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Contest
                                                </th>
                                            )}
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Last Submission
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredEntries.map((e) => (
                                            <tr key={`${e.userId ?? e.username}-${e.rank}`}>
                                                <td className="px-4 py-2 align-top text-sm font-semibold text-slate-900">#{e.rank}</td>
                                                <td className="px-4 py-2 align-top">
                                                    <div className="font-medium text-slate-900">{e.username}</div>
                                                    {e.email && <div className="text-xs text-slate-500">{e.email}</div>}
                                                </td>
                                                <td className="px-4 py-2 align-top text-sm text-slate-800">{e.score}</td>
                                                <td className="px-4 py-2 align-top text-sm text-slate-800">{e.solved}</td>
                                                {mode === "competition" && (
                                                    <td className="px-4 py-2 align-top text-xs text-slate-700">{e.contest_name || "—"}</td>
                                                )}
                                                <td className="px-4 py-2 align-top text-xs text-slate-500">
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
