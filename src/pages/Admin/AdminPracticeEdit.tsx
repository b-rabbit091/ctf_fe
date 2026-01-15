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
                    <div className="w-full text-sm text-slate-500">Loading practice challenge…</div>
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
                        {initialError || "Unable to load practice challenge."}
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
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-semibold text-slate-900 md:text-2xl">Edit Practice
                                Challenge</h1>
                            <p className="mt-1 text-xs text-slate-500 md:text-sm">
                                Update the practice problem, metadata, and reference files.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">Admin Panel</span>
                            <span
                                className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                Practice #{loadedChallenge.id}
              </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Alerts */}
                        {(error || message) && (
                            <div className="px-6 pt-4">
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
                        <div className="border-b border-slate-200 px-6 pt-2">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={`relative pb-2 text-sm font-medium ${
                                        activeTab === "question" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
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

                        {/* --- Rest of your JSX is unchanged below --- */}
                        {/* QUESTION TAB */}
                        {activeTab === "question" && (
                            <div className="space-y-8 px-6 py-6">
                                {/* Basic info */}
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="e.g. SQL Injection Basics"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Question
                                            Type</label>
                                        <input
                                            value="practice"
                                            disabled
                                            className="block w-full rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Problem Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        className="block h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Describe the challenge, context, and goal..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-slate-400">
                                        Supports plain text. For code snippets, use backticks in the description.
                                    </p>
                                </div>

                                {/* Metadata */}
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

                                {/* IO + examples */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Constraints
                                        </label>
                                        <textarea
                                            className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Input Format
                                            </label>
                                            <textarea
                                                className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Describe input specification..."
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Output Format
                                            </label>
                                            <textarea
                                                className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Describe output specification..."
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Sample Input
                                        </label>
                                        <textarea
                                            className="block h-28 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Example input..."
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Sample Output
                                        </label>
                                        <textarea
                                            className="block h-28 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Example output..."
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Attachments */}
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                Attach Additional Reference Files
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                New uploads will be added to existing attachments for this
                                                challenge. Max 20MB per file. Allowed types: images, ZIP.
                                            </p>
                                        </div>
                                        <label
                                            className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
                                                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5"
                                                >
                          <span className="max-w-xs truncate">
                            {file.name}{" "}
                              <span className="text-slate-400">
                              ({Math.round(file.size / 1024)} KB)
                            </span>
                          </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        className="text-xs text-red-500 hover:text-red-600"
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/practice")}
                                        className="text-xs text-slate-500 hover:text-slate-700 md:text-sm"
                                    >
                                        ← Back to practice list
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveQuestionDraft}
                                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                    >
                                        Validate Question Draft
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SOLUTION TAB */}
                        {activeTab === "solution" && questionSaved && (
                            <div className="space-y-6 px-6 py-6">
                                <div
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                    These fields are for internal solution notes and official answers. They should not
                                    be exposed to
                                    participants.
                                </div>

                                {(solutionType === 1 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Flag
                                            Solution</label>
                                        <textarea
                                            className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="flag{example_flag_here}"
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
                                            placeholder="Step-by-step solution, hints, and reasoning..."
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
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
                                        className="inline-flex items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
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
