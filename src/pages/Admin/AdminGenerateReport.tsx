import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Navbar from "../../components/Navbar";
import {FiSearch, FiFileText, FiEye, FiX, FiAlertCircle, FiInfo} from "react-icons/fi";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../contexts/AuthContext";
import {generateReportByChallengeId, ReportAttempt, ReportResponse} from "../../api/practice";

/** -------------------- utils / styles -------------------- **/
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const isoToLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
const toISOStart = (yyyyMmDd: string) => (yyyyMmDd ? `${yyyyMmDd}T00:00:00.000Z` : undefined);
const toISOEnd = (yyyyMmDd: string) => (yyyyMmDd ? `${yyyyMmDd}T23:59:59.999Z` : undefined);

const statusTone = (st?: string | null) => {
    const s = (st || "").toLowerCase();
    if (!s) return "slate" as const;
    if (s.includes("correct") || s.includes("accept") || s.includes("solved")) return "green" as const;
    if (s.includes("incorrect") || s.includes("reject") || s.includes("wrong")) return "red" as const;
    if (s.includes("pending") || s.includes("review")) return "amber" as const;
    return "slate" as const;
};

const Badge: React.FC<{text: string; tone?: "slate" | "green" | "red" | "amber"}> = ({text, tone = "slate"}) => {
    const map: Record<string, string> = {
        slate: "ring-slate-200/60 bg-slate-100/70 text-slate-700",
        green: "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700",
        red: "ring-rose-200/60 bg-rose-50/70 text-rose-700",
        amber: "ring-amber-200/60 bg-amber-50/70 text-amber-800",
    };
    return (
        <span className={cx("inline-flex items-center rounded-full ring-1 px-3 py-1 text-xs sm:text-sm", map[tone])}>
            {text}
        </span>
    );
};

const renderAttemptLine = (a: ReportAttempt) => {
    const st = a.status ?? "—";
    const when = isoToLocal(a.submitted_at);
    const score = Number.isFinite(a.score) ? a.score : 0;

    const submittedBy =
        a.submitted_by?.username ? <span className="text-slate-500"> · by {a.submitted_by.username}</span> : null;

    return (
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge text={a.type} tone="slate" />
                    <Badge text={st} tone={statusTone(st)} />
                    <span className="text-xs sm:text-sm text-slate-500">{when}</span>
                    {submittedBy}
                </div>

                <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-white/70 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-900">
                    Score: {score}
                </span>
            </div>

            {a.type === "flag" ? (
                <div className="text-xs sm:text-sm text-slate-700">
                    <span className="font-medium text-slate-900">Submitted:</span>{" "}
                    <span className="break-all">{a.submitted_value ?? "—"}</span>
                </div>
            ) : (
                <div className="text-xs sm:text-sm text-slate-700">
                    <span className="font-medium text-slate-900">Submitted:</span>{" "}
                    <span className="break-words whitespace-pre-wrap">{a.submitted_content ?? "—"}</span>
                </div>
            )}
        </div>
    );
};

/** -------------------- component -------------------- **/
const AdminGenerateReport: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

    // SECURITY
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    // Inputs
    const [challengeId, setChallengeId] = useState<string>("");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    // Table filters
    const [who, setWho] = useState<"ALL" | "user" | "group">("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [solutionTypeFilter, setSolutionTypeFilter] = useState<"ALL" | "flag" | "procedure" | "flag and procedure">(
        "ALL"
    );
    const [search, setSearch] = useState<string>("");

    // Data
    const [report, setReport] = useState<ReportResponse | null>(null);

    // UX
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Modal
    const [viewRowId, setViewRowId] = useState<string | null>(null);

    // guards
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const msgTimer = useRef<number | null>(null);
    const busyRef = useRef(false);

    const resetMessages = useCallback(() => {
        setError(null);
        setMessage(null);
    }, []);

    const flashMessage = useCallback((text: string | null, ms = 2500) => {
        setMessage(text);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        if (!text) return;
        msgTimer.current = window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, ms);
    }, []);

    const rows = report?.rows ?? [];

    const uniqueStatuses = useMemo(() => {
        const st = new Set<string>();
        rows.forEach((r) => {
            const f = r.summary?.flag?.latest_status;
            const p = r.summary?.procedure?.latest_status;
            if (f) st.add(f);
            if (p) st.add(p);
        });
        return Array.from(st).sort((a, b) => a.localeCompare(b));
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((r) => {
            if (who !== "ALL" && r.entity_type !== who) return false;
            if (solutionTypeFilter !== "ALL" && r.solution_type !== solutionTypeFilter) return false;

            if (statusFilter !== "ALL") {
                const s1 = r.summary?.flag?.latest_status ?? "";
                const s2 = r.summary?.procedure?.latest_status ?? "";
                if (s1 !== statusFilter && s2 !== statusFilter) return false;
            }

            if (!q) return true;
            const entityName =
                r.entity_type === "user" ? (r.entity as any)?.username ?? "" : (r.entity as any)?.name ?? "";
            return entityName.toLowerCase().includes(q);
        });
    }, [rows, who, statusFilter, solutionTypeFilter, search]);

    const summary = useMemo(() => {
        const total = filteredRows.length;

        const avgTotal = total
            ? Math.round(filteredRows.reduce((acc, r) => acc + (r.summary?.total_score ?? 0), 0) / total)
            : 0;

        const flagAvg = total
            ? Math.round(filteredRows.reduce((acc, r) => acc + (r.summary?.flag?.best_score ?? 0), 0) / total)
            : 0;

        const procAvg = total
            ? Math.round(filteredRows.reduce((acc, r) => acc + (r.summary?.procedure?.best_score ?? 0), 0) / total)
            : 0;

        return {total, avgTotal, flagAvg, procAvg};
    }, [filteredRows]);

    const selectedRow = useMemo(() => {
        if (!viewRowId) return null;
        return rows.find((r) => r.row_id === viewRowId) ?? null;
    }, [viewRowId, rows]);

    const solutionLabel = report?.challenge?.solution_type ?? null;

    const handleGenerate = useCallback(async () => {
        resetMessages();

        if (!user || user.role !== "admin") {
            setError("Unauthorized – admin only.");
            return;
        }

        const idNum = Number(challengeId);
        if (!Number.isFinite(idNum) || idNum <= 0) {
            setError("Please enter a valid Challenge ID (number).");
            return;
        }

        if (busyRef.current) return;
        busyRef.current = true;

        setLoading(true);
        flashMessage("Generating report…", 2000);

        try {
            const res = await generateReportByChallengeId(idNum, toISOStart(from), toISOEnd(to));
            if (!alive.current) return;

            setReport(res);
            setGeneratedAt(new Date().toLocaleString());
            flashMessage("Report generated.");
        } catch (e: any) {
            if (!alive.current) return;
            setError(e?.message || "Failed to generate report.");
            setMessage(null);
        } finally {
            busyRef.current = false;
            if (!alive.current) return;
            setLoading(false);
        }
    }, [resetMessages, user, challengeId, from, to, flashMessage]);

    const closeModal = useCallback(() => setViewRowId(null), []);

    // ESC closes modal
    useEffect(() => {
        if (!selectedRow) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeModal();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedRow, closeModal]);

    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar />
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Unauthorized</p>
                                <p className="mt-1 text-sm text-rose-700/90">Admin access required.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden">
                    {/* Header */}
                    <header className="px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-white/40">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                    Generate Report
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-500">
                                    Enter a Challenge ID, choose a time range, and generate an admin report.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-white/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                    <FiFileText className="mr-2" />
                                    Rows: <span className="ml-1 font-semibold text-slate-900">{summary.total}</span>
                                </span>

                                <span className="hidden sm:inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-white/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                    Avg Total: <span className="ml-1 font-semibold text-slate-900">{summary.avgTotal}</span>
                                </span>
                            </div>
                        </div>
                    </header>

                    {/* Builder */}
                    <section className="px-4 sm:px-5 py-5 border-b border-slate-200/70">
                        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-4">
                                <label className="mb-1 block text-sm font-normal text-slate-600">
                                    Challenge ID <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={challengeId}
                                        onChange={(e) => setChallengeId(e.target.value)}
                                        placeholder="e.g. 12"
                                        inputMode="numeric"
                                        className={cx(
                                            "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-10 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="lg:col-span-3">
                                <label className="mb-1 block text-sm font-normal text-slate-600">From</label>
                                <input
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    type="date"
                                    className={cx(
                                        "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                        "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                                    )}
                                />
                            </div>

                            <div className="lg:col-span-3">
                                <label className="mb-1 block text-sm font-normal text-slate-600">To</label>
                                <input
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    type="date"
                                    className={cx(
                                        "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 text-sm sm:text-base text-slate-700 shadow-sm",
                                        "focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                                    )}
                                />
                            </div>

                            <div className="lg:col-span-2 flex flex-col items-stretch gap-2">
                                {generatedAt ? (
                                    <div className="hidden lg:block text-xs text-slate-500">
                                        Last generated: <span className="font-medium text-slate-700">{generatedAt}</span>
                                    </div>
                                ) : (
                                    <div className="hidden lg:block text-xs text-slate-500">
                                        <FiInfo className="inline -mt-0.5 mr-1" />
                                        Filters apply after generation.
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className={cx(
                                        "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm sm:text-base font-normal tracking-tight",
                                        loading
                                            ? "cursor-not-allowed ring-1 ring-slate-200/60 bg-white/60 text-slate-300"
                                            : "ring-1 ring-emerald-200/60 bg-white/70 text-emerald-700 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    {loading ? "Generating…" : "Generate"}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {(error || message) ? (
                        <div className="px-4 sm:px-5 pt-4">
                            {error ? (
                                <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                                    <div className="flex items-start gap-3">
                                        <FiAlertCircle className="mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-normal tracking-tight">Fix required</p>
                                            <p className="mt-1 text-sm whitespace-pre-line break-words text-rose-700/90">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {message ? (
                                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800">
                                    {message}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Filters */}
                    {report ? (
                        <section className="px-4 sm:px-5 pb-5">
                            <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                <div className="grid gap-3 md:grid-cols-12 md:items-end">
                                    <div className="md:col-span-4">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Search user/group</label>
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Type username or group name…"
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Entity</label>
                                        <select
                                            value={who}
                                            onChange={(e) => setWho(e.target.value as any)}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "hover:bg-slate-50/70 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                        >
                                            <option value="ALL">All</option>
                                            <option value="user">Users</option>
                                            <option value="group">Groups</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-3">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Solution type</label>
                                        <select
                                            value={solutionTypeFilter}
                                            onChange={(e) => setSolutionTypeFilter(e.target.value as any)}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "hover:bg-slate-50/70 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                        >
                                            <option value="ALL">All</option>
                                            <option value="flag">Flag</option>
                                            <option value="procedure">Procedure</option>
                                            <option value="flag and procedure">Flag and procedure</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-sm font-normal text-slate-600">Status</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className={cx(
                                                "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                                "hover:bg-slate-50/70 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30"
                                            )}
                                        >
                                            <option value="ALL">All</option>
                                            {uniqueStatuses.map((st) => (
                                                <option key={st} value={st}>
                                                    {st}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-500">
                                    <div>
                                        Showing <span className="font-semibold text-slate-900">{filteredRows.length}</span> /{" "}
                                        <span className="font-semibold text-slate-900">{rows.length}</span>
                                    </div>
                                    <div>
                                        Avg Flag: <span className="font-semibold text-slate-900">{summary.flagAvg}</span> • Avg Proc:{" "}
                                        <span className="font-semibold text-slate-900">{summary.procAvg}</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <div className="px-4 sm:px-5 py-5">
                            <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                    <FiInfo className="text-slate-500" />
                                </div>
                                <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                    Generate a report to view rows
                                </div>
                                <div className="mt-1 text-sm sm:text-base text-slate-500">
                                    Enter a Challenge ID and click <span className="font-medium">Generate</span>.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    {report ? (
                        <div className="px-4 sm:px-5 pb-6">
                            <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                <table className="min-w-full text-sm sm:text-base">
                                    <thead className="bg-white/40 sticky top-0">
                                    <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-4 py-3 font-normal">User / Group</th>
                                        <th className="px-4 py-3 font-normal">Solution</th>
                                        <th className="px-4 py-3 font-normal">Status</th>
                                        <th className="px-4 py-3 font-normal">Date</th>
                                        <th className="px-4 py-3 font-normal">Flag</th>
                                        <th className="px-4 py-3 font-normal">Procedure</th>
                                        <th className="px-4 py-3 font-normal">Total</th>
                                        <th className="px-4 py-3 text-right font-normal">Actions</th>
                                    </tr>
                                    </thead>

                                    <tbody className="bg-transparent">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                                                No rows match your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((r) => {
                                            const entityName =
                                                r.entity_type === "user" ? (r.entity as any).username : (r.entity as any).name;

                                            const flagBest = r.summary?.flag?.best_score ?? 0;
                                            const procBest = r.summary?.procedure?.best_score ?? 0;
                                            const total = r.summary?.total_score ?? 0;
                                            const date = r.summary?.date ?? null;

                                            const stFlag = r.summary?.flag?.latest_status;
                                            const stProc = r.summary?.procedure?.latest_status;

                                            return (
                                                <tr key={r.row_id} className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition">
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="font-normal tracking-tight text-slate-700">{entityName}</div>
                                                        <div className="mt-0.5 text-xs sm:text-sm text-slate-500 capitalize">
                                                            {r.entity_type}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 align-top">
                                                        <Badge text={r.solution_type} tone="slate" />
                                                    </td>

                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex flex-wrap gap-2">
                                                            {stFlag ? (
                                                                <Badge text={`Flag: ${stFlag}`} tone={statusTone(stFlag)} />
                                                            ) : (
                                                                <Badge text="Flag: —" tone="slate" />
                                                            )}
                                                            {stProc ? (
                                                                <Badge text={`Proc: ${stProc}`} tone={statusTone(stProc)} />
                                                            ) : (
                                                                <Badge text="Proc: —" tone="slate" />
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 align-top text-slate-500">{isoToLocal(date)}</td>

                                                    <td className="px-4 py-3 align-top">
                                                            <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-white/70 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-900">
                                                                {flagBest}
                                                            </span>
                                                    </td>

                                                    <td className="px-4 py-3 align-top">
                                                            <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-white/70 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-900">
                                                                {procBest}
                                                            </span>
                                                    </td>

                                                    <td className="px-4 py-3 align-top">
                                                            <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-900">
                                                                {total}
                                                            </span>
                                                    </td>

                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={() => setViewRowId(r.row_id)}
                                                                className={cx(
                                                                    "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                    "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                                                    focusRing
                                                                )}
                                                            >
                                                                <FiEye size={16} />
                                                                <span>See more</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Modal */}
                {selectedRow && report ? (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 px-3 py-6 md:py-10"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) closeModal();
                        }}
                    >
                        <div className="mx-auto w-full max-w-4xl">
                            <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
                                {/* Sticky header */}
                                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-xs sm:text-sm text-slate-500">Report details</div>
                                            <h2 className="mt-0.5 text-lg sm:text-xl font-normal tracking-tight text-slate-900 truncate">
                                                {selectedRow.entity_type === "user"
                                                    ? (selectedRow.entity as any).username
                                                    : (selectedRow.entity as any).name}
                                            </h2>
                                            <div className="mt-1 text-xs sm:text-sm text-slate-600">
                                                Challenge:{" "}
                                                <span className="font-medium text-slate-900">{report.challenge?.title ?? "—"}</span> •
                                                Solution:{" "}
                                                <span className="font-medium capitalize">{selectedRow.solution_type}</span>
                                                {report.challenge?.group_only ? <span className="ml-2"><Badge text="Group-only" tone="amber" /></span> : null}
                                            </div>
                                        </div>

                                        <button
                                            onClick={closeModal}
                                            className={cx(
                                                "inline-flex items-center justify-center rounded-full ring-1 ring-slate-200/60 bg-white p-2 text-slate-700 hover:bg-slate-50",
                                                focusRing
                                            )}
                                            aria-label="Close"
                                            title="Close"
                                        >
                                            <FiX size={18} />
                                        </button>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <Badge text={`Flag best: ${selectedRow.summary.flag.best_score}`} tone="slate" />
                                        <Badge text={`Procedure best: ${selectedRow.summary.procedure.best_score}`} tone="slate" />
                                        <Badge text={`Total: ${selectedRow.summary.total_score}`} tone="slate" />
                                        <span className="sm:ml-auto text-xs sm:text-sm text-slate-500">
                                            Latest:{" "}
                                            <span className="font-medium text-slate-700">{isoToLocal(selectedRow.summary.date)}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Scroll body */}
                                <div className="max-h-[78vh] overflow-y-auto px-4 sm:px-5 py-5 space-y-5">
                                    {/* Correct solution first */}
                                    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm sm:text-base font-normal tracking-tight text-slate-900">
                                                Correct solution (Admin)
                                            </div>
                                            <div className="text-xs sm:text-sm text-slate-500">Sensitive • keep admin-only</div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(solutionLabel === "flag" || solutionLabel === "flag and procedure") ? (
                                                <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
                                                    <div className="text-xs sm:text-sm text-slate-500">Flag</div>
                                                    <pre className="mt-2 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words">
                                                        {selectedRow.see_more.correct_solution.flag_solution ?? "—"}
                                                    </pre>
                                                </div>
                                            ) : null}

                                            {(solutionLabel === "procedure" || solutionLabel === "flag and procedure") ? (
                                                <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4">
                                                    <div className="text-xs sm:text-sm text-slate-500">Procedure</div>
                                                    <pre className="mt-2 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words">
                                                        {selectedRow.see_more.correct_solution.procedure_solution ?? "—"}
                                                    </pre>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Attempts */}
                                    {(solutionLabel === "flag" || solutionLabel === "flag and procedure") ? (
                                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm sm:text-base font-normal tracking-tight text-slate-900">
                                                    Flag submissions
                                                </div>
                                                <Badge text={`${selectedRow.see_more.attempts.flag.length} attempts`} tone="slate" />
                                            </div>

                                            <div className="mt-3 space-y-2">
                                                {selectedRow.see_more.attempts.flag.length === 0 ? (
                                                    <div className="text-xs sm:text-sm text-slate-500">No flag attempts found.</div>
                                                ) : (
                                                    selectedRow.see_more.attempts.flag.map((a, idx) => (
                                                        <div key={`flag-${idx}`}>{renderAttemptLine(a)}</div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ) : null}

                                    {(solutionLabel === "procedure" || solutionLabel === "flag and procedure") ? (
                                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm sm:text-base font-normal tracking-tight text-slate-900">
                                                    Procedure submissions
                                                </div>
                                                <Badge text={`${selectedRow.see_more.attempts.procedure.length} attempts`} tone="slate" />
                                            </div>

                                            <div className="mt-3 space-y-2">
                                                {selectedRow.see_more.attempts.procedure.length === 0 ? (
                                                    <div className="text-xs sm:text-sm text-slate-500">No procedure attempts found.</div>
                                                ) : (
                                                    selectedRow.see_more.attempts.procedure.map((a, idx) => (
                                                        <div key={`proc-${idx}`}>{renderAttemptLine(a)}</div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="h-2" />
                                </div>

                                {/* Sticky footer */}
                                <div className="border-t border-slate-200 bg-white px-4 sm:px-5 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={closeModal}
                                            className={cx(
                                                "rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900",
                                                "ring-1 ring-slate-200/60 bg-white/70 hover:bg-white/90",
                                                focusRing
                                            )}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 text-center text-xs sm:text-sm text-white/70">
                                Tip: Click outside the modal or press <span className="font-semibold">Esc</span> to exit.
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
};

export default AdminGenerateReport;
