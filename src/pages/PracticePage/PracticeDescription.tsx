import React, { useEffect, useState } from "react";
import { Challenge } from "./types";
import { useAuth } from "../../contexts/AuthContext";
import {
    getCategories,
    getDifficulties,
    getSolutionTypes,
    updateChallenge,
} from "../../api/practice";
import { FiEdit2, FiSave, FiX } from "react-icons/fi";

interface Props {
    challenge: Challenge;
}

const PracticeDescription: React.FC<Props> = ({ challenge }) => {
    const { user } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Editable fields
    const [title, setTitle] = useState(challenge.title);
    const [description, setDescription] = useState(challenge.description);
    const [constraints, setConstraints] = useState(challenge.constraints);
    const [inputFormat, setInputFormat] = useState(challenge.input_format);
    const [outputFormat, setOutputFormat] = useState(challenge.output_format);
    const [sampleInput, setSampleInput] = useState(challenge.sample_input);
    const [sampleOutput, setSampleOutput] = useState(challenge.sample_output);

    const [selectedCategory, setSelectedCategory] = useState<number>(
        challenge.category?.id || 0
    );
    const [selectedDifficulty, setSelectedDifficulty] = useState<number>(
        challenge.difficulty?.id || 0
    );
    const [selectedSolutionType, setSelectedSolutionType] = useState<number>(
        challenge.solution_type?.id || 0
    );

    const [categories, setCategories] = useState<{ id: number; name: string }[]>(
        []
    );
    const [difficulties, setDifficulties] = useState<
        { id: number; level: string }[]
    >([]);
    const [solutionTypes, setSolutionTypes] = useState<
        { id: number; type: string }[]
    >([]);

    // Fetch categories, difficulties, solution types only if admin
    useEffect(() => {
        if (user?.role === "admin") {
            getCategories()
                .then((data) =>
                    setCategories(data.map((c: any) => ({ id: c.id, name: c.name })))
                )
                .catch(console.error);
            getDifficulties()
                .then((data) =>
                    setDifficulties(data.map((d: any) => ({ id: d.id, level: d.level })))
                )
                .catch(console.error);
            getSolutionTypes()
                .then((data) =>
                    setSolutionTypes(data.map((s: any) => ({ id: s.id, type: s.type })))
                )
                .catch(console.error);
        }
    }, [user]);

    const handleSave = async () => {
        setLoadingSave(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("constraints", constraints || "");
        formData.append("input_format", inputFormat || "");
        formData.append("output_format", outputFormat || "");
        formData.append("sample_input", sampleInput || "");
        formData.append("sample_output", sampleOutput || "");
        formData.append("category", selectedCategory.toString());
        formData.append("difficulty", selectedDifficulty.toString());
        formData.append("solution_type", selectedSolutionType.toString());

        try {
            await updateChallenge(challenge.id, formData);
            setMessage("Challenge updated successfully!");
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            setMessage("Failed to update challenge.");
        } finally {
            setLoadingSave(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    const resetEdits = () => {
        setTitle(challenge.title);
        setDescription(challenge.description);
        setConstraints(challenge.constraints);
        setInputFormat(challenge.input_format);
        setOutputFormat(challenge.output_format);
        setSampleInput(challenge.sample_input);
        setSampleOutput(challenge.sample_output);
        setSelectedCategory(challenge.category?.id || 0);
        setSelectedDifficulty(challenge.difficulty?.id || 0);
        setSelectedSolutionType(challenge.solution_type?.id || 0);
    };

    const sections = [
        { title: "Description", value: description, setter: setDescription },
        { title: "Constraints", value: constraints, setter: setConstraints },
        { title: "Input Format", value: inputFormat, setter: setInputFormat },
        { title: "Output Format", value: outputFormat, setter: setOutputFormat },
        { title: "Sample Input", value: sampleInput, setter: setSampleInput },
        { title: "Sample Output", value: sampleOutput, setter: setSampleOutput },
    ];

    // LeetCode-like difficulty badge color
    const difficultyLabel = challenge.difficulty?.level || "";
    const difficultyColor =
        difficultyLabel.toLowerCase() === "easy"
            ? "text-emerald-600 bg-emerald-50 border-emerald-200"
            : difficultyLabel.toLowerCase() === "medium"
                ? "text-amber-600 bg-amber-50 border-amber-200"
                : difficultyLabel.toLowerCase() === "hard"
                    ? "text-red-600 bg-red-50 border-red-200"
                    : "text-slate-600 bg-slate-50 border-slate-200";

    return (
        <div className="font-sans text-slate-900">
            {/* Header: title + meta + admin controls (LeetCode-style top bar) */}
            <header className="mb-4 border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        {user?.role === "admin" && isEditing ? (
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border-none bg-transparent text-xl md:text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none focus:ring-0"
                            />
                        ) : (
                            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
                                {title}
                            </h1>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {/* Category */}
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
                {challenge.category?.name || "Uncategorized"}
              </span>

                            {/* Difficulty */}
                            <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${difficultyColor}`}
                            >
                {difficultyLabel || "N/A"}
              </span>

                            {/* Solution type */}
                            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                {challenge.solution_type?.type || "Solution"}
              </span>
                        </div>
                    </div>

                    {/* Admin edit controls (LeetCode-like text buttons) */}
                    {user?.role === "admin" && (
                        <div className="flex items-center gap-3 text-xs md:text-sm">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={loadingSave}
                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                                    >
                                        <FiSave size={14} />
                                        <span>{loadingSave ? "Saving..." : "Save"}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            resetEdits();
                                            setIsEditing(false);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    >
                                        <FiX size={14} />
                                        <span>Cancel</span>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                >
                                    <FiEdit2 size={14} />
                                    <span>Edit</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Admin: editable dropdowns for category/difficulty/solution type */}
                {user?.role === "admin" && isEditing && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Category:</span>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(Number(e.target.value))}
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Difficulty:</span>
                            <select
                                value={selectedDifficulty}
                                onChange={(e) => setSelectedDifficulty(Number(e.target.value))}
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {difficulties.map((diff) => (
                                    <option key={diff.id} value={diff.id}>
                                        {diff.level}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Solution Type:</span>
                            <select
                                value={selectedSolutionType}
                                onChange={(e) =>
                                    setSelectedSolutionType(Number(e.target.value))
                                }
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {solutionTypes.map((st) => (
                                    <option key={st.id} value={st.id}>
                                        {st.type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </header>

            {/* Info / Status message */}
            {message && (
                <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    {message}
                </div>
            )}

            {/* Main sections – LeetCode-style content blocks */}
            <div className="space-y-5">
                {sections.map(({ title, value, setter }) => (
                    <section key={title}>
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                            {title}
                        </h2>
                        {user?.role === "admin" && isEditing ? (
                            <textarea
                                value={value || ""}
                                onChange={(e) => setter(e.target.value)}
                                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                rows={Math.max(3, (value || "").split("\n").length || 3)}
                            />
                        ) : (
                            <pre className="max-h-[420px] overflow-auto rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap">
                {value}
              </pre>
                        )}
                    </section>
                ))}

                {/* Files section – attachments like "Related Resources" */}
                {challenge.files && challenge.files.length > 0 && (
                    <section>
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Files
                        </h2>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {challenge.files.map((file) => (
                                <a
                                    key={file.url}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                                        {(file.name && file.name.split(".").pop()?.toUpperCase()) ||
                                            "FILE"}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-xs font-medium text-blue-700">
                                            {file.name}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            Opens in a new tab
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default PracticeDescription;
