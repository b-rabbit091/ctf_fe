import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import PracticeDescription from "./PracticeDescription";
import PreviousSubmissions from "./PreviousSubmissions";
import {getChallengeById} from "../../api/practice";
import type {Challenge} from "./types";
import PracticeAssistPanel from "../../components/chat/Chat";
import PracticeAnswerSubmit from "./PracticeAnswerSubmit";
import {FiAlertCircle, FiInfo} from "react-icons/fi";

/** keep: clamp + all existing functions; just optimize + match CompetitionPage layout */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const STORAGE_KEY = "practice_split_right_ratio_v2";
const LG_BREAKPOINT = 1024; // Tailwind lg

function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth >= LG_BREAKPOINT;
    });

    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
        const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);

        setIsDesktop(mq.matches);

        if (mq.addEventListener) mq.addEventListener("change", onChange);
        else mq.addListener(onChange);

        return () => {
            if (mq.removeEventListener) mq.removeEventListener("change", onChange);
            else mq.removeListener(onChange);
        };
    }, []);

    return isDesktop;
}

const readStoredRatio = (): number | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const n = Number(raw);
        if (!Number.isFinite(n)) return null;
        return clamp(n, 0.25, 0.6);
    } catch {
        return null;
    }
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const PracticePage: React.FC = () => {
    const {id} = useParams<{id: string}>();

    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
    const [mobilePane, setMobilePane] = useState<"problem" | "side">("problem");

    const isDesktop = useIsDesktop();
    const [rightRatio, setRightRatio] = useState<number>(() => readStoredRatio() ?? 0.5);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{dragging: boolean; startX: number; startRatio: number}>({
        dragging: false,
        startX: 0,
        startRatio: rightRatio,
    });

    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const challengeId = useMemo(() => {
        const n = id ? Number(id) : NaN;
        return Number.isFinite(n) ? n : NaN;
    }, [id]);

    /* ---------- data fetch (secured + stable) ---------- */
    const fetchChallenge = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (!challengeId || Number.isNaN(challengeId)) {
            setError("Invalid challenge id.");
            setLoading(false);
            return;
        }

        try {
            const data = await getChallengeById(challengeId);
            if (!alive.current) return;
            setChallenge(data);
        } catch (err) {
            console.error(err);
            if (!alive.current) return;
            setError("Failed to load challenge.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, [challengeId]);

    useEffect(() => {
        fetchChallenge();
    }, [fetchChallenge]);

    /* ---------- persist splitter ratio ---------- */
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(clamp(rightRatio, 0.25, 0.6)));
        } catch {
            // ignore
        }
    }, [rightRatio]);

    /* ---------- drag logic (same behavior, optimized) ---------- */
    const startDrag = useCallback(
        (e: React.MouseEvent) => {
            if (!isDesktop) return;
            dragRef.current.dragging = true;
            dragRef.current.startX = e.clientX;
            dragRef.current.startRatio = rightRatio;

            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        },
        [isDesktop, rightRatio]
    );

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current.dragging) return;
            const el = containerRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const total = rect.width || 1;

            const dx = e.clientX - dragRef.current.startX;
            const delta = dx / total;

            setRightRatio(clamp(dragRef.current.startRatio - delta, 0.25, 0.6));
        };

        const onUp = () => {
            if (!dragRef.current.dragging) return;
            dragRef.current.dragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    const navHeightPx = 64;

    /** ---------- same panel styling as CompetitionPage (minimal + consistent) ---------- */
    const pageShell =
        "min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-sm font-sans text-slate-700 flex flex-col";

    const panel =
        "min-w-0 flex flex-col overflow-hidden rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm";

    const panelHeader = "shrink-0 px-4 sm:px-5 py-3 border-b border-slate-200/70 bg-white/40";
    const panelBodyDesktop = "min-h-0 flex-1 overflow-y-auto";
    const panelBodyMobile = "flex-1";

    const tabBtn = (active: boolean) =>
        cx(
            "rounded-full px-3 py-1 text-xs sm:text-sm ring-1 transition",
            active
                ? "ring-slate-900/80 bg-slate-900 text-white"
                : "ring-slate-200/60 bg-white/70 text-slate-700 hover:bg-white/90"
        );

    const mobileToggleBtn = (active: boolean) =>
        cx(
            "rounded-xl px-3 py-2 text-xs sm:text-sm ring-1 transition",
            active
                ? "ring-slate-900/80 bg-slate-900 text-white"
                : "ring-slate-200/60 bg-white/70 text-slate-700 hover:bg-white/90"
        );

    /* ---------- states ---------- */
    if (loading) {
        return (
            <div className={pageShell}>
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className={panel}>
                        <div className={panelHeader}>
                            <div className="text-sm font-normal text-slate-800">Loading…</div>
                        </div>
                        <div className="p-4 text-sm text-slate-600">Loading challenge…</div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !challenge) {
        return (
            <div className={pageShell}>
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load challenge</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">{error || "Unknown error."}</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const leftPct = `${((1 - rightRatio) * 100).toFixed(1)}%`;
    const rightPct = `${(rightRatio * 100).toFixed(1)}%`;

    return (
        <div className={pageShell}>
            <Navbar />

            {/* mobile toggle (kept; same functionality) */}
            {!isDesktop ? (
                <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setMobilePane("problem")} className={mobileToggleBtn(mobilePane === "problem")}>
                            Problem
                        </button>
                        <button type="button" onClick={() => setMobilePane("side")} className={mobileToggleBtn(mobilePane === "side")}>
                            Submit
                        </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        <FiInfo className="inline -mt-0.5 mr-1" />
                        Switch between problem and submit on smaller screens.
                    </div>
                </div>
            ) : null}

            <div
                ref={containerRef}
                className={cx(
                    "w-full flex flex-col lg:flex-row gap-3 lg:gap-3",
                    "mx-auto max-w-6xl",
                    "px-3 sm:px-4 py-4"
                )}
                style={isDesktop ? {height: `calc(100vh - ${navHeightPx}px)`} : undefined}
            >
                {/* LEFT PANEL */}
                <section
                    className={cx(panel, !isDesktop && mobilePane !== "problem" ? "hidden" : "")}
                    style={isDesktop ? {width: leftPct} : undefined}
                    aria-label="Problem panel"
                >
                    <div className={panelHeader}>
                        <div className="flex flex-wrap items-center gap-2">
                            <button className={tabBtn(activeTab === "description")} onClick={() => setActiveTab("description")}>
                                Description
                            </button>
                            <button className={tabBtn(activeTab === "submissions")} onClick={() => setActiveTab("submissions")}>
                                Previous Submissions
                            </button>
                        </div>
                    </div>

                    <div className={isDesktop ? panelBodyDesktop : panelBodyMobile}>
                        <div className="p-4 sm:p-5">
                            {activeTab === "description" ? (
                                <PracticeDescription challenge={challenge} />
                            ) : (
                                <PreviousSubmissions challengeId={challenge.id} />
                            )}
                        </div>
                    </div>
                </section>

                {/* SPLITTER (desktop only) */}
                {isDesktop ? (
                    <div className="hidden lg:flex items-stretch">
                        <div
                            onMouseDown={startDrag}
                            className="group relative w-2 cursor-col-resize"
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize panels"
                            title="Drag to resize"
                        >
                            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200/70 group-hover:bg-sky-300/70" />
                            <div className="absolute inset-0" />
                        </div>
                    </div>
                ) : null}

                {/* RIGHT PANEL (chat + answer slot) */}
                <section
                    className={cx(panel, !isDesktop && mobilePane !== "side" ? "hidden" : "")}
                    style={isDesktop ? {width: rightPct} : undefined}
                    aria-label="Assistant panel"
                >
                    <div className={panelHeader}>
                        <div className="text-sm font-normal text-slate-800">Assistant</div>
                    </div>

                    <div className={isDesktop ? panelBodyDesktop : panelBodyMobile}>
                        {/* DO NOT remove functions/components; keep the same props and behavior */}
                        <div className="p-4 sm:p-5">
                            <PracticeAssistPanel
                                challenge={challenge}
                                answerSlot={<PracticeAnswerSubmit challenge={challenge} />}
                                chatContext={{challengeId: challenge.id, solutionType: challenge.solution_type?.type}}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PracticePage;
