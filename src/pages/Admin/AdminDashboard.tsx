import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import {
    FiActivity,
    FiAlertCircle,
    FiBookOpen,
    FiCalendar,
    FiEdit3,
    FiFileText,
    FiFlag,
    FiGrid,
    FiLayers,
    FiRefreshCw,
    FiShield,
    FiUsers,
} from "react-icons/fi";

import {getAdminDashboardTotals, AdminDashboardTotalsResponse} from "../../api/dashboard";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const CardShell = memo(function CardShell({
                                              title,
                                              subtitle,
                                              right,
                                              children,
                                          }: {
    title?: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
            {title ? (
                <>
                    <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-normal tracking-tight text-slate-700">{title}</h2>
                            {subtitle ? <p className="mt-1 text-sm sm:text-base text-slate-500">{subtitle}</p> : null}
                        </div>
                        {right}
                    </div>
                    <div className="h-px bg-slate-200/70"/>
                </>
            ) : null}
            <div className={cx("px-4 sm:px-5", title ? "py-4" : "py-4")}>{children}</div>
        </section>
    );
});

const StatCard = memo(function StatCard({
                                            label,
                                            value,
                                            icon,
                                            helper,
                                            loading,
                                        }: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    helper?: string;
    loading?: boolean;
}) {
    return (
        <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
            <div className="px-4 sm:px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-normal tracking-tight text-slate-600 truncate">{label}</p>
                    <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50/60 ring-1 ring-slate-200/60 text-slate-600 shrink-0">
            {icon}
          </span>
                </div>
                <div className="mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-700 leading-none">
                    {loading ? "…" : value}
                </div>
                {helper ? <p className="mt-2 text-xs sm:text-sm text-slate-500">{helper}</p> : null}
            </div>
        </div>
    );
});

const QuickLink = memo(function QuickLink({
                                              label,
                                              description,
                                              to,
                                              icon,
                                          }: {
    label: string;
    description: string;
    to: string;
    icon: React.ReactNode;
}) {
    return (
        <Link
            to={to}
            className={cx(
                "flex items-start gap-3 rounded-2xl bg-white/65 backdrop-blur-xl p-3 ring-1 ring-slate-200/60 shadow-sm",
                "transition hover:bg-white/75 hover:shadow-md",
                focusRing
            )}
        >
      <span
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50/60 ring-1 ring-slate-200/60 text-slate-600 shrink-0">
        {icon}
      </span>
            <span className="min-w-0">
        <span className="block truncate text-base sm:text-lg font-normal tracking-tight text-slate-700">
          {label}
        </span>
        <span className="mt-1 block text-xs sm:text-sm text-slate-500 line-clamp-2">{description}</span>
      </span>
        </Link>
    );
});

const AdminDashboard: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [totals, setTotals] = useState<AdminDashboardTotalsResponse | null>(null);
    const [statsLoading, setStatsLoading] = useState<boolean>(false);
    const [statsError, setStatsError] = useState<string | null>(null);

    // avoid setState after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    // redirect guard (security UX)
    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const loadTotals = useCallback(async () => {
        if (!user || user.role !== "admin") return;

        setStatsLoading(true);
        setStatsError(null);

        try {
            const data = await getAdminDashboardTotals();
            if (!alive.current) return;
            setTotals(data);
        } catch (err: any) {
            console.error("Failed to load admin dashboard totals:", err);
            if (!alive.current) return;
            setStatsError("Failed to load dashboard statistics. Please refresh or try again later.");
        } finally {
            if (!alive.current) return;
            setStatsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadTotals();
    }, [loadTotals]);

    if (!user) {
        return (
            <div
                className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar/>
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div
                        className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    const signedInBadge = useMemo(() => {
        const isAdmin = user.role === "admin";
        return (
            <span
                className="inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight ring-1 ring-amber-200/60 text-amber-700">
        <FiShield/>
                {isAdmin ? "Signed in as Admin" : "Signed in"}
      </span>
        );
    }, [user.role]);

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar/>

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    {/* Header */}
                    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                Admin Console
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-500">
                                Manage challenges, contests, users, and platform settings from a single interface.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {signedInBadge}
                            <button
                                type="button"
                                onClick={loadTotals}
                                disabled={statsLoading}
                                className={cx(
                                    "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                                    "ring-1 ring-slate-200/60 hover:bg-white/90 disabled:opacity-60",
                                    focusRing
                                )}
                                aria-label="Refresh admin stats"
                                title="Refresh"
                            >
                                <FiRefreshCw className={statsLoading ? "animate-spin" : ""} size={16}/>
                                {statsLoading ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>
                    </header>

                    {/* Error banner */}
                    {statsError ? (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 shrink-0"/>
                                <div className="min-w-0">
                                    <p className="font-normal tracking-tight">Couldn’t load dashboard statistics</p>
                                    <p className="mt-1 text-sm break-words text-rose-700/90">{statsError}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Top stats */}
                    <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Total Users"
                            value={totals?.users.total_users ?? "—"}
                            icon={<FiUsers size={18}/>}
                            helper="Students + admins registered."
                            loading={statsLoading && !totals}
                        />
                        <StatCard
                            label="Total Challenges"
                            value={totals?.challenges.total_challenges ?? "—"}
                            icon={<FiBookOpen size={18}/>}
                            helper="Practice + competition challenges."
                            loading={statsLoading && !totals}
                        />
                        <StatCard
                            label="Active Contests"
                            value={totals?.contests.active_contests ?? "—"}
                            icon={<FiFlag size={18}/>}
                            helper="Contests currently running."
                            loading={statsLoading && !totals}
                        />
                        <StatCard
                            label="Total Submissions"
                            value={totals?.submissions.total_submissions ?? "—"}
                            icon={<FiActivity size={18}/>}
                            helper="Flag + text submissions."
                            loading={statsLoading && !totals}
                        />
                    </section>

                    {/* Main layout */}
                    <div className="grid grid-cols-1 gap-3">
                        <CardShell
                            title="Content Management"
                            subtitle="Create and maintain challenges, contests, and supporting metadata."
                        >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <QuickLink
                                    label="Draft a Question"
                                    to="/admin/questions/create"
                                    description="Create the base question now. Assign Practice/Competition later when you edit."
                                    icon={<FiFileText size={18}/>}
                                />
                                <QuickLink
                                    label="Manage Practice"
                                    to="/admin/practice"
                                    description="Edit practice challenges and control visibility."
                                    icon={<FiBookOpen size={18}/>}
                                />
                                <QuickLink
                                    label="Manage Contests"
                                    to="/admin/contests"
                                    description="Create, edit, and schedule contests. Attach challenges and publish results."
                                    icon={<FiCalendar size={18}/>}
                                />
                                <QuickLink
                                    label="Manage Competition"
                                    to="/admin/competition"
                                    description="Attach challenges to contests and manage competition questions."
                                    icon={<FiFlag size={18}/>}
                                />
                                <QuickLink
                                    label="Manage Blogs"
                                    to="/admin/blogs"
                                    description="Create, edit, publish, and remove blog posts."
                                    icon={<FiEdit3 size={18}/>}
                                />
                                <QuickLink
                                    label="Categories & Difficulty"
                                    to="/admin/taxonomy"
                                    description="Configure categories, difficulty levels, and solution types."
                                    icon={<FiLayers size={18}/>}
                                />
                            </div>
                        </CardShell>

                        <CardShell
                            title="Users & Submissions"
                            subtitle="Monitor user accounts, roles, groups, and submission activity."
                        >
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <QuickLink
                                    label="Manage Users"
                                    to="/admin/users"
                                    description="View students and admins, manage roles, and activate or deactivate accounts."
                                    icon={<FiUsers size={18}/>}
                                />
                                <QuickLink
                                    label="Manage Groups"
                                    to="/admin/groups"
                                    description="View groups, members, admins, remove members, and delete groups."
                                    icon={<FiGrid size={18}/>}
                                />
                                <QuickLink
                                    label="Submissions Overview"
                                    to="/admin/submissions"
                                    description="Inspect submissions, statuses, and contest participation."
                                    icon={<FiActivity size={18}/>}
                                />
                            </div>
                        </CardShell>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminDashboard;
