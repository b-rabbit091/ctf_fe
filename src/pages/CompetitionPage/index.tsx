import React, {useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {getChallengeById} from "./api";
import {Challenge} from "./types";
import CompetitionDescription from "./CompetitionDescription";
import CompetitionAnswerSection from "./CompetitionAnswerSection";
import CompetitionPreviousSubmissions from "./CompetitionPreviousSubmissions";


const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

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

/* ---------- component ---------- */

const CompetitionPage: React.FC = () => {
    const {id} = useParams<{ id: string }>();

    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] =
        useState<"description" | "submissions">("description");

    const isDesktop = useIsDesktop();

    // same split behavior as PracticePage
    const [rightRatio, setRightRatio] = useState<number>(
        () => readStoredRatio() ?? 0.5
    );

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
            localStorage.setItem(
                STORAGE_KEY,
                String(clamp(rightRatio, 0.25, 0.6))
            );
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

            setRightRatio(
                clamp(dragRef.current.startRatio - delta, 0.25, 0.6)
            );
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
    if (loading)
        return <p className="p-6 text-gray-500">Loading challenge...</p>;
    if (error || !challenge)
        return <p className="p-6 text-red-500">{error}</p>;

    const leftPct = `${((1 - rightRatio) * 100).toFixed(1)}%`;
    const rightPct = `${(rightRatio * 100).toFixed(1)}%`;

    return (
        <div className="min-h-screen w-full bg-[#f5f5f5] text-sm font-sans">
            <Navbar/>

            <div
                ref={containerRef}
                className="w-full flex flex-col lg:flex-row gap-3 lg:gap-0"
                style={isDesktop ? {height: `calc(100vh - ${navHeightPx}px)`} : undefined}
            >
                {/* LEFT PANE */}
                <div
                    className="flex min-w-0 flex-col overflow-hidden border border-gray-200 bg-white"
                    style={isDesktop ? {width: leftPct} : undefined}
                >
                    {/* Tabs */}
                    <div className="flex shrink-0 border-b border-gray-200">
                        <button
                            className={`px-6 py-3 font-medium ${
                                activeTab === "description"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                            onClick={() => setActiveTab("description")}
                        >
                            Description
                        </button>

                        <button
                            className={`ml-4 px-6 py-3 font-medium ${
                                activeTab === "submissions"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                            onClick={() => setActiveTab("submissions")}
                        >
                            Previous Submissions
                        </button>
                    </div>

                    {/* Scroll area */}
                    <div className={isDesktop ? "min-h-0 flex-1 overflow-y-auto p-4" : "p-4"}>
                        {activeTab === "description" && (
                            <CompetitionDescription challenge={challenge}/>
                        )}
                        {activeTab === "submissions" && (
                            <CompetitionPreviousSubmissions challengeId={challenge.id}/>
                        )}
                    </div>
                </div>

                {/* SPLITTER (desktop only) */}
                {isDesktop && (
                    <div className="hidden lg:flex items-stretch">
                        <div
                            onMouseDown={startDrag}
                            className="group relative w-3 cursor-col-resize"
                            role="separator"
                            aria-orientation="vertical"
                        >
                            <div
                                className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-200 group-hover:bg-blue-400"/>
                            <div className="absolute inset-0"/>
                        </div>
                    </div>
                )}

                {/* RIGHT PANE */}
                <div
                    className="flex min-w-0 flex-col overflow-hidden border border-gray-200 bg-white"
                    style={isDesktop ? {width: rightPct} : undefined}
                >
                    <div className="shrink-0 border-b border-gray-200 px-4 py-3 font-medium text-gray-700">
                        Submit
                    </div>

                    <div className={isDesktop ? "min-h-0 flex-1 overflow-y-auto p-4" : "p-4"}>
                        <CompetitionAnswerSection challenge={challenge}/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetitionPage;
