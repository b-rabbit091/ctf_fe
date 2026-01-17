import React from "react";
import type {Challenge} from "./types";

interface Props {
    challenge: Challenge;
}

const isNonEmpty = (v?: string | null) => (v ?? "").trim().length > 0;

const PracticeDescription: React.FC<Props> = ({challenge}) => {
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

    // Bigger but still clean (not “too bold”)
    const pill =
        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm md:text-base font-medium";

    const sectionTitle =
        "text-base md:text-lg font-semibold text-slate-900";

    const section =
        "py-7 border-b border-slate-200 last:border-b-0";

    const bodyText =
        "mt-2 text-base md:text-lg leading-7 text-slate-800 whitespace-pre-wrap";

    const mono =
        "mt-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm md:text-base leading-relaxed text-slate-900 whitespace-pre-wrap overflow-auto";

    return (
        <div className="text-slate-900">
            {/* Top meta row (minimal like LeetCode) */}
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
                <span className={`${pill} border-slate-200 bg-white text-slate-700`}>
                    {categoryLabel}
                </span>
                <span className={`${pill} ${difficultyTone}`}>
                    {difficultyLabel}
                </span>
                <span className={`${pill} border-indigo-200 bg-indigo-50 text-indigo-700`}>
                    {solutionTypeLabel}
                </span>
                <span className={`${pill} border-emerald-200 bg-emerald-50 text-emerald-700`}>
                    Practice
                </span>
            </div>

            {/* Main content – single column */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-6 md:px-7 py-6">
                    {/* Title (styled) */}
                    <div className="pb-6 border-b border-slate-200">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
                            {challenge.title}
                        </h1>
                    </div>

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

                    {/* Files */}
                    {challenge.files && challenge.files.length > 0 && (
                        <section className="pt-7">
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

export default PracticeDescription;
