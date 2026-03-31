import React from "react";
import { Link } from "react-router-dom";
import {
    FiAward,
    FiBookOpen,
    FiChevronRight,
    FiClock,
    FiFlag,
    FiLayers,
    FiShield,
    FiTrendingUp,
} from "react-icons/fi";

type Highlight = {
    label: string;
    value: string;
    icon: React.ReactNode;
};

type AuthShellProps = {
    badge: string;
    title: string;
    subtitle: string;
    panelTitle: string;
    panelBody: string;
    progressLabel?: string;
    progressValue?: number;
    children: React.ReactNode;
    footer?: React.ReactNode;
    asideNote?: React.ReactNode;
};

const defaultHighlights: Highlight[] = [
    { label: "Practice Labs", value: "Hands-on guided problems", icon: <FiBookOpen /> },
    { label: "Live Competitions", value: "Solo and group challenges", icon: <FiFlag /> },
    { label: "Progress Tracking", value: "Scores, attempts, and growth", icon: <FiTrendingUp /> },
    { label: "Structured Learning", value: "CTF flow with clear milestones", icon: <FiLayers /> },
];

const quickStats = [
    { label: "Learning Path", value: "Beginner to advanced", icon: <FiAward /> },
    { label: "Session Style", value: "Responsive on any screen", icon: <FiClock /> },
    { label: "Safety", value: "Secure account workflows", icon: <FiShield /> },
];

const clampProgress = (value?: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value as number)));
};

const AuthShell: React.FC<AuthShellProps> = ({
    badge,
    title,
    subtitle,
    panelTitle,
    panelBody,
    progressLabel = "Learning Journey",
    progressValue = 0,
    children,
    footer,
    asideNote,
}) => {
    const progress = clampProgress(progressValue);

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f3efe4] text-slate-800">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(9,104,79,0.16),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(218,146,71,0.18),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(39,120,204,0.10),_transparent_35%),linear-gradient(180deg,_#fbf8ef_0%,_#f3efe4_100%)]" />
                <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(to right, #234436 1px, transparent 1px), linear-gradient(to bottom, #234436 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <div className="grid min-h-[calc(100vh-2rem)] flex-1 grid-cols-1 gap-4 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.12fr_0.88fr] lg:gap-6">
                    <section className="flex min-h-[320px] flex-col rounded-[32px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,250,238,0.92))] p-5 shadow-[0_24px_80px_-42px_rgba(36,55,48,0.45)] backdrop-blur-xl sm:p-7 lg:min-h-full lg:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <img
                                    alt="Northwest Missouri State University"
                                    src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                                    className="h-14 w-14 rounded-2xl border border-[#09684f]/10 bg-white/80 p-2 object-contain shadow-sm sm:h-16 sm:w-16"
                                    draggable={false}
                                />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#09684f] sm:text-xs">
                                        Learning Platform
                                    </p>
                                    <h1 className="font-serif text-xl tracking-tight text-slate-900 sm:text-2xl lg:text-[2rem]">
                                        Northwest Cyber Arena
                                    </h1>
                                    <p className="text-sm text-slate-600 sm:text-base">
                                        Computer Science learning, practice, and competition in one place.
                                    </p>
                                </div>
                            </div>

                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 rounded-full border border-[#09684f]/15 bg-white/80 px-4 py-2 text-sm font-medium text-[#09684f] transition hover:bg-white"
                            >
                                Back to login
                                <FiChevronRight />
                            </Link>
                        </div>

                        <div className="mt-8 max-w-2xl">
                            <div className="inline-flex items-center rounded-full border border-[#09684f]/15 bg-[#edf7f2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#09684f]">
                                {badge}
                            </div>
                            <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                                {title}
                            </h2>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                                {subtitle}
                            </p>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {defaultHighlights.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-[24px] border border-[#09684f]/10 bg-white/75 p-4 shadow-[0_16px_48px_-36px_rgba(23,54,43,0.55)]"
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7f2] text-lg text-[#09684f]">
                                        {item.icon}
                                    </div>
                                    <div className="mt-4 text-base font-semibold text-slate-900">{item.label}</div>
                                    <div className="mt-1 text-sm leading-6 text-slate-600">{item.value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-[28px] border border-[#d8c6a8] bg-[linear-gradient(135deg,#fffaf0,#f7f1e2)] p-5 shadow-[0_18px_56px_-40px_rgba(109,81,34,0.5)] sm:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7d5a1f]">
                                        {progressLabel}
                                    </div>
                                    <div className="mt-1 text-lg font-semibold text-slate-900">{panelTitle}</div>
                                </div>
                                <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#7d5a1f]">
                                    {progress}%
                                </div>
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                                {panelBody}
                            </p>
                            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
                                <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,#09684f,#d08f3d)] transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                {quickStats.map((stat) => (
                                    <div key={stat.label} className="rounded-2xl border border-white/70 bg-white/75 p-3">
                                        <div className="flex items-center gap-2 text-[#7d5a1f]">
                                            {stat.icon}
                                            <span className="text-xs font-semibold uppercase tracking-[0.16em]">{stat.label}</span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-700">{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-6 text-sm leading-6 text-slate-500">
                            {asideNote ?? "Built for students to practice, compete, and steadily improve with a calmer, course-like experience."}
                        </div>
                    </section>

                    <section className="flex min-h-[420px] flex-col rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,249,240,0.95))] p-5 shadow-[0_24px_80px_-42px_rgba(36,55,48,0.45)] backdrop-blur-xl sm:p-7 lg:min-h-full lg:p-8">
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#09684f]">
                                Student Workspace
                            </p>
                            <h3 className="mt-2 font-serif text-2xl text-slate-900 sm:text-3xl">{panelTitle}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{panelBody}</p>
                        </div>

                        <div className="flex-1">{children}</div>

                        {footer ? <div className="mt-6 border-t border-[#09684f]/10 pt-5">{footer}</div> : null}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AuthShell;
