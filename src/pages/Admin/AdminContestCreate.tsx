import React, {FormEvent, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import api from "../../api/axios";

type ContestType = "daily" | "weekly" | "monthly" | "custom";

type ContestDTO = {
    id: number;
    name: string;
    slug: string;
    description?: string;
    contest_type: ContestType;
    start_time: string;
    end_time: string;
    is_active: boolean;
    publish_result: boolean;
};

const generateSlug = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const AdminContestCreate: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [contestType, setContestType] = useState<ContestType>("custom");
    const [startTime, setStartTime] = useState(""); // datetime-local
    const [endTime, setEndTime] = useState("");     // datetime-local
    const [isActive, setIsActive] = useState(true);
    const [publishResult, setPublishResult] = useState(false);

    const resetMessages = () => {
        setMessage(null);
        setError(null);
    };

    const handleNameBlur = () => {
        if (!slug.trim() && name.trim()) {
            setSlug(generateSlug(name));
        }
    };

    const validate = () => {
        if (!name.trim()) return "Contest name is required.";
        if (!startTime || !endTime) return "Start time and end time are required.";

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Invalid start or end time.";
        if (end <= start) return "End time must be after start time.";

        return null;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!user || user.role !== "admin") {
            setError("Unauthorized – admin only.");
            return;
        }

        const err = validate();
        if (err) {
            setError(err);
            return;
        }

        const finalSlug = slug.trim() ? slug.trim() : generateSlug(name);

        setSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                slug: finalSlug,
                description: description || "",
                contest_type: contestType,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                is_active: isActive,
                publish_result: publishResult,
            };

            // ✅ uses your contest endpoint
            const res = await api.post<ContestDTO>("/challenges/contests/", payload);

            setMessage("Contest created successfully.");
            setTimeout(() => setMessage(null), 2000);

            navigate("/admin/contests");
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.detail || "Failed to create contest. Please review and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // --- full-screen shell states ---
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full text-sm text-slate-500">Checking permissions…</div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <p className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        Unauthorized – admin access required.
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar/>

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-semibold text-slate-900 md:text-2xl">
                                Create Contest
                            </h1>
                            <p className="mt-1 text-xs text-slate-500 md:text-sm">
                                Create a new contest schedule and metadata.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">
                                Admin Panel
                            </span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                                New Contest
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {(error || message) && (
                            <div className="px-6 pt-4">
                                {error && (
                                    <div className="mb-3 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                        {error}
                                    </div>
                                )}
                                {message && (
                                    <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                        {message}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-6 px-6 py-6">
                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Contest Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onBlur={handleNameBlur}
                                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="e.g. Weekly Challenge – Mixed Bag"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Slug
                                    </label>
                                    <input
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="weekly-challenge-mixed-bag"
                                    />
                                    <p className="mt-1 text-xs text-slate-400">
                                        Auto-generated from name if left blank.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="block h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Rules, scoring, eligibility, etc."
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Contest Type
                                    </label>
                                    <select
                                        value={contestType}
                                        onChange={(e) => setContestType(e.target.value as ContestType)}
                                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Start <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        End <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-6">
                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                        Active
                                    </label>

                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={publishResult}
                                            onChange={(e) => setPublishResult(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                        Publish results
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => navigate("/admin/contests")}
                                    className="text-sm text-slate-500 hover:text-slate-700"
                                >
                                    ← Back to contests list
                                </button>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                                >
                                    {submitting ? "Creating..." : "Create Contest"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AdminContestCreate;
