import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import {
    getChallenges,
    getCategories,
    getDifficulties,
    deleteChallenge,
} from "../../api/practice";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2, FiEye } from "react-icons/fi";
import { Challenge } from "./types";

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
    const { user } = useAuth();
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>(
        []
    );
    const [difficulties, setDifficulties] = useState<
        { id: number; level: string }[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [categoryFilter, setCategoryFilter] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 350);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(9);
    const pageSizeOptions = [6, 9, 12, 24];

    const [message, setMessage] = useState<string | null>(null);

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
            } catch (err: any) {
                console.error("Failed to fetch initial data:", err);
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

    /** Filtered and searched challenges */
    const filteredChallenges = useMemo(() => {
        const searchLower = debouncedSearch.trim().toLowerCase();

        return allChallenges.filter((c) => {
            if (categoryFilter && c.category?.name !== categoryFilter) return false;
            if (difficultyFilter && c.difficulty?.level !== difficultyFilter)
                return false;
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
    }, [allChallenges, categoryFilter, difficultyFilter, debouncedSearch]);

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

    /** Delete challenge */
    const handleDelete = useCallback(
        async (id: number) => {
            if (user?.role !== "admin") {
                setMessage("You are not authorized to delete challenges.");
                return;
            }
            if (
                !window.confirm(
                    "Are you sure you want to delete this challenge? This action cannot be undone."
                )
            )
                return;

            const backup = allChallenges;
            setAllChallenges((prev) => prev.filter((c) => c.id !== id));
            setMessage("Deleting challenge...");

            try {
                await deleteChallenge(id);
                setMessage("Challenge deleted.");
                if (currentPageItems.length === 1 && page > 1) setPage((p) => p - 1);
            } catch (err) {
                console.error("Failed to delete challenge:", err);
                setAllChallenges(backup);
                setMessage("Failed to delete challenge.");
            } finally {
                setTimeout(() => setMessage(null), 3500);
            }
        },
        [allChallenges, currentPageItems.length, page, user?.role]
    );

    const handleClearFilters = useCallback(() => {
        setCategoryFilter("");
        setDifficultyFilter("");
        setSearch("");
        setPage(1);
    }, []);

    const onPageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pageCount) return;
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                            Practice Challenges
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Browse and solve curated challenges. Filter by category, difficulty
                            and quickly search by title or description.
                        </p>
                    </div>
                    {user?.role === "admin" && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate("/practice/new")}
                                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                            >
                                <FiPlus size={16} />
                                <span>Add Challenge</span>
                            </button>
                        </div>
                    )}
                </header>

                {/* Filters panel */}
                <section className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        {/* Left: Search + filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <input
                                    type="search"
                                    placeholder="Search by title, description, category..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />

                            </div>

                            <select
                                value={categoryFilter}
                                onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={difficultyFilter}
                                onChange={(e) => {
                                    setDifficultyFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">All Difficulties</option>
                                {difficulties.map((diff) => (
                                    <option key={diff.id} value={diff.level}>
                                        {diff.level}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={handleClearFilters}
                                className="text-xs md:text-sm inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            >
                                Clear
                            </button>
                        </div>

                        {/* Right: meta */}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Total: <span className="font-medium">{total}</span>
              </span>
                        </div>
                    </div>
                </section>

                {/* Alerts / status */}
                {loading && (
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm mb-4">
                        Loading challenges...
                    </div>
                )}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm mb-4">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm mb-4">
                        {message}
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
                                {/* Challenge grid */}
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {currentPageItems.map((c) => {
                                        const difficulty = c.difficulty?.level || "N/A";
                                        const category = c.category?.name || "N/A";

                                        const difficultyColor =
                                            difficulty.toLowerCase() === "easy"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                : difficulty.toLowerCase() === "medium"
                                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                                    : difficulty.toLowerCase() === "hard"
                                                        ? "bg-rose-50 text-rose-700 border-rose-100"
                                                        : "bg-slate-50 text-slate-600 border-slate-100";

                                        return (
                                            <article
                                                key={c.id}
                                                className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex-1 p-4 flex flex-col">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h2 className="font-semibold text-slate-900 text-sm md:text-base line-clamp-2">
                                                            {c.title}
                                                        </h2>
                                                    </div>

                                                    <p className="mt-2 text-xs text-slate-600 line-clamp-4">
                                                        {truncateText(c.description || "", 200)}
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-slate-600 border border-slate-100">
                              <span className="font-medium mr-1">Category:</span>
                                {category}
                            </span>
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-1 border text-xs ${difficultyColor}`}
                                                        >
                              <span className="font-medium mr-1">Difficulty:</span>
                                                            {difficulty}
                            </span>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-slate-50/60">
                                                    <button
                                                        onClick={() => navigate(`/practice/${c.id}`)}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                                                        aria-label={`View challenge ${c.title}`}
                                                    >
                                                        <FiEye size={16} />
                                                        <span>View</span>
                                                    </button>

                                                    {user?.role === "admin" && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleDelete(c.id)}
                                                                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 focus:outline-none"
                                                                aria-label={`Delete challenge ${c.title}`}
                                                            >
                                                                <FiTrash2 size={16} />
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
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
                                            <span className="font-semibold text-slate-900">{page}</span>{" "}
                                            of <span className="font-semibold text-slate-900">{pageCount}</span>
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
                                            of{" "}
                                            <span className="font-medium text-slate-900">{total}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PracticeList;
