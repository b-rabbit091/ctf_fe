import React, {useEffect, useMemo, useState, useCallback} from "react";
import Navbar from "../../components/Navbar";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../contexts/AuthContext";

import api from "../../api/axios";
import {getChallenges} from "../../api/practice";

type ContestType = "daily" | "weekly" | "monthly" | "custom";

type ContestDTO = {
    id: number;
    name: string;
    slug: string;
    description?: string;
    contest_type: ContestType;
    start_time: string;
    end_time: string;
    is_active: boolean;
    publish_result: boolean;
};

type ChallengeRow = {
    id: number;
    title: string;
    description: string;
    category?: { id: number; name: string } | null;
    difficulty?: { id: number; level: string } | null;
    question_type?: string | null; // "N/A" | "practice" | "competition"
};

const AdminCompetitionAssign: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    // Alerts
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const resetMessages = () => {
        setMessage(null);
        setError(null);
    };

    // Contest dropdown list + selected contest
    const [contests, setContests] = useState<ContestDTO[]>([]);
    const [selectedContestId, setSelectedContestId] = useState<number | "">("");

    // Draft search + selection
    const [loadingDrafts, setLoadingDrafts] = useState(true);
    const [drafts, setDrafts] = useState<ChallengeRow[]>([]);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [assigning, setAssigning] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Load contests (admin-only) - LIST ONLY (no create here)
    useEffect(() => {
        if (!user) return;

        let mounted = true;
        (async () => {
            try {
                const res = await api.get<ContestDTO[]>("/challenges/contests/");
                if (!mounted) return;
                setContests(res.data || []);

                if (!selectedContestId && res.data?.length) {
                    setSelectedContestId(res.data[0].id);
                }
            } catch (e) {
                if (!mounted) return;
                setError("Failed to load contests for dropdown.");
            }
        })();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Load unassigned drafts (question_type === "N/A")
    useEffect(() => {
        if (!user) return;

        let mounted = true;
        (async () => {
            setLoadingDrafts(true);
            try {
                const all = (await getChallenges()) as any[];
                if (!mounted) return;

                const unassigned = (all || []).filter((c) => (c?.question_type ?? "") === "N/A");
                setDrafts(unassigned);
            } catch (e) {
                if (!mounted) return;
                setError("Failed to load unassigned questions (question_type = N/A).");
            } finally {
                if (!mounted) return;
                setLoadingDrafts(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [user]);

    const filteredDrafts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return drafts;

        return drafts.filter((c) => {
            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();
            const diff = (c.difficulty?.level || "").toLowerCase();
            return title.includes(q) || desc.includes(q) || cat.includes(q) || diff.includes(q);
        });
    }, [drafts, search]);

    // ✅ checked ones float to top AFTER searching
    const sortedFilteredDrafts = useMemo(() => {
        const arr = [...filteredDrafts];
        arr.sort((a, b) => {
            const aSel = selectedIds.has(a.id) ? 1 : 0;
            const bSel = selectedIds.has(b.id) ? 1 : 0;
            if (aSel !== bSel) return bSel - aSel;
            return (b.id ?? 0) - (a.id ?? 0);
        });
        return arr;
    }, [filteredDrafts, selectedIds]);

    const total = sortedFilteredDrafts.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedFilteredDrafts.slice(start, start + pageSize);
    }, [sortedFilteredDrafts, page]);

    const toggleOne = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAllOnPage = useCallback(() => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const allSelected = pageItems.every((c) => next.has(c.id));
            if (allSelected) pageItems.forEach((c) => next.delete(c.id));
            else pageItems.forEach((c) => next.add(c.id));
            return next;
        });
    }, [pageItems]);

    const clearSelection = () => setSelectedIds(new Set());

    /**
     * ✅ Bulk assign selected drafts:
     * - adds challenges to contest (M2M)
     * - sets question_type="competition"
     *
     * PATCH /challenges/challenges/bulk-update/
     * payload: { ids: [...], contest_id: <id>, question_type: "competition" }
     */
    const handleAssignSelectedToContest = async () => {
        resetMessages();

        if (!selectedContestId) {
            setError("Please select a contest from the dropdown first.");
            return;
        }
        if (selectedIds.size === 0) {
            setError("Select at least one unassigned question.");
            return;
        }

        if (!window.confirm(`Assign ${selectedIds.size} question(s) to contest #${selectedContestId}?`)) return;

        setAssigning(true);
        try {
            const ids = Array.from(selectedIds);

            await api.patch("/challenges/challenges/bulk-update/", {
                ids,
                contest_id: selectedContestId,
                question_type: "competition",
            });

            // remove from this page (they are no longer N/A after assignment)
            setDrafts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
            clearSelection();
            setMessage("Questions assigned to contest and marked as competition.");
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.detail || "Bulk assign failed.");
        } finally {
            setAssigning(false);
            setTimeout(() => setMessage(null), 3500);
        }
    };

    // --- shell states ---
    if (!user) {
        return (
            <div className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                    <div className="w-full rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                    <p className="whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg font-normal text-rose-700 shadow-sm backdrop-blur-xl">
                        Unauthorized – admin access required.
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
            <Navbar/>

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/40 bg-white/40 px-6 py-5 backdrop-blur-xl">
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl sm:text-3xl font-normal text-slate-700 tracking-tight">
                                Assign Draft Questions to Contest
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-600">
                                Admin-only. Select an existing contest, then search & select unassigned questions (question_type = N/A) and attach them in bulk.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-xs text-slate-600">
                            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1">
                                Admin Panel
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1">
                                Total drafts: <span className="ml-1 text-slate-800">{total}</span>
                            </span>
                        </div>
                    </div>

                    {(error || message) && (
                        <div className="px-6 pt-4">
                            {error && (
                                <div className="mb-3 whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm sm:text-base text-emerald-800 shadow-sm backdrop-blur-xl">
                                    {message}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assign Drafts */}
                    <section className="px-6 py-6">
                        <div className="rounded-2xl border border-slate-200/70 bg-white/40 shadow-sm backdrop-blur-xl">
                            <div className="border-b border-white/40 bg-white/40 px-6 py-4 backdrop-blur-xl">
                                <h2 className="text-lg font-normal text-slate-700 tracking-tight">Assign Draft Questions</h2>
                                <p className="mt-1 text-sm text-slate-600">
                                    Select a contest, then search unassigned questions (question_type = N/A). Checked items float to the top.
                                </p>
                            </div>

                            <div className="px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex w-full items-center gap-3 md:w-auto">
                                    <div className="w-full md:w-[380px]">
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                                setPage(1);
                                            }}
                                            placeholder="Search drafts..."
                                            className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={toggleAllOnPage}
                                        className="h-10 rounded-xl border border-slate-200/70 bg-white/70 px-4 text-sm sm:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        Toggle page
                                    </button>

                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        className="h-10 rounded-xl border border-slate-200/70 bg-white/70 px-4 text-sm sm:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                    <select
                                        value={selectedContestId}
                                        onChange={(e) => setSelectedContestId(e.target.value ? Number(e.target.value) : "")}
                                        className="h-10 rounded-xl border border-slate-200/70 bg-white px-4 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        <option value="">Select contest…</option>
                                        {contests.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        disabled={assigning || selectedIds.size === 0 || !selectedContestId}
                                        onClick={handleAssignSelectedToContest}
                                        className={[
                                            "h-10 rounded-2xl border px-5 text-sm sm:text-base font-normal shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/15",
                                            assigning || selectedIds.size === 0 || !selectedContestId
                                                ? "cursor-not-allowed border-slate-200/70 bg-white/50 text-slate-300"
                                                : "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-50",
                                        ].join(" ")}
                                    >
                                        {assigning ? "Assigning..." : `Assign selected (${selectedIds.size})`}
                                    </button>

                                    <span className="inline-flex h-10 items-center rounded-xl border border-slate-200/70 bg-slate-100/70 px-4 text-sm sm:text-base text-slate-700">
                                        <span className="text-slate-500">Total:</span>
                                        <span className="ml-1 font-normal text-slate-800">{total}</span>
                                    </span>
                                </div>
                            </div>

                            {loadingDrafts ? (
                                <div className="px-6 pb-6">
                                    <div className="w-full rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                        Loading unassigned drafts…
                                    </div>
                                </div>
                            ) : total === 0 ? (
                                <div className="px-6 pb-8">
                                    <div className="rounded-2xl border border-white/30 bg-white/55 px-5 py-8 text-center text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                        No unassigned questions found (question_type = N/A).
                                    </div>
                                </div>
                            ) : (
                                <div className="px-6 pb-6">
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-xl">
                                        <table className="min-w-full divide-y divide-slate-200/70 text-sm sm:text-base">
                                            <thead className="bg-slate-50/70">
                                            <tr>
                                                <th className="w-12 px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                    Pick
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                    Title
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                    Category
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                    Difficulty
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                    Status
                                                </th>
                                            </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100/70 bg-white/60">
                                            {pageItems.map((c) => {
                                                const isSelected = selectedIds.has(c.id);
                                                return (
                                                    <tr key={c.id} className={isSelected ? "bg-emerald-50/40" : ""}>
                                                        <td className="px-4 py-3 align-top">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleOne(c.id)}
                                                                className="h-4 w-4 rounded border-slate-300"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="max-w-xl">
                                                                <div className="truncate font-normal text-slate-800">
                                                                    {c.title}
                                                                </div>
                                                                <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                                    {c.description}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 align-top text-slate-700">
                                                            {c.category?.name || "—"}
                                                        </td>
                                                        <td className="px-4 py-3 align-top text-slate-700">
                                                            {c.difficulty?.level || "N/A"}
                                                        </td>
                                                        <td className="px-4 py-3 align-top text-slate-700">
                                                            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm">
                                                                Draft (N/A)
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-600">
                                        <div>
                                            Page <span className="font-normal text-slate-800">{page}</span> of{" "}
                                            <span className="font-normal text-slate-800">{pageCount}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={page <= 1}
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-2 text-sm font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Prev
                                            </button>
                                            <button
                                                type="button"
                                                disabled={page >= pageCount}
                                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                                className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-2 text-sm font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default AdminCompetitionAssign;
