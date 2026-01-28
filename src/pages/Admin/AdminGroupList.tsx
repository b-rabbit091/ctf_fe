import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {FiSearch, FiUsers, FiShield, FiTrash2, FiUserX, FiHash, FiAlertCircle, FiInfo} from "react-icons/fi";
import {AdminGroup, deleteGroup, getAllGroups, removeMember} from "../../api/groupsAdmin";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const inputBase =
    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

const chip = (active: boolean) =>
    cx(
        "inline-flex items-center rounded-full ring-1 px-3 py-1 text-xs sm:text-sm font-normal transition",
        active ? "ring-slate-900/80 bg-slate-900 text-white" : "ring-slate-200/60 bg-white/70 text-slate-600 hover:bg-white/90",
        focusRing
    );

const badge = (tone: "slate" | "emerald" | "amber", children: React.ReactNode) => {
    const map: Record<string, string> = {
        slate: "ring-slate-200/60 bg-slate-100/70 text-slate-700",
        emerald: "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700",
        amber: "ring-amber-200/60 bg-amber-50/70 text-amber-800",
    };

    return (
        <span className={cx("inline-flex items-center gap-1 rounded-full ring-1 px-3 py-1 text-xs sm:text-sm", map[tone])}>
            {children}
        </span>
    );
};

const fmtLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

const AdminGroupList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [groups, setGroups] = useState<AdminGroup[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [onlyNonEmpty, setOnlyNonEmpty] = useState(false);

    // lifecycle + concurrency guards
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const msgTimer = useRef<number | null>(null);
    const busyRef = useRef(false);

    const resetMessages = useCallback(() => {
        setError(null);
        setMessage(null);
    }, []);

    const flashMessage = useCallback((text: string | null) => {
        setMessage(text);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        if (!text) return;
        msgTimer.current = window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, 3200);
    }, []);

    const loadGroups = useCallback(async () => {
        if (!user || user.role !== "admin") return;

        try {
            setLoading(true);
            setError(null);
            const data = await getAllGroups();
            if (!alive.current) return;
            setGroups(Array.isArray(data) ? data : []);
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;
            setError("Failed to load groups. Please try again.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, [user]);

    // SECURITY (TOP) + initial fetch
    useEffect(() => {
        if (!user) return;

        if (user.role !== "admin") {
            navigate("/dashboard");
            return;
        }

        loadGroups();
    }, [user, navigate, loadGroups]);

    const filteredGroups = useMemo(() => {
        const q = search.trim().toLowerCase();

        return groups.filter((g) => {
            if (onlyNonEmpty && (g.members_count ?? 0) <= 0) return false;
            if (!q) return true;

            const nameMatch = (g.name || "").toLowerCase().includes(q);
            const idMatch = String(g.id).includes(q);
            const memberMatch = (g.members || []).some((m) => (m.username || "").toLowerCase().includes(q));

            return nameMatch || idMatch || memberMatch;
        });
    }, [groups, search, onlyNonEmpty]);

    const total = filteredGroups.length;

    const handleDeleteGroup = useCallback(
        async (group: AdminGroup) => {
            if (!user || user.role !== "admin") return;

            if (busyRef.current) return;
            if (!window.confirm(`Delete group "${group.name}" (ID: ${group.id})?\nThis cannot be undone.`)) return;

            resetMessages();
            busyRef.current = true;

            const backup = groups;

            try {
                // optimistic remove
                setGroups((prev) => prev.filter((g) => g.id !== group.id));
                await deleteGroup(group.id);
                if (!alive.current) return;
                flashMessage(`Group "${group.name}" has been deleted.`);
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;
                setGroups(backup);
                setError(e?.response?.data?.error || "Failed to delete group. Please try again.");
            } finally {
                busyRef.current = false;
            }
        },
        [user, resetMessages, groups, flashMessage]
    );

    const handleRemoveMember = useCallback(
        async (group: AdminGroup, userId: number, username: string) => {
            if (!user || user.role !== "admin") return;

            if (busyRef.current) return;
            if (!window.confirm(`Remove "${username}" from "${group.name}"?`)) return;

            resetMessages();
            busyRef.current = true;

            const backup = groups;

            try {
                // optimistic update
                setGroups((prev) =>
                    prev.map((g) => {
                        if (g.id !== group.id) return g;
                        const nextMembers = (g.members || []).filter((m) => m.user_id !== userId);
                        return {
                            ...g,
                            members: nextMembers,
                            members_count: Math.max(0, (g.members_count ?? nextMembers.length) - 1),
                        };
                    })
                );

                const resp = await removeMember(group.id, userId);
                if (!alive.current) return;
                flashMessage(resp?.detail || `Removed ${username} from ${group.name}.`);
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;
                setGroups(backup);
                setError(e?.response?.data?.error || "Failed to remove member. Please try again.");
            } finally {
                busyRef.current = false;
            }
        },
        [user, resetMessages, groups, flashMessage]
    );

    // -------- Guard states (match your newer admin pages) --------

    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
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

    // -------- Main UI --------

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden">
                        {/* Header */}
                        <header className="px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                        Manage Groups
                                    </h1>
                                    <p className="mt-1 text-sm sm:text-base text-slate-500">
                                        Search by group name, ID, or member username. Remove members or delete groups.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                        Total: <span className="ml-1 font-semibold text-slate-900">{total}</span>
                                    </span>

                                    <button
                                        type="button"
                                        onClick={loadGroups}
                                        className={cx(
                                            "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/70 px-4 text-xs sm:text-sm font-normal tracking-tight",
                                            "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        <FiUsers size={16} />
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Filters */}
                        <section className="px-4 sm:px-5 py-5 border-b border-slate-200/70">
                            <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                <div className="grid gap-3 md:grid-cols-12 md:items-end">
                                    <div className="md:col-span-6">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Search</label>
                                        <div className="relative">
                                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="search"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Search by group, id, member…"
                                                className={cx(inputBase, "pl-10")}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-6 flex flex-wrap items-end justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setOnlyNonEmpty((v) => !v)}
                                                className={chip(onlyNonEmpty)}
                                            >
                                                Only non-empty
                                            </button>

                                            <span className="text-xs text-slate-500">
                                                <FiInfo className="inline -mt-0.5 mr-1" />
                                                Filters are client-side.
                                            </span>
                                        </div>

                                        <div className="text-xs sm:text-sm text-slate-500">
                                            Showing <span className="font-semibold text-slate-900">{filteredGroups.length}</span> /{" "}
                                            <span className="font-semibold text-slate-900">{groups.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Alerts */}
                        {(loading || error || message) ? (
                            <div className="px-4 sm:px-5 pt-4">
                                {loading ? (
                                    <div className="mb-3 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                                        Loading groups…
                                    </div>
                                ) : null}

                                {error ? (
                                    <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                                        <div className="flex items-start gap-3">
                                            <FiAlertCircle className="mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-normal tracking-tight">Fix required</p>
                                                <p className="mt-1 text-sm whitespace-pre-line break-words text-rose-700/90">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {message ? (
                                    <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800">
                                        {message}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Table */}
                        <div className="px-4 sm:px-5 pb-6">
                            {!loading && !error ? (
                                total === 0 ? (
                                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                        <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                            <FiInfo className="text-slate-500" />
                                        </div>
                                        <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                            No groups found
                                        </div>
                                        <div className="mt-1 text-sm sm:text-base text-slate-500">
                                            Try adjusting your search or toggle.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                        <table className="min-w-full text-sm sm:text-base">
                                            <thead className="bg-white/40 sticky top-0">
                                            <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                                <th className="px-4 py-3 font-normal">Group</th>
                                                <th className="px-4 py-3 font-normal">Members</th>
                                                <th className="px-4 py-3 font-normal">Admin(s)</th>
                                                <th className="px-4 py-3 font-normal">Member details</th>
                                                <th className="px-4 py-3 text-right font-normal">Actions</th>
                                            </tr>
                                            </thead>

                                            <tbody className="bg-transparent">
                                            {filteredGroups.map((g) => {
                                                const members = g.members || [];
                                                const admins = members.filter((m) => m.is_admin);

                                                return (
                                                    <tr
                                                        key={g.id}
                                                        className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition"
                                                    >
                                                        {/* Group */}
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="max-w-[18rem]">
                                                                <div className="flex items-center gap-2">
                                                                        <span className="inline-flex items-center gap-1 rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs text-slate-700">
                                                                            <FiHash size={12} />
                                                                            {g.id}
                                                                        </span>
                                                                    <div className="truncate font-normal tracking-tight text-slate-700">
                                                                        {g.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Members count */}
                                                        <td className="px-4 py-3 align-top">
                                                            {badge("slate", (
                                                                <>
                                                                    <FiUsers size={12} />
                                                                    {g.members_count ?? 0}
                                                                </>
                                                            ))}
                                                        </td>

                                                        {/* Admins */}
                                                        <td className="px-4 py-3 align-top">
                                                            {admins.length === 0 ? (
                                                                <span className="text-xs text-slate-500">—</span>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {admins.map((a) => (
                                                                        <span
                                                                            key={a.user_id}
                                                                            className="inline-flex items-center gap-1 rounded-full ring-1 ring-emerald-200/60 bg-emerald-50/70 px-3 py-1 text-xs text-emerald-700"
                                                                        >
                                                                                <FiShield size={12} />
                                                                            {a.username}
                                                                            </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Member details */}
                                                        <td className="px-4 py-3 align-top">
                                                            {members.length === 0 ? (
                                                                <div className="text-xs text-slate-500">No members</div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {members.map((m) => (
                                                                        <div
                                                                            key={`${g.id}-${m.user_id}`}
                                                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl ring-1 ring-slate-200/60 bg-white/70 px-3 py-2"
                                                                        >
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2">
                                                                                        <span className="truncate text-xs sm:text-sm font-medium text-slate-900">
                                                                                            {m.username}
                                                                                        </span>
                                                                                    {m.is_admin ? (
                                                                                        <span className="inline-flex items-center gap-1 rounded-full ring-1 ring-emerald-200/60 bg-emerald-50/70 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                                                                                <FiShield size={11} />
                                                                                                Admin
                                                                                            </span>
                                                                                    ) : null}
                                                                                </div>
                                                                                <div className="text-[11px] sm:text-xs text-slate-500">
                                                                                    Joined: {fmtLocal(m.joined_date)}
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-2 justify-end">
                                                                                    <span className="text-[11px] sm:text-xs text-slate-600">
                                                                                        User ID:{" "}
                                                                                        <span className="font-medium text-slate-800">{m.user_id}</span>
                                                                                    </span>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveMember(g, m.user_id, m.username)}
                                                                                    className={cx(
                                                                                        "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-[11px] sm:text-xs font-normal tracking-tight",
                                                                                        "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                                                                        focusRing
                                                                                    )}
                                                                                >
                                                                                    <FiUserX size={14} />
                                                                                    <span>Remove</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteGroup(g)}
                                                                    className={cx(
                                                                        "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                        "ring-1 ring-rose-200/60 text-rose-700 hover:bg-white/90",
                                                                        focusRing
                                                                    )}
                                                                >
                                                                    <FiTrash2 size={16} />
                                                                    <span className="hidden sm:inline">Delete Group</span>
                                                                    <span className="sm:hidden">Delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : null}
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminGroupList;
