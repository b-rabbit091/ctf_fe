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
} from "../../api/practice";
import {Challenge} from "../CompetitionPage/types";

type TabKey = "question" | "solution";
type QuestionType = "practice" | "competition" | "N/A";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const AdminDraftEdit: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {user} = useAuth();

    const challengeId = id ? Number(id) : NaN;

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

    // loaded
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

    const [questionType, setQuestionType] = useState<QuestionType>("N/A");
    const [lockedQuestionType, setLockedQuestionType] = useState<"practice" | "competition" | null>(null);

    // local solution notes (not sent)
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    // uploads
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    // options
    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);

    // avoid setState after unmount + prevent double submit
    const alive = useRef(true);
    const busyRef = useRef(false);
    const msgTimer = useRef<number | null>(null);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            if (msgTimer.current) window.clearTimeout(msgTimer.current);
        };
    }, []);

    const resetMessages = useCallback(() => {
        setMessage(null);
        setError(null);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        msgTimer.current = null;
    }, []);

    const flashMessage = useCallback((text: string | null, ms = 2500) => {
        setMessage(text);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        if (!text) return;
        msgTimer.current = window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, ms);
    }, []);

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    // allowed options based on lock
    const allowedQuestionTypeOptions = useMemo(() => {
        if (lockedQuestionType) return ["N/A", lockedQuestionType] as QuestionType[];
        return ["practice", "competition", "N/A"] as QuestionType[];
    }, [lockedQuestionType]);

    const contest = (loadedChallenge as any)?.active_contest || null;

    // ---------------- LOAD INITIAL ----------------
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

            const apiQtRaw = String((challenge as any).question_type || "").toLowerCase();
            const mapped: QuestionType =
                apiQtRaw === "practice" ? "practice" : apiQtRaw === "competition" ? "competition" : "N/A";
            setQuestionType(mapped);

            const lock = mapped === "practice" || mapped === "competition" ? mapped : null;
            setLockedQuestionType(lock);

            // existing draft -> can open solution tab
            setQuestionSaved(true);
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;
            setInitialError(
                e?.response?.status === 404
                    ? "Draft question not found."
                    : "Failed to load draft question. Please try again."
            );
        } finally {
            if (!alive.current) return;
            setInitialLoading(false);
        }
    }, [user, challengeId]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    // ---------------- VALIDATION ----------------
    const validateQuestion = useCallback((): string | null => {
        if (!title.trim() || !description.trim()) return "Title and Description are required.";
        if (!category || !difficulty || !solutionType) return "Category, Difficulty, and Solution Type are required.";

        // extra guard: never swap practice <-> competition if locked
        if (lockedQuestionType && questionType !== "N/A" && questionType !== lockedQuestionType) {
            return "You can only change Question Type to N/A. Switching between Practice and Competition is not allowed.";
        }
        return null;
    }, [title, description, category, difficulty, solutionType, lockedQuestionType, questionType]);

    const handleSaveQuestionDraft = useCallback(() => {
        resetMessages();
        const err = validateQuestion();
        if (err) {
            setError(err);
            return;
        }
        setQuestionSaved(true);
        setActiveTab("solution");
        flashMessage("Draft validated. You can now review solution notes.");
    }, [resetMessages, validateQuestion, flashMessage]);

    // ---------------- FILES ----------------
    const handleFilesChange = useCallback((files: FileList | null) => {
        if (!files) return;
        resetMessages();

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/zip",
            "application/x-zip-compressed",
        ];
        const maxSizeBytes = 20 * 1024 * 1024;

        const nextFiles: File[] = [];
        const rejected: string[] = [];

        Array.from(files).forEach((file) => {
            if (!allowedTypes.includes(file.type)) {
                rejected.push(`${file.name} (unsupported type)`);
                return;
            }
            if (file.size > maxSizeBytes) {
                rejected.push(`${file.name} (too large > 20MB)`);
                return;
            }
            nextFiles.push(file);
        });

        // de-dupe same file name+size to avoid accidental multi-add
        setUploadFiles((prev) => {
            const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
            const merged = [...prev];
            nextFiles.forEach((f) => {
                const key = `${f.name}-${f.size}`;
                if (!seen.has(key)) {
                    merged.push(f);
                    seen.add(key);
                }
            });
            return merged;
        });

        if (rejected.length > 0) {
            setError(`Some files were rejected:\n${rejected.map((r) => `• ${r}`).join("\n")}`);
        }
    }, [resetMessages]);

    const handleRemoveFile = useCallback((index: number) => {
        resetMessages();
        setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    }, [resetMessages]);

    // ---------------- SUBMIT ----------------
    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            resetMessages();

            if (!user || user.role !== "admin") {
                setError("Unauthorized – admin only.");
                return;
            }
            if (!challengeId || Number.isNaN(challengeId)) {
                setError("Invalid challenge id.");
                return;
            }
            if (!questionSaved) {
                setError("Please validate and save the draft before updating.");
                setActiveTab("question");
                return;
            }

            const err = validateQuestion();
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
                formData.append("question_type", questionType); // ✅ always send exact value

                if (category) formData.append("category", String(category));
                if (difficulty) formData.append("difficulty", String(difficulty));
                if (solutionType) formData.append("solution_type", String(solutionType));

                uploadFiles.forEach((file) => {
                    formData.append("uploaded_files", file);
                });

                await updateChallenge(challengeId, formData);

                if (!alive.current) return;

                flashMessage("Draft updated successfully.");
                navigate("/admin/drafts");
            } catch (err: any) {
                console.error(err);
                if (!alive.current) return;
                setError(err?.response?.data?.detail || "Failed to update draft. Please review your input and try again.");
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
            validateQuestion,
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

    // ---------------- FULL SCREEN GUARDS ----------------
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
                        Unauthorized – admin access required.
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
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Loading draft…
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
                        {initialError || "Unable to load draft."}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <div className="w-full rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-white/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                Edit Draft Question
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-500">
                                Update the draft problem, metadata, and attachments. Contest info is read-only (competition only).
                            </p>
                        </div>

                        <div className="flex flex-row flex-wrap items-center gap-2 text-[11px] text-slate-500 sm:flex-col sm:items-end sm:gap-1">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">Admin Panel</span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                                Draft #{loadedChallenge.id}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {(error || message) && (
                            <div className="px-4 pt-4 sm:px-6">
                                {error && (
                                    <div className="mb-3 whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800">
                                        {error}
                                    </div>
                                )}
                                {message && (
                                    <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                                        {message}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="border-b border-slate-200/70 px-4 pt-2 sm:px-6">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={cx(
                                        "relative pb-2 text-sm font-medium",
                                        activeTab === "question" ? "text-slate-900" : "text-slate-500 hover:text-slate-700",
                                        focusRing
                                    )}
                                >
                                    Question
                                    {activeTab === "question" && (
                                        <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-sky-300" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    disabled={!questionSaved}
                                    onClick={() => questionSaved && setActiveTab("solution")}
                                    className={cx(
                                        "relative pb-2 text-sm font-medium",
                                        !questionSaved
                                            ? "cursor-not-allowed text-slate-300"
                                            : activeTab === "solution"
                                                ? "text-slate-900"
                                                : "text-slate-500 hover:text-slate-700",
                                        focusRing
                                    )}
                                >
                                    Solution Notes
                                    {activeTab === "solution" && questionSaved && (
                                        <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-sky-300" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* QUESTION TAB */}
                        {activeTab === "question" && (
                            <div className="space-y-8 px-4 py-6 sm:px-6">
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Title <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            className={cx(
                                                "block w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={title}
                                            onChange={(e) => {
                                                setTitle(e.target.value);
                                                setQuestionSaved(false);
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Question Type <span className="text-rose-500">*</span>
                                        </label>

                                        <select
                                            className={cx(
                                                "block w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={questionType}
                                            onChange={(e) => {
                                                const next = e.target.value as QuestionType;

                                                // hard block swap when locked
                                                if (lockedQuestionType && next !== "N/A" && next !== lockedQuestionType) return;

                                                setQuestionType(next);
                                                setQuestionSaved(false);
                                                setActiveTab("question");
                                            }}
                                        >
                                            {allowedQuestionTypeOptions.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt === "N/A" ? "N/A" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                                                </option>
                                            ))}
                                        </select>

                                        <p className="mt-1 text-xs text-slate-400">
                                            If original type is Practice/Competition, you can only change it to N/A (not switch types).
                                        </p>
                                    </div>
                                </div>

                                {/* Read-only contest info */}
                                {questionType === "competition" && (
                                    <div className="rounded-2xl bg-white/60 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">Contest (read-only)</div>
                                                <div className="text-xs text-slate-500">Managed in Contests. Not editable here.</div>
                                            </div>
                                            <span className="w-fit rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200/60">
                                                {contest?.id ? `Contest #${contest.id}` : "No contest attached"}
                                            </span>
                                        </div>

                                        {contest ? (
                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <div className="rounded-xl bg-white ring-1 ring-slate-200/60 px-3 py-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Name</div>
                                                    <div className="mt-1 text-sm text-slate-800">{contest.name || "—"}</div>
                                                </div>

                                                <div className="rounded-xl bg-white ring-1 ring-slate-200/60 px-3 py-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Slug</div>
                                                    <div className="mt-1 text-sm text-slate-800">{contest.slug || "—"}</div>
                                                </div>

                                                <div className="rounded-xl bg-white ring-1 ring-slate-200/60 px-3 py-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Type</div>
                                                    <div className="mt-1 text-sm text-slate-800">{contest.contest_type || "—"}</div>
                                                </div>

                                                <div className="rounded-xl bg-white ring-1 ring-slate-200/60 px-3 py-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Schedule</div>
                                                    <div className="mt-1 text-sm text-slate-800">
                                                        {contest.start_time ? toLocalInput(contest.start_time) : "—"} →{" "}
                                                        {contest.end_time ? toLocalInput(contest.end_time) : "—"}
                                                    </div>
                                                </div>

                                                <div className="rounded-xl bg-white ring-1 ring-slate-200/60 px-3 py-2 md:col-span-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Description</div>
                                                    <div className="mt-1 text-sm text-slate-800 whitespace-pre-line">
                                                        {contest.description || "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-3 text-sm text-slate-600">
                                                This draft is marked <b>Competition</b> but has no contest attached.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Problem Description <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        className={cx(
                                            "block h-40 w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                            "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                            focusRing
                                        )}
                                        value={description}
                                        onChange={(e) => {
                                            setDescription(e.target.value);
                                            setQuestionSaved(false);
                                        }}
                                    />
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={cx(
                                                "block w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={category}
                                            onChange={(e) => {
                                                setCategory(e.target.value ? Number(e.target.value) : "");
                                                setQuestionSaved(false);
                                            }}
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Difficulty <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={cx(
                                                "block w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={difficulty}
                                            onChange={(e) => {
                                                setDifficulty(e.target.value ? Number(e.target.value) : "");
                                                setQuestionSaved(false);
                                            }}
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Solution Type <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className={cx(
                                                "block w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={solutionType}
                                            onChange={(e) => {
                                                setSolutionType(e.target.value ? Number(e.target.value) : "");
                                                setQuestionSaved(false);
                                            }}
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

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Constraints</label>
                                        <textarea
                                            className={cx(
                                                "block h-24 w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Input Format</label>
                                            <textarea
                                                className={cx(
                                                    "block h-24 w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                    "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                    focusRing
                                                )}
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Output Format</label>
                                            <textarea
                                                className={cx(
                                                    "block h-24 w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                    "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                    focusRing
                                                )}
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Sample Input</label>
                                        <textarea
                                            className={cx(
                                                "block h-28 w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Sample Output</label>
                                        <textarea
                                            className={cx(
                                                "block h-28 w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Uploads */}
                                <div className="rounded-2xl bg-white/60 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Attach Reference Files</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Added to existing attachments. Max 20MB/file. Allowed: images, ZIP.
                                            </p>
                                        </div>

                                        <label
                                            className={cx(
                                                "inline-flex w-fit cursor-pointer items-center rounded-xl bg-white/70 px-3 py-2 text-xs font-medium",
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

                                    {uploadFiles.length > 0 && (
                                        <ul className="mt-3 space-y-2 text-xs text-slate-600">
                                            {uploadFiles.map((file, idx) => (
                                                <li
                                                    key={`${file.name}-${idx}`}
                                                    className="flex items-center justify-between gap-3 rounded-xl bg-white ring-1 ring-slate-200/60 px-3 py-2"
                                                >
                                                    <span className="min-w-0 flex-1 truncate">
                                                        {file.name}{" "}
                                                        <span className="text-slate-400">
                                                            ({Math.round(file.size / 1024)} KB)
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        className={cx(
                                                            "shrink-0 rounded-xl px-3 py-1 text-xs text-rose-600 hover:bg-rose-50",
                                                            focusRing
                                                        )}
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/drafts")}
                                        className={cx("text-sm text-slate-500 hover:text-slate-700", focusRing)}
                                    >
                                        ← Back to drafts list
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveQuestionDraft}
                                        className={cx(
                                            "inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm",
                                            "hover:bg-sky-700 disabled:opacity-60",
                                            focusRing
                                        )}
                                    >
                                        Validate Question Draft
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SOLUTION TAB */}
                        {activeTab === "solution" && questionSaved && (
                            <div className="space-y-6 px-4 py-6 sm:px-6">
                                <div className="rounded-2xl bg-white/60 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm px-4 py-3 text-xs text-slate-600">
                                    Internal notes only (not exposed to participants).
                                </div>

                                {(solutionType === 1 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Flag Solution</label>
                                        <textarea
                                            className={cx(
                                                "block h-24 w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm font-mono text-slate-800 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={flagSolution}
                                            onChange={(e) => setFlagSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                {(solutionType === 2 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Procedure / Writeup</label>
                                        <textarea
                                            className={cx(
                                                "block h-40 w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30",
                                                focusRing
                                            )}
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("question")}
                                        className={cx("text-sm text-slate-500 hover:text-slate-700", focusRing)}
                                    >
                                        ← Back to Question
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={cx(
                                            "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm",
                                            "hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed",
                                            focusRing
                                        )}
                                    >
                                        {submitting ? "Updating..." : "Update Draft"}
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

export default AdminDraftEdit;
