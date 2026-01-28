// src/pages/groups/UserGroupPage.tsx
import React, {useCallback, useEffect, useMemo, useState, FormEvent} from "react";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import {
    getMyGroupDashboard,
    createGroup,
    searchUsersForGroup,
    sendGroupInvite,
    deleteGroup,
    removeGroupMember,
    setGroupAdmin,
    getMyIncomingGroupInvites,
    acceptGroupInvite,
    declineGroupInvite,
    GroupDashboardResponse,
    GroupMember,
    GroupInvite,
    UserSearchResult,
    IncomingInvite,
} from "../../api/usersGroup";

import {
    FiTrash2,
    FiUserX,
    FiUserCheck,
    FiSend,
    FiUsers,
    FiInbox,
    FiCheck,
    FiX,
} from "react-icons/fi";

import {safeApi} from "../../utils/apiError";

const MIN_ALLOWED = 2;
const MAX_ALLOWED = 10;

function isNumericString(s: string) {
    return /^\d+$/.test(s);
}

type AnyObj = Record<string, any>;

function isObject(v: any): v is AnyObj {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function extractSuccessMessage(data: any): string | null {
    if (data == null) return null;
    if (typeof data === "string") return data.trim() || null;
    if (isObject(data)) {
        const direct = data.detail ?? data.message ?? data.msg ?? data.success ?? null;
        if (typeof direct === "string" && direct.trim()) return direct.trim();
    }
    return null;
}

function semanticErrorFromOkResponse(data: any): string | null {
    if (!isObject(data)) return null;
    const err = data.error ?? data.detail ?? data.message ?? null;
    if (typeof err === "string" && err.trim()) return err.trim();
    return null;
}

// Glass pane (matches Practice/Competition)
const Pane: React.FC<{
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}> = ({title, subtitle, right, children}) => (
    <section
        className="min-w-0 overflow-hidden rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
        <header
            className="flex items-start justify-between gap-3 border-b border-white/40 bg-white/40 px-4 py-3 backdrop-blur-xl">
            <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-normal text-slate-700 truncate">{title}</h2>
                {subtitle ? <p className="mt-1 text-xs sm:text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
        </header>
        <div className="px-4 py-4">{children}</div>
    </section>
);

const UserGroupPage: React.FC = () => {
    const {user} = useAuth();

    const [groupLoading, setGroupLoading] = useState<boolean>(true);
    const [groupError, setGroupError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [myGroup, setMyGroup] = useState<GroupDashboardResponse["group"]>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);

    const [incomingInvites, setIncomingInvites] = useState<IncomingInvite[]>([]);
    const [incomingLoading, setIncomingLoading] = useState(false);

    const [groupName, setGroupName] = useState("");
    const [minMembers, setMinMembers] = useState<string>(String(MIN_ALLOWED));
    const [maxMembers, setMaxMembers] = useState<string>(String(MAX_ALLOWED));

    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const resetMessages = () => {
        setGroupError(null);
        setMessage(null);
    };

    const onApiError = (err: any) => {
        console.error(err?.raw ?? err);
        const msg =
            Array.isArray(err?.messages) && err.messages.length
                ? err.messages.join(" • ")
                : err?.message || "Something went wrong.";
        setGroupError(msg);
    };

    const enforceNumberOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const blocked = ["e", "E", "+", "-", ".", ","];
        if (blocked.includes(e.key)) e.preventDefault();
    };

    const sanitizeToDigits = (value: string) => value.replace(/[^\d]/g, "");

    const validateMinMax = () => {
        const minStr = minMembers.trim();
        const maxStr = maxMembers.trim();

        if (!minStr || !maxStr) return "Min and Max members are required.";
        if (!isNumericString(minStr) || !isNumericString(maxStr)) return "Min/Max must be numbers only.";

        const minVal = Number(minStr);
        const maxVal = Number(maxStr);

        if (minVal < MIN_ALLOWED) return `Minimum members must be at least ${MIN_ALLOWED}.`;
        if (maxVal > MAX_ALLOWED) return `Maximum members cannot exceed ${MAX_ALLOWED}.`;
        if (minVal > maxVal) return "Minimum members cannot be greater than maximum members.";

        return null;
    };

    const loadIncomingInvites = useCallback(async () => {
        setIncomingLoading(true);

        const res = await safeApi(() => getMyIncomingGroupInvites(), "Failed to load incoming invitations.");

        setIncomingLoading(false);

        if (!res.ok) {
            console.error(res.error.raw);
            return;
        }

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            console.error("Incoming invites semantic error:", semanticErr);
            return;
        }

        setIncomingInvites(res.data || []);
    }, []);

    const loadGroupDashboard = useCallback(async () => {
        resetMessages();
        setGroupLoading(true);

        const res = await safeApi(() => getMyGroupDashboard(), "Failed to load group information. Please try again.");

        if (!res.ok) {
            onApiError(res.error);
            setGroupLoading(false);
            return;
        }

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            setGroupLoading(false);
            return;
        }

        const data = res.data;
        setMyGroup(data.group || null);
        setMembers(data.members || []);
        setPendingInvites(data.pending_invites || []);
        setGroupLoading(false);

        loadIncomingInvites();
    }, [loadIncomingInvites]);

    useEffect(() => {
        if (!user) return;
        loadGroupDashboard();
    }, [user, loadGroupDashboard]);

    if (!user) {
        return (
            <div
                className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-0 py-6 md:py-8">
                    <div
                        className="rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        Checking your account…
                    </div>
                </main>
            </div>
        );
    }

    // -------------------- Handlers --------------------

    const handleCreateGroup = async (e: FormEvent) => {
        e.preventDefault();
        resetMessages();

        const name = groupName.trim();
        if (!name) return setGroupError("Group name is required.");

        const minMaxErr = validateMinMax();
        if (minMaxErr) return setGroupError(minMaxErr);

        setGroupLoading(true);

        const res = await safeApi(
            () =>
                createGroup({
                    name,
                    min_members: Number(minMembers),
                    max_members: Number(maxMembers),
                }),
            "Failed to create group. Please try again."
        );

        setGroupLoading(false);

        if (!res.ok) return onApiError(res.error);

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            return;
        }

        setMessage(extractSuccessMessage(res.data) ?? "Group created successfully.");
        setGroupName("");
        setMinMembers(String(MIN_ALLOWED));
        setMaxMembers(String(MAX_ALLOWED));

        await loadGroupDashboard();
    };

    const handleDeleteGroup = async () => {
        if (!myGroup) return;

        if (!window.confirm(`Delete group "${myGroup.name}"? This will remove all members and invitations.`)) return;

        resetMessages();
        setGroupLoading(true);

        const res = await safeApi(() => deleteGroup(myGroup.id), "Failed to delete group. Please try again.");

        setGroupLoading(false);

        if (!res.ok) return onApiError(res.error);

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            return;
        }

        setMyGroup(null);
        setMembers([]);
        setPendingInvites([]);
        setMessage(extractSuccessMessage(res.data) ?? "Group deleted.");
    };

    const handleRemoveMember = async (m: GroupMember) => {
        if (!myGroup) return;
        if (!window.confirm(`Remove "${m.username}" from the group?`)) return;

        resetMessages();
        const backup = [...members];
        setMembers((prev) => prev.filter((x) => x.id !== m.id));

        const res = await safeApi(
            () => removeGroupMember({group_id: myGroup.id, user_id: m.id}),
            "Failed to remove member. Please try again."
        );

        if (!res.ok) {
            setMembers(backup);
            return onApiError(res.error);
        }

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setMembers(backup);
            setGroupError(semanticErr);
            return;
        }

        setMessage(extractSuccessMessage(res.data) ?? `Member ${m.username} has been removed from the group.`);
    };

    const handleSetAdmin = async (m: GroupMember) => {
        if (!myGroup) return;
        if (!window.confirm(`Make "${m.username}" the group admin? This may change your own admin privileges.`)) return;

        resetMessages();
        setGroupLoading(true);

        const res = await safeApi(
            () => setGroupAdmin({group_id: myGroup.id, user_id: m.id}),
            "Failed to update group admin. Please try again."
        );

        setGroupLoading(false);

        if (!res.ok) return onApiError(res.error);

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            return;
        }

        setMyGroup(res.data as any);
        setMessage(extractSuccessMessage(res.data) ?? `"${m.username}" is now the group admin.`);
        await loadGroupDashboard();
    };

    const handleSearchUsers = async (q: string) => {
        setSearchTerm(q);
        setSearchResults([]);

        if (!myGroup) return;

        const cleaned = q.trim();
        if (!cleaned) return;

        setSearchLoading(true);

        const res = await safeApi(() => searchUsersForGroup(cleaned), "Failed to search users.");

        setSearchLoading(false);

        if (!res.ok) {
            console.error(res.error.raw);
            return;
        }

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            console.error("Search semantic error:", semanticErr);
            setSearchResults([]);
            return;
        }

        setSearchResults(res.data || []);
    };

    const handleSendInvite = async (u: UserSearchResult) => {
        if (!myGroup) return;

        resetMessages();
        setGroupLoading(true);

        const res = await safeApi(
            () => sendGroupInvite({group_id: myGroup.id, user_id: u.id}),
            "Failed to send invitation. Please try again."
        );

        setGroupLoading(false);

        if (!res.ok) return onApiError(res.error);

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            return;
        }

        setMessage(extractSuccessMessage(res.data) ?? `Invitation sent to ${u.username}.`);
        await loadGroupDashboard();
    };

    const handleAcceptIncoming = async (inviteId: number) => {
        resetMessages();
        setIncomingLoading(true);

        const res = await safeApi(() => acceptGroupInvite(inviteId), "Failed to accept invitation.");

        setIncomingLoading(false);

        if (!res.ok) return onApiError(res.error);

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            return;
        }

        setMessage(extractSuccessMessage(res.data) ?? "Invitation accepted. You joined the group.");
        await loadGroupDashboard();
    };

    const handleDeclineIncoming = async (inviteId: number) => {
        resetMessages();
        setIncomingLoading(true);

        const res = await safeApi(() => declineGroupInvite(inviteId), "Failed to decline invitation.");

        setIncomingLoading(false);

        if (!res.ok) return onApiError(res.error);

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            return;
        }

        setMessage(extractSuccessMessage(res.data) ?? "Invitation declined.");
        await loadGroupDashboard();
    };

    // -------------------- Computed --------------------

    const totalMembers = members.length;
    const totalPending = pendingInvites.length;
    const adminMember = useMemo(() => members.find((m) => m.is_admin), [members]);

    // -------------------- Styling tokens (same family as Practice pages) --------------------

    const pageShell =
        "min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 text-sm font-sans flex flex-col";

    const pageWrap = "w-full px-0 py-6 md:py-8";

    const title = "text-2xl sm:text-3xl font-semibold text-slate-900";
    const subtitle = "mt-1 text-sm sm:text-base text-slate-600";

    const alertBase =
        "rounded-2xl border px-4 py-3 text-sm sm:text-base shadow-sm backdrop-blur-xl";

    const alertInfo = `${alertBase} border-white/30 bg-white/55 text-slate-700 ring-1 ring-slate-200/50`;
    const alertErr = `${alertBase} border-rose-200 bg-rose-50/80 text-rose-700`;
    const alertOk = `${alertBase} border-emerald-200 bg-emerald-50/80 text-emerald-700`;

    const chip =
        "inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/60 px-3 py-1 text-xs sm:text-sm font-normal text-slate-600";

    const btn =
        "rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-xs sm:text-sm font-normal text-slate-600 shadow-sm hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50";

    const btnPrimary =
        "rounded-2xl border border-blue-200/70 bg-blue-50/70 px-4 py-2.5 text-sm sm:text-base font-normal text-blue-700 shadow-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-100/60 disabled:text-slate-400 disabled:cursor-not-allowed";

    const btnDanger =
        "rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs sm:text-sm font-normal text-rose-700 shadow-sm hover:bg-rose-100/60 focus:outline-none focus:ring-2 focus:ring-rose-500/15 disabled:opacity-50";

    const btnSuccess =
        "rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs sm:text-sm font-normal text-emerald-700 shadow-sm hover:bg-emerald-100/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50";

    const inputShell =
        "rounded-xl border border-slate-200/70 bg-white/70 focus-within:bg-white focus-within:border-blue-200/70 focus-within:ring-2 focus-within:ring-blue-500/10";

    const inputBase =
        "w-full bg-transparent px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400";

    const inputMono =
        "w-full bg-transparent px-3 py-2.5 text-sm font-mono text-slate-700 outline-none placeholder:text-slate-400";

    // -------------------- UI --------------------

    return (
        <div className={pageShell}>
            <Navbar/>

            <main className={pageWrap}>
                <motion.div
                    initial={{opacity: 0, y: 6}}
                    animate={{opacity: 1, y: 0}}
                    className="w-full px-0"
                >
                    {/* Page header */}
                    <div className="px-4 sm:px-6 md:px-8 mb-6">
                        <h1 className={title}>My Group</h1>
                        <p className={subtitle}>Manage group members, invitations, and join requests in one place.</p>
                    </div>

                    {/* Alerts */}
                    <div className="px-4 sm:px-6 md:px-8 space-y-3 mb-6">
                        {groupLoading && <div className={alertInfo}>Loading group information…</div>}
                        {groupError && <div className={alertErr}>{groupError}</div>}
                        {message && <div className={alertOk}>{message}</div>}
                    </div>

                    {/* Two-column layout (full width) */}
                    <div className="px-4 sm:px-6 md:px-8 grid gap-4 lg:grid-cols-[360px_1fr]">
                        {/* LEFT */}
                        <div className="space-y-4 min-w-0">
                            <Pane
                                title={myGroup ? "Group overview" : "Create a new group"}
                                subtitle={myGroup ? "Basic details about your group." : "You don’t belong to a group yet."}
                                right={
                                    myGroup?.is_admin ? (
                                        <button type="button" onClick={handleDeleteGroup} className={btnDanger}>
                                            <span className="inline-flex items-center gap-2">
                                                <FiTrash2 size={16}/>
                                                Delete
                                            </span>
                                        </button>
                                    ) : null
                                }
                            >
                                {myGroup ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <FiUsers className="text-slate-600"/>
                                            <div className="min-w-0">
                                                <div
                                                    className="text-base font-semibold text-slate-900 truncate">{myGroup.name}</div>
                                                <div className="mt-1 text-xs sm:text-sm text-slate-500">
                                                    Members: <span
                                                    className="text-slate-700">{totalMembers}</span> / {myGroup.max_members}
                                                    {" · "}
                                                    Min required: {myGroup.min_members}
                                                </div>
                                            </div>
                                        </div>

                                        {myGroup.is_admin ? (
                                            <span className={chip}>You are the admin</span>
                                        ) : adminMember ? (
                                            <div className="text-xs sm:text-sm text-slate-500">
                                                Admin: <span className="text-slate-700">{adminMember.username}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <form onSubmit={handleCreateGroup} className="space-y-3">
                                        <div className="space-y-1">
                                            <label
                                                className="block text-xs font-normal uppercase tracking-wide text-slate-500">
                                                Group name
                                            </label>
                                            <div className={inputShell}>
                                                <input
                                                    type="text"
                                                    value={groupName}
                                                    onChange={(e) => setGroupName(e.target.value)}
                                                    placeholder="e.g., NW Bears"
                                                    className={inputBase}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label
                                                    className="block text-xs font-normal uppercase tracking-wide text-slate-500">
                                                    Min
                                                </label>
                                                <div className={inputShell}>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={minMembers}
                                                        onKeyDown={enforceNumberOnlyKeyDown}
                                                        onChange={(e) => setMinMembers(sanitizeToDigits(e.target.value))}
                                                        className={inputMono}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label
                                                    className="block text-xs font-normal uppercase tracking-wide text-slate-500">
                                                    Max
                                                </label>
                                                <div className={inputShell}>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={maxMembers}
                                                        onKeyDown={enforceNumberOnlyKeyDown}
                                                        onChange={(e) => setMaxMembers(sanitizeToDigits(e.target.value))}
                                                        className={inputMono}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={groupLoading} className={btnPrimary}>
                                            <span className="inline-flex items-center gap-2 justify-center w-full">
                                                <FiUserCheck size={18}/>
                                                {groupLoading ? "Creating…" : "Create group"}
                                            </span>
                                        </button>

                                        <p className="text-xs text-slate-500">
                                            Min must be ≥ {MIN_ALLOWED}. Max must be ≤ {MAX_ALLOWED}.
                                        </p>
                                    </form>
                                )}
                            </Pane>

                            <Pane
                                title="Pending requests"
                                subtitle="Invitations sent to you by other groups."
                                right={
                                    incomingLoading ? (
                                        <span className="text-xs text-slate-500">Loading…</span>
                                    ) : (
                                        <span className="text-xs text-slate-500">{incomingInvites.length}</span>
                                    )
                                }
                            >
                                {incomingInvites.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <FiInbox className="text-slate-500"/>
                                        <span>No pending requests.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {incomingInvites.map((inv) => (
                                            <div
                                                key={inv.id}
                                                className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50"
                                            >
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900">
                                                        {inv.group.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        Admin: <span
                                                        className="text-slate-700">{inv.invited_by?.username ?? "Unknown"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAcceptIncoming(inv.id)}
                                                        disabled={incomingLoading}
                                                        className={btnSuccess}
                                                    >
                                                        <span className="inline-flex items-center gap-2">
                                                            <FiCheck size={16}/>
                                                            Accept
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeclineIncoming(inv.id)}
                                                        disabled={incomingLoading}
                                                        className={btn}
                                                    >
                                                        <span className="inline-flex items-center gap-2">
                                                            <FiX size={16}/>
                                                            Decline
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Pane>
                        </div>

                        {/* RIGHT */}
                        <div className="space-y-4 min-w-0">
                            <Pane
                                title="Members"
                                subtitle={myGroup ? "People currently in your group." : "Create or join a group to see members."}
                                right={myGroup ? <span className="text-xs text-slate-500">{totalMembers}</span> : null}
                            >
                                {!myGroup ? (
                                    <div className="text-sm text-slate-600">No group yet.</div>
                                ) : members.length === 0 ? (
                                    <div className="text-sm text-slate-600">No members in this group yet.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {members.map((m) => (
                                            <div
                                                key={m.id}
                                                className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50"
                                            >
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900">
                                                        {m.username}
                                                        {m.is_admin ? (
                                                            <span
                                                                className={[chip, "text-slate-700"].join(" ") + " ml-2"}>
    Admin
  </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="truncate text-xs text-slate-500">{m.email}</div>
                                                </div>

                                                {myGroup.is_admin ? (
                                                    <div className="flex items-center gap-2">
                                                        {!m.is_admin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetAdmin(m)}
                                                                disabled={groupLoading}
                                                                className={btn}
                                                            >
                                                                <span className="inline-flex items-center gap-2">
                                                                    <FiUserCheck size={16}/>
                                                                    Make admin
                                                                </span>
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(m)}
                                                            disabled={groupLoading}
                                                            className={btnDanger}
                                                        >
                                                            <span className="inline-flex items-center gap-2">
                                                                <FiUserX size={16}/>
                                                                Remove
                                                            </span>
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Pane>

                            <Pane
                                title="Invitations"
                                subtitle="Invite users to join your group."
                                right={<span className="text-xs text-slate-500">{totalPending}</span>}
                            >
                                {!myGroup ? (
                                    <div className="text-sm text-slate-600">Create or join a group to invite
                                        users.</div>
                                ) : !myGroup.is_admin ? (
                                    <div className="text-sm text-slate-600">Only the group admin can send
                                        invitations.</div>
                                ) : (
                                    <div className="grid gap-4 lg:grid-cols-2 min-w-0">
                                        {/* Search */}
                                        <div className="min-w-0">
                                            <label
                                                className="block text-xs font-normal uppercase tracking-wide text-slate-500 mb-1">
                                                Search users
                                            </label>
                                            <div className={inputShell}>
                                                <input
                                                    type="search"
                                                    value={searchTerm}
                                                    onChange={(e) => handleSearchUsers(e.target.value)}
                                                    placeholder="Search by username or email…"
                                                    className={inputBase}
                                                />
                                            </div>

                                            {searchLoading && <p className="mt-2 text-xs text-slate-500">Searching…</p>}

                                            {searchResults.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {searchResults.map((u) => (
                                                        <div
                                                            key={u.id}
                                                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50"
                                                        >
                                                            <div className="min-w-0">
                                                                <div
                                                                    className="truncate text-sm font-semibold text-slate-900">{u.username}</div>
                                                                <div
                                                                    className="truncate text-xs text-slate-500">{u.email}</div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendInvite(u)}
                                                                disabled={groupLoading}
                                                                className={btnPrimary}
                                                            >
                                                                <span className="inline-flex items-center gap-2">
                                                                    <FiSend size={18}/>
                                                                    Invite
                                                                </span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {!searchLoading && searchTerm.trim() && searchResults.length === 0 && (
                                                <p className="mt-2 text-xs text-slate-500">No users found.</p>
                                            )}
                                        </div>

                                        {/* Pending sent invites */}
                                        <div className="min-w-0">
                                            <div
                                                className="text-xs font-normal uppercase tracking-wide text-slate-500 mb-1">
                                                Pending invites sent
                                            </div>

                                            {pendingInvites.length === 0 ? (
                                                <div className="text-sm text-slate-600">No pending invitations.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {pendingInvites.map((inv) => (
                                                        <div
                                                            key={inv.id}
                                                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50"
                                                        >
                                                            <div className="min-w-0">
                                                                <div
                                                                    className="truncate text-sm font-semibold text-slate-900">{inv.user.username}</div>
                                                                <div
                                                                    className="truncate text-xs text-slate-500">{inv.user.email}</div>
                                                            </div>

                                                            <span
                                                                className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/70 px-3 py-1 text-xs font-normal text-amber-700">
                                                                {String(inv.status || "").toUpperCase()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Pane>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default UserGroupPage;
