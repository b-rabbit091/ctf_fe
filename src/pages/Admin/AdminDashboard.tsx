import React, {useEffect, useState} from "react";
import {useNavigate, Link} from "react-router-dom";
import {motion} from "framer-motion";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import {FiUsers, FiFlag, FiBookOpen, FiLayers, FiActivity, FiGrid, FiEdit3} from "react-icons/fi";

import {getAdminDashboardTotals, AdminDashboardTotalsResponse} from "../../api/dashboard";

const AdminDashboard: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [totals, setTotals] = useState<AdminDashboardTotalsResponse | null>(null);
    const [statsLoading, setStatsLoading] = useState<boolean>(false);
    const [statsError, setStatsError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user || user.role !== "admin") return;

        const loadTotals = async () => {
            try {
                setStatsLoading(true);
                setStatsError(null);
                const data = await getAdminDashboardTotals();
                setTotals(data);
            } catch (err: any) {
                console.error("Failed to load admin dashboard totals:", err);
                setStatsError("Failed to load dashboard statistics. Please refresh or try again later.");
            } finally {
                setStatsLoading(false);
            }
        };

        loadTotals();
    }, [user]);

    if (!user) {
        return (
            <div
                className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col font-sans">
                <Navbar/>
                <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                    <div className="w-full text-sm sm:text-base text-slate-600">Checking permissions…</div>
                </main>
            </div>
        );
    }

    const glassCard =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    const StatCard: React.FC<{
        label: string;
        value: string | number;
        icon: React.ReactNode;
        helper?: string;
        loading?: boolean;
    }> = ({label, value, icon, helper, loading}) => (
        <div className={glassCard}>
            <div className="px-4 md:px-5 py-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm md:text-base font-normal text-slate-600 truncate">{label}</span>
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-slate-100/60 text-slate-600 shrink-0">
                        {icon}
                    </div>
                </div>
                <div
                    className="text-3xl md:text-4xl font-normal text-slate-700 leading-none">{loading ? "…" : value}</div>
                {helper ? <p className="text-xs sm:text-sm text-slate-500">{helper}</p> : null}
            </div>
        </div>
    );

    const QuickLink: React.FC<{
        label: string;
        description: string;
        to: string;
        icon: React.ReactNode;
    }> = ({label, description, to, icon}) => (
        <Link
            to={to}
            className="flex items-start gap-2 rounded-2xl border border-white/30 bg-white/55 px-3 py-3 text-left text-sm sm:text-base text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50 transition hover:bg-white/70"
        >
            <div
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 bg-slate-100/60 text-slate-600 shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="font-normal text-slate-700 text-base md:text-lg truncate">{label}</p>
                <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500 line-clamp-2">{description}</p>
            </div>
        </Link>
    );

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col font-sans">
            <Navbar/>

            <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    {/* Header */}
                    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight">
                                Admin Console
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-600">
                                Manage challenges, contests, users, and platform settings from a single, secure
                                interface.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span
                                className="inline-flex items-center rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-sm sm:text-base font-normal text-amber-700 shadow-sm backdrop-blur-xl">
                                Signed in as Admin
                            </span>
                        </div>
                    </header>

                    {/* Stats error */}
                    {statsError && (
                        <div
                            className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                            {statsError}
                        </div>
                    )}

                    {/* Top stats row */}
                    <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                        {/* Content management */}
                        <section className={glassCard}>
                            <div className="px-4 md:px-5 py-4">
                                <h2 className="text-base md:text-lg font-normal text-slate-700">Content Management</h2>
                                <p className="mt-1 text-sm sm:text-base text-slate-600">
                                    Create and maintain challenges, contests, and supporting metadata.
                                </p>
                            </div>

                            <div className="h-px w-full bg-slate-200/70"/>

                            <div className="px-4 md:px-5 pt-3 pb-4">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                    <QuickLink
                                        label="Manage Challenges"
                                        to="/admin/practice"
                                        description="Create, edit, archive practice and competition challenges. Attach files and define solutions."
                                        icon={<FiBookOpen size={18}/>}
                                    />
                                    <QuickLink
                                        label="Manage Contests"
                                        to="/admin/contests"
                                        description="Schedule contests, set start/end times, attach challenges, and toggle visibility."
                                        icon={<FiFlag size={18}/>}
                                    />

                                    {/* ✅ NEW: Manage Blogs (placed right after Manage Contests) */}
                                    <QuickLink
                                        label="Manage Blogs"
                                        to="/admin/blogs"
                                        description="Create, edit, publish, and remove blog posts. Manage cover images and content."
                                        icon={<FiEdit3 size={18}/>}
                                    />

                                    <QuickLink
                                        label="Categories & Difficulty"
                                        to="/admin/taxonomy"
                                        description="Configure categories, difficulty levels, and solution types used throughout the system."
                                        icon={<FiLayers size={18}/>}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Users & submissions */}
                        <section className={glassCard}>
                            <div className="px-4 md:px-5 py-4">
                                <h2 className="text-base md:text-lg font-normal text-slate-700">Users & Submissions</h2>
                                <p className="mt-1 text-sm sm:text-base text-slate-600">
                                    Monitor user accounts, roles, groups, and submission activity.
                                </p>
                            </div>

                            <div className="h-px w-full bg-slate-200/70"/>

                            <div className="px-4 md:px-5 pt-3 pb-4">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                    <QuickLink
                                        label="Manage Users"
                                        to="/admin/users"
                                        description="View students and admins, manage roles, and activate or deactivate accounts."
                                        icon={<FiUsers size={18}/>}
                                    />
                                    <QuickLink
                                        label="Manage Groups"
                                        to="/admin/groups"
                                        description="View all groups, members, admins, remove members, and delete groups."
                                        icon={<FiGrid size={18}/>}
                                    />
                                    <QuickLink
                                        label="Submissions Overview"
                                        to="/admin/submissions"
                                        description="Inspect user flag and text submissions, statuses, and contest participation."
                                        icon={<FiActivity size={18}/>}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminDashboard;
