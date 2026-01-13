import React, { useEffect, useState } from "react";
import { PreviousSubmission } from "./types";
import { getPreviousSubmissions } from "./practice";

interface Props {
    challengeId: number;
}

type SubmissionsResponse = {
    flag_submissions: PreviousSubmission[];
    text_submissions: PreviousSubmission[];
};

const statusClasses = (status: string) => {
    const s = status.toLowerCase();
    if (s === "solved" || s === "accepted" || s === "correct") {
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s === "wrong" || s === "rejected" || s === "incorrect") {
        return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
};

const PreviousSubmissions: React.FC<Props> = ({ challengeId }) => {
    const [submissions, setSubmissions] = useState<SubmissionsResponse>({
        flag_submissions: [],
        text_submissions: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubmissions = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getPreviousSubmissions(challengeId);
                setSubmissions(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load previous submissions.");
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [challengeId]);

    if (loading) {
        return (
            <p className="mt-4 text-xs text-slate-500">
                Loading previous submissions...
            </p>
        );
    }

    if (error) {
        return <p className="mt-4 text-xs text-red-600">{error}</p>;
    }

    if (
        submissions.flag_submissions.length === 0 &&
        submissions.text_submissions.length === 0
    ) {
        return (
            <p className="mt-4 text-xs text-slate-500">
                You have no submissions for this challenge yet.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {/* Flag submissions */}
            {submissions.flag_submissions.length > 0 && (
                <section>
                    <h2 className="mb-2 text-sm font-semibold text-slate-800">
                        Flag Submissions
                    </h2>

                    <div className="space-y-3">
                        {submissions.flag_submissions.map((sub) => (
                            <article
                                key={`flag-${sub.id}`}
                                className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-800 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                            >
                                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">

                                    <span>{new Date(sub.submittedAt).toLocaleString()}</span>
                                </div>

                                <pre className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-900">
                  {sub.value ?? ""}
                </pre>

                                {/* Status is hidden during contests, so it may be null */}
                                {sub.status && (
                                    <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    <span className={statusClasses(sub.status)}>
                      <span className="px-1">{sub.status}</span>
                    </span>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* Text submissions */}
            {submissions.text_submissions.length > 0 && (
                <section>
                    <h2 className="mb-2 text-sm font-semibold text-slate-800">
                        Text Submissions
                    </h2>

                    <div className="space-y-3">
                        {submissions.text_submissions.map((sub) => (
                            <article
                                key={`text-${sub.id}`}
                                className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-800 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                            >
                                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">

                                    <span>{new Date(sub.submittedAt).toLocaleString()}</span>
                                </div>

                                <pre className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 font-sans text-[11px] text-slate-900">
                  {sub.content ?? ""}
                </pre>

                                {/* Status is hidden during contests, so it may be null */}
                                {sub.status && (
                                    <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    <span className={statusClasses(sub.status)}>
                      <span className="px-1">{sub.status}</span>
                    </span>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default PreviousSubmissions;
