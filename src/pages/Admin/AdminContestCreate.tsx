import React, {FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import api from "../../api/axios";
import {FiAlertCircle, FiInfo} from "react-icons/fi";

type ContestType = "daily" | "weekly" | "monthly" | "custom";

type ContestDTO = {
    id: number;
    name: string;
    slug: string;
    description?: string;
    contest_type: ContestType;
    start_time: string;
    end_time: string;
    group_only: boolean;
    publish_result: boolean;
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

const AdminContestCreate: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [contestType, setContestType] = useState<ContestType>("custom");
    const [startTime, setStartTime] = useState(""); // datetime-local
    const [endTime, setEndTime] = useState(""); // datetime-local
    const [isActive, setIsActive] = useState(false);
    const [publishResult, setPublishResult] = useState(false);

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
        }, 2500);
    }, []);

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    const finalSlug = useMemo(() => (slug.trim() ? slug.trim() : generateSlug(name)), [slug, name]);

    const handleNameBlur = useCallback(() => {
        if (!slug.trim() && name.trim()) {
            setSlug(generateSlug(name));
        }
    }, [slug, name]);

    const validate = useCallback((): string | null => {
        if (!name.trim()) return "Contest name is required.";
        if (!startTime || !endTime) return "Start time and end time are required.";

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Invalid start or end time.";
        if (end <= start) return "End time must be after start time.";

        return null;
    }, [name, startTime, endTime]);

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
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
                    group_only: isActive,
                    publish_result: publishResult,
                };

                await api.post<ContestDTO>("/challenges/contests/", payload);

                if (!alive.current) return;

                flashMessage("Contest created successfully.");
                navigate("/admin/contests");
            } catch (e: any) {
                console.error(e);
                if (!alive.current) return;
                setError(e?.response?.data?.detail || "Failed to create contest. Please review and try again.");
            } finally {
                busyRef.current = false;
                if (!alive.current) return;
                setSubmitting(false);
            }
        },
        [
            resetMessages,
            user,
            validate,
            name,
            finalSlug,
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

    // --- full-screen shell states (match AdminPracticeList styling) ---
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

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden">
                    <header className="px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                    Create Contest
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-500">
                                    Create a new contest schedule and metadata.
                                </p>
                            </div>

                            <span className="inline-flex items-center rounded-full ring-1 ring-emerald-200/60 bg-emerald-50/70 px-3.5 py-2 text-xs sm:text-sm text-emerald-700">
                                New Contest
                            </span>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit}>
                        {(error || message) ? (
                            <div className="px-4 sm:px-5 pt-4">
                                {error ? (
                                    <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                                        <div className="flex items-start gap-3">
                                            <FiAlertCircle className="mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-normal tracking-tight">Fix required</p>
                                                <p className="mt-1 text-sm break-words text-rose-700/90 whitespace-pre-line">
                                                    {error}
                                                </p>
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
                                    <p className="mt-1 text-xs text-slate-500">Auto-generated from name if left blank.</p>
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
                                        Group Only
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
                                    {submitting ? "Creating..." : "Create Contest"}
                                </button>
                            </div>

                            <div className="pt-1 text-xs text-slate-500">
                                <FiInfo className="inline -mt-0.5 mr-1" />
                                Times are saved in UTC. Your local input will be converted automatically.
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AdminContestCreate;
