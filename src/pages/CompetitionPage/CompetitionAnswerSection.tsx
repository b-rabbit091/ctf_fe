import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Challenge} from "./types";
import {submitFlag, submitTextSolution} from "./api";
import {FiCheckCircle, FiAlertCircle, FiClock, FiZap, FiTrash2, FiSend} from "react-icons/fi";

interface Props {
    challenge: Challenge;
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const safeIso = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : iso;
};

const formatDuration = (ms: number): string => {
    if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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

const getSolutionTypeLabel = (challenge: Challenge) => (challenge.solution_type?.type || "").toLowerCase();

const pickLatestSubmittedAt = (resp?: SubmitResponse | null): string | null => {
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
    return safeIso(latest);
};

const clampText = (s: string, max = 10000) => (s.length > max ? s.slice(0, max) : s);

const CompetitionAnswerSection: React.FC<Props> = ({challenge}) => {
    const [solutionText, setSolutionText] = useState("");
    const [flagText, setFlagText] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [now, setNow] = useState(() => new Date());
    const [lastSubmittedAt, setLastSubmittedAt] = useState<string | null>(null);

    const alive = useRef(true);
    const busyRef = useRef(false);
    const msgTimer = useRef<number | null>(null);

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

    const contest = challenge.active_contest ?? null;

    const solutionType = useMemo(() => getSolutionTypeLabel(challenge), [challenge]);
    const showText = solutionType.includes("procedure");
    const showFlag = solutionType.includes("flag");

    const contestState = useMemo(() => {
        if (!contest) {
            return {isRunning: false, msLeft: 0, msTotal: 0, startMs: 0, endMs: 0};
        }
        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);
        const nowMs = now.getTime();
        const startMs = start.getTime();
        const endMs = end.getTime();

        const isRunning = Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs < endMs;
        const msLeft = isRunning ? Math.max(0, endMs - nowMs) : 0;
        const msTotal = Math.max(0, endMs - startMs);

        return {isRunning, msLeft, msTotal, startMs, endMs};
    }, [contest, now]);

    const resetMessages = useCallback(() => {
        setMessage(null);
        setError(null);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        msgTimer.current = null;
    }, []);

    const flash = useCallback((kind: "ok" | "err", text: string) => {
        if (kind === "ok") {
            setMessage(text);
            setError(null);
        } else {
            setError(text);
            setMessage(null);
        }

        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        msgTimer.current = window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
            setError(null);
        }, 4000);
    }, []);

    const canSubmit = useMemo(() => {
        if (!contest) return false;
        if (!contestState.isRunning) return false;
        if (!showFlag && !showText) return false;

        const hasFlag = showFlag && flagText.trim().length > 0;
        const hasText = showText && solutionText.trim().length > 0;
        return hasFlag || hasText;
    }, [contest, contestState.isRunning, showFlag, showText, flagText, solutionText]);

    const submitDisabled = submitting || !canSubmit;

    const handleSubmit = useCallback(async () => {
        resetMessages();

        if (!showFlag && !showText) {
            flash("err", "This challenge does not accept submissions.");
            return;
        }
        if (!contest) {
            flash("err", "This challenge is not attached to an active contest.");
            return;
        }
        if (!contestState.isRunning) {
            flash("err", "Submissions are not allowed at this time.");
            return;
        }

        const flag = clampText(flagText.trim(), 256);
        const proc = clampText(solutionText.trim(), 10000);

        if (!flag && !proc) {
            flash("err", "Cannot submit empty solution.");
            return;
        }

        if (busyRef.current) return;
        busyRef.current = true;
        setSubmitting(true);

        try {
            const times: string[] = [];

            if (showFlag && flag) {
                const resp = await submitFlag(challenge.id, flag);
                const latest = pickLatestSubmittedAt(resp);
                if (latest) times.push(latest);
                if (alive.current) setFlagText("");
            }

            if (showText && proc) {
                const resp = await submitTextSolution(challenge.id, proc);
                const latest = pickLatestSubmittedAt(resp);
                if (latest) times.push(latest);
                if (alive.current) setSolutionText("");
            }

            if (times.length) {
                let latest = times[0];
                let latestMs = new Date(latest).getTime();
                for (const iso of times) {
                    const ms = new Date(iso).getTime();
                    if (ms > latestMs) {
                        latestMs = ms;
                        latest = iso;
                    }
                }
                setLastSubmittedAt(latest);
            }

            flash("ok", "Submitted! Check Previous Submissions for status.");
        } catch (err: any) {
            console.error(err);
            flash("err", err?.message || "Submission failed.");
        } finally {
            busyRef.current = false;
            if (!alive.current) return;
            setSubmitting(false);
        }
    }, [
        resetMessages,
        flash,
        showFlag,
        showText,
        contest,
        contestState.isRunning,
        flagText,
        solutionText,
        challenge.id,
    ]);

    const handleClearAll = useCallback(() => {
        resetMessages();
        setFlagText("");
        setSolutionText("");
    }, [resetMessages]);

    /** -------------------- LeetCode-ish UI (right panel card) -------------------- **/
    const shell =
        "min-w-0 w-full rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden";

    const headerRow = "px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40";

    const pill = (tone: "emerald" | "amber" | "slate", text: string, icon?: React.ReactNode) => {
        const map: Record<string, string> = {
            emerald: "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700",
            amber: "ring-amber-200/60 bg-amber-50/70 text-amber-800",
            slate: "ring-slate-200/60 bg-slate-100/70 text-slate-700",
        };
        return (
            <span className={cx("inline-flex items-center gap-2 rounded-full ring-1 px-3 py-1 text-xs sm:text-sm", map[tone])}>
                {icon}
                {text}
            </span>
        );
    };

    const fieldWrap =
        "rounded-2xl ring-1 ring-slate-200/60 bg-white/70 overflow-hidden focus-within:ring-sky-200/70 focus-within:bg-white";

    const fieldHeader = "flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/60 bg-white/40";

    const monoInput =
        "w-full bg-transparent px-4 py-3 text-sm sm:text-base font-mono text-slate-800 outline-none placeholder:text-slate-400 disabled:text-slate-400";
    const monoTextarea =
        "w-full bg-transparent px-4 py-3 text-sm sm:text-base font-mono text-slate-800 outline-none placeholder:text-slate-400 disabled:text-slate-400 resize-none";

    const footerBar = "px-4 sm:px-5 py-4 border-t border-slate-200/70 bg-white/40";

    return (
        <aside className={shell}>
            {/* Header */}
            <div className={headerRow}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Submit</div>
                        <div className="mt-1 text-base sm:text-lg font-normal tracking-tight text-slate-700 truncate">
                            {challenge.title || "Challenge"}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {!contest ? pill("amber", "No active contest", <FiAlertCircle size={14} />) : null}
                        {contest && contestState.isRunning
                            ? pill("emerald", `Running • ${formatDuration(contestState.msLeft)}`, <FiClock size={14} />)
                            : contest
                                ? pill("amber", "Not running", <FiClock size={14} />)
                                : null}
                        {lastSubmittedAt ? pill("slate", `Last: ${new Date(lastSubmittedAt).toLocaleTimeString()}`) : null}
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {(error || message) ? (
                <div className="px-4 sm:px-5 pt-4">
                    {error ? (
                        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-normal tracking-tight">Submission blocked</p>
                                    <p className="mt-1 text-sm whitespace-pre-line break-words text-rose-700/90">{error}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {message ? (
                        <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800">
                            <div className="flex items-start gap-3">
                                <FiCheckCircle className="mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-normal tracking-tight">Submitted</p>
                                    <p className="mt-1 text-sm whitespace-pre-line break-words text-emerald-800/90">{message}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {/* Body */}
            <div className="px-4 sm:px-5 py-5 space-y-4">
                {/* LeetCode-ish “language/submit type” row (informational) */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-500">
                    <div className="inline-flex items-center gap-2">
                        <FiZap className="text-slate-400" />
                        <span className="text-slate-600">Submission types:</span>{" "}
                        <span className="font-medium text-slate-700">
                            {showFlag && showText ? "Flag + Procedure" : showFlag ? "Flag" : showText ? "Procedure" : "None"}
                        </span>
                    </div>
                    <div className="text-slate-500">
                        {contest ? (
                            <>
                                Window:{" "}
                                <span className="font-medium text-slate-700">
                                    {new Date(contest.start_time).toLocaleTimeString()} – {new Date(contest.end_time).toLocaleTimeString()}
                                </span>
                            </>
                        ) : (
                            <span className="font-medium text-slate-700">Attach to a contest to submit</span>
                        )}
                    </div>
                </div>

                {showFlag ? (
                    <section className={fieldWrap}>
                        <div className={fieldHeader}>
                            <div className="text-xs uppercase tracking-wide text-slate-500">Flag</div>
                            <button
                                type="button"
                                onClick={() => setFlagText("")}
                                disabled={submitting || !flagText}
                                className={cx("text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40", focusRing)}
                            >
                                Clear
                            </button>
                        </div>

                        <input
                            type="text"
                            value={flagText}
                            onChange={(e) => setFlagText(e.target.value)}
                            placeholder="flag{...}"
                            disabled={submitting || !contestState.isRunning}
                            className={monoInput}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            inputMode="text"
                            aria-label="Flag submission"
                        />

                        <div className="px-4 pb-3 text-xs text-slate-500">
                            Flags are usually case-sensitive.
                        </div>
                    </section>
                ) : null}

                {showText ? (
                    <section className={fieldWrap}>
                        <div className={fieldHeader}>
                            <div className="text-xs uppercase tracking-wide text-slate-500">Procedure</div>
                            <button
                                type="button"
                                onClick={() => setSolutionText("")}
                                disabled={submitting || !solutionText}
                                className={cx("text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40", focusRing)}
                            >
                                Clear
                            </button>
                        </div>

                        <textarea
                            value={solutionText}
                            onChange={(e) => setSolutionText(e.target.value)}
                            placeholder="Explain your approach…"
                            disabled={submitting || !contestState.isRunning}
                            className={cx(monoTextarea, "h-48 sm:h-56")}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            aria-label="Procedure submission"
                        />

                        <div className="px-4 pb-3 text-xs text-slate-500">
                            Keep it clear and concise. Limit: 10k chars.
                        </div>
                    </section>
                ) : null}

                {!showFlag && !showText ? (
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm text-slate-600">
                        This challenge does not accept submissions.
                    </div>
                ) : null}
            </div>

            {/* Footer */}
            {(showFlag || showText) ? (
                <div className={footerBar}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={handleClearAll}
                            disabled={submitting || (!flagText && !solutionText)}
                            className={cx(
                                "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/70 px-4 text-sm font-normal tracking-tight",
                                "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                focusRing
                            )}
                        >
                            <FiTrash2 size={16} />
                            Clear all
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitDisabled}
                            className={cx(
                                "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm sm:text-base font-normal tracking-tight",
                                submitDisabled
                                    ? "cursor-not-allowed ring-1 ring-slate-200/60 bg-white/60 text-slate-300"
                                    : "ring-1 ring-emerald-200/60 bg-white/70 text-emerald-700 hover:bg-white/90",
                                focusRing
                            )}
                        >
                            <FiSend size={16} />
                            {submitting ? "Submitting…" : "Submit"}
                        </button>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                        Submit is enabled only during contest time and when at least one field is filled.
                    </div>
                </div>
            ) : null}
        </aside>
    );
};

export default CompetitionAnswerSection;
