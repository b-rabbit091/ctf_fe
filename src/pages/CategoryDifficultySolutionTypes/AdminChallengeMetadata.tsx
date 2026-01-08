import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {
    getCategories,
    getDifficulties,
    getSolutionTypes,
    createCategory,
    updateCategory,
    deleteCategory,
    createDifficulty,
    updateDifficulty,
    deleteDifficulty,
    createSolutionType,
    updateSolutionType,
    deleteSolutionType,
} from "../../api/categoryDifficultySolutionTypes";
import {
    CategoryTypes,
    DifficultyTypes,
    SolutionTypes,
} from "../PracticePage/types";

interface EditableRowState {
    id: number | null;
    field1: string;
    field2: string;
}

const AdminChallengeMetadata: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [categories, setCategories] = useState<CategoryTypes[]>([]);
    const [difficulties, setDifficulties] = useState<DifficultyTypes[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<SolutionTypes[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // new item states
    const [newCategory, setNewCategory] = useState({name: "", description: ""});
    const [newDifficulty, setNewDifficulty] = useState({
        level: "",
        description: "",
    });
    const [newSolutionType, setNewSolutionType] = useState({
        type: "",
        description: "",
    });

    // inline edit states
    const [editingCategory, setEditingCategory] = useState<EditableRowState | null>(
        null
    );
    const [editingDifficulty, setEditingDifficulty] =
        useState<EditableRowState | null>(null);
    const [editingSolutionType, setEditingSolutionType] =
        useState<EditableRowState | null>(null);

    const resetMessages = () => {
        setError(null);
        setMessage(null);
    };

    useEffect(() => {
        if (!user) return;

        if (user.role !== "admin") {
            navigate("/dashboard");
            return;
        }

        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const [cats, diffs, sols] = await Promise.all([
                    getCategories(),
                    getDifficulties(),
                    getSolutionTypes(),
                ]);
                if (!mounted) return;
                setCategories(cats || []);
                setDifficulties(diffs || []);
                setSolutionTypes(sols || []);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load challenge metadata. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };
        load();

        return () => {
            mounted = false;
        };
    }, [user, navigate]);

    // === CATEGORY HANDLERS =====================================

    const handleAddCategory = async () => {
        resetMessages();
        const name = newCategory.name.trim();
        if (!name) {
            setError("Category name is required.");
            return;
        }
        try {
            const created = await createCategory({
                name,
                description: newCategory.description.trim() || "",
            });
            setCategories((prev) => [...prev, created]);
            setNewCategory({name: "", description: ""});
            setMessage("Category created.");
        } catch (e) {
            console.error(e);
            setError("Failed to create category.");
        }
    };

    const startEditCategory = (c: CategoryTypes) => {
        setEditingCategory({
            id: c.id,
            field1: c.name,
            field2: c.description ?? "",
        });
    };

    const cancelEditCategory = () => {
        setEditingCategory(null);
    };

    const saveEditCategory = async () => {
        if (!editingCategory || editingCategory.id == null) return;
        resetMessages();

        const {id, field1, field2} = editingCategory;
        if (!field1.trim()) {
            setError("Category name cannot be empty.");
            return;
        }

        try {
            const updated = await updateCategory(id, {
                name: field1.trim(),
                description: field2.trim(),
            });
            setCategories((prev) =>
                prev.map((c) => (c.id === id ? updated : c))
            );
            setEditingCategory(null);
            setMessage("Category updated.");
        } catch (e) {
            console.error(e);
            setError("Failed to update category.");
        }
    };

    const handleDeleteCategory = async (id: number) => {
        resetMessages();
        if (
            !window.confirm(
                "Delete this category? This may affect existing challenges using it."
            )
        ) {
            return;
        }
        const backup = categories;
        setCategories((prev) => prev.filter((c) => c.id !== id));
        try {
            await deleteCategory(id);
            setMessage("Category deleted.");
        } catch (e) {
            console.error(e);
            setCategories(backup);
            setError("Failed to delete category.");
        }
    };

    // === DIFFICULTY HANDLERS ===================================

    const handleAddDifficulty = async () => {
        resetMessages();
        const level = newDifficulty.level.trim();
        if (!level) {
            setError("Difficulty level is required.");
            return;
        }
        try {
            const created = await createDifficulty({
                level,
                description: newDifficulty.description.trim() || "",
            });
            setDifficulties((prev) => [...prev, created]);
            setNewDifficulty({level: "", description: ""});
            setMessage("Difficulty created.");
        } catch (e) {
            console.error(e);
            setError("Failed to create difficulty.");
        }
    };

    const startEditDifficulty = (d: DifficultyTypes) => {
        setEditingDifficulty({
            id: d.id,
            field1: d.level,
            field2: d.description ?? "",
        });
    };

    const cancelEditDifficulty = () => {
        setEditingDifficulty(null);
    };

    const saveEditDifficulty = async () => {
        if (!editingDifficulty || editingDifficulty.id == null) return;
        resetMessages();

        const {id, field1, field2} = editingDifficulty;
        if (!field1.trim()) {
            setError("Difficulty level cannot be empty.");
            return;
        }
        try {
            const updated = await updateDifficulty(id, {
                level: field1.trim(),
                description: field2.trim(),
            });
            setDifficulties((prev) =>
                prev.map((d) => (d.id === id ? updated : d))
            );
            setEditingDifficulty(null);
            setMessage("Difficulty updated.");
        } catch (e) {
            console.error(e);
            setError("Failed to update difficulty.");
        }
    };

    const handleDeleteDifficulty = async (id: number) => {
        resetMessages();
        if (
            !window.confirm(
                "Delete this difficulty? This may affect existing challenges using it."
            )
        ) {
            return;
        }
        const backup = difficulties;
        setDifficulties((prev) => prev.filter((d) => d.id !== id));
        try {
            await deleteDifficulty(id);
            setMessage("Difficulty deleted.");
        } catch (e) {
            console.error(e);
            setDifficulties(backup);
            setError("Failed to delete difficulty.");
        }
    };

    // === SOLUTION TYPE HANDLERS ================================

    const handleAddSolutionType = async () => {
        resetMessages();
        const type = newSolutionType.type.trim();
        if (!type) {
            setError("Solution type name is required.");
            return;
        }
        try {
            const created = await createSolutionType({
                type,
                description: newSolutionType.description.trim() || "",
            });
            setSolutionTypes((prev) => [...prev, created]);
            setNewSolutionType({type: "", description: ""});
            setMessage("Solution type created.");
        } catch (e) {
            console.error(e);
            setError("Failed to create solution type.");
        }
    };

    const startEditSolutionType = (s: SolutionTypes) => {
        setEditingSolutionType({
            id: s.id,
            field1: s.type,
            field2: s.description ?? "",
        });
    };

    const cancelEditSolutionType = () => {
        setEditingSolutionType(null);
    };

    const saveEditSolutionType = async () => {
        if (!editingSolutionType || editingSolutionType.id == null) return;
        resetMessages();

        const {id, field1, field2} = editingSolutionType;
        if (!field1.trim()) {
            setError("Solution type name cannot be empty.");
            return;
        }
        try {
            const updated = await updateSolutionType(id, {
                type: field1.trim(),
                description: field2.trim(),
            });
            setSolutionTypes((prev) =>
                prev.map((s) => (s.id === id ? updated : s))
            );
            setEditingSolutionType(null);
            setMessage("Solution type updated.");
        } catch (e) {
            console.error(e);
            setError("Failed to update solution type.");
        }
    };

    const handleDeleteSolutionType = async (id: number) => {
        resetMessages();
        if (
            !window.confirm(
                "Delete this solution type? This may affect existing challenges using it."
            )
        ) {
            return;
        }
        const backup = solutionTypes;
        setSolutionTypes((prev) => prev.filter((s) => s.id !== id));
        try {
            await deleteSolutionType(id);
            setMessage("Solution type deleted.");
        } catch (e) {
            console.error(e);
            setSolutionTypes(backup);
            setError("Failed to delete solution type.");
        }
    };

    // === SIMPLE PERMISSION / LOADING STATES ====================

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar/>
                <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">
                    Checking permissions…
                </div>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar/>
                <div className="mx-auto max-w-3xl p-6">
                    <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        Unauthorized – admin access required.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar/>
            <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
                {/* Header */}
                <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                            Challenge Metadata
                        </h1>
                        <p className="mt-1 text-xs text-slate-500 md:text-sm">
                            Manage categories, difficulties, and solution types used by
                            practice and competition challenges.
                        </p>
                    </div>
                    <span
                        className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Admin Panel
          </span>
                </header>

                {/* Alerts */}
                {loading && (
                    <div
                        className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                        Loading metadata…
                    </div>
                )}
                {error && (
                    <div
                        className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                        {error}
                    </div>
                )}
                {message && (
                    <div
                        className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
                        {message}
                    </div>
                )}

                {/* Content */}
                {!loading && (
                    <div className="space-y-6">
                        {/* Categories */}
                        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-4 py-3 md:px-5">
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Categories
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Logical groupings like Web, Crypto, Forensics, etc.
                                </p>
                            </div>
                            <div className="px-4 py-4 md:px-5">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead
                                        className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-2 py-2 text-left">Name</th>
                                        <th className="px-2 py-2 text-left">Description</th>
                                        <th className="px-2 py-2 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                    {categories.map((c) => {
                                        const isEditing =
                                            editingCategory && editingCategory.id === c.id;
                                        return (
                                            <tr key={c.id}>
                                                <td className="px-2 py-2 align-top">
                                                    {isEditing ? (
                                                        <input
                                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={editingCategory?.field1 ?? ""}
                                                            onChange={(e) =>
                                                                setEditingCategory((prev) =>
                                                                    prev
                                                                        ? {...prev, field1: e.target.value}
                                                                        : prev
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-slate-900">
                                {c.name}
                              </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 align-top text-xs text-slate-700">
                                                    {isEditing ? (
                                                        <input
                                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={editingCategory?.field2 ?? ""}
                                                            onChange={(e) =>
                                                                setEditingCategory((prev) =>
                                                                    prev
                                                                        ? {...prev, field2: e.target.value}
                                                                        : prev
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        c.description || "—"
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 align-top text-right text-xs">
                                                    {isEditing ? (
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={saveEditCategory}
                                                                className="rounded-md border border-emerald-500 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditCategory}
                                                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditCategory(c)}
                                                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCategory(c.id)}
                                                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Add new category row */}
                                    <tr>
                                        <td className="px-2 py-2 align-top">
                                            <input
                                                className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="New category name"
                                                value={newCategory.name}
                                                onChange={(e) =>
                                                    setNewCategory((prev) => ({
                                                        ...prev,
                                                        name: e.target.value,
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <input
                                                className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Optional description"
                                                value={newCategory.description}
                                                onChange={(e) =>
                                                    setNewCategory((prev) => ({
                                                        ...prev,
                                                        description: e.target.value,
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right text-xs">
                                            <button
                                                type="button"
                                                onClick={handleAddCategory}
                                                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                            >
                                                Add Category
                                            </button>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Difficulties */}
                        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-4 py-3 md:px-5">
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Difficulties
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Levels like Easy, Medium, Hard used for challenge difficulty.
                                </p>
                            </div>
                            <div className="px-4 py-4 md:px-5">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead
                                        className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-2 py-2 text-left">Level</th>
                                        <th className="px-2 py-2 text-left">Description</th>
                                        <th className="px-2 py-2 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                    {difficulties.map((d) => {
                                        const isEditing =
                                            editingDifficulty && editingDifficulty.id === d.id;
                                        return (
                                            <tr key={d.id}>
                                                <td className="px-2 py-2 align-top">
                                                    {isEditing ? (
                                                        <input
                                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={editingDifficulty?.field1 ?? ""}
                                                            onChange={(e) =>
                                                                setEditingDifficulty((prev) =>
                                                                    prev
                                                                        ? {...prev, field1: e.target.value}
                                                                        : prev
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-slate-900">
                                {d.level}
                              </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 align-top text-xs text-slate-700">
                                                    {isEditing ? (
                                                        <input
                                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={editingDifficulty?.field2 ?? ""}
                                                            onChange={(e) =>
                                                                setEditingDifficulty((prev) =>
                                                                    prev
                                                                        ? {...prev, field2: e.target.value}
                                                                        : prev
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        d.description || "—"
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 align-top text-right text-xs">
                                                    {isEditing ? (
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={saveEditDifficulty}
                                                                className="rounded-md border border-emerald-500 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditDifficulty}
                                                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditDifficulty(d)}
                                                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteDifficulty(d.id)}
                                                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Add new difficulty row */}
                                    <tr>
                                        <td className="px-2 py-2 align-top">
                                            <input
                                                className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="New difficulty (e.g. Easy)"
                                                value={newDifficulty.level}
                                                onChange={(e) =>
                                                    setNewDifficulty((prev) => ({
                                                        ...prev,
                                                        level: e.target.value,
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <input
                                                className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Optional description"
                                                value={newDifficulty.description}
                                                onChange={(e) =>
                                                    setNewDifficulty((prev) => ({
                                                        ...prev,
                                                        description: e.target.value,
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right text-xs">
                                            <button
                                                type="button"
                                                onClick={handleAddDifficulty}
                                                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                            >
                                                Add Difficulty
                                            </button>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Solution Types */}
                        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 px-4 py-3 md:px-5">
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Solution Types
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    E.g. Flag-only, Writeup, Flag + Writeup. Used to configure how
                                    answers are submitted.
                                </p>
                            </div>
                            <div className="px-4 py-4 md:px-5">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead
                                        className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-2 py-2 text-left">Type</th>
                                        <th className="px-2 py-2 text-left">Description</th>
                                        <th className="px-2 py-2 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                    {solutionTypes.map((s) => {
                                        const isEditing =
                                            editingSolutionType && editingSolutionType.id === s.id;
                                        return (
                                            <tr key={s.id}>
                                                <td className="px-2 py-2 align-top">
                                                    {isEditing ? (
                                                        <input
                                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={editingSolutionType?.field1 ?? ""}
                                                            onChange={(e) =>
                                                                setEditingSolutionType((prev) =>
                                                                    prev
                                                                        ? {...prev, field1: e.target.value}
                                                                        : prev
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-slate-900">
                                {s.type}
                              </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 align-top text-xs text-slate-700">
                                                    {isEditing ? (
                                                        <input
                                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            value={editingSolutionType?.field2 ?? ""}
                                                            onChange={(e) =>
                                                                setEditingSolutionType((prev) =>
                                                                    prev
                                                                        ? {...prev, field2: e.target.value}
                                                                        : prev
                                                                )
                                                            }
                                                        />
                                                    ) : (
                                                        s.description || "—"
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 align-top text-right text-xs">
                                                    {isEditing ? (
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={saveEditSolutionType}
                                                                className="rounded-md border border-emerald-500 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditSolutionType}
                                                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditSolutionType(s)}
                                                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteSolutionType(s.id)}
                                                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Add new solution type row */}
                                    <tr>
                                        <td className="px-2 py-2 align-top">
                                            <input
                                                className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="New solution type (e.g. Flag)"
                                                value={newSolutionType.type}
                                                onChange={(e) =>
                                                    setNewSolutionType((prev) => ({
                                                        ...prev,
                                                        type: e.target.value,
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <input
                                                className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Optional description"
                                                value={newSolutionType.description}
                                                onChange={(e) =>
                                                    setNewSolutionType((prev) => ({
                                                        ...prev,
                                                        description: e.target.value,
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right text-xs">
                                            <button
                                                type="button"
                                                onClick={handleAddSolutionType}
                                                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                            >
                                                Add Solution Type
                                            </button>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminChallengeMetadata;
