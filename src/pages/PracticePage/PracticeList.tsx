// src/pages/practice/PracticeList.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {getCategories, getChallenges, getDifficulties} from "./practice";
import {FiEye, FiTag, FiAlertCircle, FiRefreshCw, FiInfo} from "react-icons/fi";
import type {Challenge} from "./types";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

/** Truncate text safely */
const truncateText = (text: string, maxLength: number) =>
    text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

/** Debounce hook */
function useDebouncedValue<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

const DIFFICULTY_TAGS = ["Easy", "Medium", "Hard"] as const;

// backend statuses
type SubmissionStatus = "solved" | "partially_solved" | "attempted" | "not_attempted";

// ✅ filters you asked
type ProgressFilter = "" | "solved" | "partially_solved" | "attempted" | "unsolved";

function normalizeStatus(raw: unknown): SubmissionStatus {
    const v = String(raw ?? "").toLowerCase().trim();
    if (v === "solved") return "solved";
    if (v === "partially_solved") return "partially_solved";
    if (v === "attempted") return "attempted";
    return "not_attempted";
}

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
                    <div className="h-px bg-slate-200/70"/>
                </>
            ) : null}
            <div className={cx("px-4 sm:px-5", title ? "py-4" : "py-4")}>{children}</div>
        </section>
    );
});

const Pill = memo(function Pill({className, children}: { className: string; children: React.ReactNode }) {
    return (
        <span
            className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs sm:text-sm font-normal tracking-tight ring-1", className)}>
      {children}
    </span>
    );
});

// Tag chip: no bold, no black backgrounds; pleasant when active
const tagClass = (active: boolean) =>
    cx(
        "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
        focusRing,
        active
            ? "border-sky-200/70 bg-sky-50 text-sky-700"
            : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90"
    );

// ✅ LeetCode-ish progress chips (bright)
const progressChipClass = (key: ProgressFilter, active: boolean) => {
    const base = cx(
        "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-white/70"
    );

    const ring = "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

    if (key === "solved") {
        return cx(
            base,
            ring,
            active
                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                : "border-emerald-200/70 bg-white/70 text-emerald-700 hover:bg-emerald-50"
        );
    }
    if (key === "partially_solved") {
        return cx(
            base,
            ring,
            active
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-amber-200/70 bg-white/70 text-amber-800 hover:bg-amber-50"
        );
    }
    if (key === "attempted") {
        return cx(
            base,
            ring,
            active
                ? "border-sky-300 bg-sky-100 text-sky-900"
                : "border-sky-200/70 bg-white/70 text-sky-800 hover:bg-sky-50"
        );
    }
    // unsolved
    return cx(
        base,
        ring,
        active
            ? "border-violet-300 bg-violet-100 text-violet-900"
            : "border-violet-200/70 bg-white/70 text-violet-800 hover:bg-violet-50"
    );
};

// ✅ show label above title only if user has a status other than not_attempted
const ProgressLabel = memo(function ProgressLabel({challenge}: { challenge: Challenge }) {
    const st = normalizeStatus((challenge as any).user_submission_status);
    if (st === "not_attempted") return null;

    const label = st === "solved" ? "Solved" : st === "partially_solved" ? "Partially Solved" : "Attempted";
    const cls = st === "solved" ? "text-emerald-700" : st === "partially_solved" ? "text-amber-800" : "text-sky-700";

    return <div className={cx("text-[11px] sm:text-xs font-normal leading-none", cls)}>{label}</div>;
});

const PracticeList: React.FC = () => {
    const {user} = useAuth(); // kept (even if unused today)
    void user;
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [, setDifficulties] = useState<{ id: number; level: string }[]>([]); // kept (even if unused today)

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 350);

    const [categoryFilter, setCategoryFilter] = useState("");
    const [difficultyTag, setDifficultyTag] = useState<"" | (typeof DIFFICULTY_TAGS)[number]>("");

    // ✅ progress filter
    const [progressFilter, setProgressFilter] = useState<ProgressFilter>("");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const pageSizeOptions = useMemo(() => [6, 9, 12, 24], []);

    // avoid setState after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const fetchInitial = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [cats, diffs, chals] = await Promise.all([
                getCategories(),
                getDifficulties(),
                getChallenges({type: "practice"}),
            ]);

            if (!alive.current) return;

            setCategories(cats || []);
            setDifficulties(diffs || []);
            setAllChallenges(chals || []);
        } catch (err) {
            console.error("Failed to fetch practice data:", err);
            if (!alive.current) return;
            setError("Failed to load challenges. Please try again.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    const handleClearFilters = useCallback(() => {
        setCategoryFilter("");
        setDifficultyTag("");
        setProgressFilter("");
        setSearch("");
        setPage(1);
    }, []);

    /** Filtered + searched challenges */
    const filteredChallenges = useMemo(() => {
        const searchLower = debouncedSearch.trim().toLowerCase();

        return allChallenges.filter((c) => {
            if (categoryFilter && c.category?.name !== categoryFilter) return false;

            if (difficultyTag) {
                const lvl = (c.difficulty?.level || "").toLowerCase();
                if (lvl !== difficultyTag.toLowerCase()) return false;
            }

            // ✅ progress filtering
            if (progressFilter) {
                const st = normalizeStatus((c as any).user_submission_status);

                if (progressFilter === "unsolved") {
                    // unsolved = attempted OR partially_solved
                    if (st === "solved" || st === "not_attempted") return false;
                } else {
                    if (st !== progressFilter) return false;
                }
            }

            if (!searchLower) return true;

            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();

            return title.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower);
        });
    }, [allChallenges, categoryFilter, difficultyTag, progressFilter, debouncedSearch]);

    /** Pagination */
    const total = filteredChallenges.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

    const currentPageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredChallenges.slice(start, start + pageSize);
    }, [filteredChallenges, page, pageSize]);

    const onPageChange = useCallback(
        (newPage: number) => {
            if (newPage < 1 || newPage > pageCount) return;
            setPage(newPage);
            window.scrollTo({top: 0, behavior: "smooth"});
        },
        [pageCount]
    );

    const renderChallengeCard = useCallback(
        (c: Challenge) => {
            const difficulty = (c as any).difficulty?.level || "N/A";
            const category = (c as any).category?.name || "N/A";

            const difficultyLower = String(difficulty || "").toLowerCase();
            const difficultyColor =
                difficultyLower === "easy"
                    ? "bg-emerald-100/70 text-emerald-700 ring-emerald-200/60"
                    : difficultyLower === "moderate" || difficultyLower === "medium"
                        ? "bg-amber-100/70 text-amber-800 ring-amber-200/60"
                        : difficultyLower === "hard"
                            ? "bg-rose-100/70 text-rose-700 ring-rose-200/60"
                            : "bg-slate-100/70 text-slate-600 ring-slate-200/60";

            return (
                <article
                    key={c.id}
                    className={cx(
                        "flex flex-col rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm",
                        "transition hover:bg-white/75 hover:shadow-md"
                    )}
                >
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <ProgressLabel challenge={c}/>
                                <h3 className="mt-1 line-clamp-2 text-lg sm:text-xl md:text-2xl font-normal tracking-tight text-slate-700 leading-snug">
                                    {c.title}
                                </h3>
                            </div>

                            <span
                                className={cx(
                                    "hidden sm:inline-flex items-center rounded-full px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ring-1",
                                    difficultyColor
                                )}
                                title="Difficulty"
                            >
                {difficulty}
              </span>
                        </div>

                        <p className="mt-3 line-clamp-4 text-sm sm:text-base md:text-[17px] text-slate-600 leading-relaxed">
                            {truncateText(c.description || "", 260)}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span
                  className="inline-flex items-center gap-1.5 rounded-full ring-1 ring-slate-200/60 bg-slate-50/60 px-3.5 py-2 text-xs sm:text-sm md:text-base text-slate-600">
                <FiTag size={14}/>
                <span>Category:</span>
                <span className="truncate max-w-[14rem]">{category}</span>
              </span>

                            <span
                                className={cx(
                                    "sm:hidden inline-flex items-center rounded-full px-3.5 py-2 text-xs font-normal ring-1",
                                    difficultyColor
                                )}
                                title="Difficulty"
                            >
                {difficulty}
              </span>
                        </div>
                    </div>

                    <div
                        className="flex items-center justify-between border-t border-slate-200/60 bg-white/40 px-5 sm:px-6 py-4 backdrop-blur-xl">
                        <button
                            type="button"
                            onClick={() => navigate(`/practice/${c.id}`)}
                            className={cx(
                                "inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2.5 text-sm sm:text-base font-normal tracking-tight",
                                "ring-1 ring-sky-200/60 text-sky-700 hover:bg-white/90",
                                focusRing
                            )}
                            aria-label={`Solve practice challenge ${c.title}`}
                        >
                            <FiEye size={18}/>
                            <span>Solve</span>
                        </button>
                    </div>
                </article>
            );
        },
        [navigate]
    );

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar/>

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                {/* Header */}
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                            Practice Challenges
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-500">
                            Search, filter by difficulty and progress, then start solving.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchInitial}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                            "ring-1 ring-slate-200/60 hover:bg-white/90 disabled:opacity-60",
                            focusRing
                        )}
                        disabled={loading}
                        aria-label="Refresh practice challenges"
                        title="Refresh"
                    >
                        <FiRefreshCw className={loading ? "animate-spin" : ""} size={16}/>
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </header>

                {/* Filters */}
                <Card>
                    <div className="space-y-3">
                        {/* Row 1 */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-[240px] flex-1">
                                <label className="sr-only" htmlFor="practice-search">
                                    Search practice challenges
                                </label>
                                <input
                                    id="practice-search"
                                    type="search"
                                    placeholder="Search title, description, category…"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className={cx(
                                        "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                        "placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30 focus:outline-none"
                                    )}
                                    aria-label="Search practice challenges"
                                />
                            </div>

                            <div className="shrink-0">
                                <label className="sr-only" htmlFor="practice-category-filter">
                                    Category filter
                                </label>
                                <select
                                    id="practice-category-filter"
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className={cx(
                                        "h-10 w-[190px] max-w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                        "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                    )}
                                >
                                    <option value="">Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className={cx(
                                    "h-10 shrink-0 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                    "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                    focusRing
                                )}
                            >
                                Reset
                            </button>
                        </div>

                        {/* Row 2 */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                  Difficulty
                </span>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDifficultyTag("");
                                        setPage(1);
                                    }}
                                    className={tagClass(!difficultyTag)}
                                >
                                    All
                                </button>

                                {DIFFICULTY_TAGS.map((lvl) => {
                                    const active = difficultyTag === lvl;
                                    return (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => {
                                                setDifficultyTag(active ? "" : lvl);
                                                setPage(1);
                                            }}
                                            className={tagClass(active)}
                                            aria-pressed={active}
                                        >
                                            {lvl}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Progress chips */}
                            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                  Progress
                </span>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProgressFilter("");
                                        setPage(1);
                                    }}
                                    className={tagClass(!progressFilter)}
                                    aria-pressed={!progressFilter}
                                >
                                    All
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProgressFilter((prev) => (prev === "attempted" ? "" : "attempted"));
                                        setPage(1);
                                    }}
                                    className={progressChipClass("attempted", progressFilter === "attempted")}
                                    aria-pressed={progressFilter === "attempted"}
                                >
                                    Attempted
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProgressFilter((prev) => (prev === "partially_solved" ? "" : "partially_solved"));
                                        setPage(1);
                                    }}
                                    className={progressChipClass("partially_solved", progressFilter === "partially_solved")}
                                    aria-pressed={progressFilter === "partially_solved"}
                                >
                                    Partial
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProgressFilter((prev) => (prev === "solved" ? "" : "solved"));
                                        setPage(1);
                                    }}
                                    className={progressChipClass("solved", progressFilter === "solved")}
                                    aria-pressed={progressFilter === "solved"}
                                >
                                    Solved
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProgressFilter((prev) => (prev === "unsolved" ? "" : "unsolved"));
                                        setPage(1);
                                    }}
                                    className={progressChipClass("unsolved", progressFilter === "unsolved")}
                                    aria-pressed={progressFilter === "unsolved"}
                                    title="Attempted or Partially Solved"
                                >
                                    Unsolved
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Loading / Error banners */}
                {loading ? (
                    <div
                        className="mt-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0"/>
                            <div className="min-w-0 space-y-2">
                                <div className="h-4 w-40 bg-slate-200/80 rounded animate-pulse"/>
                                <div className="h-4 w-72 bg-slate-100 rounded animate-pulse"/>
                            </div>
                        </div>
                        <p className="mt-3 text-center text-sm text-slate-500">Loading challenges…</p>
                    </div>
                ) : null}

                {error ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load challenges</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                                <button
                                    type="button"
                                    onClick={fetchInitial}
                                    className={cx(
                                        "mt-3 inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-rose-200 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    <FiRefreshCw size={14}/>
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Content */}
                {!loading && !error ? (
                    <>
                        {total === 0 ? (
                            <div
                                className="mt-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                <div
                                    className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                    <FiInfo className="text-slate-500"/>
                                </div>
                                <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                    No matches
                                </div>
                                <div className="mt-1 text-sm sm:text-base text-slate-500">
                                    No practice challenges match your filters. Try resetting or broadening your search.
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {currentPageItems.map((c) => renderChallengeCard(c))}
                                </div>

                                {/* Pagination */}
                                <div
                                    className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className={cx(
                                                    "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                                    "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    focusRing
                                                )}
                                            >
                                                Prev
                                            </button>

                                            <span className="text-sm sm:text-base text-slate-600">
                        Page <span className="text-slate-700">{page}</span> of{" "}
                                                <span className="text-slate-700">{pageCount}</span>
                      </span>

                                            <button
                                                type="button"
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className={cx(
                                                    "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                                    "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    focusRing
                                                )}
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm sm:text-base text-slate-600">Per page</span>
                                                <label className="sr-only" htmlFor="practice-page-size">
                                                    Items per page
                                                </label>
                                                <select
                                                    id="practice-page-size"
                                                    value={pageSize}
                                                    onChange={(e) => {
                                                        setPageSize(Number(e.target.value));
                                                        setPage(1);
                                                    }}
                                                    className={cx(
                                                        "rounded-xl bg-white/70 px-3 py-2 text-sm sm:text-base text-slate-700 shadow-sm",
                                                        "ring-1 ring-slate-200/60 hover:bg-white/90",
                                                        focusRing
                                                    )}
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-sm sm:text-base text-slate-600">
                                                Showing{" "}
                                                <span
                                                    className="text-slate-700">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>{" "}
                                                – <span
                                                className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                                <span className="text-slate-700">{total}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : null}
            </main>
        </div>
    );
};

export default PracticeList;
