// src/pages/Admin/AdminUserList.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState, FormEvent} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {AdminUser, getUsers, updateUser, deleteUser, inviteAdmin} from "../../api/usersAdmin";
import {FiTrash2, FiUserX, FiUserCheck, FiSend, FiAlertCircle, FiInfo} from "react-icons/fi";

type RoleFilter = "ALL" | "ADMIN" | "STUDENT" | "UNKNOWN";
type StatusFilter = "ALL" | "ACTIVE" | "PENDING";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const inputBase =
    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

const buttonChip = (active: boolean) =>
    cx(
        "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
        active
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        focusRing
    );

const badgeTone = (tone: "emerald" | "amber") =>
    tone === "emerald"
        ? "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700"
        : "ring-amber-200/60 bg-amber-50/70 text-amber-800";

const fmtLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

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

    // lifecycle + concurrency guards
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const busyRef = useRef(false);
    const inviteBusyRef = useRef(false);

    const msgTimer = useRef<number | null>(null);

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

    const loadUsers = useCallback(async () => {
        if (!user || user.role !== "admin") return;

        try {
            setLoading(true);
            setError(null);
            const data = await getUsers();
            if (!alive.current) return;
            setUsers(Array.isArray(data) ? data : []);
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;
            setError("Failed to load users. Please try again.");
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
        loadUsers();
    }, [user, navigate, loadUsers]);

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();

        return users.filter((u) => {
            const roleName = (u.role_name || "").toLowerCase();
            const username = (u.username || "").toLowerCase();
            const email = (u.email || "").toLowerCase();

            // Role
            if (roleFilter === "ADMIN" && roleName !== "admin") return false;
            if (roleFilter === "STUDENT" && roleName !== "student") return false;
            if (roleFilter === "UNKNOWN" && roleName) return false;

            // Status
            if (statusFilter === "ACTIVE" && !u.is_active) return false;
            if (statusFilter === "PENDING" && u.is_active) return false;

            if (!q) return true;
            return username.includes(q) || email.includes(q) || roleName.includes(q);
        });
    }, [users, search, roleFilter, statusFilter]);

    const total = filteredUsers.length;

    const handleToggleActive = useCallback(
        async (u: AdminUser) => {
            if (!user || user.role !== "admin") return;

            if (busyRef.current) return;
            if (!window.confirm(`Are you sure you want to ${u.is_active ? "deactivate" : "activate"} this user?`)) return;

            resetMessages();
            busyRef.current = true;

            const backup = users;

            try {
                // optimistic
                setUsers((prev) => prev.map((x) => (x.id === u.id ? {...x, is_active: !u.is_active} : x)));

                const updated = await updateUser(u.id, {is_active: !u.is_active});
                if (!alive.current) return;

                setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
                flashMessage(`User ${u.username} has been ${updated.is_active ? "activated" : "deactivated"}.`);
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;
                setUsers(backup);
                setError("Failed to update user status. Please try again.");
            } finally {
                busyRef.current = false;
            }
        },
        [user, resetMessages, users, flashMessage]
    );

    const handleDelete = useCallback(
        async (u: AdminUser) => {
            if (!user || user.role !== "admin") return;

            if (busyRef.current) return;
            if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;

            resetMessages();
            busyRef.current = true;

            const backup = users;

            try {
                // optimistic
                setUsers((prev) => prev.filter((x) => x.id !== u.id));
                await deleteUser(u.id);
                if (!alive.current) return;
                flashMessage(`User ${u.username} has been deleted.`);
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;
                setUsers(backup);
                setError("Failed to delete user. Please try again.");
            } finally {
                busyRef.current = false;
            }
        },
        [user, resetMessages, users, flashMessage]
    );

    const handleInviteAdmin = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            resetMessages();

            if (!user || user.role !== "admin") {
                setError("Unauthorized – admin only.");
                return;
            }

            const email = inviteEmail.trim();
            const username = inviteUsername.trim();

            if (!email || !username) {
                setError("Email and username are required to invite a new admin.");
                return;
            }

            // lightweight client validation
            const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (!emailOk) {
                setError("Please enter a valid email address.");
                return;
            }
            if (username.length < 3) {
                setError("Username must be at least 3 characters.");
                return;
            }

            if (inviteBusyRef.current) return;
            inviteBusyRef.current = true;

            setInviteLoading(true);
            try {
                const resp = await inviteAdmin({email, username});
                if (!alive.current) return;

                flashMessage(resp?.detail || "Admin invite sent successfully.");
                setInviteEmail("");
                setInviteUsername("");
                // do NOT auto-reload; invited admin may not exist until verified
            } catch (err: any) {
                console.error(err);
                if (!alive.current) return;
                setError(err?.response?.data?.error || "Failed to send admin invite. Please check the email and try again.");
            } finally {
                inviteBusyRef.current = false;
                if (!alive.current) return;
                setInviteLoading(false);
            }
        },
        [resetMessages, user, inviteEmail, inviteUsername, flashMessage]
    );

    // -------- Guard states (match styling pattern used above) --------

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
                                        Manage Users
                                    </h1>
                                    <p className="mt-1 text-sm sm:text-base text-slate-500">
                                        Admin view of registered users. Review, deactivate, or remove accounts. New admins are added via secure email invites.
                                    </p>
                                </div>

                                <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                    Total: <span className="ml-1 font-semibold text-slate-900">{total}</span>
                                </span>
                            </div>
                        </header>

                        {/* Top grid: filters + invite */}
                        <section className="px-4 sm:px-5 py-5 border-b border-slate-200/70">
                            <div className="grid gap-4 lg:grid-cols-12">
                                {/* Filters */}
                                <div className="lg:col-span-8">
                                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                        <div className="grid gap-3 md:grid-cols-12 md:items-end">
                                            <div className="md:col-span-5">
                                                <label className="mb-1 block text-sm font-normal text-slate-600">Search</label>
                                                <input
                                                    type="search"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    placeholder="Search by username, email, or role…"
                                                    className={inputBase}
                                                />
                                            </div>

                                            <div className="md:col-span-7">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs sm:text-sm text-slate-500">Role:</span>
                                                        {[
                                                            {key: "ALL", label: "All"},
                                                            {key: "ADMIN", label: "Admin"},
                                                            {key: "STUDENT", label: "Student"},
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.key}
                                                                type="button"
                                                                onClick={() => setRoleFilter(opt.key as RoleFilter)}
                                                                className={buttonChip(roleFilter === opt.key)}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs sm:text-sm text-slate-500">Status:</span>
                                                        {[
                                                            {key: "ALL", label: "All"},
                                                            {key: "ACTIVE", label: "Active"},
                                                            {key: "PENDING", label: "Pending"},
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.key}
                                                                type="button"
                                                                onClick={() => setStatusFilter(opt.key as StatusFilter)}
                                                                className={buttonChip(statusFilter === opt.key)}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 text-xs sm:text-sm text-slate-500">
                                            Showing <span className="font-semibold text-slate-900">{filteredUsers.length}</span> /{" "}
                                            <span className="font-semibold text-slate-900">{users.length}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Invite new admin */}
                                <div className="lg:col-span-4">
                                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-normal tracking-tight text-slate-700">Invite New Admin</p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Sends a secure verification link.
                                                </p>
                                            </div>
                                            <span className="inline-flex items-center rounded-full ring-1 ring-amber-200/60 bg-amber-50/70 px-3 py-1 text-xs text-amber-800">
                                                Admin-only
                                            </span>
                                        </div>

                                        <form onSubmit={handleInviteAdmin} className="mt-3 space-y-3">
                                            <div>
                                                <label className="mb-1 block text-sm font-normal text-slate-600">Admin email</label>
                                                <input
                                                    type="email"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    className={inputBase}
                                                    placeholder="name@domain.com"
                                                    autoComplete="email"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-normal text-slate-600">Username</label>
                                                <input
                                                    type="text"
                                                    value={inviteUsername}
                                                    onChange={(e) => setInviteUsername(e.target.value)}
                                                    className={inputBase}
                                                    placeholder="username"
                                                    autoComplete="off"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={inviteLoading}
                                                className={cx(
                                                    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm sm:text-base font-normal tracking-tight",
                                                    inviteLoading
                                                        ? "cursor-not-allowed ring-1 ring-slate-200/60 bg-white/60 text-slate-300"
                                                        : "ring-1 ring-emerald-200/60 bg-white/70 text-emerald-700 hover:bg-white/90",
                                                    focusRing
                                                )}
                                            >
                                                <FiSend size={16} />
                                                <span>{inviteLoading ? "Sending…" : "Send Invite"}</span>
                                            </button>

                                            <p className="text-xs text-slate-500">
                                                <FiInfo className="inline -mt-0.5 mr-1" />
                                                The new admin sets their password after verifying.
                                            </p>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Alerts */}
                        {(loading || error || message) ? (
                            <div className="px-4 sm:px-5 pt-4">
                                {loading ? (
                                    <div className="mb-3 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                                        Loading users…
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
                                            No users found
                                        </div>
                                        <div className="mt-1 text-sm sm:text-base text-slate-500">
                                            Try adjusting your filters or search.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                        <table className="min-w-full text-sm sm:text-base">
                                            <thead className="bg-white/40 sticky top-0">
                                            <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                                <th className="px-4 py-3 font-normal">User</th>
                                                <th className="px-4 py-3 font-normal">Role</th>
                                                <th className="px-4 py-3 font-normal">Status</th>
                                                <th className="px-4 py-3 font-normal">Joined</th>
                                                <th className="px-4 py-3 font-normal">Last Login</th>
                                                <th className="px-4 py-3 text-right font-normal">Actions</th>
                                            </tr>
                                            </thead>

                                            <tbody className="bg-transparent">
                                            {filteredUsers.map((u) => {
                                                const roleName = (u.role_name || "").toLowerCase() || "unknown";
                                                const statusLabel = u.is_active ? "Active" : "Pending verification";
                                                const statusStyle = cx(
                                                    "inline-flex items-center rounded-full ring-1 px-3 py-1 text-xs sm:text-sm",
                                                    u.is_active ? badgeTone("emerald") : badgeTone("amber")
                                                );

                                                return (
                                                    <tr
                                                        key={u.id}
                                                        className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition"
                                                    >
                                                        <td className="px-4 py-3 align-top">
                                                            <div className="max-w-[18rem]">
                                                                <div className="truncate font-normal tracking-tight text-slate-700">
                                                                    {u.username}
                                                                </div>
                                                                <div className="truncate text-xs sm:text-sm text-slate-500">
                                                                    {u.email}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 align-top text-slate-600 capitalize">{roleName}</td>

                                                        <td className="px-4 py-3 align-top">
                                                            <span className={statusStyle}>{statusLabel}</span>
                                                        </td>

                                                        <td className="px-4 py-3 align-top text-slate-600">{fmtLocal(u.date_joined)}</td>

                                                        <td className="px-4 py-3 align-top text-slate-600">{fmtLocal(u.last_login)}</td>

                                                        <td className="px-4 py-3 align-top">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleActive(u)}
                                                                    className={cx(
                                                                        "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                        "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                                                        focusRing
                                                                    )}
                                                                >
                                                                    {u.is_active ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
                                                                    <span className="hidden sm:inline">{u.is_active ? "Deactivate" : "Activate"}</span>
                                                                    <span className="sm:hidden">{u.is_active ? "Off" : "On"}</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(u)}
                                                                    className={cx(
                                                                        "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                        "ring-1 ring-rose-200/60 text-rose-700 hover:bg-white/90",
                                                                        focusRing
                                                                    )}
                                                                >
                                                                    <FiTrash2 size={16} />
                                                                    <span className="hidden sm:inline">Delete</span>
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

export default AdminUserList;
