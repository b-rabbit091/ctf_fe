import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
    FiLogOut,
    FiSettings,
    FiUser,
    FiMenu,
    FiX,
} from "react-icons/fi";

const AdminNavbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const onLogout = () => {
        logout();
        navigate("/login");
    };

    // Extra safety: if a non-admin somehow lands here, kick them out
    useEffect(() => {
        if (user && user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const isActive = (path: string) =>
        location.pathname === path ||
        location.pathname.startsWith(path + "/");

    // Admin-specific links
    const adminLinks = [
        { name: "Admin Dashboard", path: "/admin" },
        { name: "Challenges", path: "/admin/practice" },
        { name: "Contests", path: "/admin/contests" },
        { name: "Users", path: "/admin/users" },
        { name: "Settings", path: "/admin/settings" },
    ];

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
            {/* Top bar */}
            <div className="flex h-14 items-center justify-between px-2">
                {/* Left: Logo at edge, minimal padding */}
                <div className="flex items-center min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                        <img
                            src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                            alt="NW Logo"
                            className="h-8 w-auto"
                        />
                        <div className="hidden sm:block leading-tight text-left">
                            <h1 className="text-xs sm:text-sm font-semibold text-slate-900">
                                Northwest Missouri State University
                            </h1>
                            <p className="text-[10px] sm:text-[11px] text-slate-600">
                                Admin Console · CS Dept
                            </p>
                        </div>
                    </button>
                </div>

                {/* Center: desktop admin nav */}
                <div className="hidden md:flex flex-1 items-center justify-center">
                    <div className="flex items-center gap-1">
                        {adminLinks.map((link) => {
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={
                                        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                                        (active
                                            ? "bg-slate-900 text-white shadow-sm"
                                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900")
                                    }
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Right: user (desktop) */}
                <div className="hidden md:flex items-center gap-3 min-w-max text-slate-700">
                    {user && (
                        <>
                            <button
                                type="button"
                                onClick={() => navigate("/account")}
                                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
                                    {user.username?.[0]?.toUpperCase() || (
                                        <FiUser size={14} />
                                    )}
                                </div>
                                <span className="max-w-[130px] truncate">
                                    {user.username}
                                </span>
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    Admin
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/account")}
                                className="rounded-md p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                title="Account Settings"
                            >
                                <FiSettings size={18} />
                            </button>

                            <button
                                type="button"
                                onClick={onLogout}
                                className="rounded-md p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                title="Logout"
                            >
                                <FiLogOut size={18} />
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile: profile + hamburger */}
                <div className="flex items-center gap-2 md:hidden">
                    {user && (
                        <button
                            type="button"
                            onClick={() => navigate("/account")}
                            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        >
                            <FiUser size={16} />
                            <span className="max-w-[80px] truncate">
                                {user.username}
                            </span>
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                Admin
                            </span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        aria-label="Toggle navigation menu"
                    >
                        {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white">
                    <div className="px-3 py-3 space-y-3 text-sm">
                        {/* Admin links */}
                        <div className="flex flex-col gap-1">
                            {adminLinks.map((link) => {
                                const active = isActive(link.path);
                                return (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={
                                            "rounded-md px-3 py-2 text-sm transition-colors " +
                                            (active
                                                ? "bg-slate-900 text-white font-medium"
                                                : "text-slate-700 hover:bg-slate-50")
                                        }
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Divider */}
                        {user && <div className="border-t border-slate-200 pt-3" />}

                        {/* User actions */}
                        {user && (
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        navigate("/account");
                                    }}
                                    className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                                >
                                    <FiSettings size={18} />
                                    <span>Account Settings</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        onLogout();
                                    }}
                                    className="flex items-center gap-2 rounded-md px-3 py-2 text-red-600 hover:bg-red-50"
                                >
                                    <FiLogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default AdminNavbar;
