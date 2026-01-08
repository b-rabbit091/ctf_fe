// src/pages/CompetePage/CompetitionDescription.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Challenge, ContestMeta } from "./types";
import { formatDuration } from "../../utils/time";

interface Props {
    challenge: Challenge;
}

const isNonEmpty = (v?: string | null) => (v ?? "").trim().length > 0;

const CompetitionDescription: React.FC<Props> = ({ challenge }) => {
    const contest: ContestMeta | null | undefined = challenge.active_contest;

    // timer state
    const [now, setNow] = useState<Date>(new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    // derive state from contest
    const contestState = useMemo(() => {
        if (!contest) {
            return {
                statusLabel: "No Active Contest",
                badgeClasses: "bg-slate-50 text-slate-600 border-slate-200",
                remainingLabel: "This problem is not currently attached to any contest.",
                isRunning: false,
                isUpcoming: false,
                isEnded: true,
            };
        }

        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);
        const nowMs = now.getTime();
        const startMs = start.getTime();
        const endMs = end.getTime();

        if (nowMs < startMs) {
            return {
                statusLabel: "Upcoming",
                badgeClasses: "bg-sky-50 text-sky-700 border-sky-200",
                remainingLabel: formatDuration(startMs - nowMs) + " until start",
                isRunning: false,
                isUpcoming: true,
                isEnded: false,
            };
        }

        if (nowMs >= startMs && nowMs < endMs) {
            return {
                statusLabel: "Ongoing",
                badgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200",
                remainingLabel: formatDuration(endMs - nowMs) + " remaining",
                isRunning: true,
                isUpcoming: false,
                isEnded: false,
            };
        }

        return {
            statusLabel: "Ended",
            badgeClasses: "bg-rose-50 text-rose-700 border-rose-200",
            remainingLabel: "Contest has ended",
            isRunning: false,
            isUpcoming: false,
            isEnded: true,
        };
    }, [contest, now]);

    const categoryLabel = challenge.category?.name || "Uncategorized";
    const difficultyLabel = challenge.difficulty?.level || "N/A";
    const solutionTypeLabel = challenge.solution_type?.type || "Solution";

    const difficultyTone =
        difficultyLabel.toLowerCase() === "easy"
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : difficultyLabel.toLowerCase() === "medium"
                ? "text-amber-700 bg-amber-50 border-amber-200"
                : difficultyLabel.toLowerCase() === "hard"
                    ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-slate-700 bg-slate-50 border-slate-200";

    const pill =
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";

    const sectionTitle = "text-sm font-semibold text-slate-900";

    const section = "py-6 border-b border-slate-200 last:border-b-0";

    const bodyText =
        "mt-2 text-[15px] leading-7 text-slate-800 whitespace-pre-wrap";

    const mono =
        "mt-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-900 whitespace-pre-wrap overflow-auto";

    return (
        <div className="text-slate-900">
            {/* Top meta row (same as PracticeDescription) */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`${pill} border-slate-200 bg-white text-slate-700`}>
          {categoryLabel}
        </span>
                <span className={`${pill} ${difficultyTone}`}>{difficultyLabel}</span>
                <span className={`${pill} border-indigo-200 bg-indigo-50 text-indigo-700`}>
          {solutionTypeLabel}
        </span>
                <span className={`${pill} border-amber-200 bg-amber-50 text-amber-700`}>
          Competition
        </span>

                {/* Contest state badge (kept functionality, styled as a pill) */}
                <span className={`${pill} ${contestState.badgeClasses}`}>
          {contestState.statusLabel}
        </span>

                {/* Countdown / remaining (kept, subtle pill) */}
                <span className={`${pill} border-slate-200 bg-slate-50 text-slate-700 font-mono`}>
          {contestState.remainingLabel}
        </span>
            </div>

            {/* Main content – same card/sections as PracticeDescription */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-6 py-5">
                    {/* Contest details (kept, but minimal) */}
                    {contest && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Contest</h2>

                            <div className="mt-2 text-[15px] leading-7 text-slate-800">
                                <div className="font-medium text-slate-900">
                                    {contest?.name || "No contest attached"}
                                </div>

                                {isNonEmpty(contest.description) && (
                                    <div className="mt-1 whitespace-pre-wrap text-slate-700">
                                        {contest.description}
                                    </div>
                                )}

                                <div className="mt-2 text-sm text-slate-600">
                                    <span className="font-medium text-slate-800">Starts:</span>{" "}
                                    {new Date(contest.start_time).toLocaleString()}
                                    <span className="mx-2 text-slate-400">•</span>
                                    <span className="font-medium text-slate-800">Ends:</span>{" "}
                                    {new Date(contest.end_time).toLocaleString()}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Description */}
                    {isNonEmpty(challenge.description) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Description</h2>
                            <div className={bodyText}>{challenge.description}</div>
                        </section>
                    )}

                    {/* Constraints */}
                    {isNonEmpty(challenge.constraints) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Constraints</h2>
                            <div className={bodyText}>{challenge.constraints}</div>
                        </section>
                    )}

                    {/* Input */}
                    {isNonEmpty(challenge.input_format) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Input</h2>
                            <div className={bodyText}>{challenge.input_format}</div>
                        </section>
                    )}

                    {/* Output */}
                    {isNonEmpty(challenge.output_format) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Output</h2>
                            <div className={bodyText}>{challenge.output_format}</div>
                        </section>
                    )}

                    {/* Examples */}
                    {(isNonEmpty(challenge.sample_input) || isNonEmpty(challenge.sample_output)) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Examples</h2>

                            <div className="mt-3 space-y-4">
                                <div>
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                        Example Input
                                    </div>
                                    <div className={mono}>{challenge.sample_input || "—"}</div>
                                </div>

                                <div>
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                        Example Output
                                    </div>
                                    <div className={mono}>{challenge.sample_output || "—"}</div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Files */}
                    {challenge.files && challenge.files.length > 0 && (
                        <section className="pt-6">
                            <h2 className={sectionTitle}>Files</h2>

                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {challenge.files.map((file) => (
                                    <a
                                        key={file.url}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">
                                            {file.name?.split(".").pop()?.toUpperCase() || "FILE"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-medium text-slate-900">
                                                {file.name}
                                            </div>
                                            <div className="text-xs text-slate-500">Open in new tab</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompetitionDescription;
