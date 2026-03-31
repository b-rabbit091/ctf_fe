import React from "react";
import Navbar from "../Navbar";
import AdminNavbar from "../AdminNavbar";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type ShellVariant = "public" | "admin";

type StatItem = {
    label: string;
    value: React.ReactNode;
};

type LearningShellProps = {
    variant?: ShellVariant;
    eyebrow?: string;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    stats?: StatItem[];
    headerClassName?: string;
    children: React.ReactNode;
};

function ShellNavbar({variant}: { variant: ShellVariant }) {
    if (variant === "admin") return <AdminNavbar/>;
    return <Navbar/>;
}

export function LearningShell({
                                  variant = "public",
                                  eyebrow,
                                  title,
                                  description,
                                  actions,
                                  stats,
                                  headerClassName,
                                  children,
                              }: LearningShellProps) {
    const showHeader = eyebrow || title || description || actions || (stats && stats.length > 0);

    return (
        <div
            className={cx(
                "relative min-h-screen w-full overflow-hidden font-sans text-slate-700",
                variant === "admin"
                    ? "bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),_transparent_24%),linear-gradient(160deg,_#f4fbf9_0%,_#ffffff_42%,_#eef7ff_100%)]"
                    : "bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(160deg,_#f8fbff_0%,_#ffffff_44%,_#eef4ff_100%)]"
            )}
        >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-[-8rem] top-20 h-56 w-56 rounded-full bg-white/45 blur-3xl"/>
                <div className="absolute bottom-0 right-[-7rem] h-72 w-72 rounded-full bg-white/55 blur-3xl"/>
                <div
                    className={cx(
                        "absolute inset-x-0 top-0 h-px",
                        variant === "admin"
                            ? "bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent"
                            : "bg-gradient-to-r from-transparent via-sky-200/70 to-transparent"
                    )}
                />
            </div>

            <div className="relative flex min-h-screen flex-col">
                <ShellNavbar variant={variant}/>

                <main className="flex-1">
                    <div className="flex w-full flex-col px-3 pb-8 pt-4 sm:px-4 sm:pb-10 lg:px-5">
                        {showHeader ? (
                            <header
                                className={cx(
                                    "mb-5 overflow-hidden rounded-[2rem] border border-white/70 bg-white/72 px-5 py-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:px-6 lg:px-8 lg:py-7",
                                    headerClassName
                                )}
                            >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="max-w-3xl min-w-0">
                                        {eyebrow ? (
                                            <div
                                                className={cx(
                                                    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
                                                    variant === "admin"
                                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
                                                        : "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70"
                                                )}
                                            >
                                                {eyebrow}
                                            </div>
                                        ) : null}

                                        {title ? (
                                            <h1 className="mt-3 text-3xl tracking-tight text-slate-800 sm:text-4xl lg:text-5xl">
                                                {title}
                                            </h1>
                                        ) : null}

                                        {description ? (
                                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                                {description}
                                            </p>
                                        ) : null}
                                    </div>

                                    {actions ? (
                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                            {actions}
                                        </div>
                                    ) : null}
                                </div>

                                {stats && stats.length > 0 ? (
                                    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                        {stats.map((stat) => (
                                            <div
                                                key={stat.label}
                                                className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 shadow-sm"
                                            >
                                                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                                                    {stat.label}
                                                </div>
                                                <div className="mt-2 text-lg tracking-tight text-slate-800 sm:text-xl">
                                                    {stat.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </header>
                        ) : null}

                        <div className="relative flex-1">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
