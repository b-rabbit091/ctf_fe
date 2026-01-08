// src/pages/practice/PracticeList.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import { getChallenges, getCategories, getDifficulties } from "./practice";
import { useNavigate } from "react-router-dom";
import { FiEye } from "react-icons/fi";
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
    const [difficulties, setDifficulties] = useState<{ id: number; level: string }[]>(
        []
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Minimalistic filters (no difficulty dropdown)
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 300);

    const [categoryFilter, setCategoryFilter] = useState(""); // only dropdown kept
    const [difficultyTag, setDifficultyTag] = useState<"" | "Easy" | "Moderate" | "Hard">(
        ""
    ); // chips

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

            return (
                title.includes(searchLower) ||
                desc.includes(searchLower) ||
                cat.includes(searchLower)
            );
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

    /** Card renderer (same as your original) */
    const renderChallengeCard = (c: Challenge) => {
        const difficulty = c.difficulty?.level || "N/A";
        const category = c.category?.name || "N/A";

        const difficultyColor =
            difficulty.toLowerCase() === "easy"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : difficulty.toLowerCase() === "moderate"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : difficulty.toLowerCase() === "hard"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-slate-50 text-slate-600 border-slate-100";

        return (
            <article
                key={c.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
                <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 text-sm md:text-base font-semibold text-slate-900">
                            {c.title}
                        </h2>
                    </div>

                    <p className="mt-2 line-clamp-4 text-xs text-slate-600">
                        {truncateText(c.description || "", 200)}
                    </p>

                    <div className="mt-3 flex flex-col gap-1 text-[11px]">
                        <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-slate-600">
                <span className="mr-1 font-medium">Category:</span>
                  {category}
              </span>

                            <span
                                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${difficultyColor}`}
                            >
                <span className="mr-1 font-medium">Difficulty:</span>
                                {difficulty}
              </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    <button
                        onClick={() => navigate(`/practice/${c.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                        aria-label={`View challenge ${c.title}`}
                    >
                        <FiEye size={16} />
                        <span>View</span>
                    </button>
                </div>
            </article>
        );
    };

    const activeFiltersCount =
        (search.trim() ? 1 : 0) + (categoryFilter ? 1 : 0) + (difficultyTag ? 1 : 0);

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Navbar />

            <main className="w-full px-4 py-8">
                <div className="mx-auto max-w-6xl">
                    {/* Header */}
                    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                                Practice Challenges
                            </h1>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm">
                <span className="text-slate-500">Total:</span>
                <span className="ml-2 font-semibold text-slate-900">{total}</span>
              </span>
                            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                <span className="text-slate-500">Filters:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {activeFiltersCount}
                </span>
              </span>
                        </div>
                    </header>

                    {/* Minimal toolbar: search + difficulty chips + (one) category dropdown + reset */}
                    <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 p-4">
                            {/* Search on top */}
                            <div className="w-full">
                                <input
                                    type="search"
                                    placeholder="Search by title, description, category…"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            {/* Controls row */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                {/* Difficulty chips (no dropdown) */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {["Easy", "Moderate", "Hard"].map((lvl) => {
                                        const active = difficultyTag === (lvl as any);
                                        return (
                                            <button
                                                key={lvl}
                                                type="button"
                                                onClick={() => {
                                                    setDifficultyTag(active ? "" : (lvl as any));
                                                    setPage(1);
                                                }}
                                                className={[
                                                    "rounded-full border px-3 py-1 text-xs",
                                                    active
                                                        ? "border-slate-900 bg-slate-900 text-white"
                                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                                ].join(" ")}
                                            >
                                                {lvl}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Right side: only one dropdown (Category) + Reset */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => {
                                            setCategoryFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {loading && (
                        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            Loading challenges...
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
                            {error}
                        </div>
                    )}

                    {/* List */}
                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center text-slate-500 shadow-sm">
                                    No challenges match your filters.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                        {currentPageItems.map((c) => renderChallengeCard(c))}
                                    </div>

                                    {/* Pagination */}
                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Prev
                                            </button>
                                            <span className="text-xs md:text-sm">
                        Page{" "}
                                                <span className="font-semibold text-slate-900">{page}</span> of{" "}
                                                <span className="font-semibold text-slate-900">{pageCount}</span>
                      </span>
                                            <button
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                                            <div className="flex items-center gap-2">
                                                <span>Per page</span>
                                                <select
                                                    value={pageSize}
                                                    onChange={(e) => {
                                                        setPageSize(Number(e.target.value));
                                                        setPage(1);
                                                    }}
                                                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-slate-500">
                                                Showing{" "}
                                                <span className="font-medium text-slate-900">
                          {total === 0 ? 0 : (page - 1) * pageSize + 1}
                        </span>{" "}
                                                –{" "}
                                                <span className="font-medium text-slate-900">
                          {Math.min(page * pageSize, total)}
                        </span>{" "}
                                                of <span className="font-medium text-slate-900">{total}</span>
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
