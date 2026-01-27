// src/pages/AdminDraftQuestionsList/AdminDraftQuestionsList.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { bulkUpdateChallenges, getChallenges, deleteChallenge } from "../../api/practice";
import { Challenge } from "../CompetitionPage/types";
import { FiCheckSquare, FiSquare, FiEdit3, FiPlus, FiTrash2 } from "react-icons/fi";

/** Debounce hook (same idea as CompetitionList) */
function useDebouncedValue<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

/** LeetCode-like difficulty tag options */
const DIFFICULTY_TAGS = ["Easy", "Medium", "Hard"] as const;
type DifficultyFilter = "" | (typeof DIFFICULTY_TAGS)[number];

const AdminDraftQuestionsList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 350);

    // NEW: difficulty filter chip row (same style family as CompetitionList tags)
    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("");

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const [page, setPage] = useState(1);
    const pageSize = 10;

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    // Fetch all challenges
    useEffect(() => {
        if (!user) return;

        let mounted = true;

        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            try {
                const chals = await getChallenges();
                if (!mounted) return;
                setAllChallenges(chals || []);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load questions. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchAll();
        return () => {
            mounted = false;
        };
    }, [user]);

    const filtered = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();

        return allChallenges.filter((c: any) => {
            if (difficultyFilter) {
                const d = String(c?.difficulty?.level ?? "");
                if (d !== difficultyFilter) return false;
            }

            if (!q) return true;

            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();
            const qt = String(c?.question_type ?? "").toLowerCase();
            const diff = String(c?.difficulty?.level ?? "").toLowerCase();

            return (
                title.includes(q) ||
                desc.includes(q) ||
                cat.includes(q) ||
                qt.includes(q) ||
                diff.includes(q)
            );
        });
    }, [allChallenges, debouncedSearch, difficultyFilter]);

    // Selected items float to top
    const sortedFiltered = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a: any, b: any) => {
            const aSel = selectedIds.has(a.id) ? 1 : 0;
            const bSel = selectedIds.has(b.id) ? 1 : 0;
            if (aSel !== bSel) return bSel - aSel;
            return (b.id ?? 0) - (a.id ?? 0);
        });
        return arr;
    }, [filtered, selectedIds]);

    const total = sortedFiltered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

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
            const allSelected = pageItems.every((c: any) => next.has(c.id));
            if (allSelected) pageItems.forEach((c: any) => next.delete(c.id));
            else pageItems.forEach((c: any) => next.add(c.id));
            return next;
        });
    }, [pageItems]);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
    const selectedCount = selectedIds.size;

    const badge = (qtRaw: any) => {
        const qt = String(qtRaw ?? "N/A");
        if (qt === "practice") {
            return (
                <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-emerald-700">
          Practice
        </span>
            );
        }
        if (qt === "competition") {
            return (
                <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-sky-700">
          Competition
        </span>
            );
        }
        return (
            <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-slate-600">
        N/A
      </span>
        );
    };

    // Tag chip: same vibe as CompetitionList (pleasant blue when active)
    const tagClass = (active: boolean) =>
        [
            "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        ].join(" ");

    const handleAssignSelectedToNA = useCallback(async () => {
        if (!user || user.role !== "admin") {
            setMessage("Unauthorized: admin only.");
            return;
        }
        if (selectedIds.size === 0) return;

        if (!window.confirm(`Assign ${selectedIds.size} selected question(s) to question_type = N/A?`)) return;

        setError(null);
        setMessage("Updating selected questions to N/A...");

        const ids = Array.from(selectedIds);

        try {
            await bulkUpdateChallenges({
                ids,
                question_type: "N/A",
                contest_id: null,

            });

            setAllChallenges((prev: any[]) =>
                prev.map((c) => (selectedIds.has(c.id) ? { ...c, question_type: "N/A" } : c))
            );
            clearSelection();
            setMessage("Updated successfully.");
        } catch (e: any) {
            console.error(e);
            setError(e?.message || "Failed to update questions to N/A.");
            setMessage(null);
        } finally {
            setTimeout(() => setMessage(null), 3500);
        }
    }, [selectedIds, user, clearSelection]);

    const handleNewDraft = useCallback(() => {
        navigate("/admin/drafts/new");
    }, [navigate]);

    const handleEdit = useCallback(
        (id: number) => {
            navigate(`/admin/drafts/${id}`);
        },
        [navigate]
    );

    const handleDelete = useCallback(
        async (id: number) => {
            if (!user || user.role !== "admin") return;
            if (!window.confirm(`Delete #${id}? This cannot be undone.`)) return;

            setError(null);
            setMessage("Deleting...");

            try {
                await deleteChallenge(id);
                setAllChallenges((prev) => prev.filter((c: any) => c.id !== id));
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
                setMessage("Deleted successfully.");
            } catch (e: any) {
                console.error(e);
                setError(e?.message || "Failed to delete.");
                setMessage(null);
            } finally {
                setTimeout(() => setMessage(null), 3500);
            }
        },
        [user]
    );

    // Guard states (match CompetitionList vibe)
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar />
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
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                    <div className="w-full rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-rose-700 shadow-sm backdrop-blur-xl">
                        Unauthorized – admin access required.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full">
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight">
                                Admin Draft Questions
                            </h1>
                            <p className="mt-1 text-sm sm:text-base md:text-lg text-slate-600">
                                Select questions and bulk set <span className="text-slate-700">question_type = N/A</span>.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleNewDraft}
                                className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-blue-50/70 px-5 py-2.5 text-sm sm:text-base md:text-lg font-normal text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                            >
                                <FiPlus />
                                New draft
                            </button>

                            <button
                                type="button"
                                disabled={selectedCount === 0 || loading}
                                onClick={handleAssignSelectedToNA}
                                className={[
                                    "inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm sm:text-base md:text-lg font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/15",
                                    selectedCount === 0 || loading
                                        ? "cursor-not-allowed border-slate-200/70 bg-white/60 text-slate-400"
                                        : "border-slate-200/70 bg-white/70 text-slate-700 hover:bg-white/90",
                                ].join(" ")}
                            >
                                Assign selected as N/A
                                {selectedCount > 0 && (
                                    <span className="ml-1 inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-2.5 py-0.5 text-xs font-normal text-slate-600">
                    {selectedCount}
                  </span>
                                )}
                            </button>
                        </div>
                    </header>

                    {/* Filters panel (same style as CompetitionList) */}
                    <section className="mb-6 rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        <div className="px-4 py-4 space-y-3">
                            {/* Row 1: search + difficulty dropdown + reset */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[260px] flex-1 max-w-[720px]">
                                    <label className="sr-only" htmlFor="draft-search">
                                        Search draft questions
                                    </label>
                                    <input
                                        id="draft-search"
                                        type="search"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search title, description, category, question type, difficulty..."
                                        className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>


                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        setDifficultyFilter("");
                                        clearSelection();
                                        setPage(1);
                                    }}
                                    className="h-10 shrink-0 rounded-xl border border-slate-200/70 bg-white/80 px-4 text-sm sm:text-base font-normal text-slate-600 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Row 2: difficulty chips + selection helpers */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                    Difficulty
                  </span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDifficultyFilter("");
                                            setPage(1);
                                        }}
                                        className={tagClass(!difficultyFilter)}
                                    >
                                        All
                                    </button>

                                    {DIFFICULTY_TAGS.map((d) => {
                                        const active = difficultyFilter === d;
                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => {
                                                    setDifficultyFilter(active ? "" : (d as DifficultyFilter));
                                                    setPage(1);
                                                }}
                                                className={tagClass(active)}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>

                                <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1" />

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={toggleAllOnPage}
                                        className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        Toggle page
                                    </button>

                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        Clear
                                    </button>

                                    <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-2 text-xs sm:text-sm text-slate-600">
                    <span className="text-slate-500">Total:</span>
                    <span className="ml-1">{total}</span>
                  </span>

                                    <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-2 text-xs sm:text-sm text-slate-600">
                    <span className="text-slate-500">Selected:</span>
                    <span className="ml-1">{selectedCount}</span>
                  </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {loading && (
                        <div className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            Loading questions…
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-rose-700 shadow-sm backdrop-blur-xl whitespace-pre-line">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-sky-700 shadow-sm backdrop-blur-xl">
                            {message}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div className="rounded-2xl border border-white/30 bg-white/55 px-6 py-12 text-center text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <div className="text-base md:text-lg font-normal text-slate-700">No matches</div>
                                    <div className="mt-1 text-sm md:text-base text-slate-600">
                                        No draft questions match your filters. Try resetting or broadening your search.
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <table className="min-w-full divide-y divide-slate-200/70 text-sm sm:text-base">
                                        <thead className="bg-white/40">
                                        <tr>
                                            <th className="w-12 px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Select
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Category
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Difficulty
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Question Type
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-200/60 bg-transparent">
                                        {pageItems.map((c: any) => {
                                            const isSelected = selectedIds.has(c.id);

                                            return (
                                                <tr key={c.id} className={isSelected ? "bg-white/50" : "bg-transparent"}>
                                                    <td className="px-4 py-3 align-top">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleOne(c.id)}
                                                            className="inline-flex items-center justify-center rounded-xl border border-slate-200/70 bg-white/70 p-2 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                            aria-label={isSelected ? "Unselect" : "Select"}
                                                        >
                                                            {isSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                                                        </button>
                                                    </td>

                                                    <td className="px-4 py-3 align-top">
                                                        <div className="max-w-xl">
                                                            <div className="truncate font-normal text-slate-700 text-sm sm:text-base md:text-lg">
                                                                {c.title}
                                                            </div>
                                                            <div className="mt-1 line-clamp-2 text-sm sm:text-base text-slate-600">
                                                                {c.description}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-600">
                                                        {c.category?.name || "—"}
                                                    </td>

                                                    <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-600">
                                                        {c.difficulty?.level || "—"}
                                                    </td>

                                                    <td className="px-4 py-3 align-top">{badge(c?.question_type)}</td>

                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(c.id)}
                                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-xs sm:text-sm md:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                            >
                                                                <FiEdit3 />
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(c.id)}
                                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-2 text-xs sm:text-sm md:text-base font-normal text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
                                                            >
                                                                <FiTrash2 />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {total > 0 && (
                                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <div>
                                        Page <span className="text-slate-700">{page}</span> of{" "}
                                        <span className="text-slate-700">{pageCount}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                        >
                                            Prev
                                        </button>

                                        <button
                                            type="button"
                                            disabled={page >= pageCount}
                                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                            className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                        >
                                            Next
                                        </button>
                                    </div>

                                    <div className="text-slate-600">
                                        Showing{" "}
                                        <span className="text-slate-700">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> –{" "}
                                        <span className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                        <span className="text-slate-700">{total}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDraftQuestionsList;
