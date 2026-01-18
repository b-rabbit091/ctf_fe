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
        ],
        []
    );

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

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

    const linkBase =
        "rounded-xl px-4 py-2 text-base font-medium transition-colors focus:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

    const linkActive = "bg-blue-50 text-blue-700 ring-1 ring-blue-200 shadow-sm";
    const linkIdle = "text-slate-700 hover:bg-white/80 hover:text-slate-800 ring-1 ring-transparent";

    const mobileLinkBase =
        "rounded-2xl px-4 py-3 text-base transition-colors focus:outline-none " +
        "focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

    const mobileLinkActive = "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    const mobileLinkIdle = "bg-white/70 text-slate-800 hover:bg-white/90 ring-1 ring-transparent";

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
            {/* px-0 => removes side gaps */}
            <div className="flex h-16 items-center justify-between px-0">
                {/* LEFT MOST: Brand */}
                {/*<div className="flex items-center min-w-0">*/}
                    {/*<div*/}
                    {/*    onClick={() => navigate("/")}*/}
                    {/*    className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-white/70 ring-1 ring-transparent hover:ring-slate-200/70 transition"*/}
                    {/*    role="link"*/}
                    {/*    tabIndex={0}*/}
                    {/*    onKeyDown={(e) => e.key === "Enter" && navigate("/")}*/}
                    {/*    aria-label="Go to home"*/}
                    {/*>*/}
                        {/*<img*/}
                        {/*    src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"*/}
                        {/*    alt="NW Logo"*/}
                        {/*    className="h-9 w-auto"*/}
                        {/*/>*/}
                        {/*<div className="hidden sm:block min-w-0 leading-tight text-left">*/}
                        {/*    <h1 className="text-base md:text-lg font-semibold text-slate-800 truncate">*/}
                        {/*        Northwest Missouri State University*/}
                        {/*    </h1>*/}
                        {/*    <p className="mt-0.5 text-sm md:text-base text-slate-600 truncate">Dept. of Computer Science</p>*/}
                        {/*</div>*/}
                    {/*</div>*/}

                    {/* removed spacer that creates extra gap */}
                    {/* <div className="hidden md:block w-6 lg:w-10" /> */}
                {/*</div>*/}

                {/* NAV LINKS (desktop) */}
                <div className="hidden md:flex flex-1 min-w-0 items-center">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {navLinks.map((link) => {
                                const active = isActive(link.path);
                                return (
                                    <Link key={link.name} to={link.path} className={[linkBase, active ? linkActive : linkIdle].join(" ")}>
                                        {link.name}
                                    </Link>
                                );
                            })}

                            {user?.role === "admin" && (
                                <Link
                                    to="/admin-dashboard"
                                    className={[
                                        linkBase,
                                        isActive("/admin-dashboard")
                                            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200 shadow-sm"
                                            : "text-amber-800 hover:bg-amber-50/70 ring-1 ring-transparent",
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

                {/* RIGHT (desktop user) */}
                <div className="hidden md:flex items-center gap-2 min-w-max text-slate-700">
                    {user && (
                        <>
                            <div
                                onClick={goAccount}
                                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-2.5 text-base font-medium text-slate-800 shadow-sm hover:bg-white/80 transition"
                                role="link"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && goAccount()}
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-base font-semibold ring-1 ring-slate-200/60">
                                    {user.username?.[0]?.toUpperCase() || <FiUser size={18} />}
                                </div>
                                <span className="max-w-[170px] truncate">{user.username}</span>
                            </div>

                            <div className="relative" ref={manageRef}>
                                <div
                                    onClick={() => setManageOpen((p) => !p)}
                                    className="cursor-pointer rounded-2xl border border-slate-200/70 bg-white/60 p-2.5 text-slate-700 shadow-sm hover:bg-white/80 hover:text-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70"
                                    title="Manage"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && setManageOpen((p) => !p)}
                                    aria-label="Open manage menu"
                                >
                                    <FiSettings size={20} />
                                </div>

                                {manageOpen && (
                                    <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-xl">
                                        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Manage</div>
                                        <div className="h-px bg-slate-200/60" />

                                        <div
                                            onClick={goAccount}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-blue-50/70 transition"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && goAccount()}
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                                                <FiUser size={18} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-base font-medium text-slate-800 leading-6">Account</div>
                                                <div className="text-sm text-slate-600 leading-5">Profile & settings</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={goGroups}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-blue-50/70 transition"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && goGroups()}
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                                                <FiUsers size={18} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-base font-medium text-slate-800 leading-6">Group</div>
                                                <div className="text-sm text-slate-600 leading-5">Create or manage your group</div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200/60" />

                                        <div
                                            onClick={() => {
                                                setManageOpen(false);
                                                onLogout();
                                            }}
                                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-rose-50 transition"
                                            role="menuitem"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && onLogout()}
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                                                <FiLogOut size={18} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-base font-medium text-rose-700 leading-6">Logout</div>
                                                <div className="text-sm text-rose-600/90 leading-5">Sign out of your account</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Mobile: hamburger */}
                <div className="flex items-center gap-2 md:hidden">
                    <div
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="cursor-pointer rounded-2xl border border-slate-200/70 bg-white/70 p-2.5 text-slate-700 shadow-sm hover:bg-white/90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70"
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
                <div className="md:hidden border-t border-slate-200/70 bg-white/80 backdrop-blur-xl">
                    {/* px-0 => removes side gaps */}
                    <div className="px-0 py-3 space-y-3">
                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => {
                                const active = isActive(link.path);
                                return (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={[mobileLinkBase, active ? mobileLinkActive : mobileLinkIdle].join(" ")}
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
                                        mobileLinkBase,
                                        "border",
                                        isActive("/admin-dashboard")
                                            ? "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-200/60"
                                            : "bg-white/70 text-amber-800 border-amber-200/70 hover:bg-amber-50/60 ring-1 ring-transparent",
                                    ].join(" ")}
                                >
                                    <span className="inline-flex items-center gap-2 font-medium">
                                        <FiShield size={18} />
                                        Admin
                                    </span>
                                </Link>
                            )}
                        </div>

                        {user && (
                            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={goAccount}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-base font-medium text-slate-700 hover:bg-white/90 transition"
                                    >
                                        <FiUser size={20} />
                                        <span>Account</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={goGroups}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-base font-medium text-slate-700 hover:bg-white/90 transition"
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
                                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base font-medium text-rose-700 hover:bg-rose-100/60 transition"
                                >
                                    <FiLogOut size={20} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}

                        {!user && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileOpen(false);
                                    navigate("/login");
                                }}
                                className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-base font-medium text-slate-700 hover:bg-white/90 transition"
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
