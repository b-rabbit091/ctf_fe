// src/components/Navbar.tsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";
import {FiLogOut, FiMenu, FiSettings, FiShield, FiUser, FiUsers, FiX} from "react-icons/fi";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

function useEscape(cb: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && cb();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [cb, enabled]);
}

function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        const onDown = (e: MouseEvent) => {
            const el = ref.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) cb();
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [cb, enabled, ref]);
}

const Navbar: React.FC = () => {
    const {user, logout} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const links = useMemo(
        () => [
            {name: "Dashboard", path: "/dashboard"},
            {name: "Practice", path: "/practice"},
            {name: "Compete", path: "/compete"},
            {name: "Leaderboard", path: "/leaderboard"},
            {name: "Blogs", path: "/blogs"},
        ],
        []
    );

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

    const closeAll = () => {
        setMobileOpen(false);
        setMenuOpen(false);
    };

    // close menus on navigation
    useEffect(() => {
        closeAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    useEscape(closeAll, mobileOpen || menuOpen);
    useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

    // prevent background scrolling when mobile menu is open
    useEffect(() => {
        if (!mobileOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mobileOpen]);

    const onLogout = () => {
        closeAll();
        logout();
        navigate("/login");
    };

    const go = (path: string) => {
        closeAll();
        navigate(path);
    };

    // Typography + color (NO black; avoid slate-900/950)
    const focusRing =
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

    const pillBase =
        "rounded-full px-3 py-1.5 text-sm font-semibold tracking-tight antialiased transition " +
        "ring-1 ring-transparent " +
        focusRing;

    // Active: “some color” + subtle glow
    const pillActive =
        "bg-gradient-to-r from-sky-100 via-indigo-100 to-violet-100 " +
        "text-indigo-700 ring-indigo-200/70 shadow-sm shadow-indigo-200/40";

    const pillIdle =
        "text-slate-700 hover:text-indigo-700 hover:bg-white/70 hover:ring-slate-200/60";

    const iconBtn =
        "rounded-full p-2 bg-white/55 ring-1 ring-slate-200/70 shadow-sm transition " +
        "text-slate-600 hover:text-indigo-700 hover:bg-white/80 " +
        focusRing;

    const surface =
        "bg-white/60 ring-1 ring-slate-200/60 backdrop-blur-xl";

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/65 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-4">
                {/* Brand */}
                <button
                    type="button"
                    onClick={() => go("/")}
                    className={cx(
                        "group inline-flex items-center gap-2 rounded-full px-2 py-1 transition",
                        "text-slate-700 hover:text-indigo-700 hover:bg-white/60",
                        focusRing
                    )}
                    aria-label="Go to home"
                >
                    {/* soft, non-black mark */}
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/70 text-xs font-extrabold">
                        C
                    </span>
                    <span className="hidden sm:block text-sm font-extrabold tracking-tight">CTF</span>
                </button>

                {/* Desktop nav */}
                <div className="hidden md:flex flex-1 justify-center px-3">
                    <div className={cx("inline-flex items-center gap-1 rounded-full px-1 py-1", surface)}>
                        {links.map((l) => (
                            <Link
                                key={l.path}
                                to={l.path}
                                className={cx(pillBase, isActive(l.path) ? pillActive : pillIdle)}
                            >
                                {l.name}
                            </Link>
                        ))}

                        {user?.role === "admin" && (
                            <Link
                                to="/admin-dashboard"
                                className={cx(
                                    pillBase,
                                    "inline-flex items-center gap-2",
                                    isActive("/admin-dashboard")
                                        ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 ring-amber-200/70 shadow-sm shadow-amber-200/40"
                                        : "text-amber-700 hover:bg-amber-50/70 hover:ring-amber-200/60"
                                )}
                                aria-label="Admin dashboard"
                            >
                                <FiShield size={15} />
                                Admin
                            </Link>
                        )}
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    {/* Desktop user */}
                    <div className="hidden md:flex items-center gap-2">
                        {user ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => go("/account")}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-full px-2 py-1.5 transition",
                                        "bg-white/50 ring-1 ring-slate-200/70 hover:bg-white/80 shadow-sm",
                                        "text-slate-700 hover:text-indigo-700",
                                        focusRing
                                    )}
                                    aria-label="Account"
                                >
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/70 text-slate-600 text-sm font-bold">
                                        {user.username?.[0]?.toUpperCase() || <FiUser size={14} />}
                                    </span>
                                    <span className="max-w-[120px] truncate text-sm font-semibold tracking-tight">
                                        {user.username}
                                    </span>
                                </button>

                                <div className="relative" ref={menuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setMenuOpen((v) => !v)}
                                        className={iconBtn}
                                        aria-label="Open user menu"
                                        aria-haspopup="menu"
                                        aria-expanded={menuOpen}
                                    >
                                        <FiSettings size={18} />
                                    </button>

                                    {menuOpen && (
                                        <div
                                            role="menu"
                                            className={cx(
                                                "absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl",
                                                "bg-white/90 backdrop-blur-xl ring-1 ring-slate-200/70 shadow-xl"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => go("/account")}
                                                className={cx(
                                                    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold tracking-tight transition",
                                                    "text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/60"
                                                )}
                                            >
                                                <FiUser size={16} />
                                                Account
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => go("/my-group")}
                                                className={cx(
                                                    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold tracking-tight transition",
                                                    "text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/60"
                                                )}
                                            >
                                                <FiUsers size={16} />
                                                Group
                                            </button>
                                            <div className="h-px bg-slate-200/70" />
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={onLogout}
                                                className={cx(
                                                    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold tracking-tight transition",
                                                    "text-rose-700 hover:bg-rose-50/70"
                                                )}
                                            >
                                                <FiLogOut size={16} />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => go("/login")}
                                className={cx(
                                    "rounded-full px-4 py-2 text-sm font-semibold tracking-tight transition",
                                    "bg-white/55 ring-1 ring-slate-200/70 hover:bg-white/80",
                                    "text-slate-700 hover:text-indigo-700 shadow-sm",
                                    focusRing
                                )}
                            >
                                Login
                            </button>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen((v) => !v)}
                        className={cx(iconBtn, "md:hidden")}
                        aria-label="Toggle navigation menu"
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile sheet */}
            {mobileOpen && (
                <div className="md:hidden border-t border-slate-200/70 bg-white/80 backdrop-blur-xl">
                    <div className="mx-auto max-w-6xl px-3 py-3 space-y-2">
                        {links.map((l) => (
                            <Link
                                key={l.path}
                                to={l.path}
                                onClick={() => setMobileOpen(false)}
                                className={cx(
                                    "block rounded-2xl px-4 py-3 text-sm font-semibold tracking-tight ring-1 transition",
                                    focusRing,
                                    isActive(l.path)
                                        ? "bg-gradient-to-r from-sky-100 via-indigo-100 to-violet-100 ring-indigo-200/70 text-indigo-700 shadow-sm shadow-indigo-200/40"
                                        : "bg-white/60 ring-transparent text-slate-700 hover:text-indigo-700 hover:bg-white/85 hover:ring-slate-200/60"
                                )}
                            >
                                {l.name}
                            </Link>
                        ))}

                        {user?.role === "admin" && (
                            <Link
                                to="/admin-dashboard"
                                onClick={() => setMobileOpen(false)}
                                className={cx(
                                    "block rounded-2xl px-4 py-3 text-sm font-semibold tracking-tight ring-1 ring-amber-200/80 bg-amber-50/80 text-amber-800"
                                )}
                            >
                                <span className="inline-flex items-center gap-2">
                                    <FiShield size={16} />
                                    Admin
                                </span>
                            </Link>
                        )}

                        <div className="h-px bg-slate-200/70 my-2" />

                        {user ? (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => go("/account")}
                                    className={cx(
                                        "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-tight transition",
                                        "bg-white/70 ring-1 ring-slate-200/70 hover:bg-white/90",
                                        "text-slate-700 hover:text-indigo-700",
                                        focusRing
                                    )}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <FiUser size={16} />
                                        Account
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => go("/my-group")}
                                    className={cx(
                                        "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-tight transition",
                                        "bg-white/70 ring-1 ring-slate-200/70 hover:bg-white/90",
                                        "text-slate-700 hover:text-indigo-700",
                                        focusRing
                                    )}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <FiUsers size={16} />
                                        Group
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onLogout}
                                    className={cx(
                                        "w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold tracking-tight transition",
                                        "bg-rose-50 ring-1 ring-rose-200 hover:bg-rose-100/60",
                                        "text-rose-700",
                                        focusRing
                                    )}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <FiLogOut size={16} />
                                        Logout
                                    </span>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => go("/login")}
                                className={cx(
                                    "w-full rounded-2xl px-4 py-3 text-sm font-semibold tracking-tight transition",
                                    "bg-white/70 ring-1 ring-slate-200/70 hover:bg-white/90",
                                    "text-slate-700 hover:text-indigo-700",
                                    focusRing
                                )}
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
