// src/pages/challenges/PracticeAnswerSubmit.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Challenge} from "./types";
import {submitFlag, submitTextSolution} from "./practice";
import {useAuth} from "../../contexts/AuthContext";

interface Props {
    challenge: Challenge;
}

const formatElapsed = (ms: number) => {
    if (ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

type TimerStore = {
    v: 1;
    user_id: number | string;
    challenge_id: number;
    running: boolean;
    accumulated_ms: number;
    started_at: number | null;
    updated_at: number;
};

const PracticeAnswerSubmit: React.FC<Props> = ({challenge}) => {
    const {user} = useAuth();

    const userId = (user as any)?.id ?? (user as any)?.user_id ?? "anon";
    const challengeId = challenge?.id ?? 0;

    const [flagText, setFlagText] = useState("");
    const [procedureText, setProcedureText] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    const [timer, setTimer] = useState<TimerStore | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);
    const timerRef = useRef<TimerStore | null>(null);
    const intervalRef = useRef<number | null>(null);

    const alive = useRef(true);
    const msgTimer = useRef<number | null>(null);
    const busyRef = useRef(false);

    const [lastScore, setLastScore] = useState<{flag?: number | null; procedure?: number | null}>({});

    // ----------------------------
    // Stable helpers (no behavior changes)
    // ----------------------------
    const stopTick = useCallback(() => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const computeElapsed = useCallback((t: TimerStore) => {
        if (!t.running || !t.started_at) return t.accumulated_ms;
        return t.accumulated_ms + (Date.now() - t.started_at);
    }, []);

    const safeInitTimer = useCallback((): TimerStore => {
        return {
            v: 1,
            user_id: userId,
            challenge_id: challengeId,
            running: false,
            accumulated_ms: 0,
            started_at: null,
            updated_at: Date.now(),
        };
    }, [userId, challengeId]);

    const startTick = useCallback(() => {
        stopTick();
        intervalRef.current = window.setInterval(() => {
            const t = timerRef.current;
            if (!t) return;
            setElapsedMs(computeElapsed(t));
        }, 1000);
    }, [stopTick, computeElapsed]);

    const clearBannersSoon = useCallback(() => {
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        msgTimer.current = window.setTimeout(() => {
            if (!alive.current) return;
            setError(null);
            setInfo(null);
        }, 3500);
    }, []);

    const extractScore = useCallback((data: any): number | null => {
        if (!data) return null;

        if (typeof data.score === "number") return data.score;
        if (typeof data.user_score === "number") return data.user_score;

        const r0 = Array.isArray(data.results) ? data.results[0] : null;
        if (r0) {
            if (typeof r0.score === "number") return r0.score;
            if (typeof r0.user_score === "number") return r0.user_score;
        }

        return null;
    }, []);

    // ----------------------------
    // Lifecycle safety
    // ----------------------------
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            if (msgTimer.current) window.clearTimeout(msgTimer.current);
        };
    }, []);

    // ----------------------------
    // Timer init / reset per (challengeId,userId)
    // (same behavior as your original)
    // ----------------------------
    useEffect(() => {
        stopTick();

        if (!challengeId) {
            setTimer(null);
            setElapsedMs(0);
            timerRef.current = null;
            return;
        }

        const base = safeInitTimer();
        setTimer(base);
        timerRef.current = base;
        setElapsedMs(computeElapsed(base));

        return () => stopTick();
    }, [challengeId, userId, stopTick, safeInitTimer, computeElapsed]);

    // Keep ref in sync + start/stop ticking when relevant fields change
    useEffect(() => {
        if (!timer) return;

        timerRef.current = timer;
        setElapsedMs(computeElapsed(timer));

        if (timer.running) startTick();
        else stopTick();

        return () => {};
        // keep same dependency intent, but explicit and stable
    }, [timer, computeElapsed, startTick, stopTick]);

    const startTimer = useCallback(() => {
        setTimer((prev) => {
            const base = prev ?? safeInitTimer();
            if (base.running) return base;
            return {...base, running: true, started_at: Date.now(), updated_at: Date.now()};
        });
    }, [safeInitTimer]);

    const pauseTimer = useCallback(() => {
        setTimer((prev) => {
            const base = prev ?? safeInitTimer();
            if (!base.running) return base;

            const now = Date.now();
            const extra = base.started_at ? now - base.started_at : 0;

            return {
                ...base,
                running: false,
                accumulated_ms: base.accumulated_ms + extra,
                started_at: null,
                updated_at: now,
            };
        });
    }, [safeInitTimer]);

    const resetTimer = useCallback(() => {
        setTimer((prev) => {
            const base = prev ?? safeInitTimer();
            return {...base, running: false, accumulated_ms: 0, started_at: null, updated_at: Date.now()};
        });
    }, [safeInitTimer]);

    // ----------------------------
    // Challenge input logic (UNCHANGED)
    // ----------------------------
    const solutionType = challenge.solution_type?.type || "";
    const showFlag = solutionType === "flag" || solutionType === "flag and procedure";
    const showProcedure = solutionType === "procedure" || solutionType === "flag and procedure";

    const hasInput = useMemo(() => {
        return (showFlag && flagText.trim().length > 0) || (showProcedure && procedureText.trim().length > 0);
    }, [flagText, procedureText, showFlag, showProcedure]);

    const handleSubmit = useCallback(async () => {
        setError(null);
        setInfo(null);

        if (!hasInput) {
            setError("Enter a flag and/or procedure before submitting.");
            clearBannersSoon();
            return;
        }

        if (busyRef.current) return;
        busyRef.current = true;

        setSubmitting(true);
        try {
            let flagScore: number | null | undefined = undefined;
            let procedureScore: number | null | undefined = undefined;

            if (showFlag && flagText.trim()) {
                const resp = await submitFlag(challenge.id, flagText.trim());
                flagScore = extractScore(resp);
                setFlagText("");
            }

            if (showProcedure && procedureText.trim()) {
                const resp = await submitTextSolution(challenge.id, procedureText.trim());
                procedureScore = extractScore(resp);
                setProcedureText("");
            }

            setLastScore({
                ...(flagScore !== undefined ? {flag: flagScore} : {}),
                ...(procedureScore !== undefined ? {procedure: procedureScore} : {}),
            });

            const parts: string[] = [];
            if (flagScore !== undefined) parts.push(`Flag score: ${flagScore ?? "—"}`);
            if (procedureScore !== undefined) parts.push(`Procedure score: ${procedureScore ?? "—"}`);

            setInfo(
                parts.length
                    ? `Submission received. ${parts.join(" • ")}`
                    : "Submission received. Check Previous Submissions for status."
            );
            clearBannersSoon();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Submission failed.");
            clearBannersSoon();
        } finally {
            busyRef.current = false;
            if (!alive.current) return;
            setSubmitting(false);
        }
    }, [
        hasInput,
        clearBannersSoon,
        showFlag,
        showProcedure,
        flagText,
        procedureText,
        challenge.id,
        extractScore,
    ]);

    const typeBadge = useMemo(() => {
        if (solutionType === "flag") return "flag";
        if (solutionType === "procedure") return "procedure";
        if (solutionType === "flag and procedure") return "flag + procedure";
        return "Practice";
    }, [solutionType]);

    const timerRunning = !!timer?.running;

    // ----------------------------
    // Styling: same family, minimal changes
    // ----------------------------
    const shell =
        "min-w-0 w-full flex flex-col rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50 overflow-hidden";

    const chip =
        "inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/60 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-slate-600";

    const timerPill =
        "rounded-xl border border-slate-200/70 bg-slate-100/60 px-3 py-1.5 font-mono text-sm text-slate-700";

    const btn =
        "rounded-xl border border-slate-200/70 bg-white/70 px-3 py-1.5 text-xs sm:text-sm font-normal text-slate-600 shadow-sm hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50";

    const inputShell =
        "rounded-xl border border-slate-200/70 bg-white/70 focus-within:bg-white focus-within:border-blue-200/70 focus-within:ring-2 focus-within:ring-blue-500/10";

    const inputBase =
        "w-full bg-transparent px-3 py-3 text-sm font-mono text-slate-700 outline-none placeholder:text-slate-400";

    const submitBtn =
        "w-full rounded-2xl border border-blue-200/70 bg-blue-50/70 px-4 py-2.5 text-sm sm:text-base font-normal text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-100/60 disabled:text-slate-400 disabled:cursor-not-allowed";

    return (
        <aside className={shell}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/40 bg-white/40 backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Timer */}
                    <div className="space-y-1">
                        <div className="text-sm sm:text-base font-normal text-slate-700">Time on Challenge</div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className={timerPill}>{formatElapsed(elapsedMs)}</span>

                            <button
                                type="button"
                                onClick={timerRunning ? pauseTimer : startTimer}
                                disabled={!challengeId}
                                className={btn}
                                title={timerRunning ? "Pause timer" : "Start timer"}
                            >
                                {timerRunning ? "Pause" : "Start"}
                            </button>

                            <button
                                type="button"
                                onClick={resetTimer}
                                disabled={!challengeId || (elapsedMs === 0 && !timerRunning)}
                                className={btn}
                                title="Reset timer"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Right: Type + Score */}
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className={chip}>{typeBadge}</span>

                        {(lastScore.flag != null || lastScore.procedure != null) && (
                            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                <span className="text-xs sm:text-sm font-normal text-slate-500">Latest score</span>

                                {lastScore.flag != null && (
                                    <span className="inline-flex items-center rounded-xl border border-slate-200/70 bg-slate-100/60 px-2.5 py-1 font-mono text-sm text-slate-700">
                                        F: {lastScore.flag}
                                    </span>
                                )}

                                {lastScore.procedure != null && (
                                    <span className="inline-flex items-center rounded-xl border border-slate-200/70 bg-slate-100/60 px-2.5 py-1 font-mono text-sm text-slate-700">
                                        P: {lastScore.procedure}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white/40 backdrop-blur-xl">
                {(error || info) && (
                    <div
                        className={`rounded-xl border px-3 py-2 text-sm ${
                            error
                                ? "bg-rose-50/80 border-rose-200 text-rose-700"
                                : "bg-emerald-50/80 border-emerald-200 text-emerald-700"
                        }`}
                    >
                        {error ?? info}
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
                                value={flagText}
                                onChange={(e) => setFlagText(e.target.value)}
                                disabled={submitting}
                                className={inputBase}
                                placeholder="Enter flag…"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                        </div>

                        <div className="text-xs text-slate-500">Flags may be case-sensitive.</div>
                    </section>
                )}

                {showProcedure && (
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-normal uppercase tracking-wide text-slate-500">Procedure</div>
                            <button
                                type="button"
                                onClick={() => setProcedureText("")}
                                disabled={submitting || !procedureText}
                                className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-40"
                            >
                                Clear
                            </button>
                        </div>

                        <div className={inputShell}>
                            <textarea
                                value={procedureText}
                                onChange={(e) => setProcedureText(e.target.value)}
                                disabled={submitting}
                                className={`${inputBase} h-56 resize-none`}
                                placeholder="Explain your approach…"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                        </div>

                        <div className="text-xs text-slate-500">Keep it clear and concise.</div>
                    </section>
                )}
            </div>

            {(showFlag || showProcedure) && (
                <div className="px-4 py-3 border-t border-white/40 bg-white/40 backdrop-blur-xl">
                    <button onClick={handleSubmit} disabled={submitting || !hasInput} className={submitBtn}>
                        {submitting ? "Submitting…" : "Submit"}
                    </button>
                </div>
            )}
        </aside>
    );
};

export default PracticeAnswerSubmit;
