// src/pages/CompetePage/CompetitionDescription.tsx
import React, {useEffect, useMemo, useState} from "react";
import {Challenge, ContestMeta} from "./types";
import {formatDuration} from "../../utils/time";

interface Props {
    challenge: Challenge;
}

const isNonEmpty = (v?: string | null) => (v ?? "").trim().length > 0;

const FIVE_MIN_MS = 5 * 60 * 1000;

const CompetitionDescription: React.FC<Props> = ({challenge}) => {
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
                remainingMs: null as number | null,
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
            const ms = startMs - nowMs;
            return {
                statusLabel: "Upcoming",
                badgeClasses: "bg-sky-50 text-sky-700 border-sky-200",
                remainingLabel: formatDuration(ms) + " until start",
                remainingMs: ms,
                isRunning: false,
                isUpcoming: true,
                isEnded: false,
            };
        }

        if (nowMs >= startMs && nowMs < endMs) {
            const ms = endMs - nowMs;
            return {
                statusLabel: "Ongoing",
                badgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200",
                remainingLabel: formatDuration(ms) + " remaining",
                remainingMs: ms,
                isRunning: true,
                isUpcoming: false,
                isEnded: false,
            };
        }

        return {
            statusLabel: "Ended",
            badgeClasses: "bg-rose-50 text-rose-700 border-rose-200",
            remainingLabel: "Contest has ended",
            remainingMs: 0,
            isRunning: false,
            isUpcoming: false,
            isEnded: true,
        };
    }, [contest, now]);

    const urgent =
        contestState.isRunning &&
        typeof contestState.remainingMs === "number" &&
        contestState.remainingMs > 0 &&
        contestState.remainingMs <= FIVE_MIN_MS;

    const categoryLabel = challenge.category?.name || "Uncategorized";
    const difficultyLabel = challenge.difficulty?.level || "N/A";

    const pill =
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm md:text-base font-medium";

    const sectionTitle = "text-base md:text-lg font-semibold text-slate-900";
    const section = "py-5 border-b border-slate-200 last:border-b-0";
    const bodyText = "mt-2 text-base md:text-lg leading-7 text-slate-800 whitespace-pre-wrap";
    const mono =
        "mt-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm md:text-base leading-relaxed text-slate-900 whitespace-pre-wrap overflow-auto";

    return (
        <div className="text-slate-900">

            {/* Main content */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

                {/* Header block  */}
                <div className="px-6 md:px-7 pt-5 pb-5 border-b border-slate-200">
                    {/* Contest name (above title, subtle but prominent) */}
                    <div className="mb-2 max-w-full">
                        {contest?.name ? (
                            <div className="flex items-center gap-2 text-sm sm:text-base md:text-lg text-slate-600">
                                <span className="text-slate-500">Contest</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-slate-800 truncate">
                    {contest.name}
                </span>
                            </div>
                        ) : (
                            <div className="text-sm sm:text-base md:text-lg text-slate-500">
                                No contest attached
                            </div>
                        )}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
                                {challenge.title}
                            </h1>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm md:text-base text-slate-600">
                <span className="inline-flex items-center">
                    <span className="font-medium text-slate-700">Category:</span>
                    <span className="ml-1">{categoryLabel}</span>
                </span>
                                <span className="text-slate-300">•</span>
                                <span className="inline-flex items-center">
                    <span className="font-medium text-slate-700">Difficulty:</span>
                    <span className="ml-1">{difficultyLabel}</span>
                </span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Body sections */}
                <div className="px-6 md:px-7 py-4">
                    {isNonEmpty(challenge.description) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Description</h2>
                            <div className={bodyText}>{challenge.description}</div>
                        </section>
                    )}

                    {isNonEmpty(challenge.constraints) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Constraints</h2>
                            <div className={bodyText}>{challenge.constraints}</div>
                        </section>
                    )}

                    {isNonEmpty(challenge.input_format) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Input</h2>
                            <div className={bodyText}>{challenge.input_format}</div>
                        </section>
                    )}

                    {isNonEmpty(challenge.output_format) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Output</h2>
                            <div className={bodyText}>{challenge.output_format}</div>
                        </section>
                    )}

                    {(isNonEmpty(challenge.sample_input) || isNonEmpty(challenge.sample_output)) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Examples</h2>

                            <div className="mt-4 space-y-5">
                                <div>
                                    <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                                        Example Input
                                    </div>
                                    <div className={mono}>{challenge.sample_input || "—"}</div>
                                </div>

                                <div>
                                    <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                                        Example Output
                                    </div>
                                    <div className={mono}>{challenge.sample_output || "—"}</div>
                                </div>
                            </div>
                        </section>
                    )}

                    {challenge.files && challenge.files.length > 0 && (
                        <section className="pt-5">
                            <h2 className={sectionTitle}>Files</h2>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {challenge.files.map((file) => (
                                    <a
                                        key={file.url}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        <div
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">
                                            {file.name?.split(".").pop()?.toUpperCase() || "FILE"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-medium text-slate-900">{file.name}</div>
                                            <div className="text-sm text-slate-500">Open in new tab</div>
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
