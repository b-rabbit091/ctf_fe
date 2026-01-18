import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getChallengeById } from "./api";
import { Challenge } from "./types";
import CompetitionDescription from "./CompetitionDescription";
import CompetitionAnswerSection from "./CompetitionAnswerSection";
import CompetitionPreviousSubmissions from "./CompetitionPreviousSubmissions";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const STORAGE_KEY = "competition_split_right_ratio_v1";
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

const CompetitionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");

    const isDesktop = useIsDesktop();
    const [rightRatio, setRightRatio] = useState<number>(() => readStoredRatio() ?? 0.5);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef({
        dragging: false,
        startX: 0,
        startRatio: rightRatio,
    });

    /* ---------- data fetch ---------- */
    useEffect(() => {
        const fetchChallenge = async () => {
            setLoading(true);
            setError(null);
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

        if (id) fetchChallenge();
    }, [id]);

    /* ---------- persist splitter ratio ---------- */
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(clamp(rightRatio, 0.25, 0.6)));
        } catch {
            /* ignore */
        }
    }, [rightRatio]);

    /* ---------- drag logic ---------- */
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

    /* ---------- states ---------- */
    if (loading) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar />
                <main className="flex-1 w-full p-0">
                    <div className="border border-white/30 bg-white/55 p-0 text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
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
                <main className="flex-1 w-full p-0">
                    <div className="border border-rose-200 bg-rose-50/80 p-0 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
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

    // NOTE: rounded-none + p-0 so panels touch edge-to-edge with no gaps.
    const paneShell =
        "flex min-w-0 flex-col overflow-hidden rounded-none border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    const tabBtn = (active: boolean) =>
        [
            "rounded-full border px-2.5 py-1 text-xs sm:text-sm font-normal transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        ].join(" ");


    return (
        <div className={pageShell}>
            <Navbar />

            <div
                ref={containerRef}
                className="w-full flex flex-col lg:flex-row gap-0 p-0"
                style={isDesktop ? { height: `calc(100vh - ${navHeightPx}px)` } : undefined}
            >
                {/* LEFT PANE */}
                <div className={paneShell} style={isDesktop ? { width: leftPct } : undefined}>
                    <div className="shrink-0 p-0 bg-white/40 backdrop-blur-xl">
                        <div className="flex flex-wrap items-center gap-1 p-1">
                            <button className={tabBtn(activeTab === "description")} onClick={() => setActiveTab("description")}>
                                Description
                            </button>

                            <button className={tabBtn(activeTab === "submissions")} onClick={() => setActiveTab("submissions")}>
                                Previous Submissions
                            </button>
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-200/70" />

                    <div className={isDesktop ? "min-h-0 flex-1 overflow-y-auto p-0" : "p-0"}>
                        {activeTab === "description" && <CompetitionDescription challenge={challenge} />}
                        {activeTab === "submissions" && <CompetitionPreviousSubmissions challengeId={challenge.id} />}
                    </div>
                </div>

                {/* SPLITTER (desktop only) */}
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

                {/* RIGHT PANE */}
                <div className={paneShell} style={isDesktop ? { width: rightPct } : undefined}>
                    <div className="shrink-0 p-0 bg-white/40 backdrop-blur-xl">
                        <div className="text-sm sm:text-base font-normal text-slate-700 p-1">Submit</div>
                    </div>

                    <div className="h-px w-full bg-slate-200/70" />

                    <div className={isDesktop ? "min-h-0 flex-1 overflow-y-auto p-0" : "p-0"}>
                        <CompetitionAnswerSection challenge={challenge} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetitionPage;
