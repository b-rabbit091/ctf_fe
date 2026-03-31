import React, {useEffect, useRef, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";
import {
    FiBookOpen,
    FiFileText,
    FiFlag,
    FiLogOut,
    FiMenu,
    FiSettings,
    FiShield,
    FiUser,
    FiUsers,
    FiX,
    FiEdit3,
} from "react-icons/fi";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const AdminNavbar: React.FC = () => {
    const {user, logout} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement | null>(null);

    const onLogout = () => {
        logout();
        navigate("/login");
    };

    useEffect(() => {
        if (user && user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSettingsOpen(false);
                setMobileOpen(false);
            }
        };

        const onMouseDown = (event: MouseEvent) => {
            if (!settingsRef.current) return;
            if (!settingsRef.current.contains(event.target as Node)) {
                setSettingsOpen(false);
            }
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("mousedown", onMouseDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("mousedown", onMouseDown);
        };
    }, []);

    useEffect(() => {
        setSettingsOpen(false);
        setMobileOpen(false);
    }, [location.pathname]);

    const isActive = (path: string) =>
        location.pathname === path || location.pathname.startsWith(path + "/");

    const adminLinks = [
        {name: "Overview", path: "/admin-dashboard", icon: <FiShield size={15}/>},
        {name: "Draft Question", path: "/admin/questions/create", icon: <FiEdit3 size={15}/>},
        {name: "Practice", path: "/admin/practice", icon: <FiBookOpen size={15}/>},
        {name: "Competition", path: "/admin/competition", icon: <FiFlag size={15}/>},
        {name: "Contests", path: "/admin/contests", icon: <FiFileText size={15}/>},
        {name: "Users", path: "/admin/users", icon: <FiUsers size={15}/>},
    ];

    return (
        <nav className="sticky top-0 z-40 w-full border-b border-emerald-100/70 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-4">
                <div className="flex min-w-0 items-center">
                    <button
                        type="button"
                        onClick={() => navigate("/admin-dashboard")}
                        className={cx(
                            "group flex items-center gap-3 rounded-full px-2 py-1 text-left transition hover:bg-white/70",
                            focusRing
                        )}
                    >
                        <span
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                            AC
                        </span>
                        <div className="hidden leading-tight text-left sm:block">
                            <h1 className="text-sm font-semibold tracking-tight text-slate-800">
                                Learning Control Center
                            </h1>
                            <p className="text-[11px] text-slate-500">
                                Admin workspace for content, contests, and operations
                            </p>
                        </div>
                    </button>
                </div>

                <div className="hidden flex-1 items-center justify-center md:flex">
                    <div
                        className="flex items-center gap-1 rounded-full border border-emerald-100/80 bg-white/75 px-1 py-1 shadow-sm backdrop-blur-xl">
                        {adminLinks.map((link) => {
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                                        active
                                            ? "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 ring-1 ring-emerald-200/80 shadow-sm"
                                            : "text-slate-600 hover:bg-white hover:text-emerald-800",
                                        focusRing
                                    )}
                                >
                                    {link.icon}
                                    {link.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="hidden min-w-max items-center gap-3 text-slate-700 md:flex">
                    {user ? (
                        <>
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard")}
                                className={cx(
                                    "flex items-center gap-2 rounded-full border border-emerald-100/80 bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:bg-white",
                                    focusRing
                                )}
                            >
                                <div
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100/80">
                                    {user.username?.[0]?.toUpperCase() || <FiUser size={14}/>}
                                </div>
                                <span className="max-w-[130px] truncate">{user.username}</span>
                                <span
                                    className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200/70">
                                    Admin
                                </span>
                            </button>

                            <div className="relative" ref={settingsRef}>
                                <button
                                    type="button"
                                    onClick={() => setSettingsOpen((prev) => !prev)}
                                    className={cx(
                                        "rounded-full bg-white/80 p-2 text-slate-600 ring-1 ring-emerald-100/80 shadow-sm transition-colors hover:bg-white hover:text-emerald-800",
                                        focusRing
                                    )}
                                    title="Open settings menu"
                                    aria-haspopup="menu"
                                    aria-expanded={settingsOpen}
                                >
                                    <FiSettings size={18}/>
                                </button>

                                {settingsOpen ? (
                                    <div
                                        role="menu"
                                        className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white/95 shadow-xl ring-1 ring-emerald-100/80 backdrop-blur-xl"
                                    >
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setSettingsOpen(false);
                                                navigate("/account");
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50/70 hover:text-emerald-800"
                                        >
                                            <FiUser size={16}/>
                                            Account Settings
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setSettingsOpen(false);
                                                navigate("/dashboard");
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50/70 hover:text-emerald-800"
                                        >
                                            <FiShield size={16}/>
                                            Learner Dashboard
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            <button
                                type="button"
                                onClick={onLogout}
                                className="rounded-full bg-white/80 p-2 text-red-600 ring-1 ring-red-100/80 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                title="Logout"
                            >
                                <FiLogOut size={18}/>
                            </button>
                        </>
                    ) : null}
                </div>

                <div className="flex items-center gap-2 md:hidden">
                    {user ? (
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className={cx(
                                "flex items-center gap-1 rounded-full border border-emerald-100/80 bg-white/80 px-2.5 py-1 text-xs text-slate-700 shadow-sm hover:bg-white",
                                focusRing
                            )}
                        >
                            <FiUser size={16}/>
                            <span className="max-w-[80px] truncate">{user.username}</span>
                            <span
                                className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                Admin
                            </span>
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className={cx(
                            "inline-flex items-center justify-center rounded-full bg-white/80 p-2 text-slate-700 ring-1 ring-emerald-100/80 shadow-sm hover:bg-white",
                            focusRing
                        )}
                        aria-label="Toggle navigation menu"
                    >
                        {mobileOpen ? <FiX size={20}/> : <FiMenu size={20}/>}
                    </button>
                </div>
            </div>

            {mobileOpen ? (
                <div className="border-t border-emerald-100/70 bg-white/88 backdrop-blur-xl md:hidden">
                    <div className="mx-auto max-w-7xl space-y-3 px-3 py-3 text-sm">
                        <div className="flex flex-col gap-1">
                            {adminLinks.map((link) => {
                                const active = isActive(link.path);
                                return (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={cx(
                                            "inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                                            active
                                                ? "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 ring-1 ring-emerald-200/80"
                                                : "text-slate-700 hover:bg-white",
                                            focusRing
                                        )}
                                    >
                                        {link.icon}
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>

                        {user ? <div className="border-t border-emerald-100/70 pt-3"/> : null}

                        {user ? (
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        setSettingsOpen(false);
                                        navigate("/account");
                                    }}
                                    className={cx(
                                        "flex items-center gap-2 rounded-2xl px-3 py-2 text-slate-700 hover:bg-white",
                                        focusRing
                                    )}
                                >
                                    <FiSettings size={18}/>
                                    <span>Account Settings</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        setSettingsOpen(false);
                                        navigate("/dashboard");
                                    }}
                                    className={cx(
                                        "flex items-center gap-2 rounded-2xl px-3 py-2 text-slate-700 hover:bg-white",
                                        focusRing
                                    )}
                                >
                                    <FiShield size={18}/>
                                    <span>Learner Dashboard</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        onLogout();
                                    }}
                                    className="flex items-center gap-2 rounded-2xl px-3 py-2 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                >
                                    <FiLogOut size={18}/>
                                    <span>Logout</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </nav>
    );
};

export default AdminNavbar;
