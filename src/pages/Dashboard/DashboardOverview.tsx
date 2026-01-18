// src/pages/dashboard/index.tsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import { motion } from "framer-motion";
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

import type { DashboardOverviewResponse, LoadingState } from "./types";
import { loadDashboard } from "./api";
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
        this.state = { hasError: false, message: "" };
    }

    static getDerivedStateFromError(err: any) {
        return { hasError: true, message: err?.message || "Something went wrong." };
    }

    componentDidCatch(err: any) {
        console.error("Dashboard render crash:", err);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                    <Navbar />
                    <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                        <div className="w-full rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm backdrop-blur-xl">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 text-rose-700" />
                                <div className="min-w-0">
                                    <h1 className="text-base sm:text-lg font-normal text-rose-700">Dashboard error</h1>
                                    <p className="mt-1 text-sm sm:text-base text-rose-700 break-words">
                                        {this.state.message}
                                    </p>
                                    <p className="mt-2 text-xs sm:text-sm text-rose-600">Refresh the page to recover.</p>
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
    const shell =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    return (
        <section className={shell}>
            <div className="px-4 md:px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {icon ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-slate-100/60 text-slate-600 shrink-0">
                                {icon}
                            </div>
                        ) : null}
                        <h2 className="text-base md:text-lg font-normal text-slate-700 truncate">{title}</h2>
                    </div>
                    {right}
                </div>
            </div>

            <div className="h-px w-full bg-slate-200/70" />

            <div className="px-4 md:px-5 pt-3 pb-4">{children}</div>
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
    const shell =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    return (
        <div className={shell}>
            <div className="px-4 md:px-5 py-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm md:text-base font-normal text-slate-600 truncate">
            {label}
          </span>
                    {icon ? <span className="text-slate-500 shrink-0">{icon}</span> : null}
                </div>

                <div className="text-3xl md:text-4xl font-normal text-slate-700 leading-none">
                    {value}
                </div>

                {hint ? <p className="text-xs sm:text-sm text-slate-500">{hint}</p> : null}
            </div>
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
        <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs sm:text-sm font-normal ${className}`}
        >
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
        <div className="flex flex-col gap-1.5 text-sm sm:text-base">
            <div className="flex justify-between gap-2 text-slate-600">
                <span className="truncate">{label}</span>
                <span className="font-normal text-slate-600 shrink-0">
          {value} <span className="text-slate-400">({percent}%)</span>
        </span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${percent}%` }} />
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

    const contests = useMemo(() => data?.contests ?? { ongoing: [], upcoming: [], recent_past: [] }, [data?.contests]);

    const topCategory = useMemo(
        () => data?.overall_stats.category_breakdown?.[0] ?? null,
        [data?.overall_stats.category_breakdown]
    );

    if (!data && !hasError) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                    <div className="w-full">
                        <div className="rounded-2xl border border-white/30 bg-white/55 p-4 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-11 w-11 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                                    <div className="space-y-2 min-w-0">
                                        <div className="h-6 w-56 bg-slate-200/80 rounded animate-pulse" />
                                        <div className="h-4 w-80 bg-slate-100 rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="h-9 w-28 bg-slate-200/80 rounded-full animate-pulse shrink-0" />
                            </div>
                        </div>
                        <p className="mt-3 text-center text-sm text-slate-600">Preparing your dashboard…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!data && hasError) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                    <div className="w-full">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm sm:text-base text-rose-700 flex items-start gap-3 shadow-sm backdrop-blur-xl">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal">We couldn’t load the dashboard data.</p>
                                <p className="text-sm mt-1 break-words text-rose-700">{errorMessage}</p>
                                <button
                                    type="button"
                                    onClick={load}
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white/70 px-4 py-2 text-sm font-normal text-rose-700 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
                                >
                                    <FiRefreshCw size={14} />
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
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    {/* Header */}
                    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50 text-slate-700 text-lg font-normal shrink-0">
                                {getInitial(username)}
                            </div>

                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight truncate">
                                    {username ? `Welcome, ${username}` : ""}
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-600">
                                    Track your practice, contests, and submission history in one place.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm sm:text-base">
                            {roleLabel ? (
                                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <FiShield className={data!.user.is_admin ? "text-emerald-600" : "text-slate-500"} />
                                    <span className="font-normal">{roleLabel}</span>
                                </div>
                            ) : null}

                            <button
                                type="button"
                                onClick={load}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm sm:text-base font-normal text-slate-600 shadow-sm hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:opacity-60"
                            >
                                <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
                                <span>{loading ? "Refreshing..." : "Refresh"}</span>
                            </button>
                        </div>
                    </header>

                    {/* Error banner */}
                    {hasError && (
                        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm sm:text-base text-rose-700 flex items-start gap-3 shadow-sm backdrop-blur-xl">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal">We couldn’t load the latest dashboard data.</p>
                                <p className="text-sm mt-1 break-words text-rose-700">{errorMessage}</p>
                                <button
                                    type="button"
                                    onClick={load}
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white/70 px-4 py-2 text-sm font-normal text-rose-700 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
                                >
                                    <FiRefreshCw size={14} />
                                    <span>Try again</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard label="Total Solved" value={loading ? "…" : overallSolved} hint="Practice + contests." icon={<FiAward />} />
                        <StatCard label="Attempted" value={loading ? "…" : overallAttempted} hint="All attempts counted." icon={<FiTarget />} />
                        <StatCard label="Success Rate" value={loading ? "…" : `${overallRate}%`} hint="Solved / Attempted." icon={<FiTrendingUp />} />
                        <StatCard label="Joined" value={loading ? "…" : joined} hint="Account creation date." icon={<FiClock />} />
                    </div>

                    {/* Main */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* Left */}
                        <div className="lg:col-span-2 flex flex-col gap-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <SectionCard title="Practice Progress" icon={<FiBookOpen />}>
                                    <div className="space-y-2.5 text-sm sm:text-base">
                                        <div className="flex justify-between gap-2 text-slate-600">
                                            <span>Total solved</span>
                                            <span className="font-normal text-slate-700">{data!.practice_stats.total_solved}</span>
                                        </div>
                                        <div className="flex justify-between gap-2 text-slate-600">
                                            <span>Total attempted</span>
                                            <span className="font-normal text-slate-700">{data!.practice_stats.total_attempted}</span>
                                        </div>

                                        <div className="mt-2.5 space-y-2.5">
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

                                <SectionCard title="Contest Progress" icon={<FiFlag />}>
                                    <div className="space-y-2.5 text-sm sm:text-base">
                                        <div className="flex justify-between gap-2 text-slate-600">
                                            <span>Solved in contests</span>
                                            <span className="font-normal text-slate-700">{data!.competition_stats.total_solved}</span>
                                        </div>
                                        <div className="flex justify-between gap-2 text-slate-600">
                                            <span>Attempted in contests</span>
                                            <span className="font-normal text-slate-700">{data!.competition_stats.total_attempted}</span>
                                        </div>

                                        <div className="mt-2.5 space-y-2.5">
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

                            <SectionCard title="Recent Submissions" icon={<FiActivity />}>
                                {submissions.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 text-sm sm:text-base text-slate-600 flex items-start gap-3">
                                        <FiInfo className="mt-0.5 text-slate-500" />
                                        <div>
                                            <p className="font-normal text-slate-700">No submissions yet</p>
                                            <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                                Solve a practice challenge or join a contest.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm sm:text-base">
                                            <thead>
                                            <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-600">
                                                <th className="py-2.5 pr-4 font-normal">Time</th>
                                                <th className="py-2.5 pr-4 font-normal">Challenge</th>
                                                <th className="py-2.5 pr-4 font-normal">Mode</th>
                                                <th className="py-2.5 pr-4 font-normal">Status</th>
                                                <th className="py-2.5 pr-4 font-normal">Contest</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {submissions.map((s) => (
                                                <tr
                                                    key={`${s.type}-${s.id}-${s.submitted_at}`}
                                                    className="border-b border-slate-100/70 last:border-0 hover:bg-white/60"
                                                >
                                                    <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                                                        {formatDateTime(s.submitted_at)}
                                                    </td>
                                                    <td className="py-2.5 pr-4 text-slate-700">{sanitizeTitle(s.challenge_title)}</td>
                                                    <td className="py-2.5 pr-4 text-slate-600">{safeString(s.question_type, "—")}</td>
                                                    <td className="py-2.5 pr-4">
                                                        <Pill className={statusPillClass(s.status)}>{safeString(s.status, "Unknown")}</Pill>
                                                    </td>
                                                    <td className="py-2.5 pr-4 text-slate-600">{s.contest_name || "—"}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </SectionCard>
                        </div>

                        {/* Right */}
                        <div className="flex flex-col gap-3">
                            <SectionCard title="Strongest Categories" icon={<FiTarget />}>
                                {data!.overall_stats.category_breakdown.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 text-sm sm:text-base text-slate-600 flex items-start gap-3">
                                        <FiInfo className="mt-0.5 text-slate-500" />
                                        <div>
                                            <p className="font-normal text-slate-700">No category data yet</p>
                                            <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                                Solve more problems to populate this.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 text-sm sm:text-base">
                                        {topCategory && (
                                            <div className="mb-2 rounded-2xl border border-white/30 bg-white/55 px-4 py-3 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Top Category</p>
                                                <p className="text-base md:text-lg font-normal text-slate-700">
                                                    {topCategory.category || "Uncategorized"}
                                                </p>
                                                <p className="text-xs text-slate-500">{topCategory.solved_count} solved</p>
                                            </div>
                                        )}

                                        <ul className="space-y-2">
                                            {data!.overall_stats.category_breakdown.map((cat) => (
                                                <li
                                                    key={`${cat.category_id ?? cat.category ?? "unknown"}-${cat.solved_count}`}
                                                    className="flex items-center justify-between gap-2 text-slate-600"
                                                >
                                                    <span className="truncate">{cat.category || "Uncategorized"}</span>
                                                    <span className="text-xs sm:text-sm text-slate-500 shrink-0">{cat.solved_count} solved</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </SectionCard>

                            <SectionCard
                                title="Contests"
                                icon={<FiFlag />}
                                right={
                                    <Pill className="bg-slate-100/70 text-slate-600 border border-slate-200/70">
                                        Ongoing {contests.ongoing.length}
                                    </Pill>
                                }
                            >
                                <div className="space-y-2.5 text-sm sm:text-base">
                                    {contests.ongoing.length === 0 &&
                                    contests.upcoming.length === 0 &&
                                    contests.recent_past.length === 0 ? (
                                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 text-sm sm:text-base text-slate-600 flex items-start gap-3">
                                            <FiInfo className="mt-0.5 text-slate-500" />
                                            <div>
                                                <p className="font-normal text-slate-700">No contests to show</p>
                                                <p className="mt-1 text-xs sm:text-sm text-slate-500">
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
                                                        className="rounded-2xl border border-white/30 bg-white/55 p-3 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="text-sm sm:text-base md:text-lg font-normal text-slate-700 truncate">
                                                                    {c.name}
                                                                </p>
                                                                <p className="mt-1 text-xs sm:text-sm text-slate-600 line-clamp-2">
                                                                    {c.description || "No description."}
                                                                </p>
                                                            </div>
                                                            <Pill className={st.cls}>{st.text}</Pill>
                                                        </div>
                                                        <p className="mt-2 text-xs sm:text-sm text-slate-600">
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
                        <p className="mt-4 text-center text-sm text-slate-600">Preparing your dashboard…</p>
                    ) : null}
                </motion.div>
            </main>
        </div>
    );
};

export default function DashboardPage() {
    return (
        <ErrorBoundary>
            <DashboardUI />
        </ErrorBoundary>
    );
}
