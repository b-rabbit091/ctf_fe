import api from "../../api/axios";
import type {AccountUser, ChangePasswordPayload, UpdateAccountPayload} from "./types";

const API_URL = "/users/";

/**
 * Sample:
 * GET /api/users/:id/
 */
export const getAccountUser = async (id: number): Promise<AccountUser> => {
    const resp = await api.get(`${API_URL}${id}/`);
    return resp.data;
};

/**
 * Sample:
 * PATCH /api/users/:id/
 * Body: { ...UpdateAccountPayload }
 */
export const updateAccountUser = async (id: number, data: UpdateAccountPayload): Promise<AccountUser> => {
    const resp = await api.patch(`${API_URL}${id}/`, data);
    return resp.data;
};

/**
 * Sample:
 * POST /api/users/change-password/
 * Body: { ...ChangePasswordPayload }
 */
export const changePassword = async (data: ChangePasswordPayload) => {
    const resp = await api.post(`${API_URL}change-password/`, data);
    return resp.data;
};
