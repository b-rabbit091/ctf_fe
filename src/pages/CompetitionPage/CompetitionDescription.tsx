// src/pages/CompetePage/CompetitionDescription.tsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Challenge, ContestMeta} from "./types";
import {formatDuration} from "../../utils/time";
import {FiClock, FiFileText, FiHash} from "react-icons/fi";

interface Props {
    challenge: Challenge;
}

const isNonEmpty = (v?: string | null) => (v ?? "").trim().length > 0;

const FIVE_MIN_MS = 5 * 60 * 1000;

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

const CompetitionDescription: React.FC<Props> = ({challenge}) => {
    const contest: ContestMeta | null | undefined = (challenge as any).active_contest;

    const [now, setNow] = useState<Date>(() => new Date());
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const contestState = useMemo(() => {
        if (!contest) {
            return {
                status: "NO_CONTEST" as const,
                label: "No Active Contest",
                remainingLabel: "This problem is not attached to any contest.",
                remainingMs: null as number | null,
                isRunning: false,
            };
        }

        const start = safeDate(contest.start_time);
        const end = safeDate(contest.end_time);

        if (!start || !end) {
            return {
                status: "SCHEDULE_UNKNOWN" as const,
                label: "Scheduled",
                remainingLabel: "Contest schedule is not available.",
                remainingMs: null as number | null,
                isRunning: false,
            };
        }

        const nowMs = now.getTime();
        const startMs = start.getTime();
        const endMs = end.getTime();

        if (nowMs < startMs) {
            const ms = startMs - nowMs;
            return {
                status: "UPCOMING" as const,
                label: "Upcoming",
                remainingLabel: `${formatDuration(ms)} until start`,
                remainingMs: ms,
                isRunning: false,
            };
        }

        if (nowMs >= startMs && nowMs < endMs) {
            const ms = endMs - nowMs;
            return {
                status: "ONGOING" as const,
                label: "Ongoing",
                remainingLabel: `${formatDuration(ms)} remaining`,
                remainingMs: ms,
                isRunning: true,
            };
        }

        return {
            status: "ENDED" as const,
            label: "Ended",
            remainingLabel: "Contest has ended",
            remainingMs: 0,
            isRunning: false,
        };
    }, [contest, now]);

    const urgent =
        contestState.status === "ONGOING" &&
        typeof contestState.remainingMs === "number" &&
        contestState.remainingMs > 0 &&
        contestState.remainingMs <= FIVE_MIN_MS;

    const categoryLabel = (challenge as any).category?.name || "Uncategorized";
    const difficultyLabel = (challenge as any).difficulty?.level || "N/A";

    // LeetCode-ish, minimal: simple card, subtle borders, sticky header, compact sections
    const shell = "w-full rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden";
    const header = "px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40";
    const body = "px-4 sm:px-5 py-4";
    const h1 = "text-xl sm:text-2xl md:text-3xl font-normal tracking-tight text-slate-800";
    const metaRow = "mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600";
    const pillBase = "inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1 text-xs sm:text-sm";
    const sec = "pt-4 pb-5 border-b border-slate-200/70 last:border-b-0";
    const secTitle = "text-sm sm:text-base font-normal text-slate-800";
    const text = "mt-2 text-sm sm:text-base leading-relaxed text-slate-700 whitespace-pre-wrap";
    const code = "mt-2 rounded-xl ring-1 ring-slate-200/60 bg-white/70 px-4 py-3 font-mono text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap overflow-auto";

    const statusTone = (() => {
        if (contestState.status === "ONGOING") return urgent ? "ring-amber-200/60 bg-amber-50/70 text-amber-800" : "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700";
        if (contestState.status === "UPCOMING") return "ring-sky-200/60 bg-sky-50/70 text-sky-700";
        return "ring-slate-200/60 bg-slate-100/70 text-slate-700";
    })();

    return (
        <div className="text-slate-900">
            <div className={shell}>
                {/* Header (LeetCode-ish: title + small meta + time pill) */}
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

                                <span>
                                    <span className="text-slate-500">Difficulty:</span>{" "}
                                    <span className="text-slate-700">{difficultyLabel}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cx(pillBase, statusTone, urgent ? "animate-pulse" : "")}>
                                <FiClock size={14} />
                                {contest?.name ? (
                                    <span className="max-w-[16rem] truncate">{contest.name}</span>
                                ) : (
                                    <span>{contestState.label}</span>
                                )}
                                <span className="text-slate-300">•</span>
                                <span>{contestState.remainingLabel}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className={body}>
                    {isNonEmpty((challenge as any).description) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Description</h2>
                            <div className={text}>{(challenge as any).description}</div>
                        </section>
                    ) : null}

                    {isNonEmpty((challenge as any).constraints) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Constraints</h2>
                            <div className={text}>{(challenge as any).constraints}</div>
                        </section>
                    ) : null}

                    {isNonEmpty((challenge as any).input_format) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Input</h2>
                            <div className={text}>{(challenge as any).input_format}</div>
                        </section>
                    ) : null}

                    {isNonEmpty((challenge as any).output_format) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Output</h2>
                            <div className={text}>{(challenge as any).output_format}</div>
                        </section>
                    ) : null}

                    {isNonEmpty((challenge as any).sample_input) || isNonEmpty((challenge as any).sample_output) ? (
                        <section className={sec}>
                            <h2 className={secTitle}>Examples</h2>

                            <div className="mt-3 grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-500">Example Input</div>
                                    <div className={code}>{(challenge as any).sample_input || "—"}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-500">Example Output</div>
                                    <div className={code}>{(challenge as any).sample_output || "—"}</div>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {(challenge as any).files && (challenge as any).files.length > 0 ? (
                        <section className={cx(sec, "pb-2")}>
                            <h2 className={secTitle}>Files</h2>

                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {(challenge as any).files
                                    .filter((f: any) => f?.url && isSafeUrl(String(f.url)))
                                    .map((file: any) => (
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
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-200/60 bg-slate-100/70 text-xs font-normal text-slate-700">
                                                <FiFileText size={16} />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="truncate text-sm sm:text-base font-normal text-slate-800">
                                                    {file.name || "File"}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {safeExt(file.name)} • Open in new tab
                                                </div>
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

export default CompetitionDescription;
