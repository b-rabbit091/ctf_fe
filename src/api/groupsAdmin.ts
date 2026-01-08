// src/api/groupsAdmin.ts
import api from "./axios";

/* ---------- Types (match backend response) ---------- */

export type GroupMember = {
    user_id: number;
    username: string;
    joined_date: string; // ISO
    is_admin: boolean;
};

export type AdminGroup = {
    id: number;
    name: string;
    members_count: number;
    members: GroupMember[];
};

/* ---------- API calls ---------- */

/**
 * Admin-only list
 * If yours is /api/users/groups/ then change the path accordingly.
 */
export async function getAllGroups(): Promise<AdminGroup[]> {
    const res = await api.get<AdminGroup[]>("/api/users/groups/");
    return res.data;
}

/**
 * Delete a group
 * DELETE /api/users/groups/{id}/
 */
export async function deleteGroup(groupId: number): Promise<void> {
    await api.delete(`/api/users/groups/${groupId}/`);
}

/**
 * Remove a member from a group (admin-only)
 * POST /api/users/groups/{id}/remove-member/
 * Body: { user_id: <int> }
 */
export async function removeMember(groupId: number, userId: number): Promise<{ detail?: string }> {
    const res = await api.post(`/api/users/groups/${groupId}/remove-member/`, {
        user_id: userId,
    });
    return res.data;
}
