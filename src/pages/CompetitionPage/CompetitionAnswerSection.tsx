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
    const showText =
        solutionTypeLabel === "Procedure" ||
        solutionTypeLabel === "Flag and Procedure";
    const showFlag =
        solutionTypeLabel === "Flag" || solutionTypeLabel === "Flag and Procedure";

    const contestState = useMemo(() => {
        if (!contest) {
            return {
                status: "no-contest" as const,
                statusLabel: "No Contest Attached",
                badgeClasses: "bg-slate-50 text-slate-700 border-slate-200",
                infoLabel: "This challenge is not currently part of an active contest.",
                remaining: "",
                isRunning: false,
            };
        }

        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);
        const nowMs = now.getTime();
        const startMs = start.getTime();
        const endMs = end.getTime();

        if (nowMs < startMs) {
            return {
                status: "upcoming" as const,
                statusLabel: "Upcoming",
                badgeClasses: "bg-sky-50 text-sky-700 border-sky-200",
                infoLabel: "Contest has not started yet.",
                remaining: `${formatDuration(startMs - nowMs)} until start`,
                isRunning: false,
            };
        }

        if (nowMs >= startMs && nowMs < endMs) {
            return {
                status: "running" as const,
                statusLabel: "Ongoing",
                badgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200",
                infoLabel: "Contest is live. Submissions are open.",
                remaining: `${formatDuration(endMs - nowMs)} remaining`,
                isRunning: true,
            };
        }

        return {
            status: "ended" as const,
            statusLabel: "Ended",
            badgeClasses: "bg-rose-50 text-rose-700 border-rose-200",
            infoLabel: "Contest has ended. Submissions are closed.",
            remaining: "",
            isRunning: false,
        };
    }, [contest, now]);

    const resetMessages = () => {
        setMessage(null);
        setError(null);
    };

    const pickLatestSubmittedAt = (
        resp: SubmitResponse | null | undefined
    ): string | null => {
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

    const submitDisabled =
        submitting || !contestState.isRunning || (!showFlag && !showText);

    // --- Styling tokens (match PracticeAnswerSubmit) ---
    const typeBadge = useMemo(() => {
        if (solutionTypeLabel === "Flag") return "Flag";
        if (solutionTypeLabel === "Procedure") return "Procedure";
        if (solutionTypeLabel === "Flag and Procedure") return "Flag + Procedure";
        return "Competition";
    }, [solutionTypeLabel]);

    return (
        <aside className="min-w-0 w-full flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header (same style as PracticeAnswerSubmit header) */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                            Contest Status
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
              <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${contestState.badgeClasses}`}
              >
                {contestState.statusLabel}
              </span>

                            {contestState.remaining && (
                                <span className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs text-white">
                  {contestState.remaining}
                </span>
                            )}
                        </div>

                        {/* Info + last submission (kept functionality, subtle) */}
                        <div className="text-xs text-slate-500">
                            {contestState.infoLabel}
                            {lastSubmittedAt ? (
                                <>
                                    {" "}
                                    • Last:{" "}
                                    <span className="font-medium text-slate-700">
                    {new Date(lastSubmittedAt).toLocaleString()}
                  </span>
                                </>
                            ) : null}
                        </div>
                    </div>

                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {typeBadge}
          </span>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
                {(error || message) && (
                    <div
                        className={`rounded-lg border px-3 py-2 text-sm ${
                            error
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        }`}
                    >
                        {error ?? message}
                    </div>
                )}

                {showFlag && (
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Flag
                            </div>
                            <button
                                type="button"
                                onClick={() => setFlagText("")}
                                disabled={submitting || !flagText}
                                className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-slate-300">
                            <input
                                type="text"
                                value={flagText}
                                onChange={(e) => setFlagText(e.target.value)}
                                placeholder="flag{example_flag_here}"
                                disabled={submitting || !contestState.isRunning}
                                className="w-full bg-transparent px-3 py-3 text-sm font-mono text-slate-900 outline-none"
                            />
                        </div>

                        <div className="text-xs text-slate-500">
                            Flags are usually case-sensitive. Do not share flags with others.
                        </div>
                    </section>
                )}

                {showText && (
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Procedure
                            </div>
                            <button
                                type="button"
                                onClick={() => setSolutionText("")}
                                disabled={submitting || !solutionText}
                                className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-slate-300">
              <textarea
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  placeholder="Describe your approach, reasoning, or full solution..."
                  disabled={submitting || !contestState.isRunning}
                  className="h-56 w-full resize-none bg-transparent px-3 py-3 text-sm font-mono text-slate-900 outline-none"
              />
                        </div>

                        <div className="text-xs text-slate-500">
                            Keep your explanation clear and concise. Do not paste sensitive data.
                        </div>
                    </section>
                )}
            </div>

            {(showFlag || showText) && (
                <div className="px-4 py-3 border-t border-slate-200 bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={submitDisabled}
                        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        {submitting
                            ? "Submitting…"
                            : contestState.isRunning
                                ? "Submit"
                                : "Submissions Closed"}
                    </button>
                </div>
            )}
        </aside>
    );
};

export default CompetitionAnswerSection;
