import api from "../../api/axios";
import {Blog} from "./types";

const API_URL = "/api/blogs/";


// Fetch all blogs
export const getBlogs = async (): Promise<Blog[]> => {
    try {
        const resp = await api.get<Blog[]>(API_URL);
        return resp.data;
    } catch (err: any) {
        console.error("Error fetching blogs:", err);
        throw err.response?.data || err;
    }
};

// Fetch single blog by ID
export const getBlogById = async (id: number): Promise<Blog> => {
    try {
        const resp = await api.get<Blog>(`${API_URL}${id}/`);
        return resp.data;
    } catch (err: any) {
        console.error(`Error fetching blog id=${id}:`, err);
        throw err.response?.data || err;
    }
};

// Create blog (admin)
export const createBlog = async (data: FormData): Promise<Blog> => {
    try {
        const resp = await api.post<Blog>(API_URL, data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return resp.data;
    } catch (err: any) {
        console.error("Error creating blog:", err);
        throw err.response?.data || err;
    }
};

// Update blog (admin)
export const updateBlog = async (id: number, data: FormData): Promise<Blog> => {
    try {
        const resp = await api.put<Blog>(`${API_URL}${id}/`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return resp.data;
    } catch (err: any) {
        console.error(`Error updating blog id=${id}:`, err);
        throw err.response?.data || err;
    }
};

// Delete blog (admin)
export const deleteBlog = async (id: number): Promise<void> => {
    try {
        await api.delete(`${API_URL}${id}/`);
    } catch (err: any) {
        console.error(`Error deleting blog id=${id}:`, err);
        throw err.response?.data || err;
    }
};

