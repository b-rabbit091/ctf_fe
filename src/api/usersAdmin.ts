// src/api/usersAdmin.ts
import api from "./axios";


export interface AdminUser {
    id: number;
    username: string;
    email: string;
    role_name: string;
    is_active: boolean;
    date_joined: string;
    last_login: string | null;
}
export type GroupMember = {
    user_id: number;
    username: string;
    joined_date: string;
    is_admin: boolean;
};

export type AdminGroup = {
    id: number;
    name: string;
    members_count: number;
    members: GroupMember[];
};

/**
 * Adjust these base paths if your DRF router is different.
 * This assumes:
 *   router.register("users", UserViewSet, basename="users")
 *   router.register("admin-invite", AdminInviteViewSet, basename="admin-invite")
 * under /api/users/.
 */

const USER_BASE = "/api/users/";
const ADMIN_INVITE_BASE = "/api/users/admin-invite";

/** List all users (admin-only). */
export const getUsers = async (): Promise<AdminUser[]> => {
    const resp = await api.get(USER_BASE);
    return resp.data;
};

/** Update a user (e.g., toggle is_active). */
export const updateUser = async (
    id: number,
    payload: Partial<Pick<AdminUser, "username" | "email" | "is_active">>
): Promise<AdminUser> => {
    const resp = await api.patch(`${USER_BASE}${id}/`, payload);
    return resp.data;
};

/** Delete a user (admin-only). */
export const deleteUser = async (id: number): Promise<void> => {
    await api.delete(`${USER_BASE}${id}/`);
};

/**
 * Invite a new admin.
 * Backend: AdminInviteViewSet.generate (email + username).
 */
export const inviteAdmin = async (data: {
    email: string;
    username: string;
}): Promise<{ detail: string }> => {
    const resp = await api.post(`${ADMIN_INVITE_BASE}/generate/`, data);
    return resp.data;
};