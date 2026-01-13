export type LoadingState = "idle" | "loading" | "success" | "error";

export type SettingsSection =
    | "GENERAL"
    | "SECURITY"
    | "STATUS"
    | "PRIVACY";

export interface AccountUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;

    is_active: boolean;
    date_joined?: string;
    last_login?: string | null;

    role_name?: string;
}

export interface UpdateAccountPayload {
    first_name?: string;
    last_name?: string;
    username?: string;
    email?: string;
}

export interface ChangePasswordPayload {
    old_password: string;
    new_password: string;
    confirm_password: string;
}

export interface ApiErrorShape {
    error?: string;
    detail?: string;
    message?: string;
    [key: string]: any;
}
