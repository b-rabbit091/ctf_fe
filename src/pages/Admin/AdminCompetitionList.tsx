import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import {
    getChallenges,
    getCategories,
    getDifficulties,
    deleteChallenge,
} from "../../api/practice";
import { Challenge } from "../CompetitionPage/types";
import { FiPlus, FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";

type ContestStatus = "ONGOING" | "UPCOMING" | "ENDED" | "NONE";

interface ContestMeta {
    label: string;
    status: ContestStatus;
}

function getContestMeta(challenge: Challenge): ContestMeta {
    const activeContest = challenge.active_contest ?? null;
    if (!activeContest) {
        return { label: "No Contest", status: "NONE" };
    }

    const nowMs = Date.now();
    const start = new Date(activeContest.start_time).getTime();
    const end = new Date(activeContest.end_time).getTime();

    if (nowMs < start) {
        return { label: "Upcoming", status: "UPCOMING" };
    }
    if (nowMs >= start && nowMs < end) {
        return { label: "Ongoing", status: "ONGOING" };
    }
    return { label: "Ended", status: "ENDED" };
}

const AdminCompetitionList: React.FC = () => {
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
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<ContestStatus | "ALL">("ALL");

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
                    getChallenges({ type: "competition" }),
                ]);
                if (!mounted) return;
                setCategories(cats || []);
                setDifficulties(diffs || []);
                setAllChallenges(chals || []);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load competition data. Please try again.");
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
            if (difficultyFilter && c.difficulty?.level !== difficultyFilter)
                return false;

            const meta = getContestMeta(c);
            if (statusFilter !== "ALL" && meta.status !== statusFilter) return false;

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
    }, [
        allChallenges,
        categoryFilter,
        difficultyFilter,
        statusFilter,
        search,
    ]);

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

            if (
                !window.confirm(
                    "Are you sure you want to delete this competition challenge? This cannot be undone."
                )
            )
                return;

            const backup = allChallenges;
            setAllChallenges((prev) => prev.filter((c) => c.id !== id));
            setMessage("Deleting challenge...");

            try {
                await deleteChallenge(id);
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
        setStatusFilter("ALL");
        setSearch("");
        setPage(1);
    };

    if (!user) {
        return (
            <>
                <Navbar />
                <main className="min-h-screen bg-slate-50 px-4 py-6">
                    <div className="mx-auto max-w-6xl text-sm text-slate-500">
                        Checking permissions…
                    </div>
                </main>
            </>
        );
    }

    if (user.role !== "admin") {
        return (
            <>
                <Navbar />
                <main className="min-h-screen bg-slate-50 px-4 py-6">
                    <div className="mx-auto max-w-4xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Unauthorized – admin access required.
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-8">
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto max-w-6xl"
                >
                    <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                                Manage Competition Challenges
                            </h1>
                            <p className="mt-1 text-xs md:text-sm text-slate-500">
                                Admin view of all competition-type challenges. Create, review,
                                and maintain contests from here.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/admin/contests/new")}
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                        >
                            <FiPlus size={16} />
                            <span>New Competition</span>
                        </button>
                    </header>

                    <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex w-full items-center gap-3 md:w-auto">
                                <div className="relative w-full md:w-[360px]">
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search challenges..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />

                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                <div className="relative">
                                    <select
                                        value={difficultyFilter}
                                        onChange={(e) => {
                                            setDifficultyFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Difficulty</option>
                                        {difficulties.map((d) => (
                                            <option key={d.id} value={d.level}>
                                                {d.level}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => {
                                            setCategoryFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Category</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.name}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    Reset
                                </button>

                                <span className="ml-1 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
        <span className="text-slate-500">Total:</span>
        <span className="ml-1 font-semibold text-slate-900">{total}</span>
      </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5">
                            {(
                                [
                                    { key: "ALL", label: "All" },
                                    { key: "ONGOING", label: "Ongoing" },
                                    { key: "UPCOMING", label: "Upcoming" },
                                    { key: "ENDED", label: "Ended" },
                                    { key: "NONE", label: "No contest" },
                                ] as { key: ContestStatus | "ALL"; label: string }[]
                            ).map((opt) => {
                                const active = statusFilter === opt.key;

                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => {
                                            setStatusFilter(opt.key);
                                            setPage(1);
                                        }}
                                        className={[
                                            "rounded-full border px-3 py-1 text-xs",
                                            active
                                                ? "border-slate-900 bg-slate-900 text-white"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                        ].join(" ")}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                    {loading && (
                        <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            Loading competition challenges…
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm">
                            {message}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-slate-500 shadow-sm">
                                    No competition challenges found.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Title
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Category
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Difficulty
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Contest Status
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                        {pageItems.map((c) => {
                                            const meta = getContestMeta(c);
                                            const difficulty = c.difficulty?.level || "N/A";
                                            return (
                                                <tr key={c.id}>
                                                    <td className="px-4 py-2 align-top">
                                                        <div className="max-w-xs">
                                                            <div className="truncate font-medium text-slate-900">
                                                                {c.title}
                                                            </div>
                                                            <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                                                {c.description}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                                                        {c.category?.name || "—"}
                                                    </td>
                                                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                                                        {difficulty}
                                                    </td>
                                                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                                                        {meta.label}
                                                    </td>
                                                    <td className="px-4 py-2 align-top">
                                                        <div className="flex justify-end gap-2 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    navigate(`/compete/${c.id}`)
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                <FiEye size={14} />
                                                                <span>View</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    navigate(`/admin/contests/${c.id}`)
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                <FiEdit2 size={14} />
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(c.id)}
                                                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                            >
                                                                <FiTrash2 size={14} />
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
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                                    <div>
                                        Page{" "}
                                        <span className="font-semibold text-slate-900">
                                            {page}
                                        </span>{" "}
                                        of{" "}
                                        <span className="font-semibold text-slate-900">
                                            {pageCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            type="button"
                                            disabled={page >= pageCount}
                                            onClick={() =>
                                                setPage((p) => Math.min(pageCount, p + 1))
                                            }
                                            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </main>
        </>
    );
};

export default AdminCompetitionList;
