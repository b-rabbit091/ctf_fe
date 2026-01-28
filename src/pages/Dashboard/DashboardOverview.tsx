// src/pages/dashboard/index.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Navbar from "../../components/Navbar";
import {
    FiActivity,
    FiAlertCircle,
    FiAward,
    FiClock,
    FiFlag,
    FiInfo,
    FiRefreshCw,
    FiShield,
    FiTarget,
    FiTrendingUp,
} from "react-icons/fi";

import type {DashboardOverviewResponse, LoadingState} from "./types";
import {loadDashboard} from "./api";
import {
    dedupeSubmissions,
    formatDate,
    formatDateTime,
    getInitial,
    normalizeDifficulty,
    pct,
    safeNumber,
    safeString,
    safeUsername,
    sanitizeTitle,
    statusPillClass,
    contestState,
} from "./utils";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
    state = {hasError: false};
    static getDerivedStateFromError() {
        return {hasError: true};
    }
    componentDidCatch(err: any) {
        console.error("Dashboard crash:", err);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans">
                    <Navbar />
                    <main className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-base sm:text-lg font-normal tracking-tight">Something went wrong</p>
                                    <p className="mt-1 text-sm sm:text-base text-rose-700/90">
                                        Please refresh the page to recover.
                                    </p>
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

const Card = memo(function Card({
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
        <section className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
            <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    {icon ? (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 shrink-0">
                            {icon}
                        </span>
                    ) : null}
                    <h2 className="min-w-0 truncate text-base sm:text-lg font-normal tracking-tight text-slate-700">
                        {title}
                    </h2>
                </div>
                {right}
            </div>
            <div className="h-px bg-slate-200/70" />
            <div className="px-4 sm:px-5 py-4">{children}</div>
        </section>
    );
});

const Stat = memo(function Stat({
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
        <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
            <div className="px-4 sm:px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-normal tracking-tight text-slate-600 truncate">{label}</p>
                    {icon ? <span className="text-indigo-500/80 shrink-0">{icon}</span> : null}
                </div>
                <div className="mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-700 leading-none">
                    {value}
                </div>
                {hint ? <p className="mt-2 text-xs sm:text-sm text-slate-500">{hint}</p> : null}
            </div>
        </div>
    );
});

const Pill = memo(function Pill({className, children}: {className: string; children: React.ReactNode}) {
    return (
        <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs sm:text-sm font-normal tracking-tight ring-1", className)}>
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
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm sm:text-base">
                <span className="truncate text-slate-600 font-normal tracking-tight">{label}</span>
                <span className="shrink-0 text-slate-500 font-normal tracking-tight">
                    {value} <span className="text-slate-400">({percent}%)</span>
                </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/60">
                {/* no black */}
                <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300 transition-all"
                    style={{width: `${percent}%`}}
                />
            </div>
        </div>
    );
});

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const DashboardUI: React.FC = () => {
    const [data, setData] = useState<DashboardOverviewResponse | null>(null);
    const [state, setState] = useState<LoadingState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // avoid setState after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const loading = state === "loading";
    const hasError = state === "error";

    const refresh = useCallback(async () => {
        setState("loading");
        setErrorMessage(null);

        const res = await loadDashboard();
        if (!alive.current) return;

        if (res.ok) {
            setData(res.data);
            setState("success");
        } else {
            setErrorMessage(res.message);
            setState("error");
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const username = useMemo(() => safeUsername(data?.user.username), [data?.user.username]);
    const roleLabel = data?.user.role ?? "";
    const joined = data ? formatDate(data.user.date_joined) : "—";

    const overallSolved = safeNumber(data?.overall_stats.total_solved, 0);
    const overallAttempted = safeNumber(data?.overall_stats.total_attempted, 0);
    const overallRate = pct(overallSolved, overallAttempted);

    const practiceDiff = normalizeDifficulty(data?.practice_stats.difficulty);
    const contestDiff = normalizeDifficulty(data?.competition_stats.difficulty);

    const submissions = useMemo(
        () => dedupeSubmissions(data?.recent_submissions ?? []).slice(0, 20),
        [data?.recent_submissions]
    );

    const contests = data?.contests ?? {ongoing: [], upcoming: [], recent_past: []};
    const topCategory = data?.overall_stats.category_breakdown?.[0] ?? null;

    const Shell: React.FC<{children: React.ReactNode}> = ({children}) => (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">{children}</main>
        </div>
    );

    if (!data && !hasError) {
        return (
            <Shell>
                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                            <div className="min-w-0 space-y-2">
                                <div className="h-5 w-52 bg-slate-200/80 rounded animate-pulse" />
                                <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="h-9 w-28 bg-slate-200/80 rounded-full animate-pulse shrink-0" />
                    </div>
                </div>
                <p className="mt-3 text-center text-sm text-slate-500">Preparing your dashboard…</p>
            </Shell>
        );
    }

    if (!data && hasError) {
        return (
            <Shell>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                    <div className="flex items-start gap-3">
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                            <p className="font-normal tracking-tight">Couldn’t load dashboard data</p>
                            <p className="mt-1 text-sm break-words text-rose-700/90">{errorMessage}</p>
                            <button
                                type="button"
                                onClick={refresh}
                                className={cx(
                                    "mt-3 inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                    "ring-1 ring-rose-200 hover:bg-white/90",
                                    focusRing
                                )}
                            >
                                <FiRefreshCw size={14} />
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            {/* Header */}
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 font-normal tracking-tight shrink-0">
                        {getInitial(username)}
                    </div>

                    <div className="min-w-0">
                        <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                            {username ? `Welcome, ${username}` : "Welcome"}
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-500">
                            Practice, contests, and submissions — all in one view.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {roleLabel ? (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-white/65 ring-1 ring-slate-200/60 px-3 py-2 text-sm font-normal tracking-tight text-slate-600">
                            <FiShield className={data!.user.is_admin ? "text-emerald-600" : "text-slate-500"} />
                            {roleLabel}
                        </div>
                    ) : null}

                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                            "ring-1 ring-slate-200/60 hover:bg-white/90 disabled:opacity-60",
                            focusRing
                        )}
                    >
                        <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </header>

            {/* Soft error banner */}
            {hasError ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                    <div className="flex items-start gap-3">
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                            <p className="font-normal tracking-tight">Couldn’t refresh latest data</p>
                            <p className="mt-1 text-sm break-words text-rose-700/90">{errorMessage}</p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Stats */}
            <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Total Solved" value={loading ? "…" : overallSolved} hint="Practice + contests" icon={<FiAward />} />
                <Stat label="Attempted" value={loading ? "…" : overallAttempted} hint="All attempts" icon={<FiTarget />} />
                <Stat label="Success Rate" value={loading ? "…" : `${overallRate}%`} hint="Solved / Attempted" icon={<FiTrendingUp />} />
                <Stat label="Joined" value={loading ? "…" : joined} hint="Account created" icon={<FiClock />} />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Left */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Card title="Practice Progress" icon={<FiTarget />}>
                            <div className="space-y-2.5">
                                <div className="flex justify-between gap-2 text-sm sm:text-base">
                                    <span className="text-slate-500 font-normal tracking-tight">Solved</span>
                                    <span className="text-slate-700 font-normal tracking-tight">{data!.practice_stats.total_solved}</span>
                                </div>
                                <div className="flex justify-between gap-2 text-sm sm:text-base">
                                    <span className="text-slate-500 font-normal tracking-tight">Attempted</span>
                                    <span className="text-slate-700 font-normal tracking-tight">{data!.practice_stats.total_attempted}</span>
                                </div>

                                <div className="pt-2 space-y-3">
                                    {Object.entries(practiceDiff).map(([k, v]) => (
                                        <DifficultyBar key={`p-${k}`} label={k} value={v} total={data!.practice_stats.total_solved || 1} />
                                    ))}
                                </div>
                            </div>
                        </Card>

                        <Card title="Contest Progress" icon={<FiFlag />}>
                            <div className="space-y-2.5">
                                <div className="flex justify-between gap-2 text-sm sm:text-base">
                                    <span className="text-slate-500 font-normal tracking-tight">Solved</span>
                                    <span className="text-slate-700 font-normal tracking-tight">{data!.competition_stats.total_solved}</span>
                                </div>
                                <div className="flex justify-between gap-2 text-sm sm:text-base">
                                    <span className="text-slate-500 font-normal tracking-tight">Attempted</span>
                                    <span className="text-slate-700 font-normal tracking-tight">{data!.competition_stats.total_attempted}</span>
                                </div>

                                <div className="pt-2 space-y-3">
                                    {Object.entries(contestDiff).map(([k, v]) => (
                                        <DifficultyBar key={`c-${k}`} label={k} value={v} total={data!.competition_stats.total_solved || 1} />
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card title="Recent Submissions" icon={<FiActivity />}>
                        {submissions.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50/60 ring-1 ring-slate-200/60 p-4">
                                <div className="flex items-start gap-3">
                                    <FiInfo className="mt-0.5 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="font-normal tracking-tight text-slate-700">No submissions yet</p>
                                        <p className="mt-1 text-sm text-slate-500">Solve a practice challenge or join a contest.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm sm:text-base">
                                    <thead>
                                    <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
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
                                            className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition"
                                        >
                                            <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">
                                                {formatDateTime(s.submitted_at)}
                                            </td>
                                            <td className="py-2.5 pr-4 text-slate-700 tracking-tight">
                                                {sanitizeTitle(s.challenge_title)}
                                            </td>
                                            <td className="py-2.5 pr-4 text-slate-500">
                                                {safeString(s.question_type, "—")}
                                            </td>
                                            <td className="py-2.5 pr-4">
                                                <Pill className={statusPillClass(s.status)}>{safeString(s.status, "Unknown")}</Pill>
                                            </td>
                                            <td className="py-2.5 pr-4 text-slate-500">
                                                {s.contest_name || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right */}
                <div className="flex flex-col gap-3">
                    <Card title="Strongest Categories" icon={<FiTarget />}>
                        {data!.overall_stats.category_breakdown.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50/60 ring-1 ring-slate-200/60 p-4">
                                <div className="flex items-start gap-3">
                                    <FiInfo className="mt-0.5 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="font-normal tracking-tight text-slate-700">No category data yet</p>
                                        <p className="mt-1 text-sm text-slate-500">Solve more problems to populate this.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topCategory ? (
                                    <div className="rounded-2xl bg-indigo-50/60 ring-1 ring-indigo-200/50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-indigo-600/80 font-normal">Top Category</p>
                                        <p className="mt-1 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                            {topCategory.category || "Uncategorized"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">{topCategory.solved_count} solved</p>
                                    </div>
                                ) : null}

                                <ul className="space-y-2">
                                    {data!.overall_stats.category_breakdown.map((cat) => (
                                        <li
                                            key={`${cat.category_id ?? cat.category ?? "unknown"}-${cat.solved_count}`}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span className="truncate text-slate-600 font-normal tracking-tight">
                                                {cat.category || "Uncategorized"}
                                            </span>
                                            <span className="shrink-0 text-sm text-slate-500 font-normal tracking-tight">
                                                {cat.solved_count} solved
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </Card>

                    <Card
                        title="Contests"
                        icon={<FiFlag />}
                        right={
                            <Pill className="bg-indigo-50 text-indigo-700 ring-indigo-200/60">
                                Ongoing {contests.ongoing.length}
                            </Pill>
                        }
                    >
                        {contests.ongoing.length === 0 &&
                        contests.upcoming.length === 0 &&
                        contests.recent_past.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50/60 ring-1 ring-slate-200/60 p-4">
                                <div className="flex items-start gap-3">
                                    <FiInfo className="mt-0.5 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="font-normal tracking-tight text-slate-700">No contests to show</p>
                                        <p className="mt-1 text-sm text-slate-500">When contests exist, they’ll appear here.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {contests.ongoing.slice(0, 3).map((c) => {
                                    const st = contestState(c);
                                    return (
                                        <div key={`on-${c.id}-${c.slug}`} className="rounded-2xl bg-white/60 ring-1 ring-slate-200/60 p-3 shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm sm:text-base font-normal tracking-tight text-slate-700">
                                                        {c.name}
                                                    </p>
                                                    <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-2">
                                                        {c.description || "No description."}
                                                    </p>
                                                </div>
                                                <Pill className={st.cls}>{st.text}</Pill>
                                            </div>
                                            <p className="mt-2 text-xs sm:text-sm text-slate-500">
                                                {formatDateTime(c.start_time)} → {formatDateTime(c.end_time)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {state === "loading" ? (
                <p className="mt-4 text-center text-sm text-slate-500">Preparing your dashboard…</p>
            ) : null}
        </Shell>
    );
};

export default function DashboardPage() {
    return (
        <ErrorBoundary>
            <DashboardUI />
        </ErrorBoundary>
    );
}
