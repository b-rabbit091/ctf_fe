import React, { useEffect, useState } from "react";
import { Challenge } from "./types";
import { useAuth } from "../../contexts/AuthContext";
import { getCategories, getDifficulties, getSolutionTypes, updateChallenge } from "../../api/practice";

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

    const [selectedCategory, setSelectedCategory] = useState<number>(challenge.category?.id || 0);
    const [selectedDifficulty, setSelectedDifficulty] = useState<number>(challenge.difficulty?.id || 0);
    const [selectedSolutionType, setSelectedSolutionType] = useState<number>(challenge.solution_type?.id || 0);

    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [difficulties, setDifficulties] = useState<{ id: number; level: string }[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<{ id: number; type: string }[]>([]);

    // Fetch categories, difficulties, solution types only if admin
    useEffect(() => {
        if (user?.role === "admin") {
            getCategories()
                .then(data => setCategories(data.map((c: any) => ({ id: c.id, name: c.name }))))
                .catch(console.error);
            getDifficulties()
                .then(data => setDifficulties(data.map((d: any) => ({ id: d.id, level: d.level }))))
                .catch(console.error);
            getSolutionTypes()
                .then(data => setSolutionTypes(data.map((s: any) => ({ id: s.id, type: s.type }))))
                .catch(console.error);
        }
    }, [user]);

    const handleSave = async () => {
        setLoadingSave(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("constraints", constraints);
        formData.append("input_format", inputFormat);
        formData.append("output_format", outputFormat);
        formData.append("sample_input", sampleInput);
        formData.append("sample_output", sampleOutput);
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

    const sections = [
        { title: "Description", value: description, setter: setDescription },
        { title: "Constraints", value: constraints, setter: setConstraints },
        { title: "Input Format", value: inputFormat, setter: setInputFormat },
        { title: "Output Format", value: outputFormat, setter: setOutputFormat },
        { title: "Sample Input", value: sampleInput, setter: setSampleInput },
        { title: "Sample Output", value: sampleOutput, setter: setSampleOutput },
    ];

    return (
        <div className="space-y-6 text-gray-800 font-sans">
            {/* Title and Edit/Save/Cancel */}
            <div className="flex items-center gap-3">
                {user?.role === "admin" && isEditing ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl font-bold w-full border-b border-gray-300 p-1 focus:outline-none focus:ring focus:ring-blue-200"
                    />
                ) : (
                    <h1 className="text-2xl font-bold">{title}</h1>
                )}

                {user?.role === "admin" && (
                    <div className="ml-4 flex items-center gap-4">
                        <span
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                            className={`text-sm font-medium cursor-pointer select-none ${
                                isEditing ? "text-green-600 hover:text-green-800" : "text-blue-600 hover:underline"
                            }`}
                        >
                            {loadingSave ? "Saving..." : isEditing ? "Save" : "Edit"}
                        </span>

                        {isEditing && (
                            <span
                                onClick={() => {
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
                                    setIsEditing(false);
                                }}
                                className="text-sm font-medium cursor-pointer select-none text-red-600 hover:text-red-800"
                            >
                                Cancel
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Category, Difficulty, Solution Type */}
            <div className="flex items-center gap-3">
                {user?.role === "admin" && isEditing ? (
                    <>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(Number(e.target.value))}
                            className="border rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring focus:ring-blue-200"
                        >
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(Number(e.target.value))}
                            className="border rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring focus:ring-blue-200"
                        >
                            {difficulties.map((diff) => (
                                <option key={diff.id} value={diff.id}>
                                    {diff.level}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedSolutionType}
                            onChange={(e) => setSelectedSolutionType(Number(e.target.value))}
                            className="border rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring focus:ring-blue-200"
                        >
                            {solutionTypes.map((st) => (
                                <option key={st.id} value={st.id}>
                                    {st.type}
                                </option>
                            ))}
                        </select>
                    </>
                ) : (
                    <>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                            {challenge.category?.name}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                            {challenge.difficulty?.level}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                            {challenge.solution_type?.type}
                        </span>
                    </>
                )}
            </div>

            {/* Success/Error message */}
            {message && <p className="text-sm text-blue-600">{message}</p>}

            {/* Sections */}
            {sections.map(({ title, value, setter }) => (
                <section key={title}>
                    <h2 className="text-lg font-semibold mb-1 border-b border-gray-200 pb-1">{title}</h2>
                    {user?.role === "admin" && isEditing ? (
                        <textarea
                            value={value || ""}
                            onChange={(e) => setter(e.target.value)}
                            className="w-full p-2 border rounded bg-gray-50 text-gray-800 font-sans focus:outline-none focus:ring focus:ring-blue-200"
                            rows={value?.split("\n").length || 3}
                        />
                    ) : (
                        <pre className="bg-gray-50 p-3 rounded text-gray-800 overflow-x-auto whitespace-pre-wrap">
                            {value}
                        </pre>
                    )}
                </section>
            ))}

            {/* Files */}
            {challenge.files && challenge.files.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold mb-1 border-b border-gray-200 pb-1">Files</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {challenge.files.map((file) => (
                            <a
                                key={file.url}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-50 rounded flex items-center gap-2 hover:bg-gray-100 transition"
                            >
                                <span className="text-gray-500">{file.name.split(".").pop()?.toUpperCase() || "FILE"}</span>
                                <span className="text-blue-600 font-medium truncate">{file.name}</span>
                            </a>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default PracticeDescription;
