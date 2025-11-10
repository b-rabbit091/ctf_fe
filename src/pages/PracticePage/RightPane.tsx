import React, { useState } from "react";
import { Challenge } from "./types";
import { submitFlag, submitTextSolution } from "../../api/practice";

interface Props {
    challenge: Challenge;
}

const RightPane: React.FC<Props> = ({ challenge }) => {
    const [solutionText, setSolutionText] = useState("");
    const [flagText, setFlagText] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const showText = challenge.solution_type.type === "Procedure" || challenge.solution_type.type === "Flag and Procedure";
    const showFlag = challenge.solution_type.type === "Flag" || challenge.solution_type.type === "Flag and Procedure";

    const handleSubmit = async () => {
        if (!solutionText && !flagText) return setMessage("Cannot submit empty solution.");
        setSubmitting(true);
        try {
            if (showFlag && flagText) {
                await submitFlag(challenge.id, flagText);
                setFlagText("");
            }
            if (showText && solutionText) {
                await submitTextSolution(challenge.id, solutionText);
                setSolutionText("");
            }
            setMessage("Submitted successfully!");
        } catch (err: any) {
            console.error(err);
            setMessage(err?.message || "Submission failed.");
        } finally {
            setSubmitting(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    return (
        <div className="w-full lg:w-96 flex flex-col gap-6 sticky top-6">
            {showText && (
                <div className="bg-white rounded-md shadow p-6">
                    <h2 className="font-semibold text-lg mb-2">Step-by-Step Solution</h2>
                    <textarea
                        value={solutionText}
                        onChange={(e) => setSolutionText(e.target.value)}
                        placeholder="Write your approach here..."
                        className="border rounded p-3 h-64 resize-none focus:ring-2 focus:ring-blue-300 w-full"
                    />
                </div>
            )}

            {showFlag && (
                <div className="bg-white rounded-md shadow p-6">
                    <h2 className="font-semibold text-lg mb-2">Submit Flag</h2>
                    <input
                        type="text"
                        value={flagText}
                        onChange={(e) => setFlagText(e.target.value)}
                        placeholder="Enter flag..."
                        className="border rounded p-3 focus:ring-2 focus:ring-blue-300 w-full"
                    />
                </div>
            )}

            {(showFlag || showText) && (
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mt-4 bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
                >
                    {submitting ? "Submitting..." : "Submit"}
                </button>
            )}

            {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
        </div>
    );
};

export default RightPane;
