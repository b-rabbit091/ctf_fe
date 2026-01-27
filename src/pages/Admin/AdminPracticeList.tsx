import React, {useEffect, useMemo, useState, useCallback} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import {getPracticeChallenges, deletePracticeChallenge, getCategories, getDifficulties} from "../PracticePage/practice";

import {Challenge, CategoryTypes, DifficultyTypes} from "../PracticePage/types";

import {FiPlus, FiEye, FiEdit2, FiTrash2} from "react-icons/fi";

const AdminPracticeList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [categories, setCategories] = useState<CategoryTypes[]>([]);
    const [difficulties, setDifficulties] = useState<DifficultyTypes[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("");

    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        if (!user) return;

        if (user.role !== "admin") {
            navigate("/dashboard");
            return;
        }

        let mounted = true;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [cats, diffs, chals] = await Promise.all([
                    getCategories(),
                    getDifficulties(),
                    getPracticeChallenges(), // practice-only challenges
                ]);
                if (!mounted) return;

                setCategories(cats || []);
                setDifficulties(diffs || []);
                setAllChallenges(chals || []);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load practice challenges. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchData();
        return () => {
            mounted = false;
        };
    }, [user, navigate]);

    const filtered = useMemo(() => {
        const searchLower = search.trim().toLowerCase();
        return allChallenges.filter((c) => {
            if (categoryFilter && c.category?.name !== categoryFilter) return false;
            if (difficultyFilter && c.difficulty?.level !== difficultyFilter) return false;

            if (!searchLower) return true;

            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();

            return title.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower);
        });
    }, [allChallenges, categoryFilter, difficultyFilter, search]);

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const handleDelete = useCallback(
        async (id: number) => {
            if (!user || user.role !== "admin") {
                setMessage("Unauthorized: admin only.");
                return;
            }

            if (!window.confirm("Are you sure you want to delete this practice challenge? This cannot be undone.")) return;

            const backup = allChallenges;
            setAllChallenges((prev) => prev.filter((c) => c.id !== id));
            setMessage("Deleting challenge...");

            try {
                await deletePracticeChallenge(id);
                setMessage("Challenge deleted.");
            } catch (err) {
                console.error(err);
                setAllChallenges(backup);
                setMessage("Failed to delete challenge.");
            } finally {
                setTimeout(() => setMessage(null), 3500);
            }
        },
        [allChallenges, user]
    );

    const handleClearFilters = () => {
        setCategoryFilter("");
        setDifficultyFilter("");
        setSearch("");
        setPage(1);
    };

    // --- responsive full-screen shell for guard states ---
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar/>
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
                <Navbar/>
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
            <Navbar/>

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight">
                                Manage Practice Challenges
                            </h1>
                            <p className="mt-1 text-sm sm:text-base md:text-lg text-slate-600">
                                Admin view of all practice-type challenges. Create, review, and maintain practice
                                problems from here.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/admin/practice/new")}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-2.5 text-sm sm:text-base md:text-lg font-normal text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                        >
                            <FiPlus size={18}/>
                            <span>New Practice Challenge</span>
                        </button>
                    </header>

                    {/* Filters */}
                    <section className="mb-6 rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        <div className="px-4 py-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[260px] flex-1 max-w-[720px]">
                                    <label className="sr-only" htmlFor="admin-practice-search">
                                        Search practice challenges
                                    </label>
                                    <input
                                        id="admin-practice-search"
                                        type="search"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search by title, description, category…"
                                        className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    />
                                </div>

                                <div className="shrink-0">
                                    <label className="sr-only" htmlFor="admin-practice-category">
                                        Category filter
                                    </label>
                                    <select
                                        id="admin-practice-category"
                                        value={categoryFilter}
                                        onChange={(e) => {
                                            setCategoryFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-10 w-[190px] rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        <option value="">Category</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.name}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="shrink-0">
                                    <label className="sr-only" htmlFor="admin-practice-difficulty">
                                        Difficulty filter
                                    </label>
                                    <select
                                        id="admin-practice-difficulty"
                                        value={difficultyFilter}
                                        onChange={(e) => {
                                            setDifficultyFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-10 w-[190px] rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        <option value="">Difficulty</option>
                                        {difficulties.map((d) => (
                                            <option key={d.id} value={d.level}>
                                                {d.level}
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

                                <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm md:text-base text-slate-600">
                                    <span className="text-slate-500">Total:</span>
                                    <span className="ml-1">{total}</span>
                                </span>
                            </div>
                        </div>
                    </section>

                    {loading && (
                        <div className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            Loading practice challenges…
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-rose-700 shadow-sm backdrop-blur-xl">
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
                                        No practice challenges match your filters. Try resetting or broadening your search.
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <table className="min-w-full divide-y divide-slate-200/70 text-sm sm:text-base">
                                        <thead className="bg-white/40">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Category
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Difficulty
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs sm:text-sm font-normal uppercase tracking-wide text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-200/60 bg-transparent">
                                        {pageItems.map((c) => {
                                            const difficulty = c.difficulty?.level || "N/A";
                                            return (
                                                <tr key={c.id} className="bg-transparent">
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="max-w-xs">
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
                                                        {difficulty}
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/practice/${c.id}`)}
                                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-xs sm:text-sm md:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                            >
                                                                <FiEye size={16}/>
                                                                <span>View</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/admin/practice/${c.id}`)}
                                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-xs sm:text-sm md:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                            >
                                                                <FiEdit2 size={16}/>
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(c.id)}
                                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-2 text-xs sm:text-sm md:text-base font-normal text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
                                                            >
                                                                <FiTrash2 size={16}/>
                                                                <span>Delete</span>
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
                                        <span className="text-slate-700">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>{" "}
                                        – <span className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                        <span className="text-slate-700">{total}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default AdminPracticeList;
