import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import api from "../../api/axios";
import {FiPlus, FiEye, FiEdit2, FiTrash2} from "react-icons/fi";

type ContestType = "daily" | "weekly" | "monthly" | "custom";

type ContestDTO = {
    id: number;
    name: string;
    slug: string;
    description?: string;
    contest_type: ContestType;
    start_time: string;
    end_time: string;
    is_active: boolean;
    publish_result: boolean;
};

type ContestStatus = "ONGOING" | "UPCOMING" | "ENDED";

function getContestStatus(contest: ContestDTO): { label: string; status: ContestStatus } {
    const now = Date.now();
    const start = new Date(contest.start_time).getTime();
    const end = new Date(contest.end_time).getTime();

    if (now < start) return {label: "Upcoming", status: "UPCOMING"};
    if (now >= start && now < end) return {label: "Ongoing", status: "ONGOING"};
    return {label: "Ended", status: "ENDED"};
}

const AdminContestList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [contests, setContests] = useState<ContestDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<ContestStatus | "ALL">("ALL");

    const [page, setPage] = useState(1);
    const pageSize = 10;

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user) return;

        let mounted = true;

        const fetchContests = async () => {
            setLoading(true);
            setError(null);
            try {
                // ✅ uses your existing contest endpoint you used elsewhere
                const res = await api.get<ContestDTO[]>("/challenges/contests/");
                if (!mounted) return;
                setContests(res.data || []);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load contests. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchContests();
        return () => {
            mounted = false;
        };
    }, [user]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return contests.filter((c) => {
            const meta = getContestStatus(c);
            if (statusFilter !== "ALL" && meta.status !== statusFilter) return false;

            if (!q) return true;

            const name = (c.name || "").toLowerCase();
            const slug = (c.slug || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const type = (c.contest_type || "").toLowerCase();
            return (
                name.includes(q) ||
                slug.includes(q) ||
                desc.includes(q) ||
                type.includes(q)
            );
        });
    }, [contests, search, statusFilter]);

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page]);

    const handleDelete = useCallback(
        async (id: number) => {
            if (!user || user.role !== "admin") {
                setMessage("Unauthorized: admin only.");
                return;
            }

            if (!window.confirm("Are you sure you want to delete this contest? This cannot be undone.")) return;

            const backup = contests;
            setContests((prev) => prev.filter((c) => c.id !== id));
            setMessage("Deleting contest...");

            try {
                await api.delete(`/challenges/contests/${id}/`);
                setMessage("Contest deleted.");
            } catch (err) {
                console.error(err);
                setContests(backup);
                setMessage("Failed to delete contest.");
            } finally {
                setTimeout(() => setMessage(null), 3500);
            }
        },
        [contests, user]
    );

    const handleClearFilters = () => {
        setStatusFilter("ALL");
        setSearch("");
        setPage(1);
    };

    // --- full-screen responsive shell for all states ---
    if (!user) {
        return (
            <div className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
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
            <div className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                    <div className="w-full whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg font-normal text-rose-700 shadow-sm backdrop-blur-xl">
                        Unauthorized – admin access required.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
            <Navbar/>

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    <div className="w-full rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/40 bg-white/40 px-6 py-5 backdrop-blur-xl">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl sm:text-3xl font-normal text-slate-700 tracking-tight">
                                    Manage Contests
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-600">
                                    Admin view of all contests. Create, review, edit, and delete contests from here.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/admin/contests/new")}
                                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-2.5 text-sm sm:text-base font-normal text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                            >
                                <FiPlus size={18}/>
                                <span>New Contest</span>
                            </button>
                        </div>

                        {/* Filters */}
                        <section className="px-6 py-6">
                            <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white/40 shadow-sm backdrop-blur-xl">
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
                                                placeholder="Search contests..."
                                                className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {(
                                                [
                                                    {key: "ALL", label: "All"},
                                                    {key: "ONGOING", label: "Ongoing"},
                                                    {key: "UPCOMING", label: "Upcoming"},
                                                    {key: "ENDED", label: "Ended"},
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
                                                            "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
                                                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
                                                            active
                                                                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                                                                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
                                                        ].join(" ")}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleClearFilters}
                                            className="h-10 rounded-xl border border-slate-200/70 bg-white/70 px-4 text-sm sm:text-base font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                        >
                                            Reset
                                        </button>

                                        <span className="ml-1 inline-flex h-10 items-center rounded-xl border border-slate-200/70 bg-slate-100/70 px-4 text-sm sm:text-base text-slate-700">
                                            <span className="text-slate-500">Total:</span>
                                            <span className="ml-1 font-normal text-slate-800">{total}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {loading && (
                                <div className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    Loading contests…
                                </div>
                            )}
                            {error && (
                                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/80 px-5 py-4 text-sm sm:text-base text-blue-800 shadow-sm backdrop-blur-xl">
                                    {message}
                                </div>
                            )}

                            {!loading && !error && (
                                <>
                                    {total === 0 ? (
                                        <div className="rounded-2xl border border-white/30 bg-white/55 px-5 py-8 text-center text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                            No contests found.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-xl">
                                            <table className="min-w-full divide-y divide-slate-200/70 text-sm sm:text-base">
                                                <thead className="bg-slate-50/70">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                        Name
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                        Type
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                        Window
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                        Status
                                                    </th>
                                                    <th className="px-4 py-3 text-right text-xs sm:text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
                                                        Actions
                                                    </th>
                                                </tr>
                                                </thead>

                                                <tbody className="divide-y divide-slate-100/70 bg-white/60">
                                                {pageItems.map((c) => {
                                                    const meta = getContestStatus(c);
                                                    const start = new Date(c.start_time);
                                                    const end = new Date(c.end_time);

                                                    const windowLabel = `${start.toLocaleString()} → ${end.toLocaleString()}`;

                                                    return (
                                                        <tr key={c.id}>
                                                            <td className="px-4 py-3 align-top">
                                                                <div className="max-w-xs">
                                                                    <div className="truncate font-normal text-slate-800 text-sm sm:text-base">
                                                                        {c.name}
                                                                    </div>
                                                                    <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                                        {c.description || "—"}
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-slate-500">
                                                                        slug: <span className="font-mono">{c.slug}</span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-700">
                                                                {c.contest_type}
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-700">
                                                                <div className="max-w-sm line-clamp-2">{windowLabel}</div>
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-700">
                                                                {meta.label}
                                                            </td>

                                                            <td className="px-4 py-3 align-top">
                                                                <div className="flex justify-end gap-2 text-sm">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigate(`/admin/contests/${c.id}/view`)}
                                                                        className="inline-flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                                    >
                                                                        <FiEye size={16}/>
                                                                        <span>View</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigate(`/admin/contests/${c.id}`)}
                                                                        className="inline-flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                                    >
                                                                        <FiEdit2 size={16}/>
                                                                        <span>Edit</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDelete(c.id)}
                                                                        className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-sm font-normal text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
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
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-600">
                                            <div>
                                                Page <span className="font-normal text-slate-800">{page}</span> of{" "}
                                                <span className="font-normal text-slate-800">{pageCount}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={page <= 1}
                                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                    className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-2 text-sm font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Prev
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={page >= pageCount}
                                                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                                    className="rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-2 text-sm font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminContestList;
