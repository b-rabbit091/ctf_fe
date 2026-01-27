import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {bulkUpdateChallenges, getChallenges} from "../../api/practice";
import {Challenge} from "../CompetitionPage/types";
import {FiCheckSquare, FiSquare} from "react-icons/fi";

const AdminDraftAssignPracticeList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [allDrafts, setAllDrafts] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const [page, setPage] = useState(1);
    const pageSize = 10;

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    // Fetch WITHOUT filters; then filter question_type === "N/A"
    useEffect(() => {
        if (!user) return;

        let mounted = true;

        const fetchDrafts = async () => {
            setLoading(true);
            setError(null);
            try {
                const chals = await getChallenges(); // no filters
                if (!mounted) return;

                const draftsOnly = (chals || []).filter((c: any) => (c?.question_type ?? "") === "N/A");
                setAllDrafts(draftsOnly);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load drafted questions (question_type = N/A). Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchDrafts();
        return () => {
            mounted = false;
        };
    }, [user]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allDrafts;

        return allDrafts.filter((c: any) => {
            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();
            return title.includes(q) || desc.includes(q) || cat.includes(q);
        });
    }, [allDrafts, search]);

    // ✅ Selected items float to top AFTER searching is applied
    const sortedFiltered = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const aSel = selectedIds.has(a.id) ? 1 : 0;
            const bSel = selectedIds.has(b.id) ? 1 : 0;
            if (aSel !== bSel) return bSel - aSel; // selected first
            return (b.id ?? 0) - (a.id ?? 0); // tie-break: newest first by id
        });
        return arr;
    }, [filtered, selectedIds]);

    const total = sortedFiltered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedFiltered.slice(start, start + pageSize);
    }, [sortedFiltered, page]);

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
            if (allSelected) {
                pageItems.forEach((c) => next.delete(c.id));
            } else {
                pageItems.forEach((c) => next.add(c.id));
            }
            return next;
        });
    }, [pageItems]);

    const clearSelection = () => setSelectedIds(new Set());

    const selectedCount = selectedIds.size;

    const handleAssignToPractice = useCallback(async () => {
        if (!user || user.role !== "admin") {
            setMessage("Unauthorized: admin only.");
            return;
        }
        if (selectedIds.size === 0) return;

        if (!window.confirm(`Assign ${selectedIds.size} draft question(s) as PRACTICE?`)) return;

        setError(null);
        setMessage("Assigning selected drafts as practice...");

        const ids = Array.from(selectedIds);

        try {
            await bulkUpdateChallenges({
                ids,
                question_type: "practice",
                contest_id: null,
            });

            setAllDrafts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
            clearSelection();

            setMessage("Assigned successfully.");
        } catch (e: any) {
            console.error(e);
            setError(e?.message || "Failed to assign drafts as practice.");
            setMessage(null);
        } finally {
            setTimeout(() => setMessage(null), 3500);
        }
    }, [selectedIds, user]);

    // --- full-screen responsive shell for all states ---
    if (!user) {
        return (
            <div
                className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                    <div
                        className="w-full rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div
                className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
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
        <div
            className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
            <Navbar/>

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    <div
                        className="w-full rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        {/* Header */}
                        <div
                            className="flex flex-wrap items-start justify-between gap-4 border-b border-white/40 bg-white/40 px-6 py-5 backdrop-blur-xl">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl sm:text-3xl font-normal text-slate-700 tracking-tight">
                                    Assign Drafts → Practice
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-600">
                                    This page lists only drafts where{" "}
                                    <span className="font-normal text-slate-700">question_type = N/A</span>. Select
                                    drafts and assign them as practice questions.
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <button
                                    type="button"
                                    disabled={selectedCount === 0 || loading}
                                    onClick={handleAssignToPractice}
                                    className={[
                                        "inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm sm:text-base font-normal shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/15",
                                        selectedCount === 0 || loading
                                            ? "cursor-not-allowed border-slate-200/70 bg-white/50 text-slate-300"
                                            : "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-50",
                                    ].join(" ")}
                                >
                                    Assign these as practice question
                                    {selectedCount > 0 && (
                                        <span
                                            className="ml-1 inline-flex items-center rounded-full border border-emerald-200/60 bg-white/40 px-2 py-0.5 text-xs text-emerald-700">
                                            {selectedCount}
                                        </span>
                                    )}
                                </button>

                                <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-600">
                                    <span
                                        className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1">
                                        Total: <span className="ml-1 text-slate-800">{total}</span>
                                    </span>
                                    <span
                                        className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1">
                                        Selected: <span className="ml-1 text-slate-800">{selectedCount}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6">
                            {/* Search + selection controls */}
                            <section
                                className="mb-4 rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-xl">
                                <div
                                    className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex w-full items-center gap-3 md:w-auto">
                                        <div className="relative w-full md:w-[420px]">
                                            <input
                                                type="search"
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value);
                                                    setPage(1);
                                                }}
                                                placeholder="Search drafts by title, description, category..."
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
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch("");
                                                setPage(1);
                                            }}
                                            className="h-10 rounded-xl border border-slate-200/70 bg-white/70 px-4 text-sm sm:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                        >
                                            Reset search
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {loading && (
                                <div
                                    className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    Loading drafts…
                                </div>
                            )}
                            {error && (
                                <div
                                    className="mb-4 whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div
                                    className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm sm:text-base text-emerald-800 shadow-sm backdrop-blur-xl">
                                    {message}
                                </div>
                            )}

                            {!loading && !error && (
                                <>
                                    {total === 0 ? (
                                        <div
                                            className="rounded-2xl border border-white/30 bg-white/55 px-5 py-8 text-center text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                            No drafts found with question_type = N/A.
                                        </div>
                                    ) : (
                                        <div
                                            className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-xl">
                                            <table
                                                className="min-w-full divide-y divide-slate-200/70 text-sm sm:text-base">
                                                <thead className="bg-slate-50/70">
                                                <tr>
                                                    <th className="w-12 px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                        Select
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
                                                {pageItems.map((c: any) => {
                                                    const isSelected = selectedIds.has(c.id);
                                                    return (
                                                        <tr key={c.id} className={isSelected ? "bg-emerald-50/40" : ""}>
                                                            <td className="px-4 py-3 align-top">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleOne(c.id)}
                                                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200/70 bg-white/70 p-2 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                                    aria-label={isSelected ? "Unselect" : "Select"}
                                                                >
                                                                    {isSelected ? <FiCheckSquare size={18}/> :
                                                                        <FiSquare size={18}/>}
                                                                </button>
                                                            </td>

                                                            <td className="px-4 py-3 align-top">
                                                                <div className="max-w-xl">
                                                                    <div
                                                                        className="truncate font-normal text-slate-800 text-sm sm:text-base">
                                                                        {c.title}
                                                                    </div>
                                                                    <div
                                                                        className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                                        {c.description}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-700">
                                                                {c.category?.name || "—"}
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-700">
                                                                {c.difficulty?.level || "N/A"}
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-700">
                                                                <span
                                                                    className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm">
                                                                    Draft (N/A)
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {total > 0 && (
                                        <div
                                            className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-600">
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
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminDraftAssignPracticeList;
