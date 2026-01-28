// src/components/dashboard/DashboardOverview.tsx
import React, { useEffect, useState, useMemo } from "react";
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
} from "react-icons/fi";
import {
    DashboardOverview as DashboardOverviewType,
    DashboardError, getDashboardOverview,
} from "../../api/dashboard";

type LoadingState = "idle" | "loading" | "success" | "error";

const difficultyColors: Record<string, string> = {
    Easy: "bg-emerald-50 text-emerald-700",
    Medium: "bg-amber-50 text-amber-700",
    Hard: "bg-rose-50 text-rose-700",
};

const DashboardOverview: React.FC = () => {
    const [data, setData] = useState<DashboardOverviewType | null>(null);
    const [state, setState] = useState<LoadingState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const load = async () => {
        setState("loading");
        setErrorMessage(null);
        try {
            const result = await getDashboardOverview();
            setData(result);
            setState("success");
        } catch (err) {
            console.error("Failed to load dashboard overview:", err);
            if (err instanceof DashboardError) {
                if (err.status === 401) {
                    setErrorMessage(
                        "Your session has expired or you are not logged in. Please sign in again."
                    );
                } else if (err.status === 403) {
                    setErrorMessage(
                        "You do not have permission to access this dashboard."
                    );
                } else if (err.status === 500) {
                    setErrorMessage(
                        "Something went wrong on our side. Please try again in a few moments."
                    );
                } else {
                    setErrorMessage(err.message || "Unable to load dashboard.");
                }
            } else {
                setErrorMessage(
                    "We could not reach the server. Please check your internet connection."
                );
            }
            setState("error");
        }
    };

    useEffect(() => {
        load();
    }, []);

    const loading = state === "loading";
    const hasError = state === "error";

    const totalSolved = data?.overall_stats.total_solved ?? 0;
    const totalAttempted = data?.overall_stats.total_attempted ?? 0;
    const solvedRate =
        totalAttempted > 0
            ? Math.round((totalSolved / totalAttempted) * 100)
            : 0;

    const topCategory = useMemo(() => {
        if (!data || data.overall_stats.category_breakdown.length === 0) return null;
        return data.overall_stats.category_breakdown[0];
    }, [data]);

    const formatDateTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleString();
        } catch {
            return iso;
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString();
        } catch {
            return iso;
        }
    };

    // Simple percentage bars for difficulty
    const DifficultyBar: React.FC<{
        label: string;
        value: number;
        total: number;
    }> = ({ label, value, total }) => {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
            <div className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between text-slate-600">
                    <span>{label}</span>
                    <span className="font-medium">
                        {value} <span className="text-slate-400">({pct}%)</span>
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-slate-900 transition-all"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        );
    };

    const SectionCard: React.FC<{
        title: string;
        icon?: React.ReactNode;
        children: React.ReactNode;
    }> = ({ title, icon, children }) => (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2">
                {icon && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        {icon}
                    </div>
                )}
                <h2 className="text-sm md:text-base font-semibold text-slate-900">
                    {title}
                </h2>
            </div>
            {children}
        </section>
    );

    return (
        <main className="w-full px-4 py-6 md:py-8 bg-slate-50">
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-6xl"
            >
                {/* Header */}
                <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-white text-xl font-semibold">
                            {data?.user.username
                                ? data.user.username.charAt(0).toUpperCase()
                                : "U"}
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                                {data?.user.username
                                    ? `Welcome back, ${data.user.username}`
                                    : "Your DashboardOverview"}
                            </h1>
                            <p className="mt-1 text-xs md:text-sm text-slate-500">
                                Track your practice, contests, and submission history in one
                                place.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs md:text-sm">
                        <div className="rounded-full bg-white border border-slate-200 px-3 py-1.5 flex items-center gap-2 text-slate-600 shadow-sm">
                            <FiShield className="text-emerald-600" />
                            <span className="font-medium">
                                {data?.user.role || "Student"}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={load}
                            disabled={loading}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                            <FiRefreshCw
                                className={loading ? "animate-spin" : ""}
                                size={14}
                            />
                            <span>{loading ? "Refreshing..." : "Refresh"}</span>
                        </button>
                    </div>
                </header>

                {/* Error banner */}
                {hasError && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start gap-2 shadow-sm">
                        <FiAlertCircle className="mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">We couldn’t load your dashboard.</p>
                            <p className="text-xs mt-1">{errorMessage}</p>
                            <button
                                type="button"
                                onClick={load}
                                className="mt-2 inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50"
                            >
                                <FiRefreshCw size={12} />
                                <span>Try again</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Top stats cards */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                                Total Solved
                            </span>
                            <FiAward className="text-amber-500" />
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {loading ? "…" : totalSolved}
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Across practice and contests combined.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                                Problems Attempted
                            </span>
                            <FiTarget className="text-emerald-500" />
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {loading ? "…" : totalAttempted}
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Every challenge you’ve tried at least once.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                                Success Rate
                            </span>
                            <FiTrendingUp className="text-sky-500" />
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                            {loading ? "…" : `${solvedRate}%`}
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Solved vs attempted challenges.
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                                Joined
                            </span>
                            <FiClock className="text-slate-500" />
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                            {loading || !data
                                ? "…"
                                : formatDate(data.user.date_joined)}
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Your account creation date.
                        </p>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left column: practice & competition stats */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        {/* Practice vs Competition */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SectionCard
                                title="Practice Progress"
                                icon={<FiBookOpen />}
                            >
                                {loading || !data ? (
                                    <p className="text-xs text-slate-500">
                                        Loading your practice stats…
                                    </p>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Total solved</span>
                                            <span className="font-semibold">
                                                {data.practice_stats.total_solved}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Total attempted</span>
                                            <span className="font-semibold">
                                                {data.practice_stats.total_attempted}
                                            </span>
                                        </div>
                                        <div className="mt-2 space-y-2">
                                            {Object.entries(
                                                data.practice_stats.difficulty
                                            ).map(([label, value]) => (
                                                <DifficultyBar
                                                    key={`practice-${label}`}
                                                    label={label}
                                                    value={value}
                                                    total={
                                                        data.practice_stats.total_solved || 1
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </SectionCard>

                            <SectionCard
                                title="Contest Progress"
                                icon={<FiFlag />}
                            >
                                {loading || !data ? (
                                    <p className="text-xs text-slate-500">
                                        Loading your contest stats…
                                    </p>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Solved in contests</span>
                                            <span className="font-semibold">
                                                {data.competition_stats.total_solved}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Attempted in contests</span>
                                            <span className="font-semibold">
                                                {data.competition_stats.total_attempted}
                                            </span>
                                        </div>
                                        <div className="mt-2 space-y-2">
                                            {Object.entries(
                                                data.competition_stats.difficulty
                                            ).map(([label, value]) => (
                                                <DifficultyBar
                                                    key={`comp-${label}`}
                                                    label={label}
                                                    value={value}
                                                    total={
                                                        data.competition_stats.total_solved || 1
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        </div>

                        {/* Recent submissions */}
                        <SectionCard
                            title="Recent Submissions"
                            icon={<FiActivity />}
                        >
                            {loading || !data ? (
                                <p className="text-xs text-slate-500">
                                    Loading your submission history…
                                </p>
                            ) : data.recent_submissions.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                    You don’t have any submissions yet. Try solving a
                                    practice challenge or joining a contest.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs md:text-sm">
                                        <thead>
                                        <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                                            <th className="py-2 pr-4">Time</th>
                                            <th className="py-2 pr-4">Challenge</th>
                                            <th className="py-2 pr-4">Mode</th>
                                            <th className="py-2 pr-4">Status</th>
                                            <th className="py-2 pr-4">Contest</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {data.recent_submissions.map((s) => (
                                            <tr
                                                key={`${s.type}-${s.id}`}
                                                className="border-b border-slate-100 last:border-0"
                                            >
                                                <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">
                                                    {formatDateTime(s.submitted_at)}
                                                </td>
                                                <td className="py-2 pr-4 text-slate-800">
                                                    {s.challenge_title || "Untitled"}
                                                </td>
                                                <td className="py-2 pr-4 text-slate-600">
                                                    {s.question_type === "competition"
                                                        ? "Contest"
                                                        : "Practice"}
                                                </td>
                                                <td className="py-2 pr-4">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                                s.status &&
                                                                s.status.toLowerCase() ===
                                                                "solved"
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : "bg-slate-100 text-slate-600"
                                                            }`}
                                                        >
                                                            {s.status || "Unknown"}
                                                        </span>
                                                </td>
                                                <td className="py-2 pr-4 text-slate-600">
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

                    {/* Right column: categories + contests */}
                    <div className="flex flex-col gap-5">
                        {/* Category focus */}
                        <SectionCard
                            title="Strongest Categories"
                            icon={<FiTarget />}
                        >
                            {loading || !data ? (
                                <p className="text-xs text-slate-500">
                                    Analyzing your solved problems…
                                </p>
                            ) : data.overall_stats.category_breakdown.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                    Once you solve some problems, we’ll highlight your
                                    strongest categories here.
                                </p>
                            ) : (
                                <div className="space-y-2 text-xs">
                                    {topCategory && (
                                        <div className="mb-2 rounded-lg bg-slate-900 text-slate-50 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-300">
                                                Top Category
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {topCategory.category || "Uncategorized"}
                                            </p>
                                            <p className="text-[11px] text-slate-300">
                                                {topCategory.solved_count} problem
                                                {topCategory.solved_count !== 1 && "s"} solved
                                            </p>
                                        </div>
                                    )}
                                    <ul className="space-y-1">
                                        {data.overall_stats.category_breakdown.map((cat) => (
                                            <li
                                                key={cat.category_id ?? cat.category ?? "unknown"}
                                                className="flex items-center justify-between text-slate-700"
                                            >
                                                <span className="truncate">
                                                    {cat.category || "Uncategorized"}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {cat.solved_count} solved
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </SectionCard>

                        {/* Contests */}
                        <SectionCard
                            title="Contests Overview"
                            icon={<FiFlag />}
                        >
                            {loading || !data ? (
                                <p className="text-xs text-slate-500">
                                    Loading contests…
                                </p>
                            ) : (
                                <div className="space-y-3 text-xs">
                                    {/* Ongoing */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-slate-800">
                                                Ongoing
                                            </span>
                                            <span className="text-[11px] text-emerald-700">
                                                {data.contests.ongoing.length} live
                                            </span>
                                        </div>
                                        {data.contests.ongoing.length === 0 ? (
                                            <p className="text-[11px] text-slate-500">
                                                No contests are running right now.
                                            </p>
                                        ) : (
                                            <ul className="space-y-1">
                                                {data.contests.ongoing.map((c) => (
                                                    <li
                                                        key={c.id}
                                                        className="rounded-md bg-emerald-50 px-2 py-1 flex flex-col"
                                                    >
                                                        <span className="text-slate-900 font-medium">
                                                            {c.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-600">
                                                            Ends {formatDateTime(c.end_time)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Upcoming */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-slate-800">
                                                Upcoming
                                            </span>
                                            <span className="text-[11px] text-sky-700">
                                                {data.contests.upcoming.length} scheduled
                                            </span>
                                        </div>
                                        {data.contests.upcoming.length === 0 ? (
                                            <p className="text-[11px] text-slate-500">
                                                No upcoming contests listed.
                                            </p>
                                        ) : (
                                            <ul className="space-y-1">
                                                {data.contests.upcoming.map((c) => (
                                                    <li
                                                        key={c.id}
                                                        className="rounded-md bg-sky-50 px-2 py-1 flex flex-col"
                                                    >
                                                        <span className="text-slate-900 font-medium">
                                                            {c.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-600">
                                                            Starts {formatDateTime(c.start_time)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Recent Past */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-slate-800">
                                                Recent Contests
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                {data.contests.recent_past.length} shown
                                            </span>
                                        </div>
                                        {data.contests.recent_past.length === 0 ? (
                                            <p className="text-[11px] text-slate-500">
                                                No past contests to show yet.
                                            </p>
                                        ) : (
                                            <ul className="space-y-1">
                                                {data.contests.recent_past.map((c) => (
                                                    <li
                                                        key={c.id}
                                                        className="rounded-md bg-slate-50 px-2 py-1 flex flex-col"
                                                    >
                                                        <span className="text-slate-900 font-medium">
                                                            {c.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-600">
                                                            Ended {formatDateTime(c.end_time)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    </div>
                </div>

                {/* Loading hint for very first load */}
                {state === "loading" && !data && (
                    <p className="mt-6 text-center text-xs text-slate-500">
                        Preparing your dashboard…
                    </p>
                )}
            </motion.div>
        </main>
    );
};

export default DashboardOverview;
