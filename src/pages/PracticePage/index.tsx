import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import PracticeDescription from "./PracticeDescription";
import PreviousSubmissions from "./PreviousSubmissions";
import { getChallengeById } from "../../api/practice";
import type { Challenge } from "./types";
import PracticeAssistPanel from "../../components/chat/Chat";
import PracticeAnswerSubmit from "./PracticeAnswerSubmit";

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

const PracticePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
    const [mobilePane, setMobilePane] = useState<"problem" | "side">("problem");

    const isDesktop = useIsDesktop();
    const [rightRatio, setRightRatio] = useState<number>(() => readStoredRatio() ?? 0.5);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{ dragging: boolean; startX: number; startRatio: number }>({
        dragging: false,
        startX: 0,
        startRatio: rightRatio,
    });

    useEffect(() => {
        const fetchChallenge = async () => {
            try {
                const data = await getChallengeById(Number(id));
                setChallenge(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load challenge.");
            } finally {
                setLoading(false);
            }
        };
        fetchChallenge();
    }, [id]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(clamp(rightRatio, 0.25, 0.6)));
        } catch {
            // ignore
        }
    }, [rightRatio]);

    const startDrag = (e: React.MouseEvent) => {
        if (!isDesktop) return;
        dragRef.current.dragging = true;
        dragRef.current.startX = e.clientX;
        dragRef.current.startRatio = rightRatio;

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    };

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

    if (loading) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-0 py-2">
                    <div className="rounded-2xl border border-white/30 bg-white/55 px-3 py-2 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        Loading challenge...
                    </div>
                </main>
            </div>
        );
    }

    if (error || !challenge) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-0 py-2">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                        {error}
                    </div>
                </main>
            </div>
        );
    }

    const leftPct = `${((1 - rightRatio) * 100).toFixed(1)}%`;
    const rightPct = `${(rightRatio * 100).toFixed(1)}%`;

    const pageShell =
        "min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 text-sm font-sans flex flex-col";

    const paneShell =
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    const tabBtn = (active: boolean) =>
        [
            "rounded-full border px-2.5 py-1 text-xs sm:text-sm font-normal transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        ].join(" ");

    const mobileToggleBtn = (active: boolean) =>
        [
            "rounded-2xl border px-3 py-2 text-xs sm:text-sm font-normal transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        ].join(" ");

    return (
        <div className={pageShell}>
            <Navbar />

            {!isDesktop && (
                <div className="px-0 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setMobilePane("problem")}
                            className={mobileToggleBtn(mobilePane === "problem")}
                        >
                            Problem
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobilePane("side")}
                            className={mobileToggleBtn(mobilePane === "side")}
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className="w-full flex flex-col lg:flex-row gap-2 px-0 py-2"
                style={isDesktop ? { height: `calc(100vh - ${navHeightPx}px)` } : undefined}
            >
                {/* LEFT */}
                <div
                    className={`${paneShell} ${!isDesktop && mobilePane !== "problem" ? "hidden" : ""}`}
                    style={isDesktop ? { width: leftPct } : undefined}
                >
                    <div className="shrink-0 px-3 py-2 bg-white/40 backdrop-blur-xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <button className={tabBtn(activeTab === "description")} onClick={() => setActiveTab("description")}>
                                Description
                            </button>

                            <button className={tabBtn(activeTab === "submissions")} onClick={() => setActiveTab("submissions")}>
                                Previous Submissions
                            </button>
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-200/70" />

                    <div className={isDesktop ? "min-h-0 flex-1 overflow-y-auto px-3 py-2" : "px-3 py-2"}>
                        {activeTab === "description" && <PracticeDescription challenge={challenge} />}
                        {activeTab === "submissions" && <PreviousSubmissions challengeId={challenge.id} />}
                    </div>
                </div>

                {isDesktop && (
                    <div className="hidden lg:flex items-stretch">
                        <div
                            onMouseDown={startDrag}
                            className="group relative w-2 cursor-col-resize"
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize panels"
                            title="Drag to resize"
                        >
                            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200/70 group-hover:bg-blue-300/70" />
                            <div className="absolute inset-0" />
                        </div>
                    </div>
                )}

                {/* RIGHT */}
                <div
                    className={`${paneShell} ${!isDesktop && mobilePane !== "side" ? "hidden" : ""}`}
                    style={isDesktop ? { width: rightPct } : undefined}
                >
                    <PracticeAssistPanel
                        challenge={challenge}
                        answerSlot={<PracticeAnswerSubmit challenge={challenge} />}
                        chatContext={{ challengeId: challenge.id, solutionType: challenge.solution_type?.type }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PracticePage;
