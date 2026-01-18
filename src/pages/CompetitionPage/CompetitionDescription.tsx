// src/pages/CompetePage/CompetitionDescription.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Challenge, ContestMeta } from "./types";
import { formatDuration } from "../../utils/time";

interface Props {
    challenge: Challenge;
}

const isNonEmpty = (v?: string | null) => (v ?? "").trim().length > 0;

const FIVE_MIN_MS = 5 * 60 * 1000;

const CompetitionDescription: React.FC<Props> = ({ challenge }) => {
    const contest: ContestMeta | null | undefined = (challenge as any).active_contest;

    const [now, setNow] = useState<Date>(new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const contestState = useMemo(() => {
        if (!contest) {
            return {
                statusLabel: "No Active Contest",
                badgeClasses: "bg-slate-100/70 text-slate-600 border-slate-200/70",
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

        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
            return {
                statusLabel: "Scheduled",
                badgeClasses: "bg-slate-100/70 text-slate-600 border-slate-200/70",
                remainingLabel: "Contest schedule is not available.",
                remainingMs: null as number | null,
                isRunning: false,
                isUpcoming: true,
                isEnded: false,
            };
        }

        if (nowMs < startMs) {
            const ms = startMs - nowMs;
            return {
                statusLabel: "Upcoming",
                badgeClasses: "bg-sky-100/70 text-sky-700 border-sky-200/70",
                remainingLabel: `${formatDuration(ms)} until start`,
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
                badgeClasses: "bg-emerald-100/70 text-emerald-700 border-emerald-200/70",
                remainingLabel: `${formatDuration(ms)} remaining`,
                remainingMs: ms,
                isRunning: true,
                isUpcoming: false,
                isEnded: false,
            };
        }

        return {
            statusLabel: "Ended",
            badgeClasses: "bg-slate-100/70 text-slate-600 border-slate-200/70",
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

    const categoryLabel = (challenge as any).category?.name || "Uncategorized";
    const difficultyLabel = (challenge as any).difficulty?.level || "N/A";

    const sectionTitle = "text-base md:text-lg font-normal text-slate-700";

    // tighter sections
    const section = "pt-3 pb-4 border-b border-slate-200 last:border-b-0";
    const firstSection = "pt-2 pb-4 border-b border-slate-200 last:border-b-0";

    const bodyText =
        "mt-1 text-sm sm:text-base md:text-[17px] leading-relaxed text-slate-600 whitespace-pre-wrap";

    const mono =
        "mt-2 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 font-mono text-sm md:text-base leading-relaxed text-slate-700 whitespace-pre-wrap overflow-auto";

    const cardShell =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    return (
        <div className="text-slate-900">
            <div className={cardShell}>
                {/* Header: contest name -> timer -> title/meta (no status pill, no extra gaps) */}
                {/* Header block */}
                <div className="px-6 md:px-7 pt-4 pb-3">
                    <div className="space-y-2">
                        {/* Contest info box (name + timer together) */}
                        <div
                            className={[
                                "w-fit max-w-full rounded-2xl border border-white/30 bg-white/55 px-4 py-3",
                                "text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl",
                                "ring-1 ring-slate-200/50",
                                urgent ? "animate-pulse" : "",
                            ].join(" ")}
                        >
                            {/* Contest name */}
                            {contest?.name ? (
                                <div className="flex min-w-0 items-start gap-2">
                                    <span className="shrink-0 text-slate-500">Contest</span>
                                    <span className="shrink-0 text-slate-300">•</span>
                                    <span className="min-w-0 font-normal text-slate-700 line-clamp-2">
                        {contest.name}
                    </span>
                                </div>
                            ) : (
                                <div className="text-slate-500">No contest attached</div>
                            )}

                            {/* Timer */}
                            <div className="mt-1 text-slate-600">
                                <span className="text-slate-500">Time:  {contestState.remainingLabel}</span>{" "}

                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight leading-tight">
                            {challenge.title}
                        </h1>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-2 text-sm md:text-base text-slate-600">
            <span className="inline-flex items-center">
                <span className="text-slate-500">Category:</span>
                <span className="ml-1 text-slate-600">{categoryLabel}</span>
            </span>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center">
                <span className="text-slate-500">Difficulty:</span>
                <span className="ml-1 text-slate-600">{difficultyLabel}</span>
            </span>
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-slate-200/70" />

                {/* Body */}
                <div className="px-6 md:px-7 pt-2 pb-4">
                    {isNonEmpty((challenge as any).description) && (
                        <section className={firstSection}>
                            <h2 className={sectionTitle}>Description</h2>
                            <div className={bodyText}>{(challenge as any).description}</div>
                        </section>
                    )}

                    {isNonEmpty((challenge as any).constraints) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Constraints</h2>
                            <div className={bodyText}>{(challenge as any).constraints}</div>
                        </section>
                    )}

                    {isNonEmpty((challenge as any).input_format) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Input</h2>
                            <div className={bodyText}>{(challenge as any).input_format}</div>
                        </section>
                    )}

                    {isNonEmpty((challenge as any).output_format) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Output</h2>
                            <div className={bodyText}>{(challenge as any).output_format}</div>
                        </section>
                    )}

                    {(isNonEmpty((challenge as any).sample_input) || isNonEmpty((challenge as any).sample_output)) && (
                        <section className={section}>
                            <h2 className={sectionTitle}>Examples</h2>

                            <div className="mt-3 space-y-4">
                                <div>
                                    <div className="text-xs sm:text-sm font-normal text-slate-600 uppercase tracking-wide">
                                        Example Input
                                    </div>
                                    <div className={mono}>{(challenge as any).sample_input || "—"}</div>
                                </div>

                                <div>
                                    <div className="text-xs sm:text-sm font-normal text-slate-600 uppercase tracking-wide">
                                        Example Output
                                    </div>
                                    <div className={mono}>{(challenge as any).sample_output || "—"}</div>
                                </div>
                            </div>
                        </section>
                    )}

                    {(challenge as any).files && (challenge as any).files.length > 0 && (
                        <section className="pt-3">
                            <h2 className={sectionTitle}>Files</h2>

                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {(challenge as any).files.map((file: any) => (
                                    <a
                                        key={file.url}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/55 px-4 py-3 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50 transition hover:bg-white/70"
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-100/60 text-xs font-normal text-slate-600">
                                            {file.name?.split(".").pop()?.toUpperCase() || "FILE"}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="truncate font-normal text-slate-700">{file.name}</div>
                                            <div className="text-xs sm:text-sm text-slate-500">Open in new tab</div>
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
