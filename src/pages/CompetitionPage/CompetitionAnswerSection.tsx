import React, { useEffect, useMemo, useState } from "react";
import { Challenge } from "./types";
import { submitFlag, submitTextSolution } from "./api";

interface Props {
    challenge: Challenge;
}

const formatDuration = (ms: number): string => {
    if (ms <= 0) return "00h 00m 00s";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
};

type SubmitResult = {
    type: "flag" | "procedure" | string;
    submission_id: number;
    correct: boolean;
    status: string;
    submitted_at: string;
    submitted_value?: string;
    submitted_content?: string;
};

type SubmitResponse = {
    challenge_id: number;
    question_type: string;
    contest_id: number | null;
    results: SubmitResult[];
};

const CompetitionAnswerSection: React.FC<Props> = ({ challenge }) => {
    const [solutionText, setSolutionText] = useState("");
    const [flagText, setFlagText] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [now, setNow] = useState<Date>(new Date());
    const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(null);

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const contest = challenge.active_contest ?? null;

    const solutionTypeLabel = challenge.solution_type?.type || "";
    const showText = solutionTypeLabel === "Procedure" || solutionTypeLabel === "Flag and Procedure";
    const showFlag = solutionTypeLabel === "Flag" || solutionTypeLabel === "Flag and Procedure";

    const contestState = useMemo(() => {
        if (!contest) {
            return { isRunning: false };
        }

        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);
        const nowMs = now.getTime();
        const startMs = start.getTime();
        const endMs = end.getTime();

        return { isRunning: nowMs >= startMs && nowMs < endMs };
    }, [contest, now]);

    const resetMessages = () => {
        setMessage(null);
        setError(null);
    };

    const pickLatestSubmittedAt = (resp: SubmitResponse | null | undefined): string | null => {
        const arr = resp?.results?.map((r) => r.submitted_at).filter(Boolean) ?? [];
        if (arr.length === 0) return null;
        let latest = arr[0];
        let latestMs = new Date(latest).getTime();
        for (const iso of arr) {
            const ms = new Date(iso).getTime();
            if (ms > latestMs) {
                latestMs = ms;
                latest = iso;
            }
        }
        return latest;
    };

    const handleSubmit = async () => {
        resetMessages();

        if (!showFlag && !showText) {
            setError("This challenge does not accept submissions.");
            return;
        }

        if (!contest) {
            setError("This challenge is not attached to an active contest.");
            return;
        }

        if (!contestState.isRunning) {
            setError("Submissions are not allowed at this time.");
            return;
        }

        if (!solutionText && !flagText) {
            setError("Cannot submit empty solution.");
            return;
        }

        setSubmitting(true);
        try {
            const collectedTimes: string[] = [];

            if (showFlag && flagText.trim()) {
                const resp = await submitFlag(challenge.id, flagText.trim());
                const latest = pickLatestSubmittedAt(resp);
                if (latest) collectedTimes.push(latest);
                setFlagText("");
            }

            if (showText && solutionText.trim()) {
                const resp = await submitTextSolution(challenge.id, solutionText.trim());
                const latest = pickLatestSubmittedAt(resp);
                if (latest) collectedTimes.push(latest);
                setSolutionText("");
            }

            if (collectedTimes.length > 0) {
                let latest = collectedTimes[0];
                let latestMs = new Date(latest).getTime();
                for (const iso of collectedTimes) {
                    const ms = new Date(iso).getTime();
                    if (ms > latestMs) {
                        latestMs = ms;
                        latest = iso;
                    }
                }
                setLastSubmittedAt(latest);
            }

            setMessage("Submitted successfully! Check Previous Submissions for status.");
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Submission failed.");
        } finally {
            setSubmitting(false);
            setTimeout(() => {
                setMessage(null);
                setError(null);
            }, 4000);
        }
    };

    const submitDisabled = submitting || !contestState.isRunning || (!showFlag && !showText);

    // --- Styling tokens (EXACT vibe as PracticeAnswerSubmit) ---
    const shell =
        "min-w-0 w-full flex flex-col rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50 overflow-hidden";

    const btn =
        "rounded-xl border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs sm:text-sm font-normal text-slate-600 shadow-sm hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50";

    const inputShell =
        "rounded-xl border border-slate-200/70 bg-white/70 focus-within:bg-white focus-within:border-blue-200/70 focus-within:ring-2 focus-within:ring-blue-500/10";

    const inputBase =
        "w-full bg-transparent px-3 py-3 text-sm font-mono text-slate-700 outline-none placeholder:text-slate-400";

    // Submit: full width on mobile, compact on sm+
    const submitBtn =
        "w-full sm:w-auto sm:min-w-[140px] rounded-2xl border border-blue-200/70 bg-blue-50/70 px-4 py-2.5 text-sm sm:text-base font-normal text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-100/60 disabled:text-slate-400 disabled:cursor-not-allowed";

    return (
        <aside className={shell}>


            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white/40 backdrop-blur-xl">
                {(error || message) && (
                    <div
                        className={`rounded-xl border px-3 py-2 text-sm ${
                            error
                                ? "bg-rose-50/80 border-rose-200 text-rose-700"
                                : "bg-emerald-50/80 border-emerald-200 text-emerald-700"
                        }`}
                    >
                        {error ?? message}
                    </div>
                )}

                {showFlag && (
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-normal uppercase tracking-wide text-slate-500">Flag</div>
                            <button
                                type="button"
                                onClick={() => setFlagText("")}
                                disabled={submitting || !flagText}
                                className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40"
                            >
                                Clear
                            </button>
                        </div>

                        <div className={inputShell}>
                            <input
                                type="text"
                                value={flagText}
                                onChange={(e) => setFlagText(e.target.value)}
                                placeholder="Enter flag…"
                                disabled={submitting || !contestState.isRunning}
                                className={inputBase}
                            />
                        </div>

                        <div className="text-xs text-slate-500">Flags are usually case-sensitive.</div>
                    </section>
                )}

                {showText && (
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-normal uppercase tracking-wide text-slate-500">Procedure</div>
                            <button
                                type="button"
                                onClick={() => setSolutionText("")}
                                disabled={submitting || !solutionText}
                                className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40"
                            >
                                Clear
                            </button>
                        </div>

                        <div className={inputShell}>
                            <textarea
                                value={solutionText}
                                onChange={(e) => setSolutionText(e.target.value)}
                                placeholder="Explain your approach…"
                                disabled={submitting || !contestState.isRunning}
                                className={`${inputBase} h-56 resize-none`}
                            />
                        </div>

                        <div className="text-xs text-slate-500">Keep it clear and concise.</div>
                    </section>
                )}
            </div>

            {/* Footer: Submit (small) left, Clear message right; responsive */}
            {(showFlag || showText) && (
                <div className="px-4 py-3 border-t border-white/40 bg-white/40 backdrop-blur-xl">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button onClick={handleSubmit} disabled={submitDisabled} className={submitBtn}>
                            {submitting ? "Submitting…" : "Submit"}
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default CompetitionAnswerSection;
