// src/pages/dashboard/api.ts
import api from "../../api/axios";
import axios, {AxiosError} from "axios";
import type {AdminDashboardTotalsResponse, DashboardOverview, LoadResult} from "./types";
import {normalizeApiError} from "../../utils/apiError";

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
        const resp = await api.get<DashboardOverview>("/dashboard/overview/");
        return resp.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<unknown>;
            const status = axiosError.response?.status;
            const message = normalizeApiError(error, "Unable to load dashboard.").message;
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
            "/dashboard/admin/totals/"
        );
        return resp.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<unknown>;
            const status = axiosError.response?.status;
            const message = normalizeApiError(error, "Unable to load admin totals.").message;
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
