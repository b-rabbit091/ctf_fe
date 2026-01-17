// src/pages/dashboard/index.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Navbar from "../../components/Navbar";
import {motion} from "framer-motion";
import {
    FiTrendingUp,
    FiTarget,
    FiAward,
    FiClock,
    FiAlertCircle,
    FiRefreshCw,
    FiShield,
    FiActivity,
    FiFlag,
    FiBookOpen,
    FiInfo,
} from "react-icons/fi";

import type {DashboardOverviewResponse, LoadingState} from "./types";
import {loadDashboard} from "./api";
import {
    formatDate,
    formatDateTime,
    getInitial,
    safeString,
    safeNumber,
    safeUsername,
    sanitizeTitle,
    pct,
    normalizeDifficulty,
    dedupeSubmissions,
    statusPillClass,
    contestState,
} from "./utils";

/**
 * ErrorBoundary prevents blank screen if rendering crashes.
 */
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; message: string }
> {
    constructor(props: any) {
        super(props);
        this.state = {hasError: false, message: ""};
    }

    static getDerivedStateFromError(err: any) {
        return {hasError: true, message: err?.message || "Something went wrong."};
    }

    componentDidCatch(err: any) {
        console.error("Dashboard render crash:", err);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
                    <Navbar/>
                    <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                        <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 text-rose-700"/>
                                <div>
                                    <h1 className="text-lg md:text-xl font-semibold text-rose-900">Dashboard error</h1>
                                    <p className="mt-1 text-base md:text-lg text-rose-800">{this.state.message}</p>
                                    <p className="mt-2 text-sm text-rose-700">Refresh the page to recover.</p>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            );
        }
        return this.props.children;
    }
}

/**
 * Pure components (memo) for faster rendering.
 */
const SectionCard = memo(function SectionCard({
                                                  title,
                                                  icon,
                                                  right,
                                                  children,
                                              }: {
    title: string;
    icon?: React.ReactNode;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {icon && (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                            {icon}
                        </div>
                    )}
                    <h2 className="text-base md:text-lg font-semibold text-slate-900">{title}</h2>
                </div>
                {right}
            </div>
            {children}
        </section>
    );
});

const StatCard = memo(function StatCard({
                                            label,
                                            value,
                                            hint,
                                            icon,
                                        }: {
    label: string;
    value: React.ReactNode;
    hint?: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
                <span className="text-sm md:text-base font-medium text-slate-600">{label}</span>
                {icon ? <span className="text-slate-500">{icon}</span> : null}
            </div>
            <div className="text-3xl md:text-4xl font-semibold text-slate-900 leading-none">{value}</div>
            {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
        </div>
    );
});

const Pill = memo(function Pill({
                                    className = "",
                                    children,
                                }: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${className}`}>
            {children}
        </span>
    );
});

const DifficultyBar = memo(function DifficultyBar({
                                                      label,
                                                      value,
                                                      total,
                                                  }: {
    label: string;
    value: number;
    total: number;
}) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex flex-col gap-1.5 text-sm md:text-base">
            <div className="flex justify-between text-slate-600">
                <span>{label}</span>
                <span className="font-medium">
                    {value} <span className="text-slate-400">({percent}%)</span>
                </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{width: `${percent}%`}}/>
            </div>
        </div>
    );
});

const DashboardUI: React.FC = () => {
    const [data, setData] = useState<DashboardOverviewResponse | null>(null);
    const [state, setState] = useState<LoadingState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const loading = state === "loading";
    const hasError = state === "error";

    const load = useCallback(async () => {
        setState("loading");
        setErrorMessage(null);

        const res = await loadDashboard();
        if (!mounted.current) return;

        if (res.ok) {
            setData(res.data);
            setState("success");
        } else {
            setErrorMessage(res.message);
            setState("error");
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const username = useMemo(() => safeUsername(data?.user.username), [data?.user.username]);
    const roleLabel = useMemo(() => (data?.user.role ?? ""), [data?.user.role]);

    const overallSolved = useMemo(
        () => safeNumber(data?.overall_stats.total_solved, 0),
        [data?.overall_stats.total_solved]
    );
    const overallAttempted = useMemo(
        () => safeNumber(data?.overall_stats.total_attempted, 0),
        [data?.overall_stats.total_attempted]
    );
    const overallRate = useMemo(() => pct(overallSolved, overallAttempted), [overallSolved, overallAttempted]);

    const practiceDiff = useMemo(
        () => normalizeDifficulty(data?.practice_stats.difficulty),
        [data?.practice_stats.difficulty]
    );
    const contestDiff = useMemo(
        () => normalizeDifficulty(data?.competition_stats.difficulty),
        [data?.competition_stats.difficulty]
    );

    const submissions = useMemo(() => {
        const list = data?.recent_submissions ?? [];
        return dedupeSubmissions(list).slice(0, 20);
    }, [data?.recent_submissions]);

    const contests = useMemo(() => data?.contests ?? {ongoing: [], upcoming: [], recent_past: []}, [data?.contests]);

    const topCategory = useMemo(
        () => data?.overall_stats.category_breakdown?.[0] ?? null,
        [data?.overall_stats.category_breakdown]
    );

    if (!data && !hasError) {
        return (
            <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-slate-200 animate-pulse"/>
                                    <div className="space-y-2">
                                        <div className="h-6 w-64 bg-slate-200 rounded animate-pulse"/>
                                        <div className="h-4 w-96 bg-slate-100 rounded animate-pulse"/>
                                    </div>
                                </div>
                                <div className="h-9 w-28 bg-slate-200 rounded-full animate-pulse"/>
                            </div>
                        </div>
                        <p className="mt-4 text-center text-sm text-slate-500">Preparing your dashboard…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!data && hasError) {
        return (
            <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-base text-rose-800 flex items-start gap-3 shadow-sm">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
                            <div className="min-w-0">
                                <p className="font-medium">We couldn’t load the dashboard data.</p>
                                <p className="text-sm mt-1 break-words">{errorMessage}</p>
                                <button
                                    type="button"
                                    onClick={load}
                                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50"
                                >
                                    <FiRefreshCw size={14}/>
                                    <span>Try again</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const joined = formatDate(data!.user.date_joined);

    return (
        <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
            <Navbar/>

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    {/* Header */}
                    <header className="mb-6 flex flex-wrap items-start justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white text-xl font-semibold">
                                {getInitial(username)}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
                                    {username ? `Welcome back, ${username}` : ""}
                                </h1>
                                <p className="mt-1 text-sm sm:text-base md:text-lg text-slate-600">
                                    Track your practice, contests, and submission history in one place.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm sm:text-base">
                            {roleLabel ? (
                                <div className="rounded-full bg-white border border-slate-200 px-4 py-2 flex items-center gap-2 text-slate-600 shadow-sm">
                                    <FiShield className={data!.user.is_admin ? "text-emerald-600" : "text-slate-500"}/>
                                    <span className="font-medium">{roleLabel}</span>
                                </div>
                            ) : null}

                            <button
                                type="button"
                                onClick={load}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm sm:text-base font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                                <FiRefreshCw className={loading ? "animate-spin" : ""} size={16}/>
                                <span>{loading ? "Refreshing..." : "Refresh"}</span>
                            </button>
                        </div>
                    </header>

                    {/* Error banner (non-blocking) */}
                    {hasError && (
                        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-base text-rose-800 flex items-start gap-3 shadow-sm">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
                            <div className="min-w-0">
                                <p className="font-medium">We couldn’t load the latest dashboard data.</p>
                                <p className="text-sm mt-1 break-words">{errorMessage}</p>
                                <button
                                    type="button"
                                    onClick={load}
                                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50"
                                >
                                    <FiRefreshCw size={14}/>
                                    <span>Try again</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="mb-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Solved"
                            value={loading ? "…" : overallSolved}
                            hint="Practice + contests."
                            icon={<FiAward className="text-amber-500"/>}
                        />
                        <StatCard
                            label="Attempted"
                            value={loading ? "…" : overallAttempted}
                            hint="All attempts counted."
                            icon={<FiTarget className="text-emerald-500"/>}
                        />
                        <StatCard
                            label="Success Rate"
                            value={loading ? "…" : `${overallRate}%`}
                            hint="Solved / Attempted."
                            icon={<FiTrendingUp className="text-sky-500"/>}
                        />
                        <StatCard
                            label="Joined"
                            value={loading ? "…" : joined}
                            hint="Account creation date."
                            icon={<FiClock className="text-slate-500"/>}
                        />
                    </div>

                    {/* Main */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Left */}
                        <div className="lg:col-span-2 flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SectionCard title="Practice Progress" icon={<FiBookOpen/>}>
                                    <div className="space-y-3 text-sm sm:text-base md:text-lg">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Total solved</span>
                                            <span className="font-semibold">{data!.practice_stats.total_solved}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Total attempted</span>
                                            <span className="font-semibold">{data!.practice_stats.total_attempted}</span>
                                        </div>
                                        <div className="mt-3 space-y-3">
                                            {Object.entries(practiceDiff).map(([k, v]) => (
                                                <DifficultyBar
                                                    key={`p-${k}`}
                                                    label={k}
                                                    value={v}
                                                    total={data!.practice_stats.total_solved || 1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard title="Contest Progress" icon={<FiFlag/>}>
                                    <div className="space-y-3 text-sm sm:text-base md:text-lg">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Solved in contests</span>
                                            <span className="font-semibold">{data!.competition_stats.total_solved}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Attempted in contests</span>
                                            <span className="font-semibold">{data!.competition_stats.total_attempted}</span>
                                        </div>
                                        <div className="mt-3 space-y-3">
                                            {Object.entries(contestDiff).map(([k, v]) => (
                                                <DifficultyBar
                                                    key={`c-${k}`}
                                                    label={k}
                                                    value={v}
                                                    total={data!.competition_stats.total_solved || 1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </SectionCard>
                            </div>

                            <SectionCard title="Recent Submissions" icon={<FiActivity/>}>
                                {submissions.length === 0 ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-700 flex items-start gap-3">
                                        <FiInfo className="mt-0.5 text-slate-500"/>
                                        <div>
                                            <p className="font-medium">No submissions yet</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Solve a practice challenge or join a contest.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm sm:text-base">
                                            <thead>
                                            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                                                <th className="py-3 pr-4">Time</th>
                                                <th className="py-3 pr-4">Challenge</th>
                                                <th className="py-3 pr-4">Mode</th>
                                                <th className="py-3 pr-4">Status</th>
                                                <th className="py-3 pr-4">Contest</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {submissions.map((s) => (
                                                <tr
                                                    key={`${s.type}-${s.id}-${s.submitted_at}`}
                                                    className="border-b border-slate-100 last:border-0"
                                                >
                                                    <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                                                        {formatDateTime(s.submitted_at)}
                                                    </td>
                                                    <td className="py-3 pr-4 text-slate-800">
                                                        {sanitizeTitle(s.challenge_title)}
                                                    </td>
                                                    <td className="py-3 pr-4 text-slate-600">
                                                        {safeString(s.question_type, "—")}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <Pill className={statusPillClass(s.status)}>
                                                            {safeString(s.status, "Unknown")}
                                                        </Pill>
                                                    </td>
                                                    <td className="py-3 pr-4 text-slate-600">
                                                        {s.contest_name || "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </SectionCard>
                        </div>

                        {/* Right */}
                        <div className="flex flex-col gap-5">
                            <SectionCard title="Strongest Categories" icon={<FiTarget/>}>
                                {data!.overall_stats.category_breakdown.length === 0 ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-700 flex items-start gap-3">
                                        <FiInfo className="mt-0.5 text-slate-500"/>
                                        <div>
                                            <p className="font-medium">No category data yet</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Solve more problems to populate this.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-sm sm:text-base">
                                        {topCategory && (
                                            <div className="mb-2 rounded-xl bg-slate-900 text-slate-50 px-4 py-3">
                                                <p className="text-xs uppercase tracking-wide text-slate-300">Top Category</p>
                                                <p className="text-lg font-semibold">{topCategory.category || "Uncategorized"}</p>
                                                <p className="text-xs text-slate-300">{topCategory.solved_count} solved</p>
                                            </div>
                                        )}
                                        <ul className="space-y-2">
                                            {data!.overall_stats.category_breakdown.map((cat) => (
                                                <li
                                                    key={`${cat.category_id ?? cat.category ?? "unknown"}-${cat.solved_count}`}
                                                    className="flex items-center justify-between text-slate-700"
                                                >
                                                    <span className="truncate">{cat.category || "Uncategorized"}</span>
                                                    <span className="text-sm text-slate-500">{cat.solved_count} solved</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </SectionCard>

                            <SectionCard
                                title="Contests"
                                icon={<FiFlag/>}
                                right={<Pill className="bg-slate-100 text-slate-700">Ongoing {contests.ongoing.length}</Pill>}
                            >
                                <div className="space-y-3 text-sm sm:text-base">
                                    {contests.ongoing.length === 0 &&
                                    contests.upcoming.length === 0 &&
                                    contests.recent_past.length === 0 ? (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-base text-slate-700 flex items-start gap-3">
                                            <FiInfo className="mt-0.5 text-slate-500"/>
                                            <div>
                                                <p className="font-medium">No contests to show</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    When contests exist, they’ll appear here.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {contests.ongoing.slice(0, 3).map((c) => {
                                                const st = contestState(c);
                                                return (
                                                    <div
                                                        key={`on-${c.id}-${c.slug}`}
                                                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-base md:text-lg font-semibold text-slate-900 truncate">
                                                                    {c.name}
                                                                </p>
                                                                <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                                                                    {c.description || "No description."}
                                                                </p>
                                                            </div>
                                                            <Pill className={st.cls}>{st.text}</Pill>
                                                        </div>
                                                        <p className="mt-3 text-sm text-slate-600">
                                                            {formatDateTime(c.start_time)} → {formatDateTime(c.end_time)}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            </SectionCard>
                        </div>
                    </div>

                    {state === "loading" ? (
                        <p className="mt-6 text-center text-sm text-slate-500">Preparing your dashboard…</p>
                    ) : null}
                </motion.div>
            </main>
        </div>
    );
};

export default function DashboardPage() {
    return (
        <ErrorBoundary>
            <DashboardUI/>
        </ErrorBoundary>
    );
}
