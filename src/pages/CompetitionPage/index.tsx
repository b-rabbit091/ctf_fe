// src/pages/CompetePage/CompetitionPage.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {getChallengeById} from "./api";
import {Challenge} from "./types";
import CompetitionDescription from "./CompetitionDescription";
import CompetitionAnswerSection from "./CompetitionAnswerSection";
import CompetitionPreviousSubmissions from "./CompetitionPreviousSubmissions";
import {FiAlertCircle} from "react-icons/fi";

const LG_BREAKPOINT = 1024; // Tailwind lg
const STORAGE_KEY = "competition_split_right_ratio_v2";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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

const readStoredRatio = (): number => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const n = Number(raw);
        return Number.isFinite(n) ? clamp(n, 0.28, 0.6) : 0.45;
    } catch {
        return 0.45;
    }
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const CompetitionPage: React.FC = () => {
    const {id} = useParams<{id: string}>();

    const isDesktop = useIsDesktop();
    const [rightRatio, setRightRatio] = useState<number>(() => readStoredRatio());

    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Left pane tabs (LeetCode-ish)
    const [leftTab, setLeftTab] = useState<"description" | "submissions">("description");

    // refs for safe async + drag
    const alive = useRef(true);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{dragging: boolean; startX: number; startRatio: number}>({
        dragging: false,
        startX: 0,
        startRatio: rightRatio,
    });

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

    // Fetch challenge (secured: validate id + guard unmount)
    const fetchChallenge = useCallback(async () => {
        if (!challengeId || Number.isNaN(challengeId)) {
            setError("Invalid challenge id.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

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

    // Persist splitter ratio
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(clamp(rightRatio, 0.28, 0.6)));
        } catch {
            // ignore
        }
    }, [rightRatio]);

    // Drag handlers (desktop only)
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

            // rightRatio moves inverse of dx (drag bar right => right pane shrinks)
            const next = clamp(dragRef.current.startRatio - delta, 0.28, 0.6);
            setRightRatio(next);
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

    // Minimal leetcode-like shells (similar family as your other pages, but not flashy)
    const pageShell = "min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col";
    const panel = "min-w-0 flex flex-col overflow-hidden rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm";
    const panelHeader = "shrink-0 px-4 sm:px-5 py-3 border-b border-slate-200/70 bg-white/40";
    const panelBodyDesktop = "min-h-0 flex-1 overflow-y-auto";
    const panelBodyMobile = "flex-1";
    const tabsWrap = "flex flex-wrap items-center gap-2";
    const tabBtn = (active: boolean) =>
        cx(
            "rounded-full px-3 py-1 text-xs sm:text-sm ring-1",
            active ? "ring-slate-900/80 bg-slate-900 text-white" : "ring-slate-200/60 bg-white/70 text-slate-700 hover:bg-white/90"
        );

    if (loading) {
        return (
            <div className={pageShell}>
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className={panel}>
                        <div className={panelHeader}>
                            <div className="text-sm font-normal text-slate-700">Loading…</div>
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

            {/* LeetCode layout:
                - Mobile: stacked (Description/Submissions tab on top, Submit panel below)
                - Desktop: 2 columns with resizable splitter
            */}
            <div
                ref={containerRef}
                className="w-full flex flex-col lg:flex-row gap-3 lg:gap-3 px-3 sm:px-4 py-4"
                style={isDesktop ? {height: `calc(100vh - ${navHeightPx}px)`} : undefined}
            >
                {/* LEFT: Description/Submissions */}
                <section className={panel} style={isDesktop ? {width: leftPct} : undefined} aria-label="Problem panel">
                    <div className={panelHeader}>
                        <div className="flex items-center justify-between gap-3">
                            <div className={tabsWrap}>
                                <button type="button" className={tabBtn(leftTab === "description")} onClick={() => setLeftTab("description")}>
                                    Description
                                </button>
                                <button type="button" className={tabBtn(leftTab === "submissions")} onClick={() => setLeftTab("submissions")}>
                                    Submissions
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={isDesktop ? panelBodyDesktop : panelBodyMobile}>
                        {leftTab === "description" ? (
                            <div className="p-4 sm:p-5">
                                <CompetitionDescription challenge={challenge} />
                            </div>
                        ) : (
                            <div className="p-4 sm:p-5">
                                <CompetitionPreviousSubmissions challengeId={challenge.id} />
                            </div>
                        )}
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

                {/* RIGHT: Submit */}
                <section className={panel} style={isDesktop ? {width: rightPct} : undefined} aria-label="Submit panel">
                    <div className={panelHeader}>
                        <div className="text-sm font-normal text-slate-800">Submit</div>
                    </div>

                    <div className={isDesktop ? panelBodyDesktop : panelBodyMobile}>
                        <div className="p-4 sm:p-5">
                            <CompetitionAnswerSection challenge={challenge} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default CompetitionPage;
