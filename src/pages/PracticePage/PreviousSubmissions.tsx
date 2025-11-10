import React, {useEffect, useState} from "react";
import {PreviousSubmission} from "./types";
import {getPreviousSubmissions} from "../../api/practice";

interface Props {
    challengeId: number;
}


const PreviousSubmissions: React.FC<Props> = ({challengeId}) => {

    const [submissions, setSubmissions] = useState<{
        flag_submissions: PreviousSubmission[],
        text_submissions: PreviousSubmission[]
    }>({flag_submissions: [], text_submissions: []});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const data = await getPreviousSubmissions(challengeId);
                setSubmissions(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, [challengeId]);

    if (loading) return <p className="text-gray-500 mt-4">Loading previous submissions...</p>;
    if (submissions.flag_submissions.length === 0 && submissions.text_submissions.length === 0)
        return <p className="text-gray-500 mt-4">No previous submissions.</p>;

    return (
        <div className="space-y-4">
            {/* Flag Submissions */}
            {submissions.flag_submissions.map((sub) => (
                <div
                    key={`flag-${sub.id}`}
                    className="border border-gray-200 rounded-md p-4 bg-white shadow-sm hover:shadow-md transition-all"
                >
                    <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                        <span className="font-medium text-gray-600 uppercase">Flag</span>
                        <span>{new Date(sub.updated_at).toLocaleString()}</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-gray-800 font-sans">{sub.value}</pre>
                    <div
                        className={`mt-2 font-semibold ${
                            sub.status === "solved"
                                ? "text-green-600"
                                : sub.status === "wrong"
                                    ? "text-red-600"
                                    : "text-gray-600"
                        }`}
                    >
                        {sub.status.toUpperCase()}
                    </div>
                </div>
            ))}

            {/* Text Submissions */}
            {submissions.text_submissions.map((sub) => (
                <div
                    key={`text-${sub.id}`}
                    className="border border-gray-200 rounded-md p-4 bg-white shadow-sm hover:shadow-md transition-all"
                >
                    <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                        <span className="font-medium text-gray-600 uppercase">Text</span>
                        <span>{new Date(sub.updated_at).toLocaleString()}</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-gray-800 font-sans">{sub.content}</pre>
                    <div
                        className={`mt-2 font-semibold ${
                            sub.status === "solved"
                                ? "text-green-600"
                                : sub.status === "wrong"
                                    ? "text-red-600"
                                    : "text-gray-600"
                        }`}
                    >
                        {sub.status.toUpperCase()}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PreviousSubmissions;
