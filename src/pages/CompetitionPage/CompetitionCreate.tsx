import React, {useState, useEffect, FormEvent} from "react";
import Navbar from "../../components/Navbar";
import {useNavigate} from "react-router-dom";
import {
    getCategories,
    getDifficulties,
    getSolutionTypes,
    createChallenge,
} from "./api";
import {useAuth} from "../../contexts/AuthContext";

type TabKey = "question" | "solution";
type ContestType = "daily" | "weekly" | "monthly" | "custom";

const CompetitionCreate: React.FC = () => {
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
    // fixed to competition for this page
    const [questionType] = useState<"practice" | "competition">("competition");

    // Contest fields (single contest created together with this challenge)
    const [contestName, setContestName] = useState("");
    const [contestSlug, setContestSlug] = useState("");
    const [contestDescription, setContestDescription] = useState("");
    const [contestType, setContestType] = useState<ContestType>("custom");
    const [contestStartTime, setContestStartTime] = useState(""); // datetime-local string
    const [contestEndTime, setContestEndTime] = useState("");

    // Solutions (still local only; backend solution models not wired yet)
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
    const [groupOnly, setGroupOnly] = useState(false);

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

    const generateSlug = (value: string) =>
        value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    const handleContestNameBlur = () => {
        // Only auto-fill slug if it's empty
        if (!contestSlug.trim() && contestName.trim()) {
            setContestSlug(generateSlug(contestName));
        }
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
                `Some files were rejected:\n${rejected.map((r) => `• ${r}`).join("\n")}`
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
            setError("Please save the question draft before creating the competition.");
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

        // Contest-side validation (frontend only; backend still validates)
        if (!contestName.trim()) {
            setError("Contest Name is required for competition.");
            setActiveTab("question");
            return;
        }
        if (!contestStartTime || !contestEndTime) {
            setError("Contest Start Time and End Time are required.");
            setActiveTab("question");
            return;
        }
        const start = new Date(contestStartTime);
        const end = new Date(contestEndTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            setError("Invalid contest start or end time.");
            setActiveTab("question");
            return;
        }
        if (end <= start) {
            setError("Contest End Time must be after Start Time.");
            setActiveTab("question");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            // Challenge fields
            formData.append("title", title);
            formData.append("description", description);
            formData.append("constraints", constraints);
            formData.append("input_format", inputFormat);
            formData.append("output_format", outputFormat);
            formData.append("sample_input", sampleInput);
            formData.append("sample_output", sampleOutput);
            formData.append("group_only", String(groupOnly));

            // force competition
            formData.append("question_type", questionType);
            if (category) formData.append("category", String(category));
            if (difficulty) formData.append("difficulty", String(difficulty));
            if (solutionType) formData.append("solution_type", String(solutionType));

            // Contest fields – backend will create Contest + link this challenge
            formData.append("contest_name", contestName.trim());
            if (contestSlug.trim()) {
                formData.append("contest_slug", contestSlug.trim());
            }
            formData.append("contest_description", contestDescription);
            formData.append("contest_type", contestType);
            formData.append("contest_start_time", new Date(contestStartTime).toISOString());
            formData.append("contest_end_time", new Date(contestEndTime).toISOString());

            // Files field expected by backend: `uploaded_files`
            uploadFiles.forEach((file) => {
                formData.append("uploaded_files", file);
            });

            // (optionally later) solution notes might be sent via dedicated API
            // formData.append("flag_solution", flagSolution);
            // formData.append("procedure_solution", procedureSolution);

            await createChallenge(formData);

            setMessage("Competition challenge & contest created successfully.");
            navigate("/compete");
        } catch (err) {
            console.error(err);
            setError(
                "Failed to create competition challenge. Please check your input and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (user?.role !== "admin") {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar/>
                <div className="mx-auto max-w-3xl p-6">
                    <p className="text-center font-medium text-red-600">
                        Unauthorized – admin access required.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar/>
            <div className="mx-auto">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">
                                Create Competition Challenge
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Define the competition problem, contest schedule, and reference files.
                            </p>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">
                Admin Panel
              </span>
                            <span
                                className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                Competition
              </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmitChallenge}>
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
                                        activeTab === "question"
                                            ? "text-slate-900"
                                            : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    Question & Contest
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

                        {/* QUESTION + CONTEST TAB */}
                        {activeTab === "question" && (
                            <div className="space-y-8 px-6 py-6">
                                {/* Basic Challenge Info */}
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="e.g. Web Exploitation – Auth Bypass"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Question Type
                                        </label>
                                        <input
                                            value="competition"
                                            disabled
                                            className="block w-full rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700"
                                        />
                                    </div>
                                </div>

                                {/* Problem Description */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Problem Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        className="block h-40 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Describe the challenge, context, and goal. Avoid revealing the flag or full solution."
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Solution Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={solutionType}
                                            onChange={(e) =>
                                                setSolutionType(
                                                    e.target.value ? Number(e.target.value) : ""
                                                )
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

                                {/* Contest Settings */}
                                <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-800">
                                                Contest Settings
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                This competition challenge will be attached to a new contest.
                                            </p>
                                        </div>
                                        <span
                                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      Single Contest
                    </span>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="md:col-span-2">
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Contest Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="e.g. Weekly Web CTF #12"
                                                value={contestName}
                                                onChange={(e) => setContestName(e.target.value)}
                                                onBlur={handleContestNameBlur}
                                            />
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <input
                                                id="group_only"
                                                type="checkbox"
                                                checked={groupOnly}
                                                onChange={(e) => setGroupOnly(e.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-slate-300"
                                            />
                                            <label htmlFor="group_only" className="text-sm text-slate-700">
                                                Group-only competition
                                                <div className="text-xs text-slate-500">If checked, this competition is
                                                    only for groups.</div>
                                            </label>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Slug
                                            </label>
                                            <input
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="weekly-web-ctf-12"
                                                value={contestSlug}
                                                onChange={(e) => setContestSlug(e.target.value)}
                                            />
                                            <p className="mt-1 text-xs text-slate-400">
                                                Optional. Auto-generated from name if left blank.
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Contest Description
                                        </label>
                                        <textarea
                                            className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Summary, rules, scoring, eligibility, etc."
                                            value={contestDescription}
                                            onChange={(e) => setContestDescription(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Contest Type
                                            </label>
                                            <select
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                value={contestType}
                                                onChange={(e) =>
                                                    setContestType(e.target.value as ContestType)
                                                }
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="custom">Custom</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                Start Time <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                value={contestStartTime}
                                                onChange={(e) => setContestStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                                End Time <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                value={contestEndTime}
                                                onChange={(e) => setContestEndTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Attachments */}
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                Attach Reference Files
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Upload diagrams, screenshots, or a ZIP archive with
                                                supplementary material. Max 20MB per file. Allowed types:
                                                images, ZIP.
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
                                    <p className="text-xs text-slate-400">
                                        Save the question draft first, then finalize solution notes and
                                        create the competition.
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

                        {/* SOLUTION TAB */}
                        {activeTab === "solution" && questionSaved && (
                            <div className="space-y-6 px-6 py-6">
                                <div
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                    These fields are for internal solution notes and official
                                    answers. They should never be exposed to participants.
                                </div>

                                {(solutionType === 1 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Flag Solution
                                        </label>
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Procedure / Writeup
                                        </label>
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
                                        ← Back to Question & Contest
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                                    >
                                        {submitting
                                            ? "Creating..."
                                            : "Create Competition Challenge"}
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

export default CompetitionCreate;
