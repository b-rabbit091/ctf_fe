// src/api/axios.ts
import axios from "axios";
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from "../utils/token";
import { refreshToken } from "./auth";

const API_BASE = "http://localhost:8000";

const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
});

// Request: attach access token
api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Refresh logic - single inflight refresher + queue
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (val?: unknown) => void;
    reject: (err?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
    failedQueue = [];
};

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const originalRequest = err.config;
        if (!originalRequest) return Promise.reject(err);

        // if unauthorized and we have refresh token -> try refresh
        if (err.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refresh = getRefreshToken();
            if (!refresh) {
                clearTokens();
                return Promise.reject(err);
            }

            if (isRefreshing) {
                // queue the request
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return axios(originalRequest);
                    })
                    .catch((e) => Promise.reject(e));
            }

            isRefreshing = true;

            try {
                const data = await refreshToken(refresh);
                const newAccess = data.access;
                const newRefresh = data.refresh ?? refresh;
                setAccessToken(newAccess);
                localStorage.setItem("refreshToken", newRefresh); // persist
                processQueue(null, newAccess);
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return axios(originalRequest);
            } catch (e) {
                processQueue(e, null);
                clearTokens();
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(err);
    }
);

export default api;
