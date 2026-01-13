import React, {useCallback, useEffect, useMemo, useState} from "react";
import {motion} from "framer-motion";
import {FiChevronRight, FiInfo, FiRefreshCw, FiUser} from "react-icons/fi";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import type {AccountUser, LoadingState, SettingsSection} from "./types";
import {getAccountUser} from "./api";
import {fmtDateTime, humanApiError, initialFromUser} from "./utils";

const Row: React.FC<{ label: string; value: string }> = ({label, value}) => (
    <div className="flex items-center justify-between px-4 py-2 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-800">{value}</span>
    </div>
);

const AccountSettings: React.FC = () => {
    const {user, ready} = useAuth();

    const [section, setSection] = useState<SettingsSection>("GENERAL");
    const [state, setState] = useState<LoadingState>("idle");
    const [data, setData] = useState<AccountUser | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resetMessages = useCallback(() => setError(null), []);

    const myId = useMemo(() => {
        const raw = (user as any)?.id ?? (user as any)?.user_id ?? (user as any)?.pk;
        const n = raw != null ? Number(raw) : NaN;
        return Number.isFinite(n) ? n : null;
    }, [user]);

    const load = useCallback(async () => {
        resetMessages();

        if (!myId) {
            setState("error");
            setError("Unable to load account info (missing user id in session).");
            return;
        }

        setState("loading");
        try {
            const u = await getAccountUser(myId);
            setData(u);
            setState("success");
        } catch (err: any) {
            console.error(err);
            setError(humanApiError(err, "Failed to load account information."));
            setState("error");
        }
    }, [myId, resetMessages]);

    useEffect(() => {
        if (!ready || !user) return;
        void load();
    }, [ready, user, load]);

    if (!ready) {
        return (
            <>
                <Navbar/>
                <main className="min-h-screen bg-slate-50 px-4 py-6">
                    <div className="mx-auto max-w-6xl text-sm text-slate-500">Checking session…</div>
                </main>
            </>
        );
    }

    if (!user) {
        return (
            <>
                <Navbar/>
                <main className="min-h-screen bg-slate-50 px-4 py-6">
                    <div className="mx-auto max-w-4xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                        You are not logged in.
                    </div>
                </main>
            </>
        );
    }

    const leftNav = [
        {key: "GENERAL" as const, label: "Profile", icon: FiUser},
        {key: "STATUS" as const, label: "Account Info", icon: FiInfo},
    ];

    const username = data?.username || (user as any)?.username || "Account";
    const email = data?.email || (user as any)?.email || "—";

    return (
        <>
            <Navbar/>
            <main className="min-h-screen bg-slate-50 px-4 py-6 md:py-8">
                <motion.div
                    initial={{opacity: 0, y: 6}}
                    animate={{opacity: 1, y: 0}}
                    className="mx-auto max-w-6xl"
                >
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Account</h1>
                            <p className="mt-1 text-xs text-slate-500 md:text-sm">
                                View your account details (read-only).
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={load}
                            disabled={state === "loading"}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                        >
                            <FiRefreshCw size={16}/>
                            <span>{state === "loading" ? "Refreshing…" : "Refresh"}</span>
                        </button>
                    </header>

                    {state === "loading" && (
                        <div className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            Loading your account…
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <aside className="md:col-span-4 lg:col-span-3">
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                                            {data ? initialFromUser(data) : "U"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900">{username}</div>
                                            <div className="truncate text-xs text-slate-500">{email}</div>
                                        </div>
                                    </div>
                                </div>

                                <nav className="p-2">
                                    {leftNav.map((item) => {
                                        const Icon = item.icon;
                                        const active = section === item.key;
                                        return (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setSection(item.key)}
                                                className={[
                                                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
                                                ].join(" ")}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Icon size={16}/>
                                                    <span className="font-medium">{item.label}</span>
                                                </span>
                                                <FiChevronRight size={16} className={active ? "text-white" : "text-slate-300"}/>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </aside>

                        <section className="md:col-span-8 lg:col-span-9">
                            {section === "GENERAL" && (
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Your public-facing profile details (view-only).
                                    </p>

                                    <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                                        <Row label="First name" value={data?.first_name || "—"}/>
                                        <Row label="Last name" value={data?.last_name || "—"}/>
                                        <Row label="Username" value={data?.username || "—"}/>
                                        <Row label="Email" value={data?.email || "—"}/>
                                    </div>

                                    <p className="mt-3 text-[11px] text-slate-400">Editing is disabled for your account.</p>
                                </div>
                            )}

                            {section === "STATUS" && (
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                    <h2 className="text-sm font-semibold text-slate-900">Account Info</h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Read-only details about your account.
                                    </p>

                                    <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                                        <Row label="User ID" value={data?.id != null ? String(data.id) : "—"}/>
                                        <Row label="Role" value={data?.role_name || "—"}/>
                                        <Row label="Status" value={data?.is_active ? "Active" : "Pending verification"}/>
                                        <Row label="Joined" value={fmtDateTime(data?.date_joined)}/>
                                        <Row label="Last login" value={fmtDateTime(data?.last_login)}/>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </motion.div>
            </main>
        </>
    );
};

export default AccountSettings;
