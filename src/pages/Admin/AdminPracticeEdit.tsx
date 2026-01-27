import React, {FormEvent, useEffect, useState} from "react";
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

type TabKey = "question" | "solution";

const AdminPracticeEdit: React.FC = () => {
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

    // loaded challenge (for header)
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
    const [questionType] = useState<"practice" | "competition">("practice");

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

                // Prefill fields from existing practice challenge
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

                // We're editing an existing question, so solution tab is allowed
                setQuestionSaved(true);
            } catch (e: any) {
                console.error(e);
                if (!mounted) return;
                setInitialError(
                    e?.response?.status === 404 ? "Practice challenge not found." : "Failed to load practice challenge. Please try again."
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
        setMessage("Question draft validated. You can now review solution notes.");
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!questionSaved) {
            setError("Please validate and save the question draft before updating the practice challenge.");
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
            formData.append("question_type", questionType); // keep as practice
            if (category) formData.append("category", String(category));
            if (difficulty) formData.append("difficulty", String(difficulty));
            if (solutionType) formData.append("solution_type", String(solutionType));

            // newly uploaded files
            uploadFiles.forEach((file) => {
                formData.append("uploaded_files", file);
            });

            await updateChallenge(challengeId, formData);

            setMessage("Practice challenge updated successfully.");
            navigate("/admin/practice");
        } catch (err: any) {
            console.error(err);
            setError(
                err?.response?.data?.detail ||
                "Failed to update practice challenge. Please review your input and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // --- responsive full-screen shell for all guard states (CompetitionList style) ---

    if (!user) {
        return (
            <div
                className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 px-6 py-8">
                    Checking permissions…
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div
                className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 px-6 py-8 text-rose-700">
                    Unauthorized – admin access required.
                </main>
            </div>
        );
    }
    if (initialLoading) {
        return (
            <div
                className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 px-6 py-8">
                    Loading practice challenge…
                </main>
            </div>
        );
    }

    if (initialError || !loadedChallenge) {
        return (
            <div
                className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
                <Navbar/>
                <main className="flex-1 px-6 py-8 text-rose-700">
                    {initialError}
                </main>
            </div>
        );
    }
    return (
        <div
            className='min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-["Inter"] flex flex-col'>
            <Navbar/>

            <main className="flex-1 px-6 py-8 text-rose-700">
                <div
                    className="w-full rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                    {/* Header */}
                    <div
                        className="flex flex-wrap items-start justify-between gap-4 border-b border-white/40 bg-white/40 px-6 py-5 backdrop-blur-xl">
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl sm:text-3xl font-normal text-slate-700 tracking-tight">
                                Edit Practice Challenge
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-600">
                                Update the practice problem, metadata, and reference files.
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-xs text-slate-600">
                            <span
                                className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1">
                                Admin Panel
                            </span>
                            <span
                                className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/70 px-3 py-1 text-emerald-700">
                                Practice #{loadedChallenge.id}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {(error || message) && (
                            <div className="px-6 pt-4">
                                {error && (
                                    <div
                                        className="mb-3 whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                                        {error}
                                    </div>
                                )}
                                {message && (
                                    <div
                                        className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm sm:text-base text-emerald-800 shadow-sm backdrop-blur-xl">
                                        {message}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="border-b border-white/40 px-6 pt-3">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={tagClass(activeTab === "question")}
                                >
                                    Question
                                </button>
                                <button
                                    type="button"
                                    disabled={!questionSaved}
                                    onClick={() => questionSaved && setActiveTab("solution")}
                                    className={tagClass(activeTab === "solution" && questionSaved, !questionSaved)}
                                >
                                    Solution Notes
                                </button>
                            </div>
                        </div>

                        {/* QUESTION TAB */}
                        {activeTab === "question" && (
                            <div className="space-y-8 px-6 py-6">
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Title <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            className="block h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            placeholder="e.g. SQL Injection Basics"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Question Type
                                        </label>
                                        <input
                                            value="practice"
                                            disabled
                                            className="block h-10 w-full rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-4 text-xs font-normal uppercase tracking-wide text-emerald-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                        Problem Description <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        className="block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                        style={{height: 160}}
                                        placeholder="Describe the challenge, context, and goal..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                        Supports plain text. For code snippets, use backticks in the description.
                                    </p>
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Difficulty <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Solution Type <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Constraints
                                        </label>
                                        <textarea
                                            className="block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            style={{height: 96}}
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label
                                                className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                                Input Format
                                            </label>
                                            <textarea
                                                className="block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                style={{height: 96}}
                                                placeholder="Describe input specification..."
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                                Output Format
                                            </label>
                                            <textarea
                                                className="block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                style={{height: 96}}
                                                placeholder="Describe output specification..."
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Sample Input
                                        </label>
                                        <textarea
                                            className="block w-full rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-mono text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            style={{height: 112}}
                                            placeholder="Example input..."
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Sample Output
                                        </label>
                                        <textarea
                                            className="block w-full rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-mono text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            style={{height: 112}}
                                            placeholder="Example output..."
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div
                                    className="rounded-2xl border border-slate-200/70 bg-white/40 p-4 backdrop-blur-xl">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm sm:text-base font-normal text-slate-700">
                                                Attach Additional Reference Files
                                            </p>
                                            <p className="mt-1 text-xs sm:text-sm text-slate-600">
                                                New uploads will be added to existing attachments for this
                                                challenge. Max 20MB per file. Allowed types: images, ZIP.
                                            </p>
                                        </div>
                                        <label
                                            className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15">
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
                                        <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-600">
                                            {uploadFiles.map((file, idx) => (
                                                <li
                                                    key={`${file.name}-${idx}`}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2"
                                                >
                                                    <span className="max-w-[520px] truncate">
                                                        {file.name}{" "}
                                                        <span className="text-slate-400">
                                                            ({Math.round(file.size / 1024)} KB)
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        className="text-xs sm:text-sm font-normal text-rose-700 hover:text-rose-800"
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div
                                    className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/practice")}
                                        className="text-sm font-normal text-slate-600 hover:text-slate-700"
                                    >
                                        ← Back to practice list
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveQuestionDraft}
                                        className="inline-flex items-center rounded-2xl border border-blue-200/70 bg-blue-50/70 px-5 py-2.5 text-sm sm:text-base font-normal text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                    >
                                        Validate Question Draft
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "solution" && questionSaved && (
                            <div className="space-y-6 px-6 py-6">
                                <div
                                    className="rounded-2xl border border-slate-200/70 bg-white/40 px-5 py-4 text-xs sm:text-sm text-slate-600 shadow-sm backdrop-blur-xl">
                                    These fields are for internal solution notes and official answers. They should not
                                    be exposed to
                                    participants.
                                </div>

                                {(solutionType === 1 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Flag Solution
                                        </label>
                                        <textarea
                                            className="block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm font-mono text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            style={{height: 112}}
                                            placeholder="flag{example_flag_here}"
                                            value={flagSolution}
                                            onChange={(e) => setFlagSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                {(solutionType === 2 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm sm:text-base font-normal text-slate-600">
                                            Procedure / Writeup
                                        </label>
                                        <textarea
                                            className="block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            style={{height: 160}}
                                            placeholder="Step-by-step solution, hints, and reasoning..."
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div
                                    className="flex flex-wrap items-center justify-between gap-3 border-t border-white/40 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("question")}
                                        className="text-sm font-normal text-slate-600 hover:text-slate-700"
                                    >
                                        ← Back to Question
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-2.5 text-sm sm:text-base font-normal text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-60"
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

// --- helper: same chip styling + disabled option without changing behavior ---
function tagClass(active: boolean, disabled = false) {
    return [
        "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
        disabled
            ? "cursor-not-allowed border-slate-200/70 bg-white/50 text-slate-300"
            : active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
    ].join(" ");
}
