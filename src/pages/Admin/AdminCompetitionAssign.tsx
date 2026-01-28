import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Navbar from "../../components/Navbar";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../contexts/AuthContext";

import api from "../../api/axios";
import {getChallenges} from "../../api/practice";

import {FiAlertCircle, FiInfo} from "react-icons/fi";
import { motion } from "framer-motion";

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

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const AdminCompetitionAssign: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

    // Alerts
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [contests, setContests] = useState<ContestDTO[]>([]);
    const [selectedContestId, setSelectedContestId] = useState<number | "">("");

    const [loadingDrafts, setLoadingDrafts] = useState(true);
    const [drafts, setDrafts] = useState<ChallengeRow[]>([]);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [assigning, setAssigning] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // lifecycle guards
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    // prevent double submits
    const busyRef = useRef(false);

    const resetMessages = useCallback(() => {
        setMessage(null);
        setError(null);
    }, []);

    const flashMessage = useCallback((text: string | null) => {
        setMessage(text);
        if (!text) return;
        window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, 3500);
    }, []);

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    // Load contests (admin-only)
    const fetchContests = useCallback(async () => {
        if (!user) return;
        if (user.role !== "admin") return;

        try {
            const res = await api.get<ContestDTO[]>("/challenges/contests/");
            if (!alive.current) return;

            const list = Array.isArray(res.data) ? res.data : [];
            setContests(list);

            // keep current selection if still exists; otherwise pick first
            setSelectedContestId((prev) => {
                if (prev && list.some((c) => c.id === prev)) return prev;
                return list.length ? list[0].id : "";
            });
        } catch (e) {
            if (!alive.current) return;
            setError("Failed to load contests for dropdown.");
        }
    }, [user]);

    // Load unassigned drafts (question_type === "N/A")
    const fetchDrafts = useCallback(async () => {
        if (!user) return;
        if (user.role !== "admin") return;

        setLoadingDrafts(true);
        try {
            const all = (await getChallenges()) as any[];
            if (!alive.current) return;

            const unassigned = (all || []).filter((c) => (c?.question_type ?? "") === "N/A");
            setDrafts(unassigned);
        } catch (e) {
            if (!alive.current) return;
            setError("Failed to load unassigned questions (question_type = N/A).");
        } finally {
            if (!alive.current) return;
            setLoadingDrafts(false);
        }
    }, [user]);

    useEffect(() => {
        fetchContests();
        fetchDrafts();
    }, [fetchContests, fetchDrafts]);

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

    // checked ones float to top AFTER searching
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

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

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
            const allSelected = pageItems.length > 0 && pageItems.every((c) => next.has(c.id));
            if (allSelected) pageItems.forEach((c) => next.delete(c.id));
            else pageItems.forEach((c) => next.add(c.id));
            return next;
        });
    }, [pageItems]);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    /**
     * Bulk assign selected drafts:
     * PATCH /challenges/challenges/bulk-update/
     * payload: { ids: [...], contest_id: <id>, question_type: "competition" }
     */
    const handleAssignSelectedToContest = useCallback(async () => {
        resetMessages();

        if (!user || user.role !== "admin") {
            setError("Unauthorized: admin only.");
            return;
        }
        if (!selectedContestId) {
            setError("Please select a contest from the dropdown first.");
            return;
        }
        if (selectedIds.size === 0) {
            setError("Select at least one unassigned question.");
            return;
        }
        if (busyRef.current) return;

        const ok = window.confirm(`Assign ${selectedIds.size} question(s) to contest #${selectedContestId}?`);
        if (!ok) return;

        busyRef.current = true;
        setAssigning(true);

        try {
            const ids = Array.from(selectedIds);

            await api.patch("/challenges/challenges/bulk-update/", {
                ids,
                contest_id: selectedContestId,
                question_type: "competition",
            });

            if (!alive.current) return;

            // remove from list (they are no longer N/A)
            setDrafts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
            clearSelection();
            flashMessage("Questions assigned to contest and marked as competition.");
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;
            setError(e?.response?.data?.detail || "Bulk assign failed.");
        } finally {
            busyRef.current = false;
            if (!alive.current) return;
            setAssigning(false);
        }
    }, [resetMessages, user, selectedContestId, selectedIds, clearSelection, flashMessage]);

    // --- shell states (match AdminPracticeList) ---
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Unauthorized</p>
                                <p className="mt-1 text-sm text-rose-700/90">Admin access required.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                Assign Draft Questions to Contest
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-500">
                                Admin-only. Select a contest, then search & select unassigned questions (question_type = N/A) and attach them in bulk.
                            </p>
                        </div>

                        <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                            <span className="text-slate-500">Total drafts:</span>
                            <span className="ml-1">{total}</span>
                        </span>
                    </header>

                    {error ? (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-normal tracking-tight">Action failed</p>
                                    <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {message ? (
                        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800">
                            {message}
                        </div>
                    ) : null}

                    {/* Controls */}
                    <section className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
                        <div className="px-4 sm:px-5 py-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[240px] flex-1">
                                    <label className="sr-only" htmlFor="draft-search">
                                        Search drafts
                                    </label>
                                    <input
                                        id="draft-search"
                                        type="search"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search drafts by title, description, category, difficulty…"
                                        className={cx(
                                            "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={toggleAllOnPage}
                                    className={cx(
                                        "h-10 shrink-0 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                        "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    Toggle page
                                </button>

                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className={cx(
                                        "h-10 shrink-0 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                        "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    Clear
                                </button>

                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="sr-only" htmlFor="contest-select">
                                        Select contest
                                    </label>
                                    <select
                                        id="contest-select"
                                        value={selectedContestId}
                                        onChange={(e) => setSelectedContestId(e.target.value ? Number(e.target.value) : "")}
                                        className={cx(
                                            "h-10 w-[220px] max-w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
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
                                        className={cx(
                                            "h-10 shrink-0 rounded-xl bg-white/70 px-5 text-sm sm:text-base font-normal tracking-tight",
                                            assigning || selectedIds.size === 0 || !selectedContestId
                                                ? "cursor-not-allowed ring-1 ring-slate-200/60 text-slate-300"
                                                : "ring-1 ring-emerald-200/60 text-emerald-700 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        {assigning ? "Assigning..." : `Assign selected (${selectedIds.size})`}
                                    </button>
                                </div>

                                <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                    <span className="text-slate-500">Selected:</span>
                                    <span className="ml-1">{selectedIds.size}</span>
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Table */}
                    {loadingDrafts ? (
                        <div className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                                <div className="min-w-0 space-y-2">
                                    <div className="h-4 w-52 bg-slate-200/80 rounded animate-pulse" />
                                    <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </div>
                            <p className="mt-3 text-center text-sm text-slate-500">Loading unassigned drafts…</p>
                        </div>
                    ) : total === 0 ? (
                        <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                            <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                <FiInfo className="text-slate-500" />
                            </div>
                            <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                No unassigned questions
                            </div>
                            <div className="mt-1 text-sm sm:text-base text-slate-500">
                                Nothing is currently marked as question_type = N/A.
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                <table className="min-w-full text-sm sm:text-base">
                                    <thead className="bg-white/40 sticky top-0">
                                    <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="w-14 px-4 py-3 font-normal">Pick</th>
                                        <th className="px-4 py-3 font-normal">Title</th>
                                        <th className="px-4 py-3 font-normal">Category</th>
                                        <th className="px-4 py-3 font-normal">Difficulty</th>
                                        <th className="px-4 py-3 font-normal">Status</th>
                                    </tr>
                                    </thead>

                                    <tbody className="bg-transparent">
                                    {pageItems.map((c) => {
                                        const isSelected = selectedIds.has(c.id);
                                        return (
                                            <tr
                                                key={c.id}
                                                className={cx(
                                                    "border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition",
                                                    isSelected && "bg-emerald-50/40"
                                                )}
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleOne(c.id)}
                                                        className="h-4 w-4 rounded border-slate-300"
                                                        aria-label={`Select ${c.title}`}
                                                    />
                                                </td>

                                                <td className="px-4 py-3 align-top">
                                                    <div className="max-w-[34rem]">
                                                        <div className="truncate font-normal tracking-tight text-slate-700">
                                                            {c.title}
                                                        </div>
                                                        <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                            {c.description}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-600">
                                                    {c.category?.name || "—"}
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-600">
                                                    {c.difficulty?.level || "N/A"}
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-600">
                                                        <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm">
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
                            <div className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-sm sm:text-base text-slate-600">
                                        Page <span className="text-slate-700">{page}</span> of{" "}
                                        <span className="text-slate-700">{pageCount}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className={cx(
                                                "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                                "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                                focusRing
                                            )}
                                        >
                                            Prev
                                        </button>

                                        <button
                                            type="button"
                                            disabled={page >= pageCount}
                                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
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
                                        Showing{" "}
                                        <span className="text-slate-700">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>{" "}
                                        – <span className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                        <span className="text-slate-700">{total}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default AdminCompetitionAssign;
