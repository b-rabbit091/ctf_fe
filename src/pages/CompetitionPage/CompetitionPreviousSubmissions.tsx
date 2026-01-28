import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PreviousSubmission} from "./types";
import {getPreviousSubmissions} from "./api";
import {FiAlertCircle, FiInfo} from "react-icons/fi";

interface Props {
    challengeId: number;
}

type SubmissionsResponse = {
    flag_submissions: PreviousSubmission[];
    text_submissions: PreviousSubmission[];
};

const safeDateLabel = (iso: any) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const statusTone = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "solved" || s === "accepted" || s === "correct") {
        return "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700";
    }
    if (s === "wrong" || s === "rejected" || s === "incorrect") {
        return "ring-rose-200/60 bg-rose-50/70 text-rose-700";
    }
    return "ring-slate-200/60 bg-slate-100/70 text-slate-700";
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const CompetitionPreviousSubmissions: React.FC<Props> = ({challengeId}) => {
    const [submissions, setSubmissions] = useState<SubmissionsResponse>({
        flag_submissions: [],
        text_submissions: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const fetchSubmissions = useCallback(async () => {
        if (!Number.isFinite(challengeId) || challengeId <= 0) {
            setError("Invalid challenge id.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await getPreviousSubmissions(challengeId);
            if (!alive.current) return;

            const safe: SubmissionsResponse = {
                flag_submissions: Array.isArray(data?.flag_submissions) ? data.flag_submissions : [],
                text_submissions: Array.isArray(data?.text_submissions) ? data.text_submissions : [],
            };

            setSubmissions(safe);
        } catch (err) {
            console.error(err);
            if (!alive.current) return;
            setError("Failed to load previous submissions.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, [challengeId]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const hasAny = useMemo(() => {
        return submissions.flag_submissions.length > 0 || submissions.text_submissions.length > 0;
    }, [submissions]);

    const shell =
        "w-full rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden";
    const header =
        "px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40";
    const body = "px-4 sm:px-5 py-4 space-y-5";
    const card =
        "rounded-xl bg-white/70 ring-1 ring-slate-200/60 p-4 overflow-hidden";
    const pre =
        "mt-2 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/60 px-4 py-3 text-xs sm:text-sm whitespace-pre-wrap break-words overflow-auto";

    if (loading) {
        return (
            <div className={shell}>
                <div className={header}>
                    <div className="text-sm font-normal text-slate-700">Previous Submissions</div>
                    <div className="mt-1 text-xs sm:text-sm text-slate-500">Loading…</div>
                </div>
                <div className={body}>
                    <div className="rounded-xl bg-white/70 ring-1 ring-slate-200/60 p-4 text-xs sm:text-sm text-slate-600">
                        Loading previous submissions…
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={shell}>
                <div className={header}>
                    <div className="text-sm font-normal text-slate-700">Previous Submissions</div>
                </div>
                <div className={body}>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load submissions</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasAny) {
        return (
            <div className={shell}>
                <div className={header}>
                    <div className="text-sm font-normal text-slate-700">Previous Submissions</div>
                </div>
                <div className={body}>
                    <div className="rounded-xl bg-white/70 ring-1 ring-slate-200/60 p-6 text-center">
                        <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                            <FiInfo className="text-slate-500" />
                        </div>
                        <div className="mt-3 text-sm sm:text-base font-normal tracking-tight text-slate-700">
                            No submissions yet
                        </div>
                        <div className="mt-1 text-xs sm:text-sm text-slate-500">
                            You have no submissions for this challenge.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={shell}>
            <div className={header}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <div className="text-sm font-normal text-slate-700">Previous Submissions</div>
                        <div className="mt-1 text-xs sm:text-sm text-slate-500">
                            Your recent flag/procedure attempts for this challenge.
                        </div>
                    </div>

                    <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm text-slate-700">
                        Total:{" "}
                        <span className="ml-1 font-semibold">
                            {submissions.flag_submissions.length + submissions.text_submissions.length}
                        </span>
                    </span>
                </div>
            </div>

            <div className={body}>
                {/* Flag submissions */}
                {submissions.flag_submissions.length > 0 ? (
                    <section className="space-y-3">
                        <h2 className="text-sm sm:text-base font-normal text-slate-800">Flag Submissions</h2>

                        <div className="space-y-3">
                            {submissions.flag_submissions.map((sub) => (
                                <article key={`flag-${sub.id}`} className={card}>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-500">
                                        <span>{safeDateLabel((sub as any).submittedAt)}</span>
                                        {(sub as any).status ? (
                                            <span
                                                className={cx(
                                                    "inline-flex items-center rounded-full ring-1 px-3 py-1 text-xs sm:text-sm",
                                                    statusTone(String((sub as any).status))
                                                )}
                                            >
                                                {String((sub as any).status)}
                                            </span>
                                        ) : null}
                                    </div>

                                    <pre className={cx(pre, "font-mono")}>{(sub as any).value ?? ""}</pre>
                                </article>
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* Text submissions */}
                {submissions.text_submissions.length > 0 ? (
                    <section className="space-y-3">
                        <h2 className="text-sm sm:text-base font-normal text-slate-800">Text Submissions</h2>

                        <div className="space-y-3">
                            {submissions.text_submissions.map((sub) => (
                                <article key={`text-${sub.id}`} className={card}>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-500">
                                        <span>{safeDateLabel((sub as any).submittedAt)}</span>
                                        {(sub as any).status ? (
                                            <span
                                                className={cx(
                                                    "inline-flex items-center rounded-full ring-1 px-3 py-1 text-xs sm:text-sm",
                                                    statusTone(String((sub as any).status))
                                                )}
                                            >
                                                {String((sub as any).status)}
                                            </span>
                                        ) : null}
                                    </div>

                                    <pre className={cx(pre, "font-sans")}>{(sub as any).content ?? ""}</pre>
                                </article>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        </div>
    );
};

export default CompetitionPreviousSubmissions;
