import React, {FormEvent, useEffect, useMemo, useState} from "react";
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

const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
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

    // global messages
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // loaded challenge (for header + read-only contest info)
    const [loadedChallenge, setLoadedChallenge] = useState<Challenge | null>(null);

    // challenge fields
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

    // ✅ question_type selectable: practice/competition/N/A
    const [questionType, setQuestionType] = useState<QuestionType>("N/A");

    // ✅ lock the original type so user can only move to N/A (not swap practice<->competition)
    const [lockedQuestionType, setLockedQuestionType] = useState<"practice" | "competition" | null>(null);

    // solution notes (local-only for now)
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    // file uploads (new attachments only)
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    // options
    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);

    const resetMessages = () => {
        setMessage(null);
        setError(null);
    };

    useEffect(() => {
        if (!user) return;

        if (user.role !== "admin") {
            navigate("/dashboard");
            return;
        }

        if (!challengeId || Number.isNaN(challengeId)) {
            setInitialError("Invalid challenge id.");
            setInitialLoading(false);
            return;
        }

        let mounted = true;

        const loadInitial = async () => {
            try {
                setInitialLoading(true);
                setInitialError(null);

                const [cats, diffs, sols, challenge] = await Promise.all([
                    getCategories(),
                    getDifficulties(),
                    getSolutionTypes(),
                    getChallengeById(challengeId),
                ]);

                if (!mounted) return;

                setCategories(cats || []);
                setDifficulties(diffs || []);
                setSolutionTypes(sols || []);
                setLoadedChallenge(challenge);

                // Prefill challenge fields
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

                // ✅ Prefill question_type from API (fallback -> N/A)
                const apiQtRaw = String((challenge as any).question_type || "").toLowerCase();
                const mapped: QuestionType =
                    apiQtRaw === "practice" ? "practice" : apiQtRaw === "competition" ? "competition" : "N/A";
                setQuestionType(mapped);

                // ✅ Lock original type ONLY if it is practice/competition
                const lock = mapped === "practice" || mapped === "competition" ? mapped : null;
                setLockedQuestionType(lock);

                // editing existing draft -> allow solution tab
                setQuestionSaved(true);
            } catch (e: any) {
                console.error(e);
                if (!mounted) return;
                setInitialError(
                    e?.response?.status === 404
                        ? "Draft question not found."
                        : "Failed to load draft question. Please try again."
                );
            } finally {
                if (!mounted) return;
                setInitialLoading(false);
            }
        };

        loadInitial();

        return () => {
            mounted = false;
        };
    }, [user, challengeId, navigate]);

    const handleSaveQuestionDraft = () => {
        resetMessages();

        if (!title.trim() || !description.trim()) {
            setError("Title and Description are required.");
            return;
        }
        if (!category || !difficulty || !solutionType) {
            setError("Category, Difficulty, and Solution Type are required.");
            return;
        }

        setQuestionSaved(true);
        setActiveTab("solution");
        setMessage("Draft validated. You can now review solution notes.");
    };

    const handleFilesChange = (files: FileList | null) => {
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
        const maxSizeBytes = 20 * 1024 * 1024; // 20MB

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

        setUploadFiles((prev) => [...prev, ...nextFiles]);

        if (rejected.length > 0) {
            setError(`Some files were rejected:\n${rejected.map((r) => `• ${r}`).join("\n")}`);
        }
    };

    const handleRemoveFile = (index: number) => {
        resetMessages();
        setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const allowedQuestionTypeOptions = useMemo(() => {
        // If original type is locked to practice/competition -> allow only {locked, N/A}
        if (lockedQuestionType) return ["N/A", lockedQuestionType] as QuestionType[];

        // If original is N/A (not locked) -> allow all
        return ["practice", "competition", "N/A"] as QuestionType[];
    }, [lockedQuestionType]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!questionSaved) {
            setError("Please validate and save the draft before updating.");
            setActiveTab("question");
            return;
        }

        if (!category || !difficulty || !solutionType) {
            setError("Category, Difficulty, and Solution Type are required.");
            setActiveTab("question");
            return;
        }

        if (!challengeId || Number.isNaN(challengeId)) {
            setError("Invalid challenge id.");
            return;
        }

        // ✅ extra guard: never allow swapping practice <-> competition if locked
        if (lockedQuestionType && questionType !== "N/A" && questionType !== lockedQuestionType) {
            setError("You can only change Question Type to N/A. Switching between Practice and Competition is not allowed.");
            setActiveTab("question");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();

            // challenge fields
            formData.append("title", title);
            formData.append("description", description);
            formData.append("constraints", constraints || "");
            formData.append("input_format", inputFormat || "");
            formData.append("output_format", outputFormat || "");
            formData.append("sample_input", sampleInput || "");
            formData.append("sample_output", sampleOutput || "");

            // ✅ always send the selected value (practice/competition/N/A)
            formData.append("question_type", questionType);

            if (category) formData.append("category", String(category));
            if (difficulty) formData.append("difficulty", String(difficulty));
            if (solutionType) formData.append("solution_type", String(solutionType));

            // newly uploaded files
            uploadFiles.forEach((file) => {
                formData.append("uploaded_files", file);
            });

            await updateChallenge(challengeId, formData);

            setMessage("Draft updated successfully.");
            navigate("/admin/drafts");
        } catch (err: any) {
            console.error(err);
            setError(
                err?.response?.data?.detail ||
                "Failed to update draft. Please review your input and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Read-only contest info (ONLY show when competition)
    const contest = (loadedChallenge as any)?.active_contest || null;

    // --- responsive full-screen shell for all guard states ---
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
                    <div className="w-full text-sm text-slate-500">Loading draft…</div>
                </main>
            </div>
        );
    }

    if (initialError || !loadedChallenge) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <p className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {initialError || "Unable to load draft."}
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar/>

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <div className="mx-auto w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Header */}
                    <div
                        className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-semibold text-slate-900 md:text-2xl">
                                Edit Draft Question
                            </h1>
                            <p className="mt-1 text-xs text-slate-500 md:text-sm">
                                Update the draft problem, metadata, and reference files. Contest is read-only
                                (competition only).
                            </p>
                        </div>
                        <div
                            className="flex flex-row flex-wrap items-center justify-start gap-2 text-[11px] text-slate-500 sm:flex-col sm:items-end sm:gap-1">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">
                Admin Panel
              </span>
                            <span
                                className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                Draft #{loadedChallenge.id}
              </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {(error || message) && (
                            <div className="px-4 pt-4 sm:px-6">
                                {error && (
                                    <div
                                        className="mb-3 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                        {error}
                                    </div>
                                )}
                                {message && (
                                    <div
                                        className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                        {message}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="border-b border-slate-200 px-4 pt-2 sm:px-6">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={`relative pb-2 text-sm font-medium ${
                                        activeTab === "question"
                                            ? "text-slate-900"
                                            : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    Question
                                    {activeTab === "question" && (
                                        <span
                                            className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600"/>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    disabled={!questionSaved}
                                    onClick={() => questionSaved && setActiveTab("solution")}
                                    className={`relative pb-2 text-sm font-medium ${
                                        !questionSaved
                                            ? "cursor-not-allowed text-slate-300"
                                            : activeTab === "solution"
                                                ? "text-slate-900"
                                                : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    Solution Notes
                                    {activeTab === "solution" && questionSaved && (
                                        <span
                                            className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600"/>
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
                                            Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Question Type <span className="text-red-500">*</span>
                                        </label>

                                        {/* ✅ Responsive + locked options behavior */}
                                        <select
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={questionType}
                                            onChange={(e) => {
                                                const next = e.target.value as QuestionType;

                                                // ✅ hard block swapping when locked
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
                                            If this draft is Practice/Competition, you can only change it to N/A (not
                                            switch types).
                                        </p>
                                    </div>
                                </div>

                                {/* Read-only contest info (competition only) */}
                                {questionType === "competition" && (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div
                                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">Contest
                                                    (read-only)
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Contest is managed in the Contests section. You can’t edit it here.
                                                </div>
                                            </div>
                                            <span
                                                className="w-fit rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-600 border border-slate-200">
                        {contest?.id ? `Contest #${contest.id}` : "No contest attached"}
                      </span>
                                        </div>

                                        {contest ? (
                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div
                                                        className="text-[11px] uppercase tracking-wide text-slate-500">Name
                                                    </div>
                                                    <div
                                                        className="mt-1 text-sm text-slate-900">{contest.name || "—"}</div>
                                                </div>

                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div
                                                        className="text-[11px] uppercase tracking-wide text-slate-500">Slug
                                                    </div>
                                                    <div
                                                        className="mt-1 text-sm text-slate-900">{contest.slug || "—"}</div>
                                                </div>

                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div
                                                        className="text-[11px] uppercase tracking-wide text-slate-500">Type
                                                    </div>
                                                    <div
                                                        className="mt-1 text-sm text-slate-900">{contest.contest_type || "—"}</div>
                                                </div>

                                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                    <div
                                                        className="text-[11px] uppercase tracking-wide text-slate-500">Schedule
                                                    </div>
                                                    <div className="mt-1 text-sm text-slate-900">
                                                        {contest.start_time ? toLocalInput(contest.start_time) : "—"} →{" "}
                                                        {contest.end_time ? toLocalInput(contest.end_time) : "—"}
                                                    </div>
                                                </div>

                                                <div
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 md:col-span-2">
                                                    <div
                                                        className="text-[11px] uppercase tracking-wide text-slate-500">Description
                                                    </div>
                                                    <div className="mt-1 text-sm text-slate-900 whitespace-pre-line">
                                                        {contest.description || "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-3 text-sm text-slate-600">
                                                This draft is marked as <b>Competition</b> but has no contest attached.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Problem Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        className="block h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Category <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Difficulty <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Solution Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label
                                            className="mb-1 block text-sm font-medium text-slate-700">Constraints</label>
                                        <textarea
                                            className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Input
                                                Format</label>
                                            <textarea
                                                className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Output
                                                Format</label>
                                            <textarea
                                                className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Sample
                                            Input</label>
                                        <textarea
                                            className="block h-28 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Sample
                                            Output</label>
                                        <textarea
                                            className="block h-28 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Attachments */}
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                                    <div
                                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Attach Additional
                                                Reference Files</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                New uploads will be added to existing attachments for this challenge.
                                                Max 20MB per file.
                                                Allowed types: images, ZIP.
                                            </p>
                                        </div>
                                        <label
                                            className="inline-flex w-fit cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
                                        <ul className="mt-3 space-y-1 text-xs text-slate-600">
                                            {uploadFiles.map((file, idx) => (
                                                <li
                                                    key={`${file.name}-${idx}`}
                                                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-1.5"
                                                >
                          <span className="min-w-0 flex-1 truncate">
                            {file.name} <span className="text-slate-400">({Math.round(file.size / 1024)} KB)</span>
                          </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        className="shrink-0 text-xs text-red-500 hover:text-red-600"
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div
                                    className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/drafts")}
                                        className="text-xs text-slate-500 hover:text-slate-700 md:text-sm"
                                    >
                                        ← Back to drafts list
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveQuestionDraft}
                                        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                    >
                                        Validate Question Draft
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SOLUTION TAB */}
                        {activeTab === "solution" && questionSaved && (
                            <div className="space-y-6 px-4 py-6 sm:px-6">
                                <div
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                    These fields are for internal solution notes and official answers. They should not
                                    be exposed to participants.
                                </div>

                                {(solutionType === 1 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Flag
                                            Solution</label>
                                        <textarea
                                            className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={flagSolution}
                                            onChange={(e) => setFlagSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                {(solutionType === 2 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Procedure /
                                            Writeup</label>
                                        <textarea
                                            className="block h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div
                                    className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("question")}
                                        className="text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        ← Back to Question
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
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
