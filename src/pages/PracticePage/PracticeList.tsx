// src/pages/practice/PracticeList.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import { getChallenges, getCategories, getDifficulties } from "./practice";
import { useNavigate } from "react-router-dom";
import { FiEye, FiFilter, FiTag } from "react-icons/fi";
import type { Challenge } from "./types";

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

const PracticeList: React.FC = () => {
    const { user } = useAuth(); // kept (even if unused today)
    void user;

    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [difficulties, setDifficulties] = useState<{ id: number; level: string }[]>([]);
    void difficulties; // kept (even if unused today)

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Minimalistic filters (no difficulty dropdown)
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 300);

    const [categoryFilter, setCategoryFilter] = useState(""); // only dropdown kept
    const [difficultyTag, setDifficultyTag] = useState<"" | "Easy" | "Moderate" | "Hard">(""); // chips

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(9);
    const pageSizeOptions = [6, 9, 12, 24];

    /** Fetch initial data */
    useEffect(() => {
        let mounted = true;

        const fetchInitial = async () => {
            setLoading(true);
            setError(null);
            try {
                const [cats, diffs, chals] = await Promise.all([
                    getCategories(),
                    getDifficulties(),
                    getChallenges({ type: "practice" }),
                ]);
                if (!mounted) return;

                setCategories(cats || []);
                setDifficulties(diffs || []);
                setAllChallenges(chals || []);
            } catch (err) {
                console.error("Failed to fetch practice data:", err);
                if (!mounted) return;
                setError("Failed to load challenges. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchInitial();
        return () => {
            mounted = false;
        };
    }, []);

    /** Filtered + searched challenges */
    const filteredChallenges = useMemo(() => {
        const searchLower = debouncedSearch.trim().toLowerCase();

        return allChallenges.filter((c) => {
            // category
            if (categoryFilter && c.category?.name !== categoryFilter) return false;

            // difficulty chip filter (case-insensitive)
            if (difficultyTag) {
                const lvl = (c.difficulty?.level || "").toLowerCase();
                if (lvl !== difficultyTag.toLowerCase()) return false;
            }

            // search
            if (!searchLower) return true;

            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();

            return title.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower);
        });
    }, [allChallenges, categoryFilter, difficultyTag, debouncedSearch]);

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

    const handleClearFilters = useCallback(() => {
        setCategoryFilter("");
        setDifficultyTag("");
        setSearch("");
        setPage(1);
    }, []);

    const onPageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pageCount) return;
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const filtersActive = useMemo(() => {
        return Boolean(categoryFilter || difficultyTag || debouncedSearch.trim());
    }, [categoryFilter, difficultyTag, debouncedSearch]);

    /** Card renderer (same functionality; bigger type + glassy like CompetitionList) */
    const renderChallengeCard = (c: Challenge) => {
        const difficulty = c.difficulty?.level || "N/A";
        const category = c.category?.name || "N/A";

        const difficultyLower = String(difficulty || "").toLowerCase();

        const difficultyColor =
            difficultyLower === "easy"
                ? "bg-emerald-100/70 text-emerald-900 border-emerald-200"
                : difficultyLower === "moderate" || difficultyLower === "medium"
                    ? "bg-amber-100/70 text-amber-900 border-amber-200"
                    : difficultyLower === "hard"
                        ? "bg-rose-100/70 text-rose-900 border-rose-200"
                        : "bg-slate-100/70 text-slate-800 border-slate-200";

        const cardShell =
            "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl " +
            "ring-1 ring-slate-200/50 transition hover:bg-white/70 hover:shadow-md";

        return (
            <article key={c.id} className={`flex flex-col ${cardShell}`}>
                <div className="flex flex-1 flex-col p-6 md:p-7">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 leading-snug">
                            {c.title}
                        </h2>
                    </div>

                    <p className="mt-3 line-clamp-4 text-sm sm:text-base md:text-[17px] text-slate-700 leading-relaxed">
                        {truncateText(c.description || "", 240)}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/60 px-3.5 py-2 text-xs sm:text-sm md:text-base text-slate-800">
              <FiTag size={14} />
              <span className="font-semibold">Category:</span>
              <span className="font-medium">{category}</span>
            </span>

                        <span
                            className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base ${difficultyColor}`}
                        >
              <span className="font-semibold mr-1">Difficulty:</span>
              <span className="font-medium">{difficulty}</span>
            </span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/40 bg-white/40 px-6 md:px-7 py-4 backdrop-blur-xl">
                    <button
                        onClick={() => navigate(`/practice/${c.id}`)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-2.5 text-sm sm:text-base md:text-lg font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        aria-label={`View challenge ${c.title}`}
                    >
                        <FiEye size={18} />
                        <span>Solve</span>
                    </button>

                    <span className="text-xs sm:text-sm md:text-base text-slate-700">
            Mode: <span className="font-semibold">Practice</span>
          </span>
                </div>
            </article>
        );
    };

    const activeFiltersCount = (search.trim() ? 1 : 0) + (categoryFilter ? 1 : 0) + (difficultyTag ? 1 : 0);

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full">
                    {/* Header */}
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
                                Practice Challenges
                            </h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-2xl border border-white/30 bg-white/55 px-3 py-2 text-sm sm:text-base text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                <span className="text-slate-600">Total:</span>
                <span className="ml-2 font-semibold text-slate-900">{total}</span>
              </span>

                            <span className="inline-flex items-center rounded-2xl border border-white/30 bg-white/55 px-3 py-2 text-sm sm:text-base text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                <span className="text-slate-600">Filters:</span>
                <span className="ml-2 font-semibold text-slate-900">{activeFiltersCount}</span>
              </span>

                            {filtersActive && (
                                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 text-sm sm:text-base text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <FiFilter />
                                    <span className="font-semibold">Filters active</span>
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="ml-1 rounded-xl border border-slate-200 bg-white/60 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        Reset
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    {/* Toolbar: search + chips + category + reset (bigger type, glassy, responsive like CompetitionList) */}
                    <section className="mb-6 rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        <div className="px-4 py-4">
                            <div className="flex flex-col gap-3">
                                {/* Search */}
                                <div className="w-full">
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
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm sm:text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        aria-label="Search practice challenges"
                                    />
                                </div>

                                {/* Controls row */}
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    {/* Difficulty chips */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(["Easy", "Moderate", "Hard"] as const).map((lvl) => {
                                            const active = difficultyTag === lvl;
                                            return (
                                                <button
                                                    key={lvl}
                                                    type="button"
                                                    onClick={() => {
                                                        setDifficultyTag(active ? "" : lvl);
                                                        setPage(1);
                                                    }}
                                                    className={[
                                                        "rounded-full border px-4 py-2 text-sm sm:text-base font-semibold transition",
                                                        active
                                                            ? "border-slate-900 bg-slate-900 text-white"
                                                            : "border-slate-200 bg-white/70 text-slate-800 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                                    ].join(" ")}
                                                >
                                                    {lvl}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Right side: Category + Reset */}
                                    <div className="flex flex-wrap items-center gap-2">
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
                                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="">All categories</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="button"
                                            onClick={handleClearFilters}
                                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm sm:text-base font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {loading && (
                        <div className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            Loading challenges...
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-red-900 shadow-sm backdrop-blur-xl">
                            {error}
                        </div>
                    )}

                    {/* List */}
                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div className="rounded-2xl border border-white/30 bg-white/55 px-6 py-12 text-center text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <div className="text-base md:text-lg font-semibold text-slate-900">No matches</div>
                                    <div className="mt-1 text-sm md:text-base text-slate-700">
                                        No practice challenges match your filters. Try resetting or broadening your search.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Bigger cards grid like CompetitionList */}
                                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                        {currentPageItems.map((c) => renderChallengeCard(c))}
                                    </div>

                                    {/* Pagination */}
                                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm sm:text-base font-semibold text-slate-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                Prev
                                            </button>
                                            <span className="text-sm sm:text-base md:text-lg">
                        Page <span className="font-extrabold text-slate-900">{page}</span> of{" "}
                                                <span className="font-extrabold text-slate-900">{pageCount}</span>
                      </span>
                                            <button
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm sm:text-base font-semibold text-slate-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Per page</span>
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
                                                    className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm sm:text-base md:text-lg text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-slate-700">
                                                Showing{" "}
                                                <span className="font-extrabold text-slate-900">
                          {total === 0 ? 0 : (page - 1) * pageSize + 1}
                        </span>{" "}
                                                –{" "}
                                                <span className="font-extrabold text-slate-900">{Math.min(page * pageSize, total)}</span> of{" "}
                                                <span className="font-extrabold text-slate-900">{total}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PracticeList;
