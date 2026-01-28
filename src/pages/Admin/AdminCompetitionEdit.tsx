import React, {FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {
    getCategories,
    getChallengeById,
    getDifficulties,
    getSolutionTypes,
    updateChallenge,
} from "../../api/practice";

import {Challenge, ContestMeta} from "../CompetitionPage/types";
import {FiAlertCircle, FiInfo} from "react-icons/fi";

type TabKey = "question" | "solution";
type ContestType = "daily" | "weekly" | "monthly" | "custom";
type QuestionType = "practice" | "competition";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const generateSlug = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/zip",
    "application/x-zip-compressed",
]);

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const AdminCompetitionEdit: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {user} = useAuth();

    const challengeId = useMemo(() => {
        const n = id ? Number(id) : NaN;
        return Number.isFinite(n) ? n : NaN;
    }, [id]);

    // tabs
    const [activeTab, setActiveTab] = useState<TabKey>("question");
    const [questionSaved, setQuestionSaved] = useState(false);

    // loading / error states
    const [initialLoading, setInitialLoading] = useState(true);
    const [initialError, setInitialError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [loadedChallenge, setLoadedChallenge] = useState<Challenge | null>(null);

    // form fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [constraints, setConstraints] = useState("");
    const [inputFormat, setInputFormat] = useState("");
    const [outputFormat, setOutputFormat] = useState("");
    const [sampleInput, setSampleInput] = useState("");
    const [sampleOutput, setSampleOutput] = useState("");
    const [category, setCategory] = useState<number | "">("");
    const [difficulty, setDifficulty] = useState<number | "">("");
    const [solutionType, setSolutionType] = useState<number | "">("");
    const [questionType] = useState<QuestionType>("competition");

    // contest fields
    const [contestId, setContestId] = useState<number | null>(null);
    const [contestName, setContestName] = useState("");
    const [contestSlug, setContestSlug] = useState("");
    const [contestDescription, setContestDescription] = useState("");
    const [contestType, setContestType] = useState<ContestType>("custom");
    const [contestStartTime, setContestStartTime] = useState("");
    const [contestEndTime, setContestEndTime] = useState("");

    // solution notes (still local-only here)
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    // dropdowns
    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);
    const [groupOnly, setGroupOnly] = useState(false);

    // guards
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
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    // slug auto-fill
    const handleContestNameBlur = useCallback(() => {
        if (!contestSlug.trim() && contestName.trim()) {
            setContestSlug(generateSlug(contestName));
        }
    }, [contestSlug, contestName]);

    // initial load
    const loadInitial = useCallback(async () => {
        if (!user) return;
        if (user.role !== "admin") return;

        if (!challengeId || Number.isNaN(challengeId)) {
            setInitialError("Invalid challenge id.");
            setInitialLoading(false);
            return;
        }

        setInitialLoading(true);
        setInitialError(null);

        try {
            const [cats, diffs, sols, challenge] = await Promise.all([
                getCategories(),
                getDifficulties(),
                getSolutionTypes(),
                getChallengeById(challengeId),
            ]);

            if (!alive.current) return;

            setCategories(Array.isArray(cats) ? cats : []);
            setDifficulties(Array.isArray(diffs) ? diffs : []);
            setSolutionTypes(Array.isArray(sols) ? sols : []);
            setLoadedChallenge(challenge);

            setTitle(challenge.title || "");
            setDescription(challenge.description || "");
            setConstraints(challenge.constraints || "");
            setInputFormat(challenge.input_format || "");
            setOutputFormat(challenge.output_format || "");
            setSampleInput(challenge.sample_input || "");
            setSampleOutput(challenge.sample_output || "");
            setCategory(challenge.category?.id || "");
            setDifficulty(challenge.difficulty?.id || "");
            setSolutionType(challenge.solution_type?.id || "");
            setGroupOnly(Boolean((challenge as any).group_only));

            const contest: ContestMeta | null | undefined = challenge.active_contest;

            if (contest) {
                setContestId(contest.id);
                setContestName(contest.name || "");
                setContestSlug(contest.slug || "");
                setContestDescription(contest.description || "");
                setContestType((contest.contest_type as ContestType) || "custom");
                setContestStartTime(toLocalInput(contest.start_time));
                setContestEndTime(toLocalInput(contest.end_time));
            } else {
                setContestId(null);
                setContestName("");
                setContestSlug("");
                setContestDescription("");
                setContestType("custom");
                setContestStartTime("");
                setContestEndTime("");
            }

            // keep current behavior: require draft validation before solution tab
            setQuestionSaved(true);
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;

            setInitialError(
                e?.response?.status === 404
                    ? "Competition challenge not found."
                    : "Failed to load competition challenge. Please try again."
            );
        } finally {
            if (!alive.current) return;
            setInitialLoading(false);
        }
    }, [user, challengeId]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    const validateQuestionDraft = useCallback(() => {
        resetMessages();

        if (!title.trim() || !description.trim()) {
            setError("Title and Description are required.");
            return false;
        }
        if (!category || !difficulty || !solutionType) {
            setError("Category, Difficulty, and Solution Type are required.");
            return false;
        }
        return true;
    }, [title, description, category, difficulty, solutionType, resetMessages]);

    const validateContestBlock = useCallback(() => {
        if (!contestName.trim()) {
            setError("Contest Name is required.");
            return false;
        }
        if (!contestStartTime || !contestEndTime) {
            setError("Contest Start Time and End Time are required.");
            return false;
        }

        const start = new Date(contestStartTime);
        const end = new Date(contestEndTime);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            setError("Invalid contest start or end time.");
            return false;
        }
        if (end <= start) {
            setError("Contest End Time must be after Start Time.");
            return false;
        }
        return true;
    }, [contestName, contestStartTime, contestEndTime]);

    const handleSaveQuestionDraft = useCallback(() => {
        if (!validateQuestionDraft()) {
            setActiveTab("question");
            return;
        }

        setQuestionSaved(true);
        setActiveTab("solution");
        flashMessage("Question draft validated. You can now review solution notes.");
    }, [validateQuestionDraft, flashMessage]);

    const handleFilesChange = useCallback((files: FileList | null) => {
        if (!files) return;
        resetMessages();

        const nextFiles: File[] = [];
        const rejected: string[] = [];

        Array.from(files).forEach((file) => {
            if (!ALLOWED_TYPES.has(file.type)) {
                rejected.push(`${file.name} (unsupported type)`);
                return;
            }
            if (file.size > MAX_FILE_BYTES) {
                rejected.push(`${file.name} (too large > 20MB)`);
                return;
            }
            nextFiles.push(file);
        });

        // basic anti-spam: cap total attachments to prevent huge FormData
        const CAP = 12;
        setUploadFiles((prev) => {
            const merged = [...prev, ...nextFiles];
            return merged.slice(0, CAP);
        });

        if (rejected.length > 0) {
            setError(`Some files were rejected:\n${rejected.map((r) => `• ${r}`).join("\n")}`);
        }
    }, [resetMessages]);

    const handleRemoveFile = useCallback((index: number) => {
        resetMessages();
        setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    }, [resetMessages]);

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            resetMessages();

            if (!user || user.role !== "admin") {
                setError("Unauthorized: admin only.");
                return;
            }

            if (!challengeId || Number.isNaN(challengeId)) {
                setError("Invalid challenge id.");
                return;
            }

            if (!questionSaved) {
                setError("Please validate and save the question draft before updating the competition.");
                setActiveTab("question");
                return;
            }

            if (!validateQuestionDraft()) {
                setActiveTab("question");
                return;
            }

            if (!validateContestBlock()) {
                setActiveTab("question");
                return;
            }

            if (busyRef.current) return;
            busyRef.current = true;
            setSubmitting(true);

            try {
                const formData = new FormData();

                formData.append("title", title.trim());
                formData.append("description", description.trim());
                formData.append("constraints", constraints || "");
                formData.append("input_format", inputFormat || "");
                formData.append("output_format", outputFormat || "");
                formData.append("sample_input", sampleInput || "");
                formData.append("sample_output", sampleOutput || "");
                formData.append("question_type", questionType);

                if (category) formData.append("category", String(category));
                if (difficulty) formData.append("difficulty", String(difficulty));
                if (solutionType) formData.append("solution_type", String(solutionType));

                if (contestId !== null) formData.append("contest_id", String(contestId));
                formData.append("contest_name", contestName.trim());
                if (contestSlug.trim()) formData.append("contest_slug", contestSlug.trim());
                formData.append("contest_description", contestDescription || "");
                formData.append("contest_type", contestType);

                formData.append("contest_start_time", new Date(contestStartTime).toISOString());
                formData.append("contest_end_time", new Date(contestEndTime).toISOString());
                formData.append("group_only", groupOnly ? "true" : "false");

                uploadFiles.forEach((file) => formData.append("uploaded_files", file));

                await updateChallenge(challengeId, formData);

                if (!alive.current) return;

                flashMessage("Competition challenge updated successfully.");
                navigate("/admin/contests");
            } catch (err: any) {
                console.error(err);
                if (!alive.current) return;
                setError(
                    err?.response?.data?.detail ||
                    "Failed to update competition challenge. Please review your input and try again."
                );
            } finally {
                busyRef.current = false;
                if (!alive.current) return;
                setSubmitting(false);
            }
        },
        [
            resetMessages,
            user,
            challengeId,
            questionSaved,
            validateQuestionDraft,
            validateContestBlock,
            title,
            description,
            constraints,
            inputFormat,
            outputFormat,
            sampleInput,
            sampleOutput,
            questionType,
            category,
            difficulty,
            solutionType,
            contestId,
            contestName,
            contestSlug,
            contestDescription,
            contestType,
            contestStartTime,
            contestEndTime,
            groupOnly,
            uploadFiles,
            flashMessage,
            navigate,
        ]
    );

    // --- responsive full-screen shell (match AdminPracticeList) ---
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
                        <p className="mt-3 text-center text-sm text-slate-500">Loading competition challenge…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (initialError || !loadedChallenge) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load challenge</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">
                                    {initialError || "Unable to load competition challenge."}
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
                    <header className="px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                    Edit Competition Challenge
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-500">
                                    Update the challenge, contest window, and reference files.
                                </p>
                            </div>

                            <span className="inline-flex items-center rounded-full ring-1 ring-emerald-200/60 bg-emerald-50/70 px-3.5 py-2 text-xs sm:text-sm text-emerald-700">
                                Competition #{loadedChallenge.id}
                            </span>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit}>
                        {(error || message) && (
                            <div className="px-4 sm:px-5 pt-4">
                                {error ? (
                                    <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                                        <div className="flex items-start gap-3">
                                            <FiAlertCircle className="mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-normal tracking-tight">Fix required</p>
                                                <p className="mt-1 text-sm whitespace-pre-line break-words text-rose-700/90">
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
                        )}

                        {/* Tabs */}
                        <div className="px-4 sm:px-5 pt-2 border-b border-slate-200/70">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={cx(
                                        "relative pb-3 text-sm font-normal tracking-tight",
                                        activeTab === "question"
                                            ? "text-slate-700"
                                            : "text-slate-500 hover:text-slate-700",
                                        focusRing
                                    )}
                                >
                                    Question & Contest
                                    {activeTab === "question" ? (
                                        <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-sky-400" />
                                    ) : null}
                                </button>

                                <button
                                    type="button"
                                    disabled={!questionSaved}
                                    onClick={() => questionSaved && setActiveTab("solution")}
                                    className={cx(
                                        "relative pb-3 text-sm font-normal tracking-tight",
                                        !questionSaved
                                            ? "cursor-not-allowed text-slate-300"
                                            : activeTab === "solution"
                                                ? "text-slate-700"
                                                : "text-slate-500 hover:text-slate-700",
                                        focusRing
                                    )}
                                >
                                    Solution Notes
                                    {activeTab === "solution" && questionSaved ? (
                                        <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-sky-400" />
                                    ) : null}
                                </button>
                            </div>
                        </div>

                        {activeTab === "question" ? (
                            <div className="space-y-6 px-4 sm:px-5 py-5">
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Title <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            placeholder="e.g. Web Exploitation – Auth Bypass"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Question Type</label>
                                        <input
                                            value="competition"
                                            disabled
                                            className="h-10 w-full rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-4 text-xs font-normal uppercase tracking-wide text-emerald-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-normal text-slate-600">
                                        Problem Description <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        className={cx(
                                            "min-h-[160px] w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
                                        placeholder="Describe the challenge, context, and goal…"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Plain text recommended. Avoid revealing flags / full solutions.
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : "")}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Difficulty <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value ? Number(e.target.value) : "")}
                                        >
                                            <option value="">Select Difficulty</option>
                                            {difficulties.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.level}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Solution Type <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            value={solutionType}
                                            onChange={(e) => setSolutionType(e.target.value ? Number(e.target.value) : "")}
                                        >
                                            <option value="">Select Solution Type</option>
                                            {solutionTypes.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.type}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Constraints</label>
                                        <textarea
                                            className={cx(
                                                "min-h-[96px] w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">Input Format</label>
                                            <textarea
                                                className={cx(
                                                    "min-h-[96px] w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">Output Format</label>
                                            <textarea
                                                className={cx(
                                                    "min-h-[96px] w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Sample Input</label>
                                        <textarea
                                            className={cx(
                                                "min-h-[112px] w-full rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Sample Output</label>
                                        <textarea
                                            className={cx(
                                                "min-h-[112px] w-full rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Contest block */}
                                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                                Contest Settings
                                            </h2>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Update the contest this challenge is attached to.
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm text-slate-600">
                                            {contestId ? `Contest #${contestId}` : "New contest"}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                                        <div className="md:col-span-2">
                                            <label className="mb-1 block text-sm font-normal text-slate-600">
                                                Contest Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                className={cx(
                                                    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                                value={contestName}
                                                onChange={(e) => setContestName(e.target.value)}
                                                onBlur={handleContestNameBlur}
                                            />
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <input
                                                id="group_only"
                                                type="checkbox"
                                                checked={groupOnly}
                                                onChange={(e) => setGroupOnly(e.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-slate-300"
                                            />
                                            <label htmlFor="group_only" className="text-sm text-slate-600">
                                                Group-only competition
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Only users who are part of a group can participate.
                                                </p>
                                            </label>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">Slug</label>
                                            <input
                                                className={cx(
                                                    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                                placeholder="weekly-web-ctf-12"
                                                value={contestSlug}
                                                onChange={(e) => setContestSlug(e.target.value)}
                                            />
                                            <p className="mt-1 text-xs text-slate-500">
                                                Optional. Auto-generated from name if left blank.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Contest Description</label>
                                        <textarea
                                            className={cx(
                                                "min-h-[96px] w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            value={contestDescription}
                                            onChange={(e) => setContestDescription(e.target.value)}
                                        />
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">Contest Type</label>
                                            <select
                                                className={cx(
                                                    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                                value={contestType}
                                                onChange={(e) => setContestType(e.target.value as ContestType)}
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="custom">Custom</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">
                                                Start Time <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className={cx(
                                                    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                                value={contestStartTime}
                                                onChange={(e) => setContestStartTime(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">
                                                End Time <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className={cx(
                                                    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                                value={contestEndTime}
                                                onChange={(e) => setContestEndTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Uploads */}
                                <div className="rounded-2xl border border-slate-200/70 bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm sm:text-base font-normal tracking-tight text-slate-700">
                                                Attach Reference Files
                                            </p>
                                            <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                                Max 20MB per file. Allowed: images, ZIP. (Capped to 12 files.)
                                            </p>
                                        </div>

                                        <label
                                            className={cx(
                                                "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                                "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                focusRing
                                            )}
                                        >
                                            <span>Upload files</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept=".zip,image/*"
                                                className="hidden"
                                                onChange={(e) => handleFilesChange(e.target.files)}
                                            />
                                        </label>
                                    </div>

                                    {uploadFiles.length > 0 ? (
                                        <ul className="mt-3 space-y-2">
                                            {uploadFiles.map((file, idx) => (
                                                <li
                                                    key={`${file.name}-${idx}`}
                                                    className="flex items-center justify-between gap-3 rounded-xl ring-1 ring-slate-200/60 bg-white/70 px-4 py-2"
                                                >
                                                    <span className="min-w-0 truncate text-sm text-slate-600">
                                                        {file.name}{" "}
                                                        <span className="text-slate-400">({Math.round(file.size / 1024)} KB)</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        className={cx(
                                                            "shrink-0 rounded-lg px-3 py-1.5 text-sm text-rose-700 ring-1 ring-rose-200/60 bg-rose-50/60 hover:bg-rose-50",
                                                            focusRing
                                                        )}
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="mt-3 flex items-start gap-3 text-slate-600">
                                            <FiInfo className="mt-0.5 shrink-0" />
                                            <p className="text-sm">No files selected yet.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/contests")}
                                        className={cx("rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-slate-700", focusRing)}
                                    >
                                        ← Back to competitions list
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveQuestionDraft}
                                        className={cx(
                                            "inline-flex items-center justify-center rounded-xl bg-white/70 px-5 py-2 text-sm sm:text-base font-normal tracking-tight",
                                            "ring-1 ring-sky-200/60 text-sky-700 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        Validate Question Draft
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Solution tab
                            <div className="space-y-6 px-4 sm:px-5 py-5">
                                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm text-slate-600">
                                    These fields are for internal solution notes only. They should never be exposed to participants.
                                </div>

                                {(solutionType === 1 || solutionType === 3) ? (
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Flag Solution</label>
                                        <textarea
                                            className={cx(
                                                "min-h-[96px] w-full rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            placeholder="flag{example_flag_here}"
                                            value={flagSolution}
                                            onChange={(e) => setFlagSolution(e.target.value)}
                                        />
                                    </div>
                                ) : null}

                                {(solutionType === 2 || solutionType === 3) ? (
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Procedure / Writeup</label>
                                        <textarea
                                            className={cx(
                                                "min-h-[160px] w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                            placeholder="Step-by-step solution, hints, and reasoning..."
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("question")}
                                        className={cx("rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-slate-700", focusRing)}
                                    >
                                        ← Back to Question & Contest
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
                                        {submitting ? "Updating..." : "Update Competition"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AdminCompetitionEdit;
