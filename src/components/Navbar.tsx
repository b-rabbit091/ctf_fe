// src/components/Navbar.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiLogOut, FiSettings, FiUser, FiMenu, FiX, FiUsers } from "react-icons/fi";

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [mobileOpen, setMobileOpen] = useState(false);

    // Facebook-style manage dropdown (desktop)
    const [manageOpen, setManageOpen] = useState(false);
    const manageRef = useRef<HTMLDivElement | null>(null);

    const onLogout = () => {
        logout();
        navigate("/login");
    };

    const navLinks = [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Practice", path: "/practice" },
        { name: "Compete", path: "/compete" },
        { name: "Leaderboard", path: "/leaderboard" },
        { name: "Blogs", path: "/blogs" },
    ];

    const isActive = (path: string) =>
        location.pathname === path || location.pathname.startsWith(path + "/");

    // Close manage dropdown on outside click / ESC
    useEffect(() => {
        const onDocMouseDown = (e: MouseEvent) => {
            if (!manageRef.current) return;
            if (!manageRef.current.contains(e.target as Node)) setManageOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setManageOpen(false);
        };

        document.addEventListener("mousedown", onDocMouseDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onDocMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    const goAccount = () => {
        setManageOpen(false);
        setMobileOpen(false);
        navigate("/account");
    };

    const goGroups = () => {
        setManageOpen(false);
        setMobileOpen(false);
        navigate("/my-group");
    };

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
            <div className="flex h-14 items-center justify-between px-2">
                {/* Left: Logo */}
                <div className="flex items-center min-w-0">
                    <div
                        onClick={() => navigate("/")}
                        className="flex cursor-pointer items-center gap-2 focus:outline-none"
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/")}
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
                                Dept. of Computer Science
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center: desktop nav */}
                <div className="hidden md:flex flex-1 items-center justify-center">
                    <div className="flex items-center gap-1">
                        {navLinks.map((link) => {
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

                        {user?.role === "admin" && (
                            <Link
                                to="/admin-dashboard"
                                className={
                                    "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors " +
                                    (isActive("/admin-dashboard")
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "text-amber-700 hover:bg-amber-50/70")
                                }
                            >
                                Admin
                            </Link>
                        )}
                    </div>
                </div>

                {/* Right: desktop user */}
                <div className="hidden md:flex items-center gap-3 min-w-max text-slate-700">
                    {user && (
                        <>
                            {/* username pill */}
                            <div
                                onClick={goAccount}
                                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                role="link"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && goAccount()}
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
                                    {user.username?.[0]?.toUpperCase() || <FiUser size={14} />}
                                </div>
                                <span className="max-w-[130px] truncate">{user.username}</span>
                            </div>

                            {/*  Facebook-style trigger (NOT a button) */}
                            <div className="relative" ref={manageRef}>
                                <div
                                    onClick={() => setManageOpen((p) => !p)}
                                    className="cursor-pointer rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                    title="Manage"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && setManageOpen((p) => !p)}
                                >
                                    <FiSettings size={18} />
                                </div>

                                {/*  Dropdown panel (left aligned + smaller text) */}
                                {manageOpen && (
                                    <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Manage
                                        </div>

                                        <div className="h-px bg-slate-100" />

                                        {/* Account */}
                                        <div
                                            onClick={goAccount}
                                            className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && goAccount()}
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                                <FiUser size={16} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-sm font-medium text-slate-900 leading-5">
                                                    Account
                                                </div>
                                                <div className="text-xs text-slate-500 leading-4">
                                                    Profile & settings
                                                </div>
                                            </div>
                                        </div>

                                        {/* Group */}
                                        <div
                                            onClick={goGroups}
                                            className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && goGroups()}
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                                <FiUsers size={16} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-sm font-medium text-slate-900 leading-5">
                                                    Group
                                                </div>
                                                <div className="text-xs text-slate-500 leading-4">
                                                    Create or manage your group
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-100" />

                                        {/* Logout */}
                                        <div
                                            onClick={() => {
                                                setManageOpen(false);
                                                onLogout();
                                            }}
                                            className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-red-50"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && onLogout()}
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
                                                <FiLogOut size={16} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-sm font-medium text-red-700 leading-5">
                                                    Logout
                                                </div>
                                                <div className="text-xs text-red-600/80 leading-4">
                                                    Sign out of your account
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Mobile: profile + hamburger */}
                <div className="flex items-center gap-2 md:hidden">
                    {user && (
                        <div
                            onClick={goAccount}
                            className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            role="link"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && goAccount()}
                        >
                            <FiUser size={16} />
                            <span className="max-w-[80px] truncate">{user.username}</span>
                        </div>
                    )}

                    <div
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="cursor-pointer rounded-md p-1.5 text-slate-700 hover:bg-slate-100"
                        role="button"
                        tabIndex={0}
                        aria-label="Toggle navigation menu"
                        onKeyDown={(e) => e.key === "Enter" && setMobileOpen((prev) => !prev)}
                    >
                        {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
                    </div>
                </div>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white">
                    <div className="px-3 py-3 space-y-3 text-sm">
                        <div className="flex flex-col gap-1">
                            {navLinks.map((link) => {
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

                            {user?.role === "admin" && (
                                <Link
                                    to="/admin"
                                    onClick={() => setMobileOpen(false)}
                                    className={
                                        "rounded-md px-3 py-2 text-sm font-semibold transition-colors " +
                                        (isActive("/admin")
                                            ? "bg-amber-50 text-amber-700"
                                            : "text-amber-700 hover:bg-amber-50/70")
                                    }
                                >
                                    Admin
                                </Link>
                            )}
                        </div>

                        {user && <div className="border-t border-slate-200 pt-3" />}

                        {user && (
                            <div className="flex flex-col gap-1">
                                <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Manage
                                </p>

                                <div
                                    onClick={goAccount}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                                    role="link"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && goAccount()}
                                >
                                    <FiUser size={18} />
                                    <span>Account</span>
                                </div>

                                <div
                                    onClick={goGroups}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50"
                                    role="link"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && goGroups()}
                                >
                                    <FiUsers size={18} />
                                    <span>Group</span>
                                </div>

                                <div
                                    onClick={() => {
                                        setMobileOpen(false);
                                        onLogout();
                                    }}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-red-600 hover:bg-red-50"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && onLogout()}
                                >
                                    <FiLogOut size={18} />
                                    <span>Logout</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
