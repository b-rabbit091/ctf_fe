// src/contexts/AuthContext.tsx
import React, {createContext, useContext, useEffect, useState} from "react";
import jwtDecode from "jwt-decode";
import {
    confirmResetPassword,
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
import {normalizeApiError} from "../utils/apiError";

type User = {
    id?: number;
    user_id?: number;
    username?: string;
    role?: string;
    email?: string;
};

type DecodedToken = {
    exp?: number;
    id?: number;
    pk?: number;
    user_id?: number;
    username?: string;
    user?: string;
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
    resetPasswordWithToken: (token: string, password: string, confirm_password: string) => Promise<void>;
    verifyResetPassword: (payload: { email: string }) => Promise<void>;
    ready: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeAuthToken(token: string): DecodedToken | null {
    try {
        return jwtDecode<DecodedToken>(token);
    } catch {
        return null;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessTokenState] = useState<string | null>(getAccessToken());
    const [ready, setReady] = useState(false);

    // initialize from localStorage token
    useEffect(() => {
        const t = getAccessToken();
        if (t) {
            const decoded = decodeAuthToken(t);
            if (!decoded) {
                clearTokens();
                setUser(null);
                setAccessTokenState(null);
                setReady(true);
                return;
            }

            if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                clearTokens();
                setUser(null);
                setAccessTokenState(null);
                setReady(true);
                return;
            }

            setUser({user_id: decoded.user_id, username: decoded.username, email: decoded.email, role: decoded.role});
            setAccessTokenState(t);
        }
        setReady(true);
    }, []);

    const login = async (identifier: string, password: string) => {
        let data;
        try {
            data = await loginUser({identifier, password});
        } catch (error) {
            throw normalizeApiError(error, "Wrong email or password.");
        }
        const {access, refresh} = data;

        setAccessToken(access);
        setRefreshToken(refresh);
        setAccessTokenState(access);

        const decoded = decodeAuthToken(access);
        if (!decoded) {
            setUser(null);
            return;
        }

        const uid = decoded.user_id ?? decoded.id ?? decoded.pk;
        setUser({
            id: uid,
            user_id: uid,
            username: decoded.username || decoded.user || decoded.email,
            email: decoded.email,
            role: decoded.role,
        });
    };

    const logout = () => {
        clearTokens();
        setUser(null);
        setAccessTokenState(null);
    };

    const register = async (payload: { username: string; email: string; first_name: string, last_name: string }) => {
        try {
            await registerUser(payload);
        } catch (error) {
            throw normalizeApiError(error, "Registration failed.");
        }
    };

    const verifyResetPassword = async (payload: { email: string; }) => {
        try {
            await verifyResetUserPassword(payload);
        } catch (error) {
            throw normalizeApiError(error, "Unable to start password reset.");
        }
    };

    const inviteAdminFn = async (payload: { username: string; email: string }) => {
        await inviteAdmin(payload);
    };

    const verifyEmailSetPassword = async (token: string, password: string, confirm_password: string) => {
        try {
            await verifyEmailAndSetPassword(token, password, confirm_password);
        } catch (error) {
            throw normalizeApiError(error, "Unable to verify your account.");
        }
    };

    const resetPasswordWithToken = async (token: string, password: string, confirm_password: string) => {
        try {
            await confirmResetPassword(token, password, confirm_password);
        } catch (error) {
            throw normalizeApiError(error, "Unable to reset your password.");
        }
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
                resetPasswordWithToken,
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
