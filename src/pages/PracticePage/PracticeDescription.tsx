import React, {useMemo} from "react";
import {FiFileText, FiHash} from "react-icons/fi";

import type {Challenge, FileType} from "./types";

interface Props {
    challenge: Challenge;
}

const isNonEmpty = (v?: string | null) => (v ?? "").trim().length > 0;

const safeDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

const safeExt = (name?: string) => {
    const raw = (name || "").split(".").pop() || "FILE";
    const cleaned = raw.replace(/[^a-z0-9]/gi, "").toUpperCase();
    return cleaned.slice(0, 6) || "FILE";
};

const isSafeUrl = (url: string) => {
    try {
        const u = new URL(url, window.location.origin);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const safeFiles = (files?: FileType[] | null): FileType[] => (Array.isArray(files) ? files : []);

const PracticeDescription: React.FC<Props> = ({challenge}) => {
    const categoryLabel = challenge.category?.name || "Uncategorized";
    const difficultyLabel = challenge.difficulty?.level || "N/A";
    const solutionTypeLabel = challenge.solution_type?.type || "Solution";

    const createdLabel = useMemo(() => {
        const d = safeDate(challenge.created_at ?? null);
        return d
            ? d.toLocaleDateString(undefined, {year: "numeric", month: "long", day: "numeric"})
            : null;
    }, [challenge.created_at]);

    const shell =
        "w-full rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden";
    const header = "px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40";
    const body = "px-4 sm:px-5 py-4";
    const h1 = "text-xl sm:text-2xl md:text-3xl font-normal tracking-tight text-slate-800";
    const metaRow = "mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600";
    const pillBase = "inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1 text-xs sm:text-sm";
    const sec = "pt-4 pb-5 border-b border-slate-200/70 last:border-b-0";
    const secTitle = "text-sm sm:text-base font-normal text-slate-800";
    const text = "mt-2 text-sm sm:text-base leading-relaxed text-slate-700 whitespace-pre-wrap";
    const code =
        "mt-2 rounded-xl ring-1 ring-slate-200/60 bg-white/70 px-4 py-3 font-mono text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words overflow-auto";

    const difficultyTone = useMemo(() => {
        const d = String(difficultyLabel || "").toLowerCase();
        if (d === "easy") return "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700";
        if (d === "medium" || d === "moderate") return "ring-amber-200/60 bg-amber-50/70 text-amber-800";
        if (d === "hard") return "ring-rose-200/60 bg-rose-50/70 text-rose-700";
        return "ring-slate-200/60 bg-slate-100/70 text-slate-700";
    }, [difficultyLabel]);

    return (
        <div className="text-slate-900">
            <div className={shell}>
                <div className={header}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className={cx(h1, "truncate")}>{challenge.title}</h1>

                            <div className={metaRow}>
                                <span className={cx(pillBase, "ring-slate-200/60 bg-slate-100/70 text-slate-700")}>
                                    <FiHash size={14} />
                                    {challenge.id}
                                </span>

                                <span className="text-slate-300">•</span>

                                <span>
                                    <span className="text-slate-500">Category:</span>{" "}
                                    <span className="text-slate-700">{categoryLabel}</span>
                                </span>

                                <span className="text-slate-300">•</span>

                                <span className={cx(pillBase, difficultyTone)}>{difficultyLabel}</span>

                                <span className="text-slate-300">•</span>

                                <span className={cx(pillBase, "ring-slate-200/60 bg-white/70 text-slate-700")}>
                                    {solutionTypeLabel}
                                </span>

                                {createdLabel ? (
                                    <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-500">Created:</span>
                                        <span className="text-slate-700">{createdLabel}</span>
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <span className={cx(pillBase, "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700")}>
                            PRACTICE
                        </span>
                    </div>
                </div>

                <div className={body}>
                    {isNonEmpty(challenge.description) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Description</h2>
                            <div className={text}>{challenge.description}</div>
                        </section>
                    ) : null}

                    {isNonEmpty(challenge.constraints) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Constraints</h2>
                            <div className={text}>{challenge.constraints}</div>
                        </section>
                    ) : null}

                    {isNonEmpty(challenge.input_format) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Input</h2>
                            <div className={text}>{challenge.input_format}</div>
                        </section>
                    ) : null}

                    {isNonEmpty(challenge.output_format) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Output</h2>
                            <div className={text}>{challenge.output_format}</div>
                        </section>
                    ) : null}

                    {isNonEmpty(challenge.sample_input) || isNonEmpty(challenge.sample_output) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Examples</h2>

                            <div className="mt-3 grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-500">Example Input</div>
                                    <div className={code}>{challenge.sample_input || "—"}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-500">Example Output</div>
                                    <div className={code}>{challenge.sample_output || "—"}</div>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {safeFiles(challenge.files).length > 0 ? (
                        <section className={cx(sec, "pb-2")}>
                            <h2 className={secTitle}>Files</h2>

                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {safeFiles(challenge.files)
                                    .filter((file) => !!file?.url && isSafeUrl(String(file.url)))
                                    .map((file) => (
                                        <a
                                            key={String(file.url)}
                                            href={String(file.url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cx(
                                                "flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3",
                                                "ring-1 ring-slate-200/60 hover:bg-white/90 transition",
                                                "min-w-0"
                                            )}
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-200/60 bg-slate-100/70 text-slate-700">
                                                <FiFileText size={16} />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="truncate text-sm sm:text-base font-normal text-slate-800">
                                                    {file.name || "File"}
                                                </div>
                                                <div className="text-xs text-slate-500">{safeExt(file.name)} • Open in new tab</div>
                                            </div>
                                        </a>
                                    ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default PracticeDescription;
