import api from "./axios";
import {normalizeApiError} from "../utils/apiError";

const API_URL = "/blogs/";

export interface Blog {
    id: number;
    title: string;
    content: string;
    cover_image?: string | File | null; // string for saved URL, File for new upload
    created_at: string;
}

// Fetch all blogs
export const getBlogs = async (): Promise<Blog[]> => {
    try {
        const resp = await api.get<Blog[]>(API_URL);
        return resp.data;
    } catch (err: unknown) {
        console.error("Error fetching blogs:", err);
        throw normalizeApiError(err, "Failed to fetch blogs.");
    }
};

// Fetch single blog by ID
export const getBlogById = async (id: number): Promise<Blog> => {
    try {
        const resp = await api.get<Blog>(`${API_URL}${id}/`);
        return resp.data;
    } catch (err: unknown) {
        console.error(`Error fetching blog id=${id}:`, err);
        throw normalizeApiError(err, `Failed to fetch blog ${id}.`);
    }
};

// Create blog (admin)
export const createBlog = async (data: FormData): Promise<Blog> => {
    try {
        const resp = await api.post<Blog>(API_URL, data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return resp.data;
    } catch (err: unknown) {
        console.error("Error creating blog:", err);
        throw normalizeApiError(err, "Failed to create blog.");
    }
};

// Update blog (admin)
export const updateBlog = async (id: number, data: FormData): Promise<Blog> => {
    try {
        const resp = await api.put<Blog>(`${API_URL}${id}/`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return resp.data;
    } catch (err: unknown) {
        console.error(`Error updating blog id=${id}:`, err);
        throw normalizeApiError(err, `Failed to update blog ${id}.`);
    }
};

// Delete blog (admin)
export const deleteBlog = async (id: number): Promise<void> => {
    try {
        await api.delete(`${API_URL}${id}/`);
    } catch (err: unknown) {
        console.error(`Error deleting blog id=${id}:`, err);
        throw normalizeApiError(err, `Failed to delete blog ${id}.`);
    }
};
