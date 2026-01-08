// src/pages/groups/UserGroupPage.tsx
import React, { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";

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

import { safeApi } from "../../utils/apiError";

const MIN_ALLOWED = 2;
const MAX_ALLOWED = 10;

function isNumericString(s: string) {
    return /^\d+$/.test(s);
}

type AnyObj = Record<string, any>;
function isObject(v: any): v is AnyObj {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * For SUCCESS payloads (2xx): pull message out of common keys
 * Example: {detail:"..."} or {message:"..."} or string body
 */
function extractSuccessMessage(data: any): string | null {
    if (data == null) return null;
    if (typeof data === "string") return data.trim() || null;
    if (isObject(data)) {
        const direct = data.detail ?? data.message ?? data.msg ?? data.success ?? null;
        if (typeof direct === "string" && direct.trim()) return direct.trim();
    }
    return null;
}

/**
 * Some endpoints may return 200 with {error:"..."} or {detail:"..."} to mean failure.
 * If we detect an error-like payload, treat it as an error even if HTTP is 2xx.
 */
function semanticErrorFromOkResponse(data: any): string | null {
    if (!isObject(data)) return null;
    const err = data.error ?? data.detail ?? data.message ?? null;
    if (typeof err === "string" && err.trim()) return err.trim();
    return null;
}

// Small GitHub-like box component
const Box: React.FC<{
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, subtitle, right, children }) => (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                {subtitle ? <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p> : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
        </header>
        <div className="px-4 py-4">{children}</div>
    </section>
);

const UserGroupPage: React.FC = () => {
    const { user } = useAuth();

    const [groupLoading, setGroupLoading] = useState<boolean>(true);
    const [groupError, setGroupError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [myGroup, setMyGroup] = useState<GroupDashboardResponse["group"]>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);

    // Incoming invites (other groups invited ME)
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
        // err is NormalizedApiError from apiError.ts
        console.error(err?.raw ?? err);

        const msg =
            Array.isArray(err?.messages) && err.messages.length
                ? err.messages.join(" • ")
                : err?.message || "Something went wrong.";

        setGroupError(msg);

        // Optional: auto-redirect if token expired
        // if (err?.isAuthError) logout?.();
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
            // quieter than main errors
            console.error(res.error.raw);
            return;
        }

        // if backend ever returns {error:"..."} with 200
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

        // independent load
        loadIncomingInvites();
    }, [loadIncomingInvites]);

    useEffect(() => {
        if (!user) return;
        loadGroupDashboard();
    }, [user, loadGroupDashboard]);

    if (!user) {
        return (
            <>
                <Navbar />
                <main className="min-h-screen bg-slate-50 px-4 py-6">
                    <div className="mx-auto max-w-6xl text-sm text-slate-500">Checking your account…</div>
                </main>
            </>
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
            () => removeGroupMember({ group_id: myGroup.id, user_id: m.id }),
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
        // optional refresh:
        // await loadGroupDashboard();
    };

    const handleSetAdmin = async (m: GroupMember) => {
        if (!myGroup) return;
        if (!window.confirm(`Make "${m.username}" the group admin? This may change your own admin privileges.`)) return;

        resetMessages();
        setGroupLoading(true);

        const res = await safeApi(
            () => setGroupAdmin({ group_id: myGroup.id, user_id: m.id }),
            "Failed to update group admin. Please try again."
        );

        setGroupLoading(false);

        if (!res.ok) return onApiError(res.error);

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            setGroupError(semanticErr);
            return;
        }

        // backend returns group payload for set-admin
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
            // keep silent like before, but log
            console.error(res.error.raw);
            return;
        }

        const semanticErr = semanticErrorFromOkResponse(res.data);
        if (semanticErr) {
            // treat as empty results + show small error? (silent is ok)
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
            () => sendGroupInvite({ group_id: myGroup.id, user_id: u.id }),
            "Failed to send invitation. Please try again."
        );

        setGroupLoading(false);

        if (!res.ok) return onApiError(res.error);

        // IMPORTANT: invite() sometimes returns 200 with {error:"User already belongs..."}
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

    // -------------------- UI --------------------

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-8">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl">
                    {/* GitHub-ish page header */}
                    <div className="mb-6">
                        <h1 className="text-xl font-semibold text-slate-900">My Group</h1>
                        <p className="mt-1 text-sm text-slate-600">Manage group members, invitations, and join requests in one place.</p>
                    </div>

                    {/* Alerts */}
                    {groupLoading && (
                        <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                            Loading group information…
                        </div>
                    )}
                    {groupError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {groupError}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {message}
                        </div>
                    )}

                    {/* GitHub-like two-column layout */}
                    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                        {/* LEFT column */}
                        <div className="space-y-4">
                            {/* Overview / Create */}
                            <Box
                                title={myGroup ? "Group overview" : "Create a new group"}
                                subtitle={myGroup ? "Basic details about your group." : "You don’t belong to a group yet."}
                                right={
                                    myGroup?.is_admin ? (
                                        <button
                                            type="button"
                                            onClick={handleDeleteGroup}
                                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                                        >
                                            <FiTrash2 size={14} />
                                            Delete
                                        </button>
                                    ) : null
                                }
                            >
                                {myGroup ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <FiUsers className="text-slate-600" />
                                            <div className="font-medium text-slate-900">{myGroup.name}</div>
                                        </div>

                                        <div className="text-xs text-slate-600">
                                            Members: <span className="font-semibold text-slate-900">{totalMembers}</span> / {myGroup.max_members}
                                            {" · "}
                                            Min required: {myGroup.min_members}
                                        </div>

                                        {myGroup.is_admin ? (
                                            <div className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                                You are the admin
                                            </div>
                                        ) : adminMember ? (
                                            <div className="text-xs text-slate-600">
                                                Admin: <span className="font-medium text-slate-900">{adminMember.username}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <form onSubmit={handleCreateGroup} className="space-y-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-700">Group name</label>
                                            <input
                                                type="text"
                                                value={groupName}
                                                onChange={(e) => setGroupName(e.target.value)}
                                                placeholder="e.g., NW Bears"
                                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-slate-700">Min</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={minMembers}
                                                    onKeyDown={enforceNumberOnlyKeyDown}
                                                    onChange={(e) => setMinMembers(sanitizeToDigits(e.target.value))}
                                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-slate-700">Max</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={maxMembers}
                                                    onKeyDown={enforceNumberOnlyKeyDown}
                                                    onChange={(e) => setMaxMembers(sanitizeToDigits(e.target.value))}
                                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={groupLoading}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                        >
                                            <FiUserCheck size={16} />
                                            {groupLoading ? "Creating…" : "Create group"}
                                        </button>

                                        <p className="text-xs text-slate-500">
                                            Min must be ≥ {MIN_ALLOWED}. Max must be ≤ {MAX_ALLOWED}.
                                        </p>
                                    </form>
                                )}
                            </Box>

                            {/* Incoming invitations (requests to YOU) */}
                            <Box
                                title="Pending requests"
                                subtitle="Invitations sent to you by other groups."
                                right={
                                    incomingLoading ? (
                                        <span className="text-xs text-slate-500">Loading…</span>
                                    ) : (
                                        <span className="text-xs text-slate-600">{incomingInvites.length}</span>
                                    )
                                }
                            >
                                {incomingInvites.length === 0 ? (
                                    <div className="text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <FiInbox className="text-slate-500" />
                                            <span>No pending requests.</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {incomingInvites.map((inv) => (
                                            <div key={inv.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900">{inv.group.name}</div>
                                                    <div className="text-xs text-slate-600">
                                                        Admin: <span className="font-medium">{inv.invited_by?.username ?? "Unknown"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAcceptIncoming(inv.id)}
                                                        disabled={incomingLoading}
                                                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                                    >
                                                        <FiCheck size={14} />
                                                        Accept
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeclineIncoming(inv.id)}
                                                        disabled={incomingLoading}
                                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                    >
                                                        <FiX size={14} />
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Box>
                        </div>

                        {/* RIGHT column */}
                        <div className="space-y-4">
                            {/* Members */}
                            <Box
                                title="Members"
                                subtitle={myGroup ? "People currently in your group." : "Create or join a group to see members."}
                                right={myGroup ? <span className="text-xs text-slate-600">{totalMembers}</span> : null}
                            >
                                {!myGroup ? (
                                    <div className="text-sm text-slate-600">No group yet.</div>
                                ) : members.length === 0 ? (
                                    <div className="text-sm text-slate-600">No members in this group yet.</div>
                                ) : (
                                    <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
                                        {members.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900">
                                                        {m.username}{" "}
                                                        {m.is_admin ? (
                                                            <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Admin
                              </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="truncate text-xs text-slate-600">{m.email}</div>
                                                </div>

                                                {myGroup.is_admin ? (
                                                    <div className="flex items-center gap-2">
                                                        {!m.is_admin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetAdmin(m)}
                                                                disabled={groupLoading}
                                                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                            >
                                                                <FiUserCheck size={14} />
                                                                Make admin
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(m)}
                                                            disabled={groupLoading}
                                                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                        >
                                                            <FiUserX size={14} />
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Box>

                            {/* Invites (admin only) */}
                            <Box title="Invitations" subtitle="Invite users to join your group." right={<span className="text-xs text-slate-600">{totalPending}</span>}>
                                {!myGroup ? (
                                    <div className="text-sm text-slate-600">Create or join a group to invite users.</div>
                                ) : !myGroup.is_admin ? (
                                    <div className="text-sm text-slate-600">Only the group admin can send invitations.</div>
                                ) : (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {/* Search */}
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-700">Search users</label>
                                            <input
                                                type="search"
                                                value={searchTerm}
                                                onChange={(e) => handleSearchUsers(e.target.value)}
                                                placeholder="Search by username or email…"
                                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            {searchLoading && <p className="mt-1 text-xs text-slate-500">Searching…</p>}

                                            {searchResults.length > 0 && (
                                                <div className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
                                                    {searchResults.map((u) => (
                                                        <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                                            <div className="min-w-0">
                                                                <div className="truncate text-sm font-semibold text-slate-900">{u.username}</div>
                                                                <div className="truncate text-xs text-slate-600">{u.email}</div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendInvite(u)}
                                                                disabled={groupLoading}
                                                                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                                            >
                                                                <FiSend size={14} />
                                                                Invite
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
                                        <div>
                                            <div className="mb-1 text-xs font-medium text-slate-700">Pending invites sent</div>
                                            {pendingInvites.length === 0 ? (
                                                <div className="text-sm text-slate-600">No pending invitations.</div>
                                            ) : (
                                                <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
                                                    {pendingInvites.map((inv) => (
                                                        <div key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                                            <div className="min-w-0">
                                                                <div className="truncate text-sm font-semibold text-slate-900">{inv.user.username}</div>
                                                                <div className="truncate text-xs text-slate-600">{inv.user.email}</div>
                                                            </div>
                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                {String(inv.status || "").toUpperCase()}
                              </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Box>
                        </div>
                    </div>
                </motion.div>
            </main>
        </>
    );
};

export default UserGroupPage;
