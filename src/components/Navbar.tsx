// src/components/Navbar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiLogOut, FiSettings, FiUser, FiMenu, FiX, FiUsers, FiShield } from "react-icons/fi";

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [mobileOpen, setMobileOpen] = useState(false);

    // Manage dropdown (desktop)
    const [manageOpen, setManageOpen] = useState(false);
    const manageRef = useRef<HTMLDivElement | null>(null);

    const onLogout = () => {
        logout();
        navigate("/login");
    };

    const navLinks = useMemo(
        () => [
            { name: "Dashboard", path: "/dashboard" },
            { name: "Practice", path: "/practice" },
            { name: "Compete", path: "/compete" },
            { name: "Leaderboard", path: "/leaderboard" },
            { name: "Blogs", path: "/blogs" },
            // add more options later — this layout will handle it (wrap/scroll)
        ],
        []
    );

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
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between px-2 sm:px-3 md:px-4">
                {/* LEFT MOST: Brand (logo + NW text) */}
                <div className="flex items-center min-w-0">
                    <div
                        onClick={() => navigate("/")}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl px-1.5 py-1 hover:bg-slate-50"
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/")}
                        aria-label="Go to home"
                    >
                        <img
                            src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                            alt="NW Logo"
                            className="h-9 w-auto"
                        />
                        <div className="hidden sm:block min-w-0 leading-tight text-left">
                            <h1 className="text-base md:text-lg font-semibold text-slate-900 truncate">
                                Northwest Missouri State University
                            </h1>
                            <p className="mt-0.5 text-sm md:text-base text-slate-600 truncate">
                                Dept. of Computer Science
                            </p>
                        </div>
                    </div>

                    {/* gap after NW section (desktop only) */}
                    <div className="hidden md:block w-6 lg:w-10" />
                </div>

                {/* NAV LINKS: start after the gap (desktop) */}
                <div className="hidden md:flex flex-1 min-w-0 items-center">
                    {/* If many links, this area will scroll horizontally instead of breaking layout */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {navLinks.map((link) => {
                                const active = isActive(link.path);
                                return (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        className={[
                                            "rounded-xl px-4 py-2 text-base font-medium transition-colors",
                                            active
                                                ? "bg-slate-900 text-white shadow-sm"
                                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                                        ].join(" ")}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}

                            {user?.role === "admin" && (
                                <Link
                                    to="/admin-dashboard"
                                    className={[
                                        "rounded-xl px-4 py-2 text-base font-medium transition-colors",
                                        isActive("/admin-dashboard")
                                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                                            : "text-amber-800 hover:bg-amber-50/70 border border-transparent",
                                    ].join(" ")}
                                >
                  <span className="inline-flex items-center gap-2">
                    <FiShield size={18} />
                    Admin
                  </span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Desktop user */}
                <div className="hidden md:flex items-center gap-2 min-w-max text-slate-700">
                    {user && (
                        <>
                            <div
                                onClick={goAccount}
                                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2.5 text-base font-medium text-slate-800 shadow-sm hover:bg-white"
                                role="link"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && goAccount()}
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-base font-semibold">
                                    {user.username?.[0]?.toUpperCase() || <FiUser size={18} />}
                                </div>
                                <span className="max-w-[170px] truncate">{user.username}</span>
                            </div>

                            <div className="relative" ref={manageRef}>
                                <div
                                    onClick={() => setManageOpen((p) => !p)}
                                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white/70 p-2.5 text-slate-700 shadow-sm hover:bg-white hover:text-slate-900 transition-colors"
                                    title="Manage"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && setManageOpen((p) => !p)}
                                    aria-label="Open manage menu"
                                >
                                    <FiSettings size={20} />
                                </div>

                                {manageOpen && (
                                    <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Manage
                                        </div>

                                        <div className="h-px bg-slate-100" />

                                        <div
                                            onClick={goAccount}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && goAccount()}
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                                <FiUser size={18} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-base font-medium text-slate-900 leading-6">Account</div>
                                                <div className="text-sm text-slate-600 leading-5">Profile & settings</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={goGroups}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && goGroups()}
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                                <FiUsers size={18} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-base font-medium text-slate-900 leading-6">Group</div>
                                                <div className="text-sm text-slate-600 leading-5">Create or manage your group</div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-100" />

                                        <div
                                            onClick={() => {
                                                setManageOpen(false);
                                                onLogout();
                                            }}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-red-50"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && onLogout()}
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-700">
                                                <FiLogOut size={18} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-base font-medium text-red-700 leading-6">Logout</div>
                                                <div className="text-sm text-red-600/90 leading-5">Sign out of your account</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Mobile: hamburger only (keeps left brand truly left-most) */}
                <div className="flex items-center gap-2 md:hidden">
                    <div
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white/85 p-2.5 text-slate-800 shadow-sm hover:bg-white"
                        role="button"
                        tabIndex={0}
                        aria-label="Toggle navigation menu"
                        onKeyDown={(e) => e.key === "Enter" && setMobileOpen((prev) => !prev)}
                    >
                        {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                    </div>
                </div>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl">
                    <div className="px-3 py-3 space-y-3">
                        {/* Primary links */}
                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => {
                                const active = isActive(link.path);
                                return (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={[
                                            "rounded-2xl px-4 py-3 text-base transition-colors",
                                            active ? "bg-slate-900 text-white" : "bg-white text-slate-800 hover:bg-slate-50",
                                        ].join(" ")}
                                    >
                                        <span className="font-medium">{link.name}</span>
                                    </Link>
                                );
                            })}

                            {user?.role === "admin" && (
                                <Link
                                    to="/admin"
                                    onClick={() => setMobileOpen(false)}
                                    className={[
                                        "rounded-2xl px-4 py-3 text-base transition-colors border",
                                        isActive("/admin")
                                            ? "bg-amber-50 text-amber-800 border-amber-200"
                                            : "bg-white text-amber-800 border-amber-200/70 hover:bg-amber-50/60",
                                    ].join(" ")}
                                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <FiShield size={18} />
                    Admin
                  </span>
                                </Link>
                            )}
                        </div>

                        {/* User actions */}
                        {user && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={goAccount}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
                                    >
                                        <FiUser size={20} />
                                        <span>Account</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={goGroups}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
                                    >
                                        <FiUsers size={20} />
                                        <span>Group</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        onLogout();
                                    }}
                                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base font-medium text-red-700 hover:bg-red-100/60"
                                >
                                    <FiLogOut size={20} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}

                        {/* If not logged in, keep menu clean */}
                        {!user && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileOpen(false);
                                    navigate("/login");
                                }}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
