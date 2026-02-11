// src/contexts/AuthContext.tsx
import React, {createContext, useContext, useEffect, useState} from "react";
import jwtDecode from "jwt-decode";
import {
    loginUser,
    registerUser,
    inviteAdmin,
    verifyEmailAndSetPassword,
    verifyResetUserPassword,
} from "../api/auth";
import {
    setAccessToken,
    setRefreshToken,
    getAccessToken,
    clearTokens
} from "../utils/token";
import {toast} from "react-toastify";

type User = {
    id?: number;
    user_id?: number;
    username?: string;
    role?: string;
    email?: string;
};

type AuthContextType = {
    user: User | null;
    accessToken: string | null;
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => void;
    register: (payload: { username: string; email: string; first_name: string, last_name: string }) => Promise<void>;
    inviteAdmin: (payload: { username: string; email: string }) => Promise<void>;
    verifyEmailSetPassword: (token: string, password: string, confirm_password: string) => Promise<void>;
    verifyResetPassword: (payload: { email: string }) => Promise<void>;
    ready: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken());
    const [ready, setReady] = useState(false);

    // initialize from localStorage token
    useEffect(() => {
        const t = getAccessToken();
        if (t) {
            try {
                const d: any = jwtDecode(t);
                if (d?.exp && Date.now() >= d.exp * 1000) {
                    clearTokens();
                    setUser(null);
                    setAccessTokenState(null);
                    setReady(true);
                    return;
                }

                setUser({user_id: d.user_id, username: d.username , email: d.email, role: d.role});
                setAccessTokenState(t);
            } catch {
                clearTokens();
                setUser(null);
                setAccessTokenState(null);
            }
        }
        setReady(true);
    }, []);

    const login = async (identifier: string, password: string) => {
        const data = await loginUser({identifier, password});
        const {access, refresh} = data;

        setAccessToken(access);
        setRefreshToken(refresh);
        setAccessTokenState(access);

        try {
            const d: any = jwtDecode(access);
            const uid = d.user_id ?? d.id ?? d.pk;

            setUser({
                id: uid,
                user_id: uid,
                username: d.username || d.user || d.email,
                email: d.email,
                role: d.role,
            });
        } catch {
            setUser(null);
        }
    };

    const logout = () => {
        clearTokens();
        setUser(null);
        setAccessTokenState(null);
    };

    const register = async (payload: { username: string; email: string; first_name: string, last_name: string }) => {
        await registerUser(payload);
    };

    const verifyResetPassword = async (payload: { email: string; }) => {
        await verifyResetUserPassword(payload);
    };

    const inviteAdminFn = async (payload: { username: string; email: string }) => {
        await inviteAdmin(payload);
        toast.success("Admin invite sent.");
    };

    const verifyEmailSetPassword = async (token: string, password: string, confirm_password: string) => {
        await verifyEmailAndSetPassword(token, password, confirm_password);
        toast.success("Password set — account activated. Please login.");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                login,
                logout,
                register,
                inviteAdmin: inviteAdminFn,
                verifyEmailSetPassword,
                verifyResetPassword,
                ready
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
