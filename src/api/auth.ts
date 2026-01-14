// src/api/auth.ts
import api from "./axios";

const API_URL = "/users/";

export interface LoginPayload {
    username: string;
    password: string;
}

export interface RegisterPayload {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
}

export interface AdminInvitePayload {
    username: string;
    email: string;
    role?: string;
}
export interface VerifyPasswordResetPayload {
    email: string;

}

// login
export const loginUser = async (data: LoginPayload) => {
    const resp = await api.post(`${API_URL}token/`, data);
    return resp.data;
};

// register student
export const registerUser = async (data: RegisterPayload) => {
    const resp = await api.post(`${API_URL}register/`, data);
    return resp.data;
};

export const verifyResetUserPassword = async (data: VerifyPasswordResetPayload) => {
    const resp = await api.post(`${API_URL}verify-reset-password/`, data);
    return resp.data;
};



// refresh
export const refreshToken = async (refresh: string) => {
    const resp = await api.post(`${API_URL}token/refresh/`, { refresh });
    return resp.data;
};

// admin invite (admin-only)
export const inviteAdmin = async (data: AdminInvitePayload) => {
    const resp = await api.post(`${API_URL}admin-invite/generate/`, data);
    return resp.data;
};

// verify-email & set password (backend expects token + password)
export const verifyEmailAndSetPassword = async (token: string, password: string, confirm_password:string) => {
    const resp = await api.post(`${API_URL}verify-email/`, { token, password, confirm_password });
    return resp.data;
};
