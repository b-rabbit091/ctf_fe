import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import {FiSearch, FiUsers, FiShield, FiTrash2, FiUserX, FiHash} from "react-icons/fi";

import {AdminGroup, deleteGroup, getAllGroups, removeMember} from "../../api/groupsAdmin";

const AdminGroupList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [groups, setGroups] = useState<AdminGroup[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [onlyNonEmpty, setOnlyNonEmpty] = useState(false);

    const resetMessages = () => {
        setError(null);
        setMessage(null);
    };

    const loadGroups = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAllGroups();
            setGroups(Array.isArray(data) ? data : []);
        } catch (e: any) {
            console.error(e);
            setError("Failed to load groups. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

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

    const handleDeleteGroup = async (group: AdminGroup) => {
        if (!window.confirm(`Delete group "${group.name}" (ID: ${group.id})?\nThis cannot be undone.`)) {
            return;
        }

        resetMessages();
        const backup = [...groups];

        try {
            // optimistic remove
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
            await deleteGroup(group.id);
            setMessage(`Group "${group.name}" has been deleted.`);
        } catch (e: any) {
            console.error(e);
            setGroups(backup);
            setError(e?.response?.data?.error || "Failed to delete group. Please try again.");
        }
    };

    const handleRemoveMember = async (group: AdminGroup, userId: number, username: string) => {
        if (!window.confirm(`Remove "${username}" from "${group.name}"?`)) {
            return;
        }

        resetMessages();
        const backup = [...groups];

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
            setMessage(resp?.detail || `Removed ${username} from ${group.name}.`);

            // Optional: hard refresh to ensure counts/admin flags stay consistent
            // await loadGroups();
        } catch (e: any) {
            console.error(e);
            setGroups(backup);
            setError(e?.response?.data?.error || "Failed to remove member. Please try again.");
        }
    };

    // -------- Guard states --------

    if (!user) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full text-sm text-slate-500">Checking permissions…</div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Unauthorized – admin access required.
                    </div>
                </main>
            </div>
        );
    }

    // -------- Main UI --------

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar/>

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    {/* Header */}
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Manage Groups</h1>
                            <p className="mt-1 text-xs md:text-sm text-slate-500">
                                Admin view of all groups and memberships. Search by group name, ID, or member username.
                                You can remove
                                members or delete groups.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadGroups}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            <FiUsers size={14}/>
                            Refresh
                        </button>
                    </header>

                    {/* Filters */}
                    <section
                        className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full max-w-xs">
                                <FiSearch
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by group, id, member…"
                                    className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
                                <button
                                    type="button"
                                    onClick={() => setOnlyNonEmpty((v) => !v)}
                                    className={[
                                        "rounded-full border px-2.5 py-1 transition-colors",
                                        onlyNonEmpty
                                            ? "border-slate-900 bg-slate-900 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                    ].join(" ")}
                                >
                                    Only non-empty
                                </button>
                            </div>

                            <div className="ml-auto text-xs text-slate-500">
                                Total: <span className="font-medium text-slate-800">{total}</span>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {loading && (
                        <div
                            className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            Loading groups…
                        </div>
                    )}
                    {error && (
                        <div
                            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div
                            className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm">
                            {message}
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div
                                    className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-slate-500 shadow-sm">
                                    No groups found for the selected filters.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Group
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Members
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Admin(s)
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Member details
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredGroups.map((g) => {
                                            const members = g.members || [];
                                            const admins = members.filter((m) => m.is_admin);

                                            return (
                                                <tr key={g.id}>
                                                    {/* Group */}
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="max-w-xs">
                                                            <div className="flex items-center gap-2">
                                  <span
                                      className="inline-flex items-center gap-1 rounded-md bg-slate-900/5 px-2 py-0.5 text-[11px] text-slate-700">
                                    <FiHash size={12}/>
                                      {g.id}
                                  </span>
                                                                <div
                                                                    className="truncate font-medium text-slate-900">{g.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Members count */}
                                                    <td className="px-4 py-3 align-top">
                              <span
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                                <FiUsers size={12}/>
                                  {g.members_count ?? 0}
                              </span>
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
                                                                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                                                                    >
                                      <FiShield size={12}/>
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
                                                                {members.map((m) => {
                                                                    const joined = new Date(m.joined_date).toLocaleString();

                                                                    return (
                                                                        <div
                                                                            key={`${g.id}-${m.user_id}`}
                                                                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                                                        >
                                                                            <div className="min-w-0">
                                                                                <div
                                                                                    className="flex items-center gap-2">
                                            <span className="truncate text-xs font-medium text-slate-900">
                                              {m.username}
                                            </span>
                                                                                    {m.is_admin && (
                                                                                        <span
                                                                                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                                <FiShield size={11}/>
                                                Admin
                                              </span>
                                                                                    )}
                                                                                </div>
                                                                                <div
                                                                                    className="text-[11px] text-slate-500">Joined: {joined}</div>
                                                                            </div>

                                                                            <div className="flex items-center gap-2">
                                          <span className="text-[11px] text-slate-600">
                                            User ID:{" "}
                                              <span className="font-medium text-slate-800">{m.user_id}</span>
                                          </span>

                                                                                {/* Remove member */}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveMember(g, m.user_id, m.username)}
                                                                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                                                                >
                                                                                    <FiUserX size={12}/>
                                                                                    Remove
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteGroup(g)}
                                                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                            >
                                                                <FiTrash2 size={14}/>
                                                                Delete Group
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
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default AdminGroupList;
