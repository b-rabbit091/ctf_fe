// src/pages/dashboard/api.ts
import api from "../../api/axios";
import axios, {AxiosError} from "axios";
import type {AdminDashboardTotalsResponse, DashboardOverview, LoadResult} from "./types";

/* ==== Custom error type so UI can show friendly messages ==== */

export class DashboardError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = "DashboardError";
        this.status = status;
    }
}

/* ==== API call (uses axios instance `api`) ==== */

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
    try {
        const resp = await api.get<DashboardOverview>("/api/dashboard/overview/");
        return resp.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<any>;

            const status = axiosError.response?.status;
            const data = axiosError.response?.data;

            const detailFromServer =
                (data && typeof data === "object" && (data as any).detail) || null;

            let message = "Unable to load dashboard.";

            if (detailFromServer) {
                message = String(detailFromServer);
            } else if (status === 401) {
                message =
                    "Your session has expired or you are not logged in. Please sign in again.";
            } else if (status === 403) {
                message = "You do not have permission to access this dashboard.";
            } else if (status === 500) {
                message =
                    "Something went wrong on our side. Please try again in a few moments.";
            } else if (axiosError.message) {
                message = axiosError.message;
            }

            throw new DashboardError(message, status);
        }

        throw new DashboardError(
            "We could not reach the server. Please check your internet connection."
        );
    }
};

export const getAdminDashboardTotals = async (): Promise<AdminDashboardTotalsResponse> => {
    // Your old file had no try/catch here; keeping behavior consistent is better for UI stability.
    try {
        const resp = await api.get<AdminDashboardTotalsResponse>(
            "/api/dashboard/admin/totals/"
        );
        return resp.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<any>;
            const status = axiosError.response?.status;
            const data = axiosError.response?.data;

            const detailFromServer =
                (data && typeof data === "object" && (data as any).detail) || null;

            let message = "Unable to load admin totals.";

            if (detailFromServer) {
                message = String(detailFromServer);
            } else if (status === 401) {
                message =
                    "Your session has expired or you are not logged in. Please sign in again.";
            } else if (status === 403) {
                message = "You do not have permission to access admin totals.";
            } else if (status === 500) {
                message =
                    "Something went wrong on our side. Please try again in a few moments.";
            } else if (axiosError.message) {
                message = axiosError.message;
            }

            throw new DashboardError(message, status);
        }

        throw new DashboardError(
            "We could not reach the server. Please check your internet connection."
        );
    }
};


export const loadDashboard = async (): Promise<LoadResult> => {
    try {
        const data = await getDashboardOverview();
        return {ok: true, data};
    } catch (err: unknown) {
        // Never leak stack traces; keep message user-safe
        if (err instanceof DashboardError) {
            return {ok: false, message: err.message, recoverable: true};
        }
        return {
            ok: false,
            message: "We could not reach the server. Please check your internet connection.",
            recoverable: true,
        };
    }
};