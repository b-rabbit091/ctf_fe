// src/pages/Admin/AdminUserList.tsx
import React, {useEffect, useMemo, useState, useCallback, FormEvent} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {
    AdminUser,
    getUsers,
    updateUser,
    deleteUser,
    inviteAdmin,
} from "../../api/usersAdmin";
import {FiTrash2, FiUserX, FiUserCheck, FiSend} from "react-icons/fi";

type RoleFilter = "ALL" | "ADMIN" | "STUDENT" | "UNKNOWN";
type StatusFilter = "ALL" | "ACTIVE" | "PENDING";

const AdminUserList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

    // Invite admin form
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteUsername, setInviteUsername] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);

    const resetMessages = () => {
        setError(null);
        setMessage(null);
    };

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getUsers();
            setUsers(data);
        } catch (e: any) {
            console.error(e);
            setError("Failed to load users. Please try again.");
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

        loadUsers();
    }, [user, navigate, loadUsers]);

    const filteredUsers = useMemo(() => {
        const searchLower = search.trim().toLowerCase();

        return users.filter((u) => {
            const roleName = u.role_name?.toLowerCase() || "";

            // Role filter
            if (roleFilter === "ADMIN" && roleName !== "admin") return false;
            if (roleFilter === "STUDENT" && roleName !== "student") return false;
            if (roleFilter === "UNKNOWN" && roleName) return false;

            // Status filter
            if (statusFilter === "ACTIVE" && !u.is_active) return false;
            if (statusFilter === "PENDING" && u.is_active) return false;

            if (!searchLower) return true;

            return (
                u.username.toLowerCase().includes(searchLower) ||
                u.email.toLowerCase().includes(searchLower) ||
                roleName.includes(searchLower)
            );
        });
    }, [users, search, roleFilter, statusFilter]);

    const total = filteredUsers.length;

    const handleToggleActive = async (u: AdminUser) => {
        if (!window.confirm(`Are you sure you want to ${u.is_active ? "deactivate" : "activate"} this user?`)) {
            return;
        }

        resetMessages();
        const backup = [...users];

        try {
            setUsers((prev) =>
                prev.map((x) =>
                    x.id === u.id ? {...x, is_active: !u.is_active} : x
                )
            );
            const updated = await updateUser(u.id, {is_active: !u.is_active});
            setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
            setMessage(
                `User ${u.username} has been ${updated.is_active ? "activated" : "deactivated"}.`
            );
        } catch (e: any) {
            console.error(e);
            setUsers(backup);
            setError("Failed to update user status. Please try again.");
        }
    };

    const handleDelete = async (u: AdminUser) => {
        if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) {
            return;
        }

        resetMessages();
        const backup = [...users];

        try {
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
            await deleteUser(u.id);
            setMessage(`User ${u.username} has been deleted.`);
        } catch (e: any) {
            console.error(e);
            setUsers(backup);
            setError("Failed to delete user. Please try again.");
        }
    };

    const handleInviteAdmin = async (e: FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!inviteEmail.trim() || !inviteUsername.trim()) {
            setError("Email and username are required to invite a new admin.");
            return;
        }

        setInviteLoading(true);
        try {
            const resp = await inviteAdmin({
                email: inviteEmail.trim(),
                username: inviteUsername.trim(),
            });
            setMessage(resp.detail || "Admin invite sent successfully.");
            setInviteEmail("");
            setInviteUsername("");
            // Optionally reload user list, but new admin will only appear after verification
        } catch (err: any) {
            console.error(err);
            setError(
                err?.response?.data?.error ||
                "Failed to send admin invite. Please check the email and try again."
            );
        } finally {
            setInviteLoading(false);
        }
    };

    // -------- Guard states (same pattern as other admin pages) --------

    if (!user) {
        return (
            <>
                <Navbar/>
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
                <Navbar/>
                <main className="min-h-screen bg-slate-50 px-4 py-6">
                    <div
                        className="mx-auto max-w-4xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Unauthorized – admin access required.
                    </div>
                </main>
            </>
        );
    }

    // -------- Main UI --------

    return (
        <>
            <Navbar/>
            <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-8">
                <motion.div
                    initial={{opacity: 0, y: 6}}
                    animate={{opacity: 1, y: 0}}
                    className="mx-auto max-w-6xl"
                >
                    {/* Header */}
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                                Manage Users
                            </h1>
                            <p className="mt-1 text-xs md:text-sm text-slate-500">
                                Admin view of all registered users. Review, deactivate, or remove
                                accounts. New admins are added via secure email invites.
                            </p>
                        </div>

                        {/* Invite new admin card (compact) */}
                        <div
                            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Invite New Admin
                            </p>
                            <form onSubmit={handleInviteAdmin} className="space-y-2">
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Admin email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={inviteUsername}
                                        onChange={(e) => setInviteUsername(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                                >
                                    <FiSend size={14}/>
                                    <span>{inviteLoading ? "Sending…" : "Send Invite"}</span>
                                </button>
                                <p className="text-[10px] text-slate-400">
                                    An email with a secure verification link will be sent. The new
                                    admin sets their own password after verifying.
                                </p>
                            </form>
                        </div>
                    </header>

                    {/* Filters */}
                    <section
                        className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by username, email, or role…"
                                className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />

                            {/* Role filter */}
                            <div className="flex flex-wrap items-center gap-1 text-[11px] md:text-xs">
                                <span className="mr-1 text-slate-500">Role:</span>
                                {[
                                    {key: "ALL", label: "All"},
                                    {key: "ADMIN", label: "Admin"},
                                    {key: "STUDENT", label: "Student"},
                                ].map((opt) => {
                                    const active = roleFilter === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setRoleFilter(opt.key as RoleFilter)}
                                            className={[
                                                "rounded-full border px-2.5 py-1 transition-colors",
                                                active
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                            ].join(" ")}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Status filter */}
                            <div className="flex flex-wrap items-center gap-1 text-[11px] md:text-xs">
                                <span className="mr-1 text-slate-500">Status:</span>
                                {[
                                    {key: "ALL", label: "All"},
                                    {key: "ACTIVE", label: "Active"},
                                    {key: "PENDING", label: "Pending"},
                                ].map((opt) => {
                                    const active = statusFilter === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() =>
                                                setStatusFilter(opt.key as StatusFilter)
                                            }
                                            className={[
                                                "rounded-full border px-2.5 py-1 transition-colors",
                                                active
                                                    ? "border-slate-900 bg-slate-900 text-white"
                                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                            ].join(" ")}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="ml-auto text-xs text-slate-500">
                                Total:{" "}
                                <span className="font-medium text-slate-800">{total}</span>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {loading && (
                        <div
                            className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            Loading users…
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
                                    No users found for the selected filters.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                User
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Role
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Status
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Joined
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Last Login
                                            </th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredUsers.map((u) => {
                                            const roleName = u.role_name?.toLowerCase() || "";

                                            const statusLabel = u.is_active
                                                ? "Active"
                                                : "Pending verification";
                                            const statusClass = u.is_active
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200";

                                            const joined = new Date(u.date_joined).toLocaleString();
                                            const lastLogin = u.last_login
                                                ? new Date(u.last_login).toLocaleString()
                                                : "—";

                                            return (
                                                <tr key={u.id}>
                                                    <td className="px-4 py-2 align-top">
                                                        <div className="max-w-xs">
                                                            <div className="truncate font-medium text-slate-900">
                                                                {u.username}
                                                            </div>
                                                            <div className="truncate text-xs text-slate-500">
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                                                        {roleName}
                                                    </td>
                                                    <td className="px-4 py-2 align-top">
                              <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                                                    </td>
                                                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                                                        {joined}
                                                    </td>
                                                    <td className="px-4 py-2 align-top text-xs text-slate-700">
                                                        {lastLogin}
                                                    </td>
                                                    <td className="px-4 py-2 align-top">
                                                        <div className="flex justify-end gap-2 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleActive(u)}
                                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                {u.is_active ? (
                                                                    <>
                                                                        <FiUserX size={14}/>
                                                                        <span>Deactivate</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FiUserCheck size={14}/>
                                                                        <span>Activate</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(u)}
                                                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                            >
                                                                <FiTrash2 size={14}/>
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
                        </>
                    )}
                </motion.div>
            </main>
        </>
    );
};

export default AdminUserList;
