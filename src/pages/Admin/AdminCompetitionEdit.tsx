import React, { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import {
    getCategories,
    getChallengeById,
    getDifficulties,
    getSolutionTypes,
    updateChallenge,
} from "../../api/practice";
import { Challenge, ContestMeta } from "../CompetitionPage/types";

type TabKey = "question" | "solution";
type ContestType = "daily" | "weekly" | "monthly" | "custom";

const AdminCompetitionEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const challengeId = id ? Number(id) : NaN;

    const [activeTab, setActiveTab] = useState<TabKey>("question");
    const [questionSaved, setQuestionSaved] = useState(false);

    const [initialLoading, setInitialLoading] = useState(true);
    const [initialError, setInitialError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [loadedChallenge, setLoadedChallenge] = useState<Challenge | null>(null);

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
    const [questionType] = useState<"practice" | "competition">("competition");

    const [contestId, setContestId] = useState<number | null>(null);
    const [contestName, setContestName] = useState("");
    const [contestSlug, setContestSlug] = useState("");
    const [contestDescription, setContestDescription] = useState("");
    const [contestType, setContestType] = useState<ContestType>("custom");
    const [contestStartTime, setContestStartTime] = useState("");
    const [contestEndTime, setContestEndTime] = useState("");

    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    const [uploadFiles, setUploadFiles] = useState<File[]>([]);

    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);

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
        if (!contestSlug.trim() && contestName.trim()) {
            setContestSlug(generateSlug(contestName));
        }
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

                const contest: ContestMeta | null | undefined = challenge.active_contest;

                if (contest) {
                    setContestId(contest.id);
                    setContestName(contest.name || "");
                    setContestSlug(contest.slug || "");
                    setContestDescription(contest.description || "");
                    setContestType((contest.contest_type as ContestType) || "custom");

                    const toLocalInput = (d: Date) =>
                        new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

                    setContestStartTime(toLocalInput(new Date(contest.start_time)));
                    setContestEndTime(toLocalInput(new Date(contest.end_time)));
                } else {
                    setContestId(null);
                    setContestName("");
                    setContestSlug("");
                    setContestDescription("");
                    setContestType("custom");
                    setContestStartTime("");
                    setContestEndTime("");
                }

                setQuestionSaved(true);
            } catch (e: any) {
                console.error(e);
                if (!mounted) return;

                setInitialError(
                    e?.response?.status === 404
                        ? "Competition challenge not found."
                        : "Failed to load competition challenge. Please try again."
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
            setError("Please validate and save the question draft before updating the competition.");
            setActiveTab("question");
            return;
        }

        if (!category || !difficulty || !solutionType) {
            setError("Category, Difficulty, and Solution Type are required.");
            setActiveTab("question");
            return;
        }

        if (!contestName.trim()) {
            setError("Contest Name is required.");
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

        if (!challengeId || Number.isNaN(challengeId)) {
            setError("Invalid challenge id.");
            return;
        }

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

            if (category) formData.append("category", String(category));
            if (difficulty) formData.append("difficulty", String(difficulty));
            if (solutionType) formData.append("solution_type", String(solutionType));

            if (contestId !== null) formData.append("contest_id", String(contestId));
            formData.append("contest_name", contestName.trim());
            if (contestSlug.trim()) formData.append("contest_slug", contestSlug.trim());
            formData.append("contest_description", contestDescription);
            formData.append("contest_type", contestType);
            formData.append("contest_start_time", new Date(contestStartTime).toISOString());
            formData.append("contest_end_time", new Date(contestEndTime).toISOString());

            uploadFiles.forEach((file) => {
                formData.append("uploaded_files", file);
            });

            await updateChallenge(challengeId, formData);

            setMessage("Competition challenge updated successfully.");
            navigate("/admin/contests");
        } catch (err: any) {
            console.error(err);
            setError(
                err?.response?.data?.detail ||
                "Failed to update competition challenge. Please review your input and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // --- responsive full-screen shell for all states ---
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full text-sm text-slate-500">Checking permissions…</div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar />
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
                <Navbar />
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full text-sm text-slate-500">Loading competition challenge…</div>
                </main>
            </div>
        );
    }

    if (initialError || !loadedChallenge) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <p className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {initialError || "Unable to load competition challenge."}
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-semibold text-slate-900 md:text-2xl">
                                Edit Competition Challenge
                            </h1>
                            <p className="mt-1 text-xs text-slate-500 md:text-sm">
                                Update the competition problem, contest schedule, and reference files. All changes are validated both
                                here and on the backend.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5">Admin Panel</span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
                Competition #{loadedChallenge.id}
              </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {(error || message) && (
                            <div className="px-6 pt-4">
                                {error && (
                                    <div className="mb-3 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                        {error}
                                    </div>
                                )}
                                {message && (
                                    <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                        {message}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="border-b border-slate-200 px-6 pt-2">
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("question")}
                                    className={`relative pb-2 text-sm font-medium ${
                                        activeTab === "question" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    Question & Contest
                                    {activeTab === "question" && (
                                        <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600" />
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
                                        <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {activeTab === "question" && (
                            <div className="space-y-8 px-6 py-6">
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Question Type</label>
                                        <input
                                            value="competition"
                                            disabled
                                            className="block w-full rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700"
                                        />
                                    </div>
                                </div>

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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Constraints</label>
                                        <textarea
                                            className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="e.g. 1 ≤ N ≤ 10^5"
                                            value={constraints}
                                            onChange={(e) => setConstraints(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Input Format</label>
                                            <textarea
                                                className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Describe input specification..."
                                                value={inputFormat}
                                                onChange={(e) => setInputFormat(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Output Format</label>
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Sample Input</label>
                                        <textarea
                                            className="block h-28 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Example input..."
                                            value={sampleInput}
                                            onChange={(e) => setSampleInput(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Sample Output</label>
                                        <textarea
                                            className="block h-28 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Example output..."
                                            value={sampleOutput}
                                            onChange={(e) => setSampleOutput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-800">Contest Settings</h2>
                                            <p className="text-xs text-slate-500">Update the contest this challenge is attached to.</p>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      {contestId ? `Contest #${contestId}` : "New Contest"}
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

                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
                                            <input
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="weekly-web-ctf-12"
                                                value={contestSlug}
                                                onChange={(e) => setContestSlug(e.target.value)}
                                            />
                                            <p className="mt-1 text-xs text-slate-400">Optional. Auto-generated from name if left blank.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Contest Description</label>
                                        <textarea
                                            className="block h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder="Summary, rules, scoring, eligibility, etc."
                                            value={contestDescription}
                                            onChange={(e) => setContestDescription(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Contest Type</label>
                                            <select
                                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Attach Additional Reference Files</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                New uploads will be added to existing attachments for this challenge. Max 20MB per file. Allowed
                                                types: images, ZIP.
                                            </p>
                                        </div>

                                        <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
                              <span className="text-slate-400">({Math.round(file.size / 1024)} KB)</span>
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
                                        onClick={() => navigate("/admin/contests")}
                                        className="text-xs text-slate-500 hover:text-slate-700 md:text-sm"
                                    >
                                        ← Back to competitions list
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

                        {activeTab === "solution" && questionSaved && (
                            <div className="space-y-6 px-6 py-6">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                    These fields are for internal solution notes and official answers. They should never be exposed to
                                    participants. When the backend API is ready, these fields can be wired to dedicated solution endpoints.
                                </div>

                                {(solutionType === 1 || solutionType === 3) && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Flag Solution</label>
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Procedure / Writeup</label>
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
