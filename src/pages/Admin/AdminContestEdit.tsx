import React, {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import api from "../../api/axios";
import {FiTrash2} from "react-icons/fi";

type ContestType = "daily" | "weekly" | "monthly" | "custom";
type TabKey = "details" | "questions";

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
    challenges?: any[]; // expects [ids...] from backend
};

type ChallengeRow = {
    id: number;
    title: string;
    description: string;
    category?: { id: number; name: string } | null;
    difficulty?: { id: number; level: string } | null;
    question_type?: string | null;
};

const generateSlug = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const AdminContestEdit: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const contestId = id ? Number(id) : NaN;

    const navigate = useNavigate();
    const {user} = useAuth();

    const [activeTab, setActiveTab] = useState<TabKey>("details");

    const [initialLoading, setInitialLoading] = useState(true);
    const [initialError, setInitialError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [loaded, setLoaded] = useState<ContestDTO | null>(null);

    // details form
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [contestType, setContestType] = useState<ContestType>("custom");
    const [startTime, setStartTime] = useState(""); // datetime-local
    const [endTime, setEndTime] = useState(""); // datetime-local
    const [isActive, setIsActive] = useState(true);
    const [publishResult, setPublishResult] = useState(false);

    // questions tab state
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [attachedIds, setAttachedIds] = useState<number[]>([]);
    const [attachedRows, setAttachedRows] = useState<ChallengeRow[]>([]);
    const [qSearch, setQSearch] = useState("");

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

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

    const extractChallengeIds = (c: any): number[] => {
        const raw = c?.challenges ?? [];
        if (!Array.isArray(raw)) return [];
        return raw
            .map((x: any) => (typeof x === "number" ? x : x?.id))
            .filter((n: any) => typeof n === "number") as number[];
    };

    // ---------------- LOAD CONTEST (DETAILS) ----------------
    useEffect(() => {
        if (!user) return;

        if (!contestId || Number.isNaN(contestId)) {
            setInitialError("Invalid contest id.");
            setInitialLoading(false);
            return;
        }

        let mounted = true;

        (async () => {
            setInitialLoading(true);
            setInitialError(null);

            try {
                const res = await api.get<ContestDTO>(`/challenges/contests/${contestId}/`);
                if (!mounted) return;

                const c = res.data;
                setLoaded(c);

                setName(c.name || "");
                setSlug(c.slug || "");
                setDescription(c.description || "");
                setContestType(c.contest_type || "custom");
                setStartTime(toLocalInput(c.start_time));
                setEndTime(toLocalInput(c.end_time));
                setIsActive(Boolean(c.is_active));
                setPublishResult(Boolean(c.publish_result));

                const ids = extractChallengeIds(c);
                setAttachedIds(ids);
            } catch (e: any) {
                console.error(e);
                if (!mounted) return;
                setInitialError(
                    e?.response?.status === 404 ? "Contest not found." : "Failed to load contest. Please try again."
                );
            } finally {
                if (!mounted) return;
                setInitialLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [user, contestId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!user || user.role !== "admin") {
            setError("Unauthorized – admin only.");
            return;
        }
        if (!contestId || Number.isNaN(contestId)) {
            setError("Invalid contest id.");
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

            const res = await api.patch<ContestDTO>(`/challenges/contests/${contestId}/`, payload);

            setLoaded(res.data);
            setMessage("Contest updated successfully.");
            setTimeout(() => setMessage(null), 2500);

            navigate("/admin/contests");
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.detail || "Failed to update contest. Please review and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // ---------------- QUESTIONS TAB ----------------
    // IMPORTANT:
    // This fetches ONLY attached challenges (not all challenges),
    // using query param: ?id__in=1,2,3 (backend must support it).
    const hydrateAttachedRows = useCallback(async (ids: number[]) => {
        if (ids.length === 0) {
            setAttachedRows([]);
            return;
        }

        const idIn = ids.join(",");

        const res = await api.get<any[]>(`/challenges/challenges/`, {
            params: {"id__in": idIn},
        });

        const rows: ChallengeRow[] = (res.data || []).map((ch: any) => ({
            id: ch.id,
            title: ch.title || "",
            description: ch.description || "",
            category: ch.category ?? null,
            difficulty: ch.difficulty ?? null,
            question_type: ch.question_type ?? null,
        }));

        // keep same order as contest.challenges
        const byId = new Map<number, ChallengeRow>(rows.map((r) => [r.id, r]));
        setAttachedRows(ids.map((cid) => byId.get(cid)).filter(Boolean) as ChallengeRow[]);
    }, []);

    useEffect(() => {
        if (activeTab !== "questions") return;
        if (!loaded) return;

        const ids = extractChallengeIds(loaded);
        setAttachedIds(ids);

        setQuestionsLoading(true);
        (async () => {
            try {
                await hydrateAttachedRows(ids);
            } catch (e) {
                console.error(e);
                setError("Failed to load attached questions.");
            } finally {
                setQuestionsLoading(false);
            }
        })();
    }, [activeTab, loaded, hydrateAttachedRows]);

    const filteredQuestions = useMemo(() => {
        const q = qSearch.trim().toLowerCase();
        if (!q) return attachedRows;

        return attachedRows.filter((c) => {
            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();
            const diff = (c.difficulty?.level || "").toLowerCase();
            return title.includes(q) || desc.includes(q) || cat.includes(q) || diff.includes(q);
        });
    }, [attachedRows, qSearch]);

    // REMOVE semantics:
    // Your backend should interpret PATCH {"challenges":[id]} as "remove id from this contest"
    const handleRemoveQuestion = useCallback(
        async (challengeId: number) => {
            resetMessages();

            if (!user || user.role !== "admin") {
                setError("Unauthorized – admin only.");
                return;
            }
            if (!contestId || Number.isNaN(contestId)) {
                setError("Invalid contest id.");
                return;
            }

            if (!window.confirm("Remove this question from the contest? (It will NOT be deleted.)")) return;

            // optimistic
            const prevIds = attachedIds;
            setAttachedIds((prev) => prev.filter((x) => x !== challengeId));
            setAttachedRows((prev) => prev.filter((r) => r.id !== challengeId));
            setMessage("Removing question...");

            try {
                await api.patch(`/challenges/contests/${contestId}/`, {
                    challenges: [challengeId], // remove only this id
                });

                // refresh contest + rows (source of truth)
                const res = await api.get<ContestDTO>(`/challenges/contests/${contestId}/`);
                setLoaded(res.data);

                const ids = extractChallengeIds(res.data);
                setAttachedIds(ids);
                await hydrateAttachedRows(ids);

                setMessage("Question removed from contest.");
            } catch (e: any) {
                console.error(e);
                setAttachedIds(prevIds);
                setError(e?.response?.data?.detail || "Remove failed.");
                setMessage(null);

                // best-effort restore rows
                try {
                    await hydrateAttachedRows(prevIds);
                } catch {
                    // ignore
                }
            } finally {
                setTimeout(() => setMessage(null), 3500);
            }
        },
        [user, contestId, attachedIds, hydrateAttachedRows]
    );

    // ---------------- RENDER ----------------
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

    if (initialLoading) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full text-sm text-slate-500">Loading contest…</div>
                </main>
            </div>
        );
    }

    if (initialError || !loaded) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <p className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {initialError || "Unable to load contest."}
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
                                Edit Contest
                            </h1>
                            <p className="mt-1 text-xs text-slate-500 md:text-sm">
                                Update contest metadata, schedule, publish settings, and attached questions.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">
                                Admin Panel
                            </span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                                Contest #{loaded.id}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-slate-200 px-6 pt-2">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab("details")}
                                className={`relative pb-2 text-sm font-medium ${
                                    activeTab === "details" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                Contest Details
                                {activeTab === "details" && (
                                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600"/>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab("questions")}
                                className={`relative pb-2 text-sm font-medium ${
                                    activeTab === "questions" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                Questions
                                {activeTab === "questions" && (
                                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600"/>
                                )}
                            </button>
                        </div>
                    </div>

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

                    {/* DETAILS TAB */}
                    {activeTab === "details" && (
                        <form onSubmit={handleSubmit}>
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
                                        <p className="mt-1 text-xs text-slate-400">Auto-generated from name if blank.</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="block h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Rules, scoring, eligibility, etc."
                                    />
                                </div>

                                <div className="grid gap-6 md:grid-cols-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Contest Type</label>
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
                                        {submitting ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* QUESTIONS TAB */}
                    {activeTab === "questions" && (
                        <div className="px-6 py-6 space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="w-full md:w-[420px]">
                                    <input
                                        type="search"
                                        value={qSearch}
                                        onChange={(e) => setQSearch(e.target.value)}
                                        placeholder="Search attached questions..."
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>

                                <span className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                                    <span className="text-slate-500">Total:</span>
                                    <span className="ml-1 font-semibold text-slate-900">{filteredQuestions.length}</span>
                                </span>
                            </div>

                            {questionsLoading ? (
                                <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                                    Loading questions…
                                </div>
                            ) : filteredQuestions.length === 0 ? (
                                <div className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-base text-slate-500 shadow-sm">
                                    No questions attached.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm sm:text-base">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Category
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Difficulty
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredQuestions.map((q) => (
                                            <tr key={q.id}>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="max-w-xl">
                                                        <div className="truncate font-medium text-slate-900">
                                                            {q.title}
                                                        </div>
                                                        <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                            {q.description}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-700">
                                                    {q.category?.name || "—"}
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-700">
                                                    {q.difficulty?.level || "N/A"}
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-700">
                                                    {q.question_type || "—"}
                                                </td>

                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveQuestion(q.id)}
                                                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                                        >
                                                            <FiTrash2 size={16}/>
                                                            <span>Remove</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminContestEdit;
    