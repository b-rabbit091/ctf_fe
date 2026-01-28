import React, {FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import api from "../../api/axios";
import {FiTrash2, FiAlertCircle, FiInfo} from "react-icons/fi";

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
    challenges?: any[]; // expects [ids...] or [{id:..}]
};

type ChallengeRow = {
    id: number;
    title: string;
    description: string;
    category?: { id: number; name: string } | null;
    difficulty?: { id: number; level: string } | null;
    question_type?: string | null;
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const generateSlug = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const extractChallengeIds = (c: any): number[] => {
    const raw = c?.challenges ?? [];
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x: any) => (typeof x === "number" ? x : x?.id))
        .filter((n: any) => typeof n === "number") as number[];
};

const AdminContestEdit: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const contestId = useMemo(() => {
        const n = id ? Number(id) : NaN;
        return Number.isFinite(n) ? n : NaN;
    }, [id]);

    const navigate = useNavigate();
    const {user} = useAuth();

    const [activeTab, setActiveTab] = useState<TabKey>("details");

    const [initialLoading, setInitialLoading] = useState(true);
    const [initialError, setInitialError] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [questionsLoading, setQuestionsLoading] = useState(false);

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
    const [attachedIds, setAttachedIds] = useState<number[]>([]);
    const [attachedRows, setAttachedRows] = useState<ChallengeRow[]>([]);
    const [qSearch, setQSearch] = useState("");

    // lifecycle + concurrency guards
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const busyRef = useRef(false);
    const msgTimer = useRef<number | null>(null);

    const resetMessages = useCallback(() => {
        setMessage(null);
        setError(null);
    }, []);

    const flashMessage = useCallback((text: string | null) => {
        setMessage(text);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        if (!text) return;
        msgTimer.current = window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, 3500);
    }, []);

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    const handleNameBlur = useCallback(() => {
        if (!slug.trim() && name.trim()) setSlug(generateSlug(name));
    }, [slug, name]);

    const validate = useCallback(() => {
        if (!name.trim()) return "Contest name is required.";
        if (!startTime || !endTime) return "Start time and end time are required.";

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Invalid start or end time.";
        if (end <= start) return "End time must be after start time.";
        return null;
    }, [name, startTime, endTime]);

    const fetchContest = useCallback(async () => {
        if (!user) return;
        if (user.role !== "admin") return;

        if (!contestId || Number.isNaN(contestId)) {
            setInitialError("Invalid contest id.");
            setInitialLoading(false);
            return;
        }

        setInitialLoading(true);
        setInitialError(null);

        try {
            const res = await api.get<ContestDTO>(`/challenges/contests/${contestId}/`);
            if (!alive.current) return;

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
            if (!alive.current) return;
            setInitialError(e?.response?.status === 404 ? "Contest not found." : "Failed to load contest. Please try again.");
        } finally {
            if (!alive.current) return;
            setInitialLoading(false);
        }
    }, [user, contestId]);

    useEffect(() => {
        fetchContest();
    }, [fetchContest]);

    // fetch ONLY attached challenges
    const hydrateAttachedRows = useCallback(async (ids: number[]) => {
        if (ids.length === 0) {
            setAttachedRows([]);
            return;
        }

        const idIn = ids.join(",");

        const res = await api.get<any[]>(`/challenges/challenges/`, {params: {"id__in": idIn}});

        const rows: ChallengeRow[] = (res.data || []).map((ch: any) => ({
            id: ch.id,
            title: ch.title || "",
            description: ch.description || "",
            category: ch.category ?? null,
            difficulty: ch.difficulty ?? null,
            question_type: ch.question_type ?? null,
        }));

        const byId = new Map<number, ChallengeRow>(rows.map((r) => [r.id, r]));
        setAttachedRows(ids.map((cid) => byId.get(cid)).filter(Boolean) as ChallengeRow[]);
    }, []);

    // load questions when tab is opened
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
                if (!alive.current) return;
                setError("Failed to load attached questions.");
            } finally {
                if (!alive.current) return;
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

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
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

            if (busyRef.current) return;
            busyRef.current = true;
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
                if (!alive.current) return;

                setLoaded(res.data);
                flashMessage("Contest updated successfully.");
                navigate("/admin/contests");
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;
                setError(e?.response?.data?.detail || "Failed to update contest. Please review and try again.");
            } finally {
                busyRef.current = false;
                if (!alive.current) return;
                setSubmitting(false);
            }
        },
        [
            resetMessages,
            user,
            contestId,
            validate,
            slug,
            name,
            description,
            contestType,
            startTime,
            endTime,
            isActive,
            publishResult,
            flashMessage,
            navigate,
        ]
    );

    // REMOVE semantics: backend interprets PATCH {"challenges":[id]} as remove id
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
            if (busyRef.current) return;

            if (!window.confirm("Remove this question from the contest? (It will NOT be deleted.)")) return;

            busyRef.current = true;

            // optimistic
            const prevIds = attachedIds;
            setAttachedIds((prev) => prev.filter((x) => x !== challengeId));
            setAttachedRows((prev) => prev.filter((r) => r.id !== challengeId));
            flashMessage("Removing question...");

            try {
                await api.patch(`/challenges/contests/${contestId}/`, {challenges: [challengeId]});

                // refresh contest source-of-truth
                const res = await api.get<ContestDTO>(`/challenges/contests/${contestId}/`);
                if (!alive.current) return;

                setLoaded(res.data);

                const ids = extractChallengeIds(res.data);
                setAttachedIds(ids);
                await hydrateAttachedRows(ids);

                flashMessage("Question removed from contest.");
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;

                setAttachedIds(prevIds);
                setError(e?.response?.data?.detail || "Remove failed.");

                // best-effort restore rows
                try {
                    await hydrateAttachedRows(prevIds);
                } catch {
                    // ignore
                }
            } finally {
                busyRef.current = false;
            }
        },
        [resetMessages, user, contestId, attachedIds, hydrateAttachedRows, flashMessage]
    );

    // ---------------- RENDER ----------------
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Unauthorized</p>
                                <p className="mt-1 text-sm text-rose-700/90">Admin access required.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (initialLoading) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                            <div className="min-w-0 space-y-2">
                                <div className="h-4 w-52 bg-slate-200/80 rounded animate-pulse" />
                                <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                            </div>
                        </div>
                        <p className="mt-3 text-center text-sm text-slate-500">Loading contest…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (initialError || !loaded) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load contest</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">
                                    {initialError || "Unable to load contest."}
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden">
                    {/* Header */}
                    <header className="px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                    Edit Contest
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-500">
                                    Update contest metadata, schedule, publish settings, and attached questions.
                                </p>
                            </div>

                            <span className="inline-flex items-center rounded-full ring-1 ring-emerald-200/60 bg-emerald-50/70 px-3.5 py-2 text-xs sm:text-sm text-emerald-700">
                                Contest #{loaded.id}
                            </span>
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="px-4 sm:px-5 pt-2 border-b border-slate-200/70">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab("details")}
                                className={cx(
                                    "relative pb-3 text-sm font-normal tracking-tight",
                                    activeTab === "details" ? "text-slate-700" : "text-slate-500 hover:text-slate-700",
                                    focusRing
                                )}
                            >
                                Contest Details
                                {activeTab === "details" ? (
                                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-sky-400" />
                                ) : null}
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab("questions")}
                                className={cx(
                                    "relative pb-3 text-sm font-normal tracking-tight",
                                    activeTab === "questions" ? "text-slate-700" : "text-slate-500 hover:text-slate-700",
                                    focusRing
                                )}
                            >
                                Questions
                                {activeTab === "questions" ? (
                                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-sky-400" />
                                ) : null}
                            </button>
                        </div>
                    </div>

                    {/* Alerts */}
                    {(error || message) ? (
                        <div className="px-4 sm:px-5 pt-4">
                            {error ? (
                                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                                    <div className="flex items-start gap-3">
                                        <FiAlertCircle className="mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-normal tracking-tight">Fix required</p>
                                            <p className="mt-1 text-sm whitespace-pre-line break-words text-rose-700/90">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {message ? (
                                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800">
                                    {message}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {/* DETAILS TAB */}
                    {activeTab === "details" ? (
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-6 px-4 sm:px-5 py-5">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Contest Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onBlur={handleNameBlur}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            placeholder="e.g. Weekly Challenge – Mixed Bag"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Slug</label>
                                        <input
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            placeholder="weekly-challenge-mixed-bag"
                                        />
                                        <p className="mt-1 text-xs text-slate-500">Auto-generated from name if blank.</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-normal text-slate-600">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={cx(
                                            "min-h-[112px] w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
                                        placeholder="Rules, scoring, eligibility, etc."
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Contest Type</label>
                                        <select
                                            value={contestType}
                                            onChange={(e) => setContestType(e.target.value as ContestType)}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Start <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            End <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 md:pt-7">
                                        <label className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300"
                                            />
                                            Active
                                        </label>

                                        <label className="flex items-center gap-2 text-sm text-slate-600">
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

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/70 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/contests")}
                                        className={cx("rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-slate-700", focusRing)}
                                    >
                                        ← Back to contests list
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={cx(
                                            "inline-flex items-center justify-center rounded-xl bg-white/70 px-5 py-2 text-sm sm:text-base font-normal tracking-tight",
                                            submitting
                                                ? "cursor-not-allowed ring-1 ring-slate-200/60 text-slate-300"
                                                : "ring-1 ring-emerald-200/60 text-emerald-700 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        {submitting ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>

                                <div className="pt-1 text-xs text-slate-500">
                                    <FiInfo className="inline -mt-0.5 mr-1" />
                                    Times are stored in UTC; your local inputs are converted automatically.
                                </div>
                            </div>
                        </form>
                    ) : (
                        /* QUESTIONS TAB */
                        <div className="px-4 sm:px-5 py-5 space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="w-full md:w-[420px]">
                                    <input
                                        type="search"
                                        value={qSearch}
                                        onChange={(e) => setQSearch(e.target.value)}
                                        placeholder="Search attached questions..."
                                        className={cx(
                                            "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
                                    />
                                </div>

                                <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                    <span className="text-slate-500">Total:</span>
                                    <span className="ml-1">{filteredQuestions.length}</span>
                                </span>
                            </div>

                            {questionsLoading ? (
                                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm text-slate-600">
                                    Loading questions…
                                </div>
                            ) : filteredQuestions.length === 0 ? (
                                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                    <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                        <FiInfo className="text-slate-500" />
                                    </div>
                                    <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                        No questions attached
                                    </div>
                                    <div className="mt-1 text-sm sm:text-base text-slate-500">
                                        This contest currently has no attached challenges.
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                    <table className="min-w-full text-sm sm:text-base">
                                        <thead className="bg-white/40 sticky top-0">
                                        <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-3 font-normal">Title</th>
                                            <th className="px-4 py-3 font-normal">Category</th>
                                            <th className="px-4 py-3 font-normal">Difficulty</th>
                                            <th className="px-4 py-3 font-normal">Type</th>
                                            <th className="px-4 py-3 text-right font-normal">Actions</th>
                                        </tr>
                                        </thead>

                                        <tbody className="bg-transparent">
                                        {filteredQuestions.map((q) => (
                                            <tr
                                                key={q.id}
                                                className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition"
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <div className="max-w-[34rem]">
                                                        <div className="truncate font-normal tracking-tight text-slate-700">
                                                            {q.title}
                                                        </div>
                                                        <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                            {q.description}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-600">{q.category?.name || "—"}</td>

                                                <td className="px-4 py-3 align-top text-slate-600">{q.difficulty?.level || "N/A"}</td>

                                                <td className="px-4 py-3 align-top text-slate-600">{q.question_type || "—"}</td>

                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveQuestion(q.id)}
                                                            className={cx(
                                                                "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                "ring-1 ring-rose-200/60 text-rose-700 hover:bg-white/90",
                                                                focusRing
                                                            )}
                                                        >
                                                            <FiTrash2 size={16} />
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
