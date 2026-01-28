// src/pages/AdminDraftQuestionsList/AdminDraftQuestionsList.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {bulkUpdateChallenges, deleteChallenge, getChallenges} from "../../api/practice";
import type {Challenge} from "../CompetitionPage/types";
import {FiAlertCircle, FiCheckSquare, FiEdit3, FiInfo, FiPlus, FiRefreshCw, FiSquare, FiTrash2} from "react-icons/fi";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

/** Debounce hook */
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

function safeLower(v: unknown) {
    return String(v ?? "").toLowerCase();
}

function safeString(v: unknown, fallback = "—") {
    return typeof v === "string" && v.trim() ? v : fallback;
}

function safeId(v: unknown): number | null {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

const tagClass = (active: boolean) =>
    cx(
        "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
        focusRing,
        active
            ? "border-sky-200/70 bg-sky-50 text-sky-700"
            : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90"
    );

const badge = (qtRaw: any) => {
    const qt = String(qtRaw ?? "N/A");
    if (qt === "practice") {
        return (
            <span
                className="inline-flex items-center rounded-full ring-1 ring-emerald-200/60 bg-emerald-100/70 px-3 py-1 text-xs sm:text-sm font-normal text-emerald-700">
        Practice
      </span>
        );
    }
    if (qt === "competition") {
        return (
            <span
                className="inline-flex items-center rounded-full ring-1 ring-sky-200/60 bg-sky-100/70 px-3 py-1 text-xs sm:text-sm font-normal text-sky-700">
        Competition
      </span>
        );
    }
    return (
        <span
            className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm font-normal text-slate-600">
      N/A
    </span>
    );
};

const AdminDraftQuestionsList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 350);

    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("");

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const [page, setPage] = useState(1);
    const pageSize = 10;

    // prevent state updates after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    // prevent double submit
    const [busy, setBusy] = useState<null | "refresh" | "bulk" | "delete">(null);

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    const fetchAll = useCallback(async () => {
        if (!user) return;
        if (user.role !== "admin") return;

        setBusy("refresh");
        setLoading(true);
        setError(null);

        try {
            const chals = await getChallenges();
            if (!alive.current) return;

            setAllChallenges(Array.isArray(chals) ? chals : []);
        } catch (e) {
            console.error(e);
            if (!alive.current) return;
            setError("Failed to load questions. Please try again.");
            setAllChallenges([]);
        } finally {
            if (!alive.current) return;
            setBusy(null);
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();

        return allChallenges.filter((c: any) => {
            if (difficultyFilter) {
                const d = String(c?.difficulty?.level ?? "");
                if (d !== difficultyFilter) return false;
            }

            if (!q) return true;

            const title = safeLower(c?.title);
            const desc = safeLower(c?.description);
            const cat = safeLower(c?.category?.name);
            const qt = safeLower(c?.question_type);
            const diff = safeLower(c?.difficulty?.level);

            return title.includes(q) || desc.includes(q) || cat.includes(q) || qt.includes(q) || diff.includes(q);
        });
    }, [allChallenges, debouncedSearch, difficultyFilter]);

    // Selected items float to top
    const sortedFiltered = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a: any, b: any) => {
            const aId = safeId(a?.id) ?? -1;
            const bId = safeId(b?.id) ?? -1;

            const aSel = selectedIds.has(aId) ? 1 : 0;
            const bSel = selectedIds.has(bId) ? 1 : 0;
            if (aSel !== bSel) return bSel - aSel;
            return bId - aId;
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
            const ids = pageItems.map((c: any) => safeId(c?.id)).filter((x): x is number => x != null);
            const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
            if (allSelected) ids.forEach((id) => next.delete(id));
            else ids.forEach((id) => next.add(id));
            return next;
        });
    }, [pageItems]);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
    const selectedCount = selectedIds.size;

    const flashMessage = useCallback((text: string | null) => {
        setMessage(text);
        if (!text) return;
        window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, 3500);
    }, []);

    const handleAssignSelectedToNA = useCallback(async () => {
        if (!user || user.role !== "admin") {
            flashMessage("Unauthorized: admin only.");
            return;
        }
        if (selectedIds.size === 0) return;
        if (busy) return;

        if (!window.confirm(`Assign ${selectedIds.size} selected question(s) to question_type = N/A?`)) return;

        setError(null);
        flashMessage("Updating selected questions to N/A...");
        setBusy("bulk");

        const ids = Array.from(selectedIds);

        try {
            await bulkUpdateChallenges({
                ids,
                question_type: "N/A",
                contest_id: null,
            });

            if (!alive.current) return;

            setAllChallenges((prev: any[]) =>
                prev.map((c) =>
                    selectedIds.has(c.id) ? {...c, question_type: "N/A"} : c
                )
            );
            clearSelection();
            flashMessage("Updated successfully.");
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;
            setError(e?.message || "Failed to update questions to N/A.");
            setMessage(null);
        } finally {
            if (!alive.current) return;
            setBusy(null);
        }
    }, [selectedIds, user, clearSelection, busy, flashMessage]);

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
            if (busy) return;
            if (!window.confirm(`Delete #${id}? This cannot be undone.`)) return;

            setError(null);
            flashMessage("Deleting...");
            setBusy("delete");

            try {
                await deleteChallenge(id);
                if (!alive.current) return;

                setAllChallenges((prev) => prev.filter((c: any) => c.id !== id));
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
                flashMessage("Deleted successfully.");
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;
                setError(e?.message || "Failed to delete.");
                setMessage(null);
            } finally {
                if (!alive.current) return;
                setBusy(null);
            }
        },
        [user, busy, flashMessage]
    );

    // Guard states
    if (!user) {
        return (
            <div
                className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar/>
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div
                        className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div
                className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar/>
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
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

    const allSelectedOnPage = pageItems.length > 0 && pageItems.every((c: any) => selectedIds.has(Number(c.id)));

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar/>

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <div className="w-full">
                    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                Admin Draft Questions
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-500">
                                Select questions and bulk set <span
                                className="text-slate-700">question_type = N/A</span>.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleNewDraft}
                                className={cx(
                                    "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                                    "ring-1 ring-sky-200/60 text-sky-700 hover:bg-white/90",
                                    focusRing
                                )}
                            >
                                <FiPlus/>
                                New draft
                            </button>

                            <button
                                type="button"
                                onClick={fetchAll}
                                disabled={busy === "refresh" || loading}
                                className={cx(
                                    "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                                    "ring-1 ring-slate-200/60 hover:bg-white/90 disabled:opacity-60",
                                    focusRing
                                )}
                                aria-label="Refresh questions"
                                title="Refresh"
                            >
                                <FiRefreshCw className={busy === "refresh" || loading ? "animate-spin" : ""} size={16}/>
                                Refresh
                            </button>

                            <button
                                type="button"
                                disabled={selectedCount === 0 || loading || !!busy}
                                onClick={handleAssignSelectedToNA}
                                className={cx(
                                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-normal tracking-tight",
                                    "ring-1",
                                    selectedCount === 0 || loading || !!busy
                                        ? "cursor-not-allowed ring-slate-200/60 bg-white/60 text-slate-400"
                                        : "ring-slate-200/60 bg-white/70 text-slate-700 hover:bg-white/90",
                                    focusRing
                                )}
                            >
                                Assign selected as N/A
                                {selectedCount > 0 ? (
                                    <span
                                        className="ml-1 inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-2.5 py-0.5 text-xs font-normal text-slate-600">
                    {selectedCount}
                  </span>
                                ) : null}
                            </button>
                        </div>
                    </header>

                    {/* Filters panel */}
                    <section
                        className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
                        <div className="px-4 sm:px-5 py-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[240px] flex-1">
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
                                        className={cx(
                                            "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
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
                                    className={cx(
                                        "h-10 shrink-0 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                        "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    Reset
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                  <span
                      className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                    Difficulty
                  </span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDifficultyFilter("");
                                            setPage(1);
                                        }}
                                        className={tagClass(!difficultyFilter)}
                                        aria-pressed={!difficultyFilter}
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
                                                aria-pressed={active}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>

                                <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1"/>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={toggleAllOnPage}
                                        className={cx(
                                            "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                            focusRing
                                        )}
                                        title="Toggle selection for current page"
                                    >
                                        {allSelectedOnPage ? "Unselect page" : "Select page"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={clearSelection}
                                        disabled={selectedCount === 0}
                                        className={cx(
                                            "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed",
                                            focusRing
                                        )}
                                    >
                                        Clear
                                    </button>

                                    <span
                                        className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-2 text-xs sm:text-sm text-slate-600">
                    <span className="text-slate-500">Total:</span>
                    <span className="ml-1">{total}</span>
                  </span>

                                    <span
                                        className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-2 text-xs sm:text-sm text-slate-600">
                    <span className="text-slate-500">Selected:</span>
                    <span className="ml-1">{selectedCount}</span>
                  </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Banners */}
                    {loading ? (
                        <div
                            className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0"/>
                                <div className="min-w-0 space-y-2">
                                    <div className="h-4 w-44 bg-slate-200/80 rounded animate-pulse"/>
                                    <div className="h-4 w-72 bg-slate-100 rounded animate-pulse"/>
                                </div>
                            </div>
                            <p className="mt-3 text-center text-sm text-slate-500">Loading questions…</p>
                        </div>
                    ) : null}

                    {error ? (
                        <div
                            className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700 whitespace-pre-line">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 shrink-0"/>
                                <div className="min-w-0">
                                    <p className="font-normal tracking-tight">Something went wrong</p>
                                    <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {message ? (
                        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sky-700">
                            {message}
                        </div>
                    ) : null}

                    {/* Table */}
                    {!loading && !error ? (
                        <>
                            {total === 0 ? (
                                <div
                                    className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                    <div
                                        className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                        <FiInfo className="text-slate-500"/>
                                    </div>
                                    <div
                                        className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                        No matches
                                    </div>
                                    <div className="mt-1 text-sm sm:text-base text-slate-500">
                                        No draft questions match your filters. Try resetting or broadening your search.
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                    <table className="min-w-full text-sm sm:text-base">
                                        <thead className="bg-white/40 sticky top-0">
                                        <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                            <th className="w-12 px-4 py-3 font-normal">Select</th>
                                            <th className="px-4 py-3 font-normal">Title</th>
                                            <th className="px-4 py-3 font-normal">Category</th>
                                            <th className="px-4 py-3 font-normal">Difficulty</th>
                                            <th className="px-4 py-3 font-normal">Question Type</th>
                                            <th className="px-4 py-3 text-right font-normal">Actions</th>
                                        </tr>
                                        </thead>

                                        <tbody className="bg-transparent">
                                        {pageItems.map((row: any) => {
                                            const id = safeId(row?.id);
                                            if (id == null) return null;

                                            const isSelected = selectedIds.has(id);

                                            return (
                                                <tr
                                                    key={id}
                                                    className={cx(
                                                        "border-b border-slate-100/70 last:border-0",
                                                        isSelected ? "bg-white/55" : "bg-transparent",
                                                        "hover:bg-white/60 transition"
                                                    )}
                                                >
                                                    <td className="px-4 py-3 align-top">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleOne(id)}
                                                            className={cx(
                                                                "inline-flex items-center justify-center rounded-xl bg-white/70 p-2",
                                                                "ring-1 ring-slate-200/60 hover:bg-white/90",
                                                                focusRing
                                                            )}
                                                            aria-label={isSelected ? "Unselect" : "Select"}
                                                        >
                                                            {isSelected ? <FiCheckSquare size={18}/> :
                                                                <FiSquare size={18}/>}
                                                        </button>
                                                    </td>

                                                    <td className="px-4 py-3 align-top">
                                                        <div className="max-w-[34rem]">
                                                            <div
                                                                className="truncate font-normal tracking-tight text-slate-700">
                                                                {safeString(row?.title, "Untitled")}
                                                            </div>
                                                            <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                                {safeString(row?.description, "")}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 align-top text-slate-600">
                                                        {safeString(row?.category?.name, "—")}
                                                    </td>

                                                    <td className="px-4 py-3 align-top text-slate-600">
                                                        {safeString(row?.difficulty?.level, "—")}
                                                    </td>

                                                    <td className="px-4 py-3 align-top">{badge(row?.question_type)}</td>

                                                    <td className="px-4 py-3 align-top">
                                                        <div
                                                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(id)}
                                                                className={cx(
                                                                    "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                    "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                                    focusRing
                                                                )}
                                                            >
                                                                <FiEdit3/>
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(id)}
                                                                disabled={busy === "delete"}
                                                                className={cx(
                                                                    "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                    "ring-1 ring-rose-200/60 text-rose-700 hover:bg-white/90 disabled:opacity-60",
                                                                    focusRing
                                                                )}
                                                            >
                                                                <FiTrash2/>
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

                            {total > 0 ? (
                                <div
                                    className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
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
                                            <span
                                                className="text-slate-700">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> –{" "}
                                            <span
                                                className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                            <span className="text-slate-700">{total}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </main>
        </div>
    );
};

export default AdminDraftQuestionsList;
