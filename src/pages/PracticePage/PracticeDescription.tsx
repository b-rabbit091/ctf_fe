import React from "react";
import type { Challenge } from "./types";

interface Props {
    challenge: Challenge;
}

const isNonEmpty = (v?: string | null) => (v ?? "").trim().length > 0;

const PracticeDescription: React.FC<Props> = ({ challenge }) => {
    const categoryLabel = (challenge as any).category?.name || "Uncategorized";
    const difficultyLabel = (challenge as any).difficulty?.level || "N/A";
    const solutionTypeLabel = (challenge as any).solution_type?.type || "Solution";

    const difficultyLower = String(difficultyLabel || "").toLowerCase();
    const difficultyPill =
        difficultyLower === "easy"
            ? "bg-emerald-100/70 text-emerald-700 border-emerald-200/70"
            : difficultyLower === "medium" || difficultyLower === "moderate"
                ? "bg-amber-100/70 text-amber-700 border-amber-200/70"
                : difficultyLower === "hard"
                    ? "bg-rose-100/70 text-rose-700 border-rose-200/70"
                    : "bg-slate-100/70 text-slate-600 border-slate-200/70";

    const cardShell =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    // Match CompetitionDescription (tight spacing)
    const sectionTitle = "text-base md:text-lg font-normal text-slate-700";
    const section = "pt-4 pb-5 border-b border-slate-200 last:border-b-0";
    const firstSection = "pt-2 pb-5 border-b border-slate-200 last:border-b-0";
    const bodyText =
        "mt-1 text-sm sm:text-base md:text-[17px] leading-relaxed text-slate-600 whitespace-pre-wrap";
    const mono =
        "mt-2 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 font-mono text-sm md:text-base leading-relaxed text-slate-700 whitespace-pre-wrap overflow-auto";

    // Glassy pill (same vibe as CompetitionList/CompetitionDescription)
    const pill =
        "inline-flex items-center rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal";

    return (
        <div className="text-slate-900">
            <div className={cardShell}>
                {/* Header block (tight like CompetitionDescription) */}
                <div className="px-6 md:px-7 pt-5 pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            {/* Subtle meta row */}
                            <div className="mb-2 flex flex-wrap items-center gap-2.5">
                                <span className={`${pill} bg-slate-100/60 text-slate-600 border-slate-200/70`}>
                                    {categoryLabel}
                                </span>

                                <span className={`${pill} ${difficultyPill}`}>{difficultyLabel}</span>

                                <span className={`${pill} bg-indigo-100/70 text-indigo-700 border-indigo-200/70`}>
                                    {(solutionTypeLabel || "Solution").toUpperCase()}
                                </span>

                                <span className={`${pill} bg-emerald-100/70 text-emerald-700 border-emerald-200/70`}>
                                    PRACTICE
                                </span>
                            </div>

                            {/* Title (same as CompetitionDescription) */}
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight leading-tight">
                                {challenge.title}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Divider line (no extra spacing) */}
                <div className="h-px w-full bg-slate-200/70" />

                {/* Body sections (tight top padding) */}
                <div className="px-6 md:px-7 pt-1 pb-4">
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

                            <div className="mt-4 space-y-5">
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
                        <section className="pt-4">
                            <h2 className={sectionTitle}>Files</h2>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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

export default PracticeDescription;
