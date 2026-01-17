// src/pages/challenges/PracticeAnswerSubmit.tsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Challenge} from "./types";
import {submitFlag, submitTextSolution, fetchChatHistory} from "./practice";
import {useAuth} from "../../contexts/AuthContext";

import type {ChatMessage} from "./types";

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


export const PracticeAiChatHistory: React.FC<{ challenge: Challenge }> = ({challenge}) => {
    const {user} = useAuth();

    const userId = (user as any)?.id ?? (user as any)?.user_id ?? "anon";
    const challengeId = challenge?.id ?? 0;

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatNext, setChatNext] = useState<string | null>(null);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatLoadingOlder, setChatLoadingOlder] = useState(false);

    const chatAbortRef = useRef<AbortController | null>(null);

    const dedupeByIdOldestFirst = (list: ChatMessage[]) => {
        const map = new Map<string, ChatMessage>();
        for (const m of list) map.set(String(m.id), m);
        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            const ta = Date.parse(a.createdAt || "") || 0;
            const tb = Date.parse(b.createdAt || "") || 0;
            return ta - tb;
        });
        return arr;
    };

    const loadChatLatest = async () => {
        if (!challengeId) {
            setChatMessages([]);
            setChatNext(null);
            return;
        }

        setChatLoading(true);
        chatAbortRef.current?.abort();
        const ac = new AbortController();
        chatAbortRef.current = ac;

        const res = await fetchChatHistory({
            challengeId,
            pageSize: 20,
            signal: ac.signal,
        });

        if (ac.signal.aborted) return;

        setChatLoading(false);
        chatAbortRef.current = null;

        if (!res.ok) {
            setChatMessages([]);
            setChatNext(null);
            return;
        }

        const newestFirst = res.data.messages; // backend: newest -> oldest
        const oldestFirst = [...newestFirst].reverse(); // UI: oldest -> newest

        setChatMessages(dedupeByIdOldestFirst(oldestFirst));
        setChatNext(res.data.next ?? null);
    };

    const loadChatOlder = async () => {
        if (!challengeId || !chatNext || chatLoadingOlder) return;

        setChatLoadingOlder(true);
        chatAbortRef.current?.abort();
        const ac = new AbortController();
        chatAbortRef.current = ac;

        const res = await fetchChatHistory({
            challengeId,
            cursorUrl: chatNext,
            signal: ac.signal,
        });

        if (ac.signal.aborted) return;

        setChatLoadingOlder(false);
        chatAbortRef.current = null;

        if (!res.ok) return;

        const olderOldestFirst = [...res.data.messages].reverse();
        setChatMessages((prev) => dedupeByIdOldestFirst([...olderOldestFirst, ...prev]));
        setChatNext(res.data.next ?? null);
    };

    useEffect(() => {
        loadChatLatest();
        return () => {
            chatAbortRef.current?.abort();
            chatAbortRef.current = null;
        };
    }, [challengeId, userId]);

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    AI Chat History
                </div>

                <div className="flex items-center gap-2">
                    {chatNext && !chatLoading && (
                        <button
                            type="button"
                            onClick={loadChatOlder}
                            disabled={chatLoadingOlder}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            {chatLoadingOlder ? "Loading…" : "Load older"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={loadChatLatest}
                        disabled={chatLoading}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                        {chatLoading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
                {chatLoading ? (
                    <div className="p-3 text-sm text-slate-600">Loading history…</div>
                ) : chatMessages.length === 0 ? (
                    <div className="p-3 text-sm text-slate-600">No chat history yet.</div>
                ) : (
                    <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                        {chatMessages.map((m) => {
                            const isUser = m.role === "user";
                            return (
                                <div key={m.id} className={isUser ? "text-right" : "text-left"}>
                                    <div
                                        className={[
                                            "inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                                            isUser ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900",
                                        ].join(" ")}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="text-[11px] text-slate-400">
                Loaded from server (per user + challenge).
            </div>
        </section>
    );
};

const PracticeAnswerSubmit: React.FC<Props> = ({challenge}) => {
    const {user} = useAuth();

    const [flagText, setFlagText] = useState("");
    const [procedureText, setProcedureText] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);


    const userId = (user as any)?.id ?? (user as any)?.user_id ?? "anon";
    const challengeId = challenge?.id ?? 0;

    const [timer, setTimer] = useState<TimerStore | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);

    const intervalRef = useRef<number | null>(null);
    const timerRef = useRef<TimerStore | null>(null);

    const [lastScore, setLastScore] = useState<{ flag?: number | null; procedure?: number | null }>({});


    const stopTick = () => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const computeElapsed = (t: TimerStore) => {
        if (!t.running || !t.started_at) return t.accumulated_ms;
        return t.accumulated_ms + (Date.now() - t.started_at);
    };

    const safeInitTimer = (): TimerStore => ({
        v: 1,
        user_id: userId,
        challenge_id: challengeId,
        running: false,
        accumulated_ms: 0,
        started_at: null,
        updated_at: Date.now(),
    });

    const startTick = () => {
        stopTick();
        intervalRef.current = window.setInterval(() => {
            const t = timerRef.current;
            if (!t) return;
            setElapsedMs(computeElapsed(t));
        }, 1000);
    };

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challengeId, userId]);

    useEffect(() => {
        if (!timer) return;
        timerRef.current = timer;
        setElapsedMs(computeElapsed(timer));

        if (timer.running) startTick();
        else stopTick();

        return () => {
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timer?.running, timer?.accumulated_ms, timer?.started_at]);

    const startTimer = () => {
        setTimer((prev) => {
            const base = prev ?? safeInitTimer();
            if (base.running) return base;
            return {
                ...base,
                running: true,
                started_at: Date.now(),
                updated_at: Date.now(),
            };
        });
    };

    const pauseTimer = () => {
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
    };

    const resetTimer = () => {
        setTimer((prev) => {
            const base = prev ?? safeInitTimer();
            return {
                ...base,
                running: false,
                accumulated_ms: 0,
                started_at: null,
                updated_at: Date.now(),
            };
        });
    };

    // ----------------------------
    // Challenge input logic
    // ----------------------------
    const solutionType = challenge.solution_type?.type || "";

    const showFlag = solutionType === "Flag" || solutionType === "Flag and Procedure";

    const showProcedure = solutionType === "Procedure" || solutionType === "Flag and Procedure";

    const hasInput = useMemo(() => {
        return (
            (showFlag && flagText.trim().length > 0) ||
            (showProcedure && procedureText.trim().length > 0)
        );
    }, [flagText, procedureText, showFlag, showProcedure]);

    const clearBannersSoon = () => {
        window.setTimeout(() => {
            setError(null);
            setInfo(null);
        }, 3500);
    };
    const extractScore = (data: any): number | null => {
        if (!data) return null;

        if (typeof data.score === "number") return data.score;
        if (typeof data.user_score === "number") return data.user_score;

        const r0 = Array.isArray(data.results) ? data.results[0] : null;
        if (r0) {
            if (typeof r0.score === "number") return r0.score;
            if (typeof r0.user_score === "number") return r0.user_score;
        }

        return null;
    };

    const handleSubmit = async () => {
        setError(null);
        setInfo(null);

        if (!hasInput) {
            setError("Enter a flag and/or procedure before submitting.");
            clearBannersSoon();
            return;
        }

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


            //
            // if (showFlag && flagText.trim()) {
            //     await submitFlag(challenge.id, flagText.trim());
            //     setFlagText("");
            // }
            //
            // if (showProcedure && procedureText.trim()) {
            //     console.log("shot procedure and text", showProcedure, procedureText.trim());
            //     await submitTextSolution(challenge.id, procedureText.trim());
            //     setProcedureText("");
            // }
            //
            // setInfo("Submission received. Check Previous Submissions for status.");
            // clearBannersSoon();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Submission failed.");
            clearBannersSoon();
        } finally {
            setSubmitting(false);
        }
    };

    const typeBadge = useMemo(() => {
        if (solutionType === "Flag") return "Flag";
        if (solutionType === "Procedure") return "Procedure";
        if (solutionType === "Flag and Procedure") return "Flag + Procedure";
        return "Practice";
    }, [solutionType]);

    const timerRunning = !!timer?.running;

    return (
        <aside
            className="min-w-0 w-full flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Timer */}
                    <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">Time on Challenge</div>

                        <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm text-white shadow-sm">
                    {formatElapsed(elapsedMs)}
                </span>

                            <button
                                type="button"
                                onClick={timerRunning ? pauseTimer : startTimer}
                                disabled={!challengeId}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                                title={timerRunning ? "Pause timer" : "Start timer"}
                            >
                                {timerRunning ? "Pause" : "Start"}
                            </button>

                            <button
                                type="button"
                                onClick={resetTimer}
                                disabled={!challengeId || (elapsedMs === 0 && !timerRunning)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                                title="Reset timer"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Right: Type + Score (bigger, clearer) */}
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {typeBadge}
            </span>

                        {(lastScore.flag != null || lastScore.procedure != null) && (
                            <div
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                <span className="text-xs font-semibold text-slate-600">Latest score</span>

                                {lastScore.flag != null && (
                                    <span
                                        className="inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-sm text-white">
                            F: {lastScore.flag}
                        </span>
                                )}

                                {lastScore.procedure != null && (
                                    <span
                                        className="inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-sm text-white">
                            P: {lastScore.procedure}
                        </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
                {(error || info) && (
                    <div
                        className={`rounded-lg border px-3 py-2 text-sm ${
                            error
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        }`}
                    >
                        {error ?? info}
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

                        <div
                            className="rounded-lg border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-slate-300">
                            <input
                                value={flagText}
                                onChange={(e) => setFlagText(e.target.value)}
                                disabled={submitting}
                                className="w-full bg-transparent px-3 py-3 text-sm font-mono text-slate-900 outline-none"
                            />
                        </div>

                        <div className="text-xs text-slate-500">Flags may be case-sensitive.</div>
                    </section>
                )}

                {showProcedure && (
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Procedure
                            </div>
                            <button
                                type="button"
                                onClick={() => setProcedureText("")}
                                disabled={submitting || !procedureText}
                                className="text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40"
                            >
                                Clear
                            </button>
                        </div>

                        <div
                            className="rounded-lg border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-slate-300">
                            <textarea
                                value={procedureText}
                                onChange={(e) => setProcedureText(e.target.value)}
                                disabled={submitting}
                                className="h-56 w-full resize-none bg-transparent px-3 py-3 text-sm font-mono text-slate-900 outline-none"
                            />
                        </div>

                        <div className="text-xs text-slate-500">Keep it clear and concise.</div>
                    </section>
                )}
            </div>

            {(showFlag || showProcedure) && (
                <div className="px-4 py-3 border-t border-slate-200 bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !hasInput}
                        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Submitting…" : "Submit"}
                    </button>
                </div>
            )}
        </aside>
    );
};

export default PracticeAnswerSubmit;
