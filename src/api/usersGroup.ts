// src/api/groups.ts
import api from "./axios";

//
// NOTE:
// Adjust the URL paths below ("/groups/...") to match your Django backend routes.
// These are just conventional examples.
//

// The shape the CompetitionList expects:
export interface GroupSummary {
    id: number;
    name: string;
    min_members: number;
    max_members: number;
    is_admin: boolean;
}

export interface GroupMember {
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
}

export interface GroupInvite {
    id: number;
    user: {
        id: number;
        username: string;
        email: string;
    };
    status: "pending" | "accepted" | "declined" | "expired";
}

export interface GroupDashboardResponse {
    group: GroupSummary | null;
    members: GroupMember[];
    pending_invites: GroupInvite[];
}

export interface UserSearchResult {
    id: number;
    username: string;
    email: string;
}

// GET /api/groups/me/dashboard/
export async function getMyGroupDashboard(): Promise<GroupDashboardResponse> {
    const res = await api.get("api/users/groups/me/dashboard/");
    return res.data;
}
export type CreateGroupPayload = {
    name: string;
    min_members: number;
    max_members: number;
};

export const createGroup = async (payload: CreateGroupPayload) => {
    const resp = await api.post("api/users/groups/", payload, {
        headers: { "Content-Type": "application/json" },
    });
    return resp.data;
};
// POST /api/groups/  { name }
// export const createGroup = async (payload: { name: string }): Promise<GroupSummary> {
//     const res = await api.post("api/users/groups/", payload);
//     return res.data;
// }
// export const createGroup = async (name: String) => {
//     const resp = await api.post("api/users/groups/", name, {
//         headers: { "Content-Type": "multipart/form-data" },
//     });
//     return resp.data;
// };

// GET /api/groups/search-users/?q=...
export async function searchUsersForGroup(
    query: string
): Promise<UserSearchResult[]> {
    if (!query.trim()) return [];
    const res = await api.get("api/users/groups/search-users/", {
        params: { q: query },
    });
    return res.data;
}

// POST /api/groups/:group_id/invitations/  { user_id }
export async function sendGroupInvite(payload: {
    group_id: number;
    user_id: number;
}): Promise<GroupInvite> {
    const { group_id, user_id } = payload;
    const res = await api.post(`api/users/groups/${group_id}/invitations/`, {
        user_id,
    });
    return res.data;
}

// DELETE /api/groups/:group_id/
export async function deleteGroup(groupId: number): Promise<void> {
    await api.delete(`api/users/groups/${groupId}/`);
}

// POST /api/groups/:group_id/remove-member/  { user_id }
export async function removeGroupMember(payload: {
    group_id: number;
    user_id: number;
}): Promise<void> {
    const { group_id, user_id } = payload;
    await api.post(`api/users/groups/${group_id}/remove-member/`, { user_id });
}

// POST /api/groups/:group_id/set-admin/  { user_id }
export async function setGroupAdmin(payload: {
    group_id: number;
    user_id: number;
}): Promise<GroupSummary> {
    const { group_id, user_id } = payload;
    const res = await api.post(`api/users/groups/${group_id}/set-admin/`, { user_id });
    return res.data;
}

// Incoming invite shape (example)
export type IncomingInvite = {
    id: number;
    status: string;
    group: { id: number; name: string };
    invited_by?: { id: number; username: string };
};

export async function getMyIncomingGroupInvites(): Promise<IncomingInvite[]> {
    const res = await api.get("api/users/groups/me/invitations/");
    return res.data;
}

export async function acceptGroupInvite(inviteId: number): Promise<any> {
    const res = await api.post(`api/users/groups/invitations/${inviteId}/accept/`);
    return res.data;
}

export async function declineGroupInvite(inviteId: number): Promise<any> {
    const res = await api.post(`/api/groups/invitations/${inviteId}/decline/`);
    return res.data;
}
