import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useAuth} from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import {
    getChallenges,
    getCategories,
    getDifficulties,
    deleteChallenge,
} from "../../api/practice";
import {useNavigate} from "react-router-dom";
import {FiPlus, FiEdit, FiTrash2, FiEye} from "react-icons/fi";
import {Challenge} from "./types";

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
    const {user} = useAuth();
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [difficulties, setDifficulties] = useState<{ id: number; level: string }[]>([]);

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
                    getChallenges(),
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
            if (difficultyFilter && c.difficulty?.level !== difficultyFilter) return false;
            if (!searchLower) return true;

            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();

            return title.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower);
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
            if (!window.confirm("Are you sure you want to delete this challenge?")) return;

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
        window.scrollTo({top: 0, behavior: "smooth"});
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar/>
            <div className="max-w-6xl mx-auto p-6">
                <div className="flex justify-between items-start gap-6 mb-6 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Practice Challenges</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Browse practice problems. Filters & search are instant — no extra API calls.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <input
                            type="search"
                            placeholder="Search title, description or category..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="border rounded p-2 w-64"
                        />

                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                            className="border rounded p-2"
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
                            className="border rounded p-2"
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
                            className="text-sm px-3 py-2 border rounded hover:bg-gray-100"
                        >
                            Clear
                        </button>

                        {user?.role === "admin" && (
                            <button
                                onClick={() => navigate("/practice/new")}
                                className="flex items-center gap-2 bg-green-600 text-white p-2 rounded hover:bg-green-700"
                            >
                                <FiPlus size={16}/> <span className="hidden sm:inline">Add</span>
                            </button>
                        )}
                    </div>
                </div>

                {loading && <p className="text-gray-600">Loading...</p>}
                {error && <p className="text-red-600">{error}</p>}
                {message && <p className="text-sm text-blue-600 mb-4">{message}</p>}

                {!loading && !error && (
                    <>
                        {total === 0 ? (
                            <p className="text-gray-600">No challenges match your filters.</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {currentPageItems.map((c) => (
                                        <article key={c.id}
                                                 className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col overflow-hidden">
                                            <div className="p-4 flex flex-col flex-1">
                                                <h2 className="font-bold text-lg mb-1 line-clamp-2">{c.title}</h2>
                                                <p className="text-gray-700 flex-1 text-sm line-clamp-4">
                                                    {truncateText(c.description || "", 150)}
                                                </p>

                                                <div className="mt-3 flex justify-between items-center">
                                                    <button
                                                        onClick={() => navigate(`/practice/${c.id}`)}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        <FiEye size={18}/>
                                                    </button>

                                                    {user?.role === "admin" && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => navigate(`/practice/edit/${c.id}`)}
                                                                className="text-yellow-500 hover:text-yellow-600"
                                                            >
                                                                <FiEdit size={18}/>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(c.id)}
                                                                className="text-red-500 hover:text-red-600"
                                                            >
                                                                <FiTrash2 size={18}/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <p className="text-gray-400 text-xs mt-2">
                                                    Category: {c.category?.name || "N/A"} |
                                                    Difficulty: {c.difficulty?.level || "N/A"}
                                                </p>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                                                className="px-3 py-1 border rounded disabled:opacity-50">
                                            Prev
                                        </button>
                                        <span>Page <strong>{page}</strong> of {pageCount}</span>
                                        <button onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}
                                                className="px-3 py-1 border rounded disabled:opacity-50">
                                            Next
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="text-sm">Per page</label>
                                        <select value={pageSize} onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setPage(1);
                                        }} className="border rounded p-1">
                                            {pageSizeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <div className="text-sm text-gray-600">
                                            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
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
