// src/pages/practice/PracticeList.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import { getChallenges, getCategories, getDifficulties } from "./practice";
import { useNavigate } from "react-router-dom";
import { FiEye, FiTag } from "react-icons/fi";
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

const DIFFICULTY_TAGS = ["Easy", "Medium", "Hard"] as const;

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

    // Filters
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 350);

    const [categoryFilter, setCategoryFilter] = useState("");
    const [difficultyTag, setDifficultyTag] = useState<"" | (typeof DIFFICULTY_TAGS)[number]>("");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
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
            if (categoryFilter && c.category?.name !== categoryFilter) return false;

            if (difficultyTag) {
                const lvl = (c.difficulty?.level || "").toLowerCase();
                if (lvl !== difficultyTag.toLowerCase()) return false;
            }

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


    // Tag chip: no bold, no black backgrounds; pleasant blue when active
    const tagClass = (active: boolean) =>
        [
            "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        ].join(" ");

    /** Card renderer (match CompetitionList: normal weight, slate-700, glass) */
    const renderChallengeCard = (c: Challenge) => {
        const difficulty = (c as any).difficulty?.level || "N/A";
        const category = (c as any).category?.name || "N/A";

        const difficultyLower = String(difficulty || "").toLowerCase();

        const difficultyColor =
            difficultyLower === "easy"
                ? "bg-emerald-100/70 text-emerald-700 border-emerald-200/70"
                : difficultyLower === "moderate" || difficultyLower === "medium"
                    ? "bg-amber-100/70 text-amber-700 border-amber-200/70"
                    : difficultyLower === "hard"
                        ? "bg-rose-100/70 text-rose-700 border-rose-200/70"
                        : "bg-slate-100/70 text-slate-600 border-slate-200/70";

        const cardShell =
            "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl " +
            "ring-1 ring-slate-200/50 transition hover:bg-white/70 hover:shadow-md";

        return (
            <article key={c.id} className={`flex flex-col ${cardShell}`}>
                <div className="flex flex-1 flex-col p-6 md:p-7">
                    <div className="flex items-start justify-between gap-3">
                        {/* Title is the ONLY thing that is bigger; keep it normal weight */}
                        <h3 className="line-clamp-2 text-lg sm:text-xl md:text-2xl font-normal text-slate-700 leading-snug">
                            {c.title}
                        </h3>

                        <span
                            className={`hidden sm:inline-flex items-center rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ${difficultyColor}`}
                            title="Difficulty"
                        >
                            {difficulty}
                        </span>
                    </div>

                    <p className="mt-3 line-clamp-4 text-sm sm:text-base md:text-[17px] text-slate-600 leading-relaxed">
                        {truncateText(c.description || "", 260)}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-100/60 px-3.5 py-2 text-xs sm:text-sm md:text-base text-slate-600">
                            <FiTag size={14} />
                            <span>Category:</span>
                            <span>{category}</span>
                        </span>

                        <span
                            className={`sm:hidden inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-normal ${difficultyColor}`}
                            title="Difficulty"
                        >
                            {difficulty}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/40 bg-white/40 px-6 md:px-7 py-4 backdrop-blur-xl">
                    <button
                        onClick={() => navigate(`/practice/${c.id}`)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-blue-50/70 px-5 py-2.5 text-sm sm:text-base md:text-lg font-normal text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                        aria-label={`Solve practice challenge ${c.title}`}
                    >
                        <FiEye size={18} />
                        <span>Solve</span>
                    </button>

                </div>
            </article>
        );
    };


    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full">
                    {/* Header (match CompetitionList: normal weight, slate-700) */}
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight">
                                Practice Challenges
                            </h1>
                        </div>

                    </header>

                    {/* Filters panel (match CompetitionList layout + chips) */}
                    <section className="mb-6 rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        <div className="px-4 py-4 space-y-3">
                            {/* Row 1 */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[260px] flex-1 max-w-[720px]">
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
                                        className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                        className="h-10 w-[190px] rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                    className="h-10 shrink-0 rounded-xl border border-slate-200/70 bg-white/80 px-4 text-sm sm:text-base font-normal text-slate-600 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                >
                                    Reset
                                </button>


                            </div>

                            {/* Row 2: Difficulty chips (match CompetitionList chip style) */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
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
                                            >
                                                {lvl}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {loading && (
                        <div className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            Loading challenges...
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-rose-700 shadow-sm backdrop-blur-xl">
                            {error}
                        </div>
                    )}

                    {/* List */}
                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div className="rounded-2xl border border-white/30 bg-white/55 px-6 py-12 text-center text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <div className="text-base md:text-lg font-normal text-slate-700">No matches</div>
                                    <div className="mt-1 text-sm md:text-base text-slate-600">
                                        No practice challenges match your filters. Try resetting or broadening your search.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                        {currentPageItems.map((c) => renderChallengeCard(c))}
                                    </div>

                                    {/* Pagination (match CompetitionList) */}
                                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            >
                                                Prev
                                            </button>
                                            <span className="text-sm sm:text-base md:text-lg text-slate-600">
                                                Page <span className="text-slate-600">{page}</span> of{" "}
                                                <span className="text-slate-600">{pageCount}</span>
                                            </span>
                                            <button
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-normal text-slate-600">Per page</span>
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
                                                    className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm sm:text-base md:text-lg text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-slate-600">
                                                Showing{" "}
                                                <span className="text-slate-600">
                                                    {total === 0 ? 0 : (page - 1) * pageSize + 1}
                                                </span>{" "}
                                                –{" "}
                                                <span className="text-slate-600">{Math.min(page * pageSize, total)}</span> of{" "}
                                                <span className="text-slate-600">{total}</span>
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
