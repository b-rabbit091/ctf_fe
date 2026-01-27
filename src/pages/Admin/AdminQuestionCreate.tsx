import React, {useState, useEffect, FormEvent} from "react";
import Navbar from "../../components/Navbar";
import {useNavigate} from "react-router-dom";
import {getCategories, getDifficulties, getSolutionTypes, createChallenge} from "../../api/practice";

type TabKey = "question" | "solution";

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

    // Solutions
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    // Files
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    // Dropdowns
    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [cats, diffs, sols] = await Promise.all([getCategories(), getDifficulties(), getSolutionTypes()]);
                if (!mounted) return;

                setCategories(cats);
                setDifficulties(diffs);
                setSolutionTypes(sols);
            } catch {
                if (mounted) setError("Failed to load dropdowns.");
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const resetMessages = () => {
        setMessage(null);
        setError(null);
    };

    const handleSaveQuestion = () => {
        resetMessages();

        if (!title || !description) {
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
    };

    const handleFilesChange = (files: FileList | null) => {
        if (!files) return;

        resetMessages();

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/zip",
            "application/x-zip-compressed",
        ];

        const maxSize = 20 * 1024 * 1024;
        const accepted: File[] = [];
        const rejected: string[] = [];

        Array.from(files).forEach((f) => {
            if (!allowedTypes.includes(f.type)) {
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
    };

    const handleRemoveFile = (idx: number) => {
        setUploadFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmitChallenge = async (e: FormEvent) => {
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
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar/>

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200">
                    {/* --- HEADER --- */}
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h1 className="text-2xl font-semibold text-slate-900">Create Challenge</h1>
                        <p className="text-sm text-slate-500">Define the problem, metadata, and files.</p>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmitChallenge}>
                        {/* Alerts */}
                        {(error || message) && (
                            <div className="px-6 pt-4">
                                {error && (
                                    <div
                                        className="mb-3 border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm whitespace-pre-line">
                                        {error}
                                    </div>
                                )}
                                {message && (
                                    <div
                                        className="mb-3 border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                                        {message}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="px-6 pt-2 border-b border-slate-200">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={`pb-2 text-sm font-medium ${
                                        activeTab === "question" ? "text-slate-900 border-b-2 border-blue-600" : "text-slate-500"
                                    }`}
                                >
                                    Question
                                </button>

                                <button
                                    type="button"
                                    disabled={!questionSaved}
                                    onClick={() => setActiveTab("solution")}
                                    className={`pb-2 text-sm font-medium ${
                                        !questionSaved
                                            ? "text-slate-300 cursor-not-allowed"
                                            : activeTab === "solution"
                                                ? "text-slate-900 border-b-2 border-blue-600"
                                                : "text-slate-500"
                                    }`}
                                >
                                    Solution Notes
                                </button>
                            </div>
                        </div>

                        {/* Question Tab */}
                        {activeTab === "question" && (
                            <div className="px-6 py-6 space-y-6">
                                {/* Basic info */}
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="e.g. SQL Injection Basics"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>

                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Problem Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-40"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
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

                                {/* IO and examples */}
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label
                                            className="block text-sm font-medium text-slate-700 mb-1">Constraints</label>
                                        <textarea
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24"
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Input
                                                Format</label>
                                            <textarea
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24"
                                                placeholder="Describe input specification..."
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Output
                                                Format</label>
                                            <textarea
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24"
                                                placeholder="Describe output specification..."
                                                value={outputFormat}
                                                onChange={(e) => setOutputFormat(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Sample
                                            Input</label>
                                        <textarea
                                            className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-28"
                                            placeholder="Example input..."
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Sample
                                            Output</label>
                                        <textarea
                                            className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-28"
                                            placeholder="Example output..."
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Attachments (files) */}
                                <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Attach Reference Files</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Upload diagrams, screenshots, or a ZIP archive with supplementary
                                                material. Max 20MB per file.
                                                Allowed types: images, ZIP.
                                            </p>
                                        </div>
                                        <label
                                            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
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
                                                    className="flex items-center justify-between bg-white border border-slate-200 rounded-md px-3 py-1.5"
                                                >
                          <span className="truncate max-w-xs">
                            {file.name} <span className="text-slate-400">({Math.round(file.size / 1024)} KB)</span>
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

                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-400">You can refine solution notes after saving the
                                        question draft.</p>
                                    <button
                                        type="button"
                                        onClick={handleSaveQuestion}
                                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                    >
                                        Save Question Draft
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Solution Tab */}
                        {activeTab === "solution" && questionSaved && (
                            <div className="px-6 py-6 space-y-6">
                                <div
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                    These fields are for internal solution notes.
                                </div>

                                {(solutionType === 1 || solutionType === 3) && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Flag
                                            Solution</label>
                                        <textarea
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 font-mono"
                                            placeholder="flag{example_flag_here}"
                                            value={flagSolution}
                                            onChange={(e) => setFlagSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                {(solutionType === 2 || solutionType === 3) && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Procedure /
                                            Writeup</label>
                                        <textarea
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-40"
                                            placeholder="Step-by-step solution, hints, and reasoning..."
                                            value={procedureSolution}
                                            onChange={(e) => setProcedureSolution(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
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
                                        {submitting ? "Creating..." : "Create Challenge"}
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

export default AdminQuestionCreate;
