import React, {useState, useEffect, FormEvent} from "react";
import Navbar from "../../components/Navbar";
import {useNavigate} from "react-router-dom";
import {
    getCategories,
    getDifficulties,
    getSolutionTypes,
    createChallenge,
} from "../../api/practice";
import {useAuth} from "../../contexts/AuthContext";

type TabKey = "question" | "solution";

const ChallengeCreate: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

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
    const [questionType, setQuestionType] = useState<"practice" | "competition">(
        "practice"
    );

    // Solutions (currently UI-only – wire to backend when you add endpoints for FlagSolution/TextSolution)
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    // File uploads (images + zip)
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    // Options
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
                const [cats, diffs, sols] = await Promise.all([
                    getCategories(),
                    getDifficulties(),
                    getSolutionTypes(),
                ]);
                if (!mounted) return;
                setCategories(cats);
                setDifficulties(diffs);
                setSolutionTypes(sols);
            } catch (e) {
                if (!mounted) return;
                setError("Failed to load options. Please refresh and try again.");
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
        setMessage("Question draft saved. You can now add solution details.");
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
            setError(
                `Some files were rejected:\n${rejected
                    .map((r) => `• ${r}`)
                    .join("\n")}`
            );
        }
    };

    const handleRemoveFile = (index: number) => {
        resetMessages();
        setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmitChallenge = async (e: FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!questionSaved) {
            setError("Please save the question draft before creating the challenge.");
            setActiveTab("question");
            return;
        }

        if (!solutionType) {
            setError("Solution Type is required.");
            setActiveTab("question");
            return;
        }

        if (!category || !difficulty) {
            setError("Category and Difficulty are required.");
            setActiveTab("question");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("constraints", constraints);
            formData.append("input_format", inputFormat);
            formData.append("output_format", outputFormat);
            formData.append("sample_input", sampleInput);
            formData.append("sample_output", sampleOutput);

            formData.append("question_type", questionType);
            if (category) formData.append("category", String(category));
            if (difficulty) formData.append("difficulty", String(difficulty));
            if (solutionType) formData.append("solution_type", String(solutionType));

            // Files field expected by backend: `uploaded_files`
            uploadFiles.forEach((file) => {
                formData.append("uploaded_files", file);
            });

            await createChallenge(formData);

            setMessage("Challenge created successfully.");
            navigate("/practice");
        } catch (err) {
            console.error(err);
            setError("Failed to create challenge. Please check your input and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (user?.role !== "admin") {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar/>
                <div className="max-w-3xl mx-auto p-6">
                    <p className="text-center text-red-600 font-medium">
                        Unauthorized – admin access required.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar/>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="bg-white shadow-sm rounded-xl border border-slate-200">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">
                                Create New Challenge
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Define the problem statement, metadata, and reference files.
                            </p>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">
                Admin Panel
              </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmitChallenge}>
                        {/* Global alerts */}
                        {(error || message) && (
                            <div className="px-6 pt-4">
                                {error && (
                                    <div
                                        className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 whitespace-pre-line">
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
                        <div className="px-6 pt-2 border-b border-slate-200">
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
                                            className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 rounded-full"/>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    disabled={!questionSaved}
                                    onClick={() => questionSaved && setActiveTab("solution")}
                                    className={`relative pb-2 text-sm font-medium ${
                                        !questionSaved
                                            ? "text-slate-300 cursor-not-allowed"
                                            : activeTab === "solution"
                                                ? "text-slate-900"
                                                : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    Solution Notes
                                    {activeTab === "solution" && questionSaved && (
                                        <span
                                            className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 rounded-full"/>
                                    )}
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
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Question Type
                                        </label>
                                        <select
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={questionType}
                                            onChange={(e) =>
                                                setQuestionType(e.target.value as "practice" | "competition")
                                            }
                                        >
                                            <option value="practice">Practice</option>
                                            <option value="competition">Competition</option>
                                        </select>
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
                                            onChange={(e) =>
                                                setCategory(e.target.value ? Number(e.target.value) : "")
                                            }
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
                                            onChange={(e) =>
                                                setDifficulty(e.target.value ? Number(e.target.value) : "")
                                            }
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
                                            onChange={(e) =>
                                                setSolutionType(e.target.value ? Number(e.target.value) : "")
                                            }
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Constraints
                                        </label>
                                        <textarea
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24"
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Input Format
                                            </label>
                                            <textarea
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24"
                                                placeholder="Describe input specification..."
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Output Format
                                            </label>
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Sample Input
                                        </label>
                                        <textarea
                                            className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-28"
                                            placeholder="Example input..."
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Sample Output
                                        </label>
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
                                            <p className="text-sm font-medium text-slate-700">
                                                Attach Reference Files
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Upload diagrams, screenshots, or a ZIP archive with supplementary
                                                material.
                                                Max 20MB per file. Allowed types: images, ZIP.
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

                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-400">
                                        You can refine solution notes after saving the question draft.
                                    </p>
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Flag Solution
                                        </label>
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Procedure / Writeup
                                        </label>
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
            </div>
        </div>
    );
};

export default ChallengeCreate;
