import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { useNavigate } from "react-router-dom";
import { getCategories, getDifficulties, getSolutionTypes, createChallenge } from "../../api/practice";
import { useAuth } from "../../contexts/AuthContext";

const ChallengeCreate: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Tabs
    const [activeTab, setActiveTab] = useState<"question" | "solution">("question");
    const [questionSaved, setQuestionSaved] = useState(false);

    // Challenge fields in memory
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
    const [questionType, setQuestionType] = useState("practice");
    const [fileLinks, setFileLinks] = useState<string[]>([]);
    const [newFileLink, setNewFileLink] = useState("");

    // Solution fields
    const [flagSolution, setFlagSolution] = useState("");
    const [procedureSolution, setProcedureSolution] = useState("");

    // Options
    const [categories, setCategories] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [solutionTypes, setSolutionTypes] = useState<any[]>([]);

    const [message, setMessage] = useState("");

    // Fetch options
    useEffect(() => {
        Promise.all([getCategories(), getDifficulties(), getSolutionTypes()]).then(
            ([cats, diffs, sols]) => {
                setCategories(cats);
                setDifficulties(diffs);
                setSolutionTypes(sols);
            }
        );
    }, []);

    // Add file link
    const addFileLink = () => {
        if (newFileLink.trim()) {
            setFileLinks(prev => [...prev, newFileLink.trim()]);
            setNewFileLink("");
        }
    };

    // Save question in memory
    const handleSaveQuestion = () => {
        if (!title.trim() || !description.trim()) {
            setMessage("Title and Description are required");
            return;
        }
        setMessage("Question saved in memory. You can now add solutions.");
        setQuestionSaved(true);
        setActiveTab("solution");
    };

    // Final submit
    const handleSubmitChallenge = async () => {
        if (!questionSaved) {
            setMessage("Save question first.");
            return;
        }
        if (!solutionType) {
            setMessage("Select a solution type.");
            return;
        }

        const payload = {
            title,
            description,
            constraints,
            input_format: inputFormat,
            output_format: outputFormat,
            sample_input: sampleInput,
            sample_output: sampleOutput,
            category,
            difficulty,
            solution_type: solutionType,
            question_type: questionType,
            files: fileLinks,
            flag_solution: flagSolution,
            procedure_solution: procedureSolution,
        };

        try {
            await createChallenge(payload);
            setMessage("Challenge created successfully!");
            navigate("/practice");
        } catch (err) {
            console.error(err);
            setMessage("Failed to create challenge.");
        }
    };

    if (user?.role !== "admin") return <p className="text-center p-6">Unauthorized</p>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow-md">
                <h1 className="text-3xl font-bold mb-6">Create Challenge</h1>
                {message && <p className="text-blue-600 mb-4">{message}</p>}

                {/* Tabs */}
                <div className="flex border-b mb-6">
                    <button
                        className={`px-4 py-2 ${activeTab === "question" ? "border-b-2 border-blue-600 text-blue-600 font-semibold" : "text-gray-500"}`}
                        onClick={() => setActiveTab("question")}
                    >
                        Question
                    </button>
                    <button
                        className={`ml-2 px-4 py-2 ${activeTab === "solution" ? "border-b-2 border-blue-600 text-blue-600 font-semibold" : "text-gray-500"} ${!questionSaved && "opacity-50 cursor-not-allowed"}`}
                        onClick={() => questionSaved && setActiveTab("solution")}
                    >
                        Solution
                    </button>
                </div>

                {/* Question Tab */}
                {activeTab === "question" && (
                    <div className="space-y-4">
                        <input
                            className="border p-2 w-full rounded"
                            placeholder="Title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                        <textarea
                            className="border p-2 w-full rounded h-32"
                            placeholder="Problem Description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <select className="border p-2 rounded" value={category} onChange={e => setCategory(Number(e.target.value))}>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select className="border p-2 rounded" value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}>
                                <option value="">Select Difficulty</option>
                                {difficulties.map(d => <option key={d.id} value={d.id}>{d.level}</option>)}
                            </select>
                        </div>
                        <select className="border p-2 rounded w-full" value={solutionType} onChange={e => setSolutionType(Number(e.target.value))}>
                            <option value="">Select Solution Type</option>
                            {solutionTypes.map(s => <option key={s.id} value={s.id}>{s.type}</option>)}
                        </select>
                        <select className="border p-2 rounded w-full" value={questionType} onChange={e => setQuestionType(e.target.value)}>
                            <option value="practice">Practice</option>
                            <option value="competition">Competition</option>
                        </select>

                        <textarea
                            className="border p-2 w-full rounded"
                            placeholder="Constraints (optional)"
                            value={constraints}
                            onChange={e => setConstraints(e.target.value)}
                        />
                        <textarea
                            className="border p-2 w-full rounded"
                            placeholder="Input Format (optional)"
                            value={inputFormat}
                            onChange={e => setInputFormat(e.target.value)}
                        />
                        <textarea
                            className="border p-2 w-full rounded"
                            placeholder="Output Format (optional)"
                            value={outputFormat}
                            onChange={e => setOutputFormat(e.target.value)}
                        />
                        <textarea
                            className="border p-2 w-full rounded"
                            placeholder="Sample Input (optional)"
                            value={sampleInput}
                            onChange={e => setSampleInput(e.target.value)}
                        />
                        <textarea
                            className="border p-2 w-full rounded"
                            placeholder="Sample Output (optional)"
                            value={sampleOutput}
                            onChange={e => setSampleOutput(e.target.value)}
                        />

                        {/* File Links */}
                        <div>
                            <label className="block font-medium mb-1">Attach Files (URLs)</label>
                            <div className="flex gap-2">
                                <input
                                    className="border p-2 rounded flex-1"
                                    placeholder="File URL"
                                    value={newFileLink}
                                    onChange={e => setNewFileLink(e.target.value)}
                                />
                                <button type="button" className="bg-gray-200 px-3 rounded" onClick={addFileLink}>Add</button>
                            </div>
                            {fileLinks.length > 0 && (
                                <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                                    {fileLinks.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                            )}
                        </div>

                        <button className="bg-blue-600 text-white px-6 py-2 rounded mt-4" onClick={handleSaveQuestion}>
                            Save Question
                        </button>
                    </div>
                )}

                {/* Solution Tab */}
                {activeTab === "solution" && questionSaved && (
                    <div className="space-y-4">
                        {(solutionType === 1 || solutionType === 3) && (
                            <textarea
                                className="border p-2 w-full rounded h-24"
                                placeholder="Flag Solution"
                                value={flagSolution}
                                onChange={e => setFlagSolution(e.target.value)}
                            />
                        )}
                        {(solutionType === 2 || solutionType === 3) && (
                            <textarea
                                className="border p-2 w-full rounded h-24"
                                placeholder="Procedure Solution"
                                value={procedureSolution}
                                onChange={e => setProcedureSolution(e.target.value)}
                            />
                        )}
                        <button className="bg-green-600 text-white px-6 py-2 rounded" onClick={handleSubmitChallenge}>
                            Create Challenge
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChallengeCreate;
