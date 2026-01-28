import React, {FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Navbar from "../../components/Navbar";
import {useNavigate} from "react-router-dom";
import {getCategories, getDifficulties, getSolutionTypes, createChallenge} from "../../api/practice";

type TabKey = "question" | "solution";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

function safeArray<T>(v: any): T[] {
    return Array.isArray(v) ? (v as T[]) : [];
}

const AdminQuestionCreate: React.FC = () => {
    const navigate = useNavigate();

    // Tabs
    const [activeTab, setActiveTab] = useState<TabKey>("question");
    const [questionSaved, setQuestionSaved] = useState(false);

    // Challenge fields
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
    const [questionType, setQuestionType] = useState<"practice" | "competition">("practice");
    void questionType;

    // Solutions (kept exactly as-is behavior-wise; internal notes only)
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");
    void flagSolution;
    void procedureSolution;

    // Files
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    // Dropdowns
    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);

    // avoid setState after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        setLoadingDropdowns(true);

        (async () => {
            try {
                const [cats, diffs, sols] = await Promise.all([getCategories(), getDifficulties(), getSolutionTypes()]);
                if (!mounted || !alive.current) return;

                setCategories(safeArray(cats));
                setDifficulties(safeArray(diffs));
                setSolutionTypes(safeArray(sols));
            } catch {
                if (mounted && alive.current) setError("Failed to load dropdowns.");
            } finally {
                if (mounted && alive.current) setLoadingDropdowns(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const resetMessages = useCallback(() => {
        setMessage(null);
        setError(null);
    }, []);

    const canSaveQuestion = useMemo(() => {
        if (!title.trim() || !description.trim()) return false;
        if (!category || !difficulty || !solutionType) return false;
        return true;
    }, [title, description, category, difficulty, solutionType]);

    const handleSaveQuestion = useCallback(() => {
        resetMessages();

        if (!title.trim() || !description.trim()) {
            setError("Title & Description are required.");
            return;
        }
        if (!category || !difficulty || !solutionType) {
            setError("Please select Category, Difficulty, and Solution Type.");
            return;
        }

        setQuestionSaved(true);
        setActiveTab("solution");
        setMessage("Draft saved. You can now enter solution details.");
    }, [resetMessages, title, description, category, difficulty, solutionType]);

    const handleFilesChange = useCallback(
        (files: FileList | null) => {
            if (!files) return;

            resetMessages();

            const allowedTypes = new Set([
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif",
                "application/zip",
                "application/x-zip-compressed",
            ]);

            const maxSize = 20 * 1024 * 1024;
            const accepted: File[] = [];
            const rejected: string[] = [];

            Array.from(files).forEach((f) => {
                if (!allowedTypes.has(f.type)) {
                    rejected.push(`${f.name} (invalid type)`);
                    return;
                }
                if (f.size > maxSize) {
                    rejected.push(`${f.name} (exceeds 20MB)`);
                    return;
                }
                accepted.push(f);
            });

            setUploadFiles((prev) => [...prev, ...accepted]);

            if (rejected.length > 0) {
                setError("Rejected files:\n" + rejected.join("\n"));
            }
        },
        [resetMessages]
    );

    const handleRemoveFile = useCallback((idx: number) => {
        setUploadFiles((prev) => prev.filter((_, i) => i !== idx));
    }, []);

    const handleSubmitChallenge = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            resetMessages();

            if (!questionSaved) {
                setError("Please save the question draft first.");
                setActiveTab("question");
                return;
            }

            setSubmitting(true);

            try {
                const form = new FormData();
                form.append("title", title);
                form.append("description", description);
                form.append("constraints", constraints);
                form.append("input_format", inputFormat);
                form.append("output_format", outputFormat);
                form.append("sample_input", sampleInput);
                form.append("sample_output", sampleOutput);

                form.append("question_type", "N/A");
                form.append("category", String(category));
                form.append("difficulty", String(difficulty));
                form.append("solution_type", String(solutionType));

                uploadFiles.forEach((f) => form.append("uploaded_files", f));

                await createChallenge(form);
                navigate("/admin/practice");
            } catch (err) {
                setError("Failed to create  challenge.");
            } finally {
                if (alive.current) setSubmitting(false);
            }
        },
        [
            resetMessages,
            questionSaved,
            title,
            description,
            constraints,
            inputFormat,
            outputFormat,
            sampleInput,
            sampleOutput,
            category,
            difficulty,
            solutionType,
            uploadFiles,
            navigate,
        ]
    );

    const shell = "min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col";
    const glassCard = "rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm";

    const inputBase =
        "block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-2 text-sm sm:text-base text-slate-700 shadow-sm " +
        "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

    const textAreaBase =
        "block w-full rounded-xl border border-slate-200/70 bg-white px-4 py-2 text-sm sm:text-base text-slate-700 shadow-sm " +
        "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

    const selectBase =
        "block w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 py-2 text-sm sm:text-base text-slate-700 shadow-sm " +
        "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30";

    return (
        <div className={shell}>
            <Navbar/>

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <div className={glassCard}>
                    {/* Header */}
                    <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                Create Challenge
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-500">
                                Define the problem, metadata, and files.
                            </p>
                        </div>
                        {loadingDropdowns ? (
                            <span
                                className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-50/70 px-3 py-1 text-xs sm:text-sm text-slate-600">
                                Loading…
                            </span>
                        ) : null}
                    </div>

                    <div className="h-px bg-slate-200/70"/>

                    {/* FORM */}
                    <form onSubmit={handleSubmitChallenge}>
                        {/* Alerts */}
                        {(error || message) ? (
                            <div className="px-4 sm:px-5 pt-4">
                                {error ? (
                                    <div
                                        className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700 text-sm sm:text-base whitespace-pre-line">
                                        {error}
                                    </div>
                                ) : null}
                                {message ? (
                                    <div
                                        className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-700 text-sm sm:text-base">
                                        {message}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Tabs */}
                        <div className="px-4 sm:px-5 pt-2">
                            <div className="flex flex-wrap gap-4 border-b border-slate-200/70">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={cx(
                                        "pb-3 text-sm sm:text-base font-normal tracking-tight",
                                        activeTab === "question"
                                            ? "text-slate-700 border-b-2 border-sky-400"
                                            : "text-slate-500 hover:text-slate-700",
                                        focusRing
                                    )}
                                >
                                    Question
                                </button>

                                <button
                                    type="button"
                                    disabled={!questionSaved}
                                    onClick={() => setActiveTab("solution")}
                                    className={cx(
                                        "pb-3 text-sm sm:text-base font-normal tracking-tight",
                                        !questionSaved
                                            ? "text-slate-300 cursor-not-allowed"
                                            : activeTab === "solution"
                                                ? "text-slate-700 border-b-2 border-sky-400"
                                                : "text-slate-500 hover:text-slate-700",
                                        !questionSaved ? "" : focusRing
                                    )}
                                >
                                    Solution Notes
                                </button>
                            </div>
                        </div>

                        {/* Question Tab */}
                        {activeTab === "question" ? (
                            <div className="px-4 sm:px-5 py-5 space-y-6">
                                {/* Basic info */}
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                            Title <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            className={inputBase}
                                            placeholder="e.g. SQL Injection Basics"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                        Problem Description <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        className={cx(textAreaBase, "h-40")}
                                        placeholder="Describe the challenge, context, and goal..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                        Supports plain text. For code snippets, use backticks in the description.
                                    </p>
                                </div>

                                {/* Metadata */}
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
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
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
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
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
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

                                {/* IO and examples */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                            Constraints
                                        </label>
                                        <textarea
                                            className={cx(textAreaBase, "h-24")}
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label
                                                className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                                Input Format
                                            </label>
                                            <textarea
                                                className={cx(textAreaBase, "h-24")}
                                                placeholder="Describe input specification..."
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label
                                                className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                                Output Format
                                            </label>
                                            <textarea
                                                className={cx(textAreaBase, "h-24")}
                                                placeholder="Describe output specification..."
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                            Sample Input
                                        </label>
                                        <textarea
                                            className={cx(
                                                "block w-full rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-2 text-sm font-mono text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30",
                                                "h-28"
                                            )}
                                            placeholder="Example input..."
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                            Sample Output
                                        </label>
                                        <textarea
                                            className={cx(
                                                "block w-full rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-2 text-sm font-mono text-slate-700 shadow-sm",
                                                "focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30",
                                                "h-28"
                                            )}
                                            placeholder="Example output..."
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Attachments */}
                                <div className="rounded-2xl bg-slate-50/60 ring-1 ring-slate-200/60 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm sm:text-base font-normal tracking-tight text-slate-700">
                                                Attach Reference Files
                                            </p>
                                            <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                                Upload diagrams, screenshots, or a ZIP archive. Max 20MB per file.
                                                Allowed: images, ZIP.
                                            </p>
                                        </div>

                                        <label
                                            className={cx(
                                                "inline-flex items-center rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                                "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90 cursor-pointer",
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
                                                    className="flex items-center justify-between gap-3 rounded-xl bg-white/70 ring-1 ring-slate-200/60 px-3 py-2"
                                                >
                                                    <span className="truncate">
                                                        {file.name}{" "}
                                                        <span className="text-slate-400">
                                                            ({Math.round(file.size / 1024)} KB)
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        className={cx("text-rose-700 hover:text-rose-800 text-xs sm:text-sm", focusRing)}
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>

                                <div
                                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200/70">
                                    <p className="text-xs sm:text-sm text-slate-500">
                                        You can refine solution notes after saving the question draft.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={handleSaveQuestion}
                                        disabled={!canSaveQuestion || submitting}
                                        className={cx(
                                            "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-normal tracking-tight",
                                            "ring-1",
                                            !canSaveQuestion || submitting
                                                ? "cursor-not-allowed ring-slate-200/60 bg-white/60 text-slate-400"
                                                : "ring-sky-200/60 bg-white/70 text-sky-700 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        Save Question Draft
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {/* Solution Tab */}
                        {activeTab === "solution" && questionSaved ? (
                            <div className="px-4 sm:px-5 py-5 space-y-6">
                                <div
                                    className="rounded-2xl bg-slate-50/60 ring-1 ring-slate-200/60 p-4 text-xs sm:text-sm text-slate-600">
                                    These fields are for internal solution notes.
                                </div>

                                {(solutionType === 1 || solutionType === 3) ? (
                                    <div>
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                            Flag Solution
                                        </label>
                                        <textarea
                                            className={cx(textAreaBase, "h-24 font-mono")}
                                            placeholder="flag{example_flag_here}"
                                            value={flagSolution}
                                            onChange={(e) => setFlagSolution(e.target.value)}
                                        />
                                    </div>
                                ) : null}

                                {(solutionType === 2 || solutionType === 3) ? (
                                    <div>
                                        <label className="block text-sm sm:text-base font-normal text-slate-600 mb-1">
                                            Procedure / Writeup
                                        </label>
                                        <textarea
                                            className={cx(textAreaBase, "h-40")}
                                            placeholder="Step-by-step solution, hints, and reasoning..."
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                ) : null}

                                <div
                                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200/70">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("question")}
                                        className={cx(
                                            "inline-flex items-center justify-center rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        ← Back to Question
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={cx(
                                            "inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-normal tracking-tight",
                                            "ring-1",
                                            submitting
                                                ? "cursor-not-allowed ring-slate-200/60 bg-white/60 text-slate-400"
                                                : "ring-emerald-200/60 bg-white/70 text-emerald-700 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        {submitting ? "Creating..." : "Create Challenge"}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AdminQuestionCreate;
