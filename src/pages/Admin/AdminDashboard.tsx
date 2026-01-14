import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";

import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";

import { FiUsers, FiFlag, FiBookOpen, FiLayers, FiActivity, FiGrid } from "react-icons/fi";

import { getAdminDashboardTotals, AdminDashboardTotalsResponse } from "../../api/dashboard";

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
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
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar />
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full text-sm text-slate-500">Checking permissions…</div>
                </main>
            </div>
        );
    }

    const StatCard: React.FC<{
        label: string;
        value: string | number;
        icon: React.ReactNode;
        helper?: string;
        loading?: boolean;
    }> = ({ label, value, icon, helper, loading }) => (
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">{label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/5 text-slate-800">
                    {icon}
                </div>
            </div>
            <div className="text-xl font-semibold text-slate-900">{loading ? "…" : value}</div>
            {helper && <p className="text-[10px] text-slate-500">{helper}</p>}
        </div>
    );

    const QuickLink: React.FC<{
        label: string;
        description: string;
        to: string;
        icon: React.ReactNode;
    }> = ({ label, description, to, icon }) => (
        <Link
            to={to}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-xs md:text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        >
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/5 text-slate-800">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="font-medium text-slate-900">{label}</p>
                <p className="mt-0.5 text-[11px] md:text-xs text-slate-500 line-clamp-2">{description}</p>
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    {/* Header */}
                    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Admin Console</h1>
                            <p className="mt-1 text-xs md:text-sm text-slate-500">
                                Manage challenges, contests, users, and platform settings from a single, secure interface.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-800 font-medium">
                Signed in as Admin
              </span>
                        </div>
                    </header>

                    {/* Stats error (if any) */}
                    {statsError && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs md:text-sm text-red-700">
                            {statsError}
                        </div>
                    )}

                    {/* Top stats row */}
                    <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Total Users"
                            value={totals?.users.total_users ?? "—"}
                            icon={<FiUsers size={16} />}
                            helper="Students + admins registered."
                            loading={statsLoading && !totals}
                        />
                        <StatCard
                            label="Total Challenges"
                            value={totals?.challenges.total_challenges ?? "—"}
                            icon={<FiBookOpen size={16} />}
                            helper="Practice + competition challenges."
                            loading={statsLoading && !totals}
                        />
                        <StatCard
                            label="Active Contests"
                            value={totals?.contests.active_contests ?? "—"}
                            icon={<FiFlag size={16} />}
                            helper="Contests currently running."
                            loading={statsLoading && !totals}
                        />
                        <StatCard
                            label="Total Submissions"
                            value={totals?.submissions.total_submissions ?? "—"}
                            icon={<FiActivity size={16} />}
                            helper="Flag + text submissions."
                            loading={statsLoading && !totals}
                        />
                    </section>

                    {/* Main layout */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Content management */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <div className="mb-3">
                                <h2 className="text-base md:text-lg font-semibold text-slate-900">Content Management</h2>
                                <p className="mt-1 text-xs md:text-sm text-slate-500">
                                    Create and maintain challenges, contests, and supporting metadata.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <QuickLink
                                    label="Manage Challenges"
                                    to="/admin/challenges"
                                    description="Create, edit, archive practice and competition challenges. Attach files and define solutions."
                                    icon={<FiBookOpen size={16} />}
                                />
                                <QuickLink
                                    label="Manage Contests"
                                    to="/admin/contests"
                                    description="Schedule contests, set start/end times, attach challenges, and toggle visibility."
                                    icon={<FiFlag size={16} />}
                                />
                                <QuickLink
                                    label="Categories & Difficulty"
                                    to="/admin/taxonomy"
                                    description="Configure categories, difficulty levels, and solution types used throughout the system."
                                    icon={<FiLayers size={16} />}
                                />
                            </div>
                        </section>

                        {/* Users & submissions */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <div className="mb-3">
                                <h2 className="text-base md:text-lg font-semibold text-slate-900">Users & Submissions</h2>
                                <p className="mt-1 text-xs md:text-sm text-slate-500">
                                    Monitor user accounts, roles, groups, and submission activity.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <QuickLink
                                    label="Manage Users"
                                    to="/admin/users"
                                    description="View students and admins, manage roles, and activate or deactivate accounts."
                                    icon={<FiUsers size={16} />}
                                />
                                <QuickLink
                                    label="Manage Groups"
                                    to="/admin/groups"
                                    description="View all groups, members, admins, remove members, and delete groups."
                                    icon={<FiGrid size={16} />}
                                />
                                <QuickLink
                                    label="Submissions Overview"
                                    to="/admin/submissions"
                                    description="Inspect user flag and text submissions, statuses, and contest participation."
                                    icon={<FiActivity size={16} />}
                                />
                            </div>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminDashboard;
