import React, {FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {
    getCategories,
    getDifficulties,
    getSolutionTypes,
    getChallengeById,
    updateChallenge,
} from "../PracticePage/practice";
import {Challenge} from "../PracticePage/types";
import {FiAlertCircle, FiInfo} from "react-icons/fi";

type TabKey = "question" | "solution";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const inputBase =
    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

const textareaBase =
    "block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

const selectBase =
    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

const monoBase =
    "block w-full rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-mono text-slate-700 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

const allowedFileTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/zip",
    "application/x-zip-compressed",
];
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function tagClass(active: boolean, disabled = false) {
    return [
        "relative pb-3 text-sm font-normal tracking-tight",
        disabled ? "cursor-not-allowed text-slate-300" : active ? "text-slate-700" : "text-slate-500 hover:text-slate-700",
        focusRing,
    ].join(" ");
}

const AdminPracticeEdit: React.FC = () => {
    const {id} = useParams<{id: string}>();
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

    // messages
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // loaded challenge
    const [loadedChallenge, setLoadedChallenge] = useState<Challenge | null>(null);

    // fields
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
    const [questionType] = useState<"practice" | "competition">("practice");

    // solution notes (local-only)
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    // uploads
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    // options
    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);

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
        }, 3000);
    }, []);

    // SECURITY (TOP)
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

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

            setCategories(cats || []);
            setDifficulties(diffs || []);
            setSolutionTypes(sols || []);
            setLoadedChallenge(challenge);

            setTitle(challenge.title || "");
            setDescription(challenge.description || "");
            setConstraints((challenge.constraints as string) || "");
            setInputFormat((challenge.input_format as string) || "");
            setOutputFormat((challenge.output_format as string) || "");
            setSampleInput((challenge.sample_input as string) || "");
            setSampleOutput((challenge.sample_output as string) || "");
            setCategory(challenge.category?.id || "");
            setDifficulty(challenge.difficulty?.id || "");
            setSolutionType(challenge.solution_type?.id || "");

            setQuestionSaved(true);
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;
            setInitialError(
                e?.response?.status === 404
                    ? "Practice challenge not found."
                    : "Failed to load practice challenge. Please try again."
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
        if (!title.trim() || !description.trim()) return "Title and Description are required.";
        if (!category || !difficulty || !solutionType) return "Category, Difficulty, and Solution Type are required.";
        return null;
    }, [title, description, category, difficulty, solutionType]);

    const handleSaveQuestionDraft = useCallback(() => {
        resetMessages();
        const err = validateQuestionDraft();
        if (err) {
            setError(err);
            return;
        }
        setQuestionSaved(true);
        setActiveTab("solution");
        flashMessage("Question draft validated. You can now review solution notes.");
    }, [resetMessages, validateQuestionDraft, flashMessage]);

    const handleFilesChange = useCallback(
        (files: FileList | null) => {
            if (!files) return;
            resetMessages();

            const nextFiles: File[] = [];
            const rejected: string[] = [];

            Array.from(files).forEach((file) => {
                if (!allowedFileTypes.includes(file.type)) {
                    rejected.push(`${file.name} (unsupported type)`);
                    return;
                }
                if (file.size > MAX_FILE_BYTES) {
                    rejected.push(`${file.name} (too large > 20MB)`);
                    return;
                }
                nextFiles.push(file);
            });

            if (nextFiles.length) setUploadFiles((prev) => [...prev, ...nextFiles]);

            if (rejected.length) {
                setError(`Some files were rejected:\n${rejected.map((r) => `• ${r}`).join("\n")}`);
            }
        },
        [resetMessages]
    );

    const handleRemoveFile = useCallback(
        (index: number) => {
            resetMessages();
            setUploadFiles((prev) => prev.filter((_, i) => i !== index));
        },
        [resetMessages]
    );

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            resetMessages();

            if (!user || user.role !== "admin") {
                setError("Unauthorized – admin only.");
                return;
            }

            if (!questionSaved) {
                setError("Please validate and save the question draft before updating the practice challenge.");
                setActiveTab("question");
                return;
            }

            if (!challengeId || Number.isNaN(challengeId)) {
                setError("Invalid challenge id.");
                return;
            }

            const err = validateQuestionDraft();
            if (err) {
                setError(err);
                setActiveTab("question");
                return;
            }

            if (busyRef.current) return;
            busyRef.current = true;

            setSubmitting(true);
            try {
                const formData = new FormData();

                formData.append("title", title);
                formData.append("description", description);
                formData.append("constraints", constraints || "");
                formData.append("input_format", inputFormat || "");
                formData.append("output_format", outputFormat || "");
                formData.append("sample_input", sampleInput || "");
                formData.append("sample_output", sampleOutput || "");
                formData.append("question_type", questionType);
                formData.append("category", String(category));
                formData.append("difficulty", String(difficulty));
                formData.append("solution_type", String(solutionType));

                uploadFiles.forEach((file) => formData.append("uploaded_files", file));

                await updateChallenge(challengeId, formData);

                flashMessage("Practice challenge updated successfully.");
                navigate("/admin/practice");
            } catch (err: any) {
                console.error(err);
                setError(
                    err?.response?.data?.detail ||
                    "Failed to update practice challenge. Please review your input and try again."
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
            questionSaved,
            challengeId,
            validateQuestionDraft,
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
            uploadFiles,
            flashMessage,
            navigate,
        ]
    );

    /** -------------------- guard states -------------------- **/
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
                        <p className="mt-3 text-center text-sm text-slate-500">Loading practice challenge…</p>
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
                                <p className="mt-1 text-sm break-words text-rose-700/90">{initialError || "Unable to load."}</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /** -------------------- main render -------------------- **/
    const showFlag = solutionType === 1 || solutionType === 3;
    const showProcedure = solutionType === 2 || solutionType === 3;

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
                                    Edit Practice Challenge
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-500">
                                    Update the practice problem, metadata, and reference files.
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                    Admin Panel
                                </span>
                                <span className="inline-flex items-center rounded-full ring-1 ring-emerald-200/60 bg-emerald-50/70 px-3.5 py-2 text-xs sm:text-sm text-emerald-700">
                                    Practice #{loadedChallenge.id}
                                </span>
                            </div>
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="px-4 sm:px-5 pt-2 border-b border-slate-200/70">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab("question")}
                                className={tagClass(activeTab === "question")}
                            >
                                Question
                                {activeTab === "question" ? (
                                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-sky-400" />
                                ) : null}
                            </button>

                            <button
                                type="button"
                                disabled={!questionSaved}
                                onClick={() => questionSaved && setActiveTab("solution")}
                                className={tagClass(activeTab === "solution" && questionSaved, !questionSaved)}
                                aria-disabled={!questionSaved}
                            >
                                Solution Notes
                                {activeTab === "solution" ? (
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

                    <form onSubmit={handleSubmit}>
                        {/* QUESTION TAB */}
                        {activeTab === "question" ? (
                            <div className="space-y-6 px-4 sm:px-5 py-5">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Title <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            className={inputBase}
                                            placeholder="e.g. SQL Injection Basics"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Question Type</label>
                                        <input
                                            value="practice"
                                            disabled
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-4 text-xs font-normal uppercase tracking-wide text-emerald-700"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-normal text-slate-600">
                                        Problem Description <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        className={textareaBase}
                                        style={{height: 160}}
                                        placeholder="Describe the challenge, context, and goal..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        <FiInfo className="inline -mt-0.5 mr-1" />
                                        Supports plain text. For code snippets, use backticks in the description.
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">
                                            Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={selectBase}
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
                                            className={selectBase}
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
                                            className={selectBase}
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
                                            className={textareaBase}
                                            style={{height: 96}}
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">Input Format</label>
                                            <textarea
                                                className={textareaBase}
                                                style={{height: 96}}
                                                placeholder="Describe input specification..."
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-normal text-slate-600">Output Format</label>
                                            <textarea
                                                className={textareaBase}
                                                style={{height: 96}}
                                                placeholder="Describe output specification..."
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
                                            className={monoBase}
                                            style={{height: 112}}
                                            placeholder="Example input..."
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Sample Output</label>
                                        <textarea
                                            className={monoBase}
                                            style={{height: 112}}
                                            placeholder="Example output..."
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200/70 bg-white/40 p-4 backdrop-blur-xl">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm sm:text-base font-normal text-slate-700">
                                                Attach Additional Reference Files
                                            </p>
                                            <p className="mt-1 text-xs sm:text-sm text-slate-600">
                                                New uploads will be added to existing attachments. Max 20MB per file. Allowed types:
                                                images, ZIP.
                                            </p>
                                        </div>

                                        <label
                                            className={cx(
                                                "inline-flex cursor-pointer items-center rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
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
                                        <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-600">
                                            {uploadFiles.map((file, idx) => (
                                                <li
                                                    key={`${file.name}-${idx}`}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl ring-1 ring-slate-200/60 bg-white/70 px-4 py-2"
                                                >
                                                    <span className="max-w-[520px] truncate">
                                                        {file.name} <span className="text-slate-400">({Math.round(file.size / 1024)} KB)</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        className={cx("text-rose-700 hover:text-rose-800", focusRing)}
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/70 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/practice")}
                                        className={cx("rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-slate-700", focusRing)}
                                    >
                                        ← Back to practice list
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
                            /* SOLUTION TAB */
                            <div className="space-y-6 px-4 sm:px-5 py-5">
                                <div className="rounded-2xl border border-slate-200/70 bg-white/40 p-4 text-xs sm:text-sm text-slate-600 shadow-sm backdrop-blur-xl">
                                    <FiInfo className="inline -mt-0.5 mr-1" />
                                    These fields are internal solution notes and official answers. They should not be exposed to participants.
                                </div>

                                {showFlag ? (
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Flag Solution</label>
                                        <textarea
                                            className={monoBase}
                                            style={{height: 112}}
                                            placeholder="flag{example_flag_here}"
                                            value={flagSolution}
                                            onChange={(e) => setFlagSolution(e.target.value)}
                                        />
                                    </div>
                                ) : null}

                                {showProcedure ? (
                                    <div>
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Procedure / Writeup</label>
                                        <textarea
                                            className={textareaBase}
                                            style={{height: 160}}
                                            placeholder="Step-by-step solution, hints, and reasoning..."
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/70 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("question")}
                                        className={cx("rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-slate-700", focusRing)}
                                    >
                                        ← Back to Question
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
                                        {submitting ? "Updating..." : "Update Practice Challenge"}
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

export default AdminPracticeEdit;
