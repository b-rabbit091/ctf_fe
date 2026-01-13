// src/api/challengeMeta.ts
import api from "./axios";
import {
    CategoryTypes,
    DifficultyTypes,
    SolutionTypes,
} from "../pages/PracticePage/types";

//  import the read-only helpers from practice.ts
import {
    getCategories as getCategoriesBase,
    getDifficulties as getDifficultiesBase,
    getSolutionTypes as getSolutionTypesBase,
} from "./practice";

// Re-export the "read" functions so the admin page can import everything from here
export const getCategories = getCategoriesBase;
export const getDifficulties = getDifficultiesBase;
export const getSolutionTypes = getSolutionTypesBase;

// ===== Admin-only CRUD for metadata =====

// Categories
export const createCategory = async (payload: {
    name: string;
    description?: string;
}): Promise<CategoryTypes> => {
    const resp = await api.post("/api/challenges/categories/", payload);
    return resp.data;
};

export const updateCategory = async (
    id: number,
    payload: { name?: string; description?: string }
): Promise<CategoryTypes> => {
    const resp = await api.patch(`/api/challenges/categories/${id}/`, payload);
    return resp.data;
};

export const deleteCategory = async (id: number): Promise<void> => {
    await api.delete(`/api/challenges/categories/${id}/`);
};

// Difficulties
export const createDifficulty = async (payload: {
    level: string;
    description?: string;
}): Promise<DifficultyTypes> => {
    const resp = await api.post("/api/challenges/difficulties/", payload);
    return resp.data;
};

export const updateDifficulty = async (
    id: number,
    payload: { level?: string; description?: string }
): Promise<DifficultyTypes> => {
    const resp = await api.patch(`/api/challenges/difficulties/${id}/`, payload);
    return resp.data;
};

export const deleteDifficulty = async (id: number): Promise<void> => {
    await api.delete(`/api/challenges/difficulties/${id}/`);
};

// Solution Types
export const createSolutionType = async (payload: {
    type: string;
    description?: string;
}): Promise<SolutionTypes> => {
    const resp = await api.post("/api/challenges/solution-types/", payload);
    return resp.data;
};

export const updateSolutionType = async (
    id: number,
    payload: { type?: string; description?: string }
): Promise<SolutionTypes> => {
    const resp = await api.patch(
        `/api/challenges/solution-types/${id}/`,
        payload
    );
    return resp.data;
};

export const deleteSolutionType = async (id: number): Promise<void> => {
    await api.delete(`/api/challenges/solution-types/${id}/`);
};
