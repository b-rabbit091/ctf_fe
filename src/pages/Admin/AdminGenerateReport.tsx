import React, { useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { FiSearch, FiFileText, FiEye, FiX } from "react-icons/fi";
import { generateReportByChallengeId, ReportResponse, ReportAttempt } from "../../api/practice";

const isoToLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");
const toISOStart = (yyyyMmDd: string) => (yyyyMmDd ? `${yyyyMmDd}T00:00:00.000Z` : undefined);
const toISOEnd = (yyyyMmDd: string) => (yyyyMmDd ? `${yyyyMmDd}T23:59:59.999Z` : undefined);

const badge = (text: string, tone: "slate" | "green" | "red" | "amber" = "slate") => {
    const map: Record<string, string> = {
        slate: "border-slate-200 bg-slate-50 text-slate-700",
        green: "border-emerald-200 bg-emerald-50 text-emerald-700",
        red: "border-rose-200 bg-rose-50 text-rose-700",
        amber: "border-amber-200 bg-amber-50 text-amber-800",
    };
    return (
        <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-sm md:text-base font-medium ${map[tone]}`}>
      {text}
    </span>
    );
};

const statusTone = (st?: string | null) => {
    const s = (st || "").toLowerCase();
    if (!s) return "slate" as const;
    if (s.includes("correct") || s.includes("accept") || s.includes("solved")) return "green" as const;
    if (s.includes("incorrect") || s.includes("reject") || s.includes("wrong")) return "red" as const;
    if (s.includes("pending") || s.includes("review")) return "amber" as const;
    return "slate" as const;
};

const renderAttemptLine = (a: ReportAttempt) => {
    const st = a.status ?? "—";
    const when = isoToLocal(a.submitted_at);
    const score = Number.isFinite(a.score) ? a.score : 0;

    const submittedBy =
        a.submitted_by?.username ? <span className="text-slate-500"> · by {a.submitted_by.username}</span> : null;

    return (
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {badge(a.type, "slate")}
                    {badge(st, statusTone(st))}
                    <span className="text-sm md:text-base text-slate-500">{when}</span>
                    {submittedBy}
                </div>

                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-900">
          Score: {score}
        </span>
            </div>

            {a.type === "flag" ? (
                <div className="text-sm md:text-base text-slate-700">
                    <span className="font-medium text-slate-900">Submitted:</span>{" "}
                    <span className="break-all">{a.submitted_value ?? "—"}</span>
                </div>
            ) : (
                <div className="text-sm md:text-base text-slate-700">
                    <span className="font-medium text-slate-900">Submitted:</span>{" "}
                    <span className="break-words whitespace-pre-wrap">{a.submitted_content ?? "—"}</span>
                </div>
            )}
        </div>
    );
};

const AdminGenerateReport: React.FC = () => {
    // Inputs
    const [challengeId, setChallengeId] = useState<string>("");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    // Table filters (client-side)
    const [who, setWho] = useState<"ALL" | "user" | "group">("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [solutionTypeFilter, setSolutionTypeFilter] = useState<"ALL" | "flag" | "procedure" | "flag and procedure">("ALL");
    const [search, setSearch] = useState<string>("");

    // Data
    const [report, setReport] = useState<ReportResponse | null>(null);

    // UX state
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Modal
    const [viewRowId, setViewRowId] = useState<string | null>(null);

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

        return { total, avgTotal, flagAvg, procAvg };
    }, [filteredRows]);

    const selectedRow = useMemo(() => {
        if (!viewRowId) return null;
        return rows.find((r) => r.row_id === viewRowId) ?? null;
    }, [viewRowId, rows]);

    const handleGenerate = async () => {
        setError(null);
        setMessage(null);

        const idNum = Number(challengeId);
        if (!Number.isFinite(idNum) || idNum <= 0) {
            setError("Please enter a valid Challenge ID (number).");
            return;
        }

        setLoading(true);
        setMessage("Generating report…");

        try {
            const res = await generateReportByChallengeId(idNum, toISOStart(from), toISOEnd(to));
            setReport(res);
            setGeneratedAt(new Date().toLocaleString());
            setMessage("Report generated.");
            window.setTimeout(() => setMessage(null), 2500);
        } catch (e: any) {
            setError(e?.message || "Failed to generate report.");
            setMessage(null);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => setViewRowId(null);

    const solutionLabel = report?.challenge?.solution_type ?? null;

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <div className="w-full">
                    <header className="mb-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">Generate Report</h1>
                                <p className="mt-1 text-sm md:text-base text-slate-600">
                                    Enter a Challenge ID, choose a time range, then generate an admin report.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm md:text-base text-slate-600">
                  <FiFileText className="mr-2" />
                  Rows: <span className="ml-1 font-semibold text-slate-900">{summary.total}</span>
                </span>

                                <span className="hidden md:inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm md:text-base text-slate-600">
                  Avg Total: <span className="ml-1 font-semibold text-slate-900">{summary.avgTotal}</span>
                </span>
                            </div>
                        </div>
                    </header>

                    {/* Builder */}
                    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                                <div className="w-full sm:w-[260px]">
                                    <label className="block text-sm md:text-base font-medium text-slate-700 mb-1">Challenge ID</label>
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={challengeId}
                                            onChange={(e) => setChallengeId(e.target.value)}
                                            placeholder="e.g. 12"
                                            className="w-full rounded-md border border-slate-300 pl-10 pr-3 py-2 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                            inputMode="numeric"
                                        />
                                    </div>
                                </div>

                                <div className="w-full sm:w-auto">
                                    <label className="block text-sm md:text-base font-medium text-slate-700 mb-1">From</label>
                                    <input
                                        value={from}
                                        onChange={(e) => setFrom(e.target.value)}
                                        type="date"
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>

                                <div className="w-full sm:w-auto">
                                    <label className="block text-sm md:text-base font-medium text-slate-700 mb-1">To</label>
                                    <input
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                        type="date"
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {generatedAt && (
                                    <div className="hidden md:block text-sm md:text-base text-slate-500">
                                        Last generated: <span className="font-medium text-slate-700">{generatedAt}</span>
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-base md:text-lg font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Generating…" : "Generate"}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-3 text-base md:text-lg text-red-700 border border-red-200">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 rounded-md bg-blue-50 p-3 text-base md:text-lg text-blue-700 border border-blue-200">
                            {message}
                        </div>
                    )}

                    {/* Client-side filters */}
                    {report && (
                        <section className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col">
                                <label className="text-sm md:text-base font-medium text-slate-700 mb-1">Search user/group</label>
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Type username or group name…"
                                    className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-base md:text-lg"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="text-sm md:text-base font-medium text-slate-700 mb-1">Solution type</label>
                                <select
                                    className="rounded border border-slate-300 px-3 py-2 text-base md:text-lg"
                                    value={solutionTypeFilter}
                                    onChange={(e) => setSolutionTypeFilter(e.target.value as any)}
                                >
                                    <option value="ALL">All</option>
                                    <option value="flag">Flag</option>
                                    <option value="procedure">Procedure</option>
                                    <option value="flag and procedure">flag and procedure</option>
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-sm md:text-base font-medium text-slate-700 mb-1">Status</label>
                                <select
                                    className="rounded border border-slate-300 px-3 py-2 text-base md:text-lg"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">All</option>
                                    {uniqueStatuses.map((st) => (
                                        <option key={st} value={st}>
                                            {st}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="ml-auto flex flex-col justify-end">
                                <div className="text-sm md:text-base text-slate-500">
                                    Showing <span className="font-semibold text-slate-900">{filteredRows.length}</span> /{" "}
                                    <span className="font-semibold text-slate-900">{rows.length}</span>
                                </div>
                                <div className="text-sm md:text-base text-slate-500">
                                    Avg Flag: <span className="font-semibold text-slate-900">{summary.flagAvg}</span> • Avg Proc:{" "}
                                    <span className="font-semibold text-slate-900">{summary.procAvg}</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-full text-base md:text-lg">
                            <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="px-4 py-3 text-left">User / Group</th>
                                <th className="px-4 py-3 text-left">Solution Type</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Flag Score</th>
                                <th className="px-4 py-3 text-left">Procedure Score</th>
                                <th className="px-4 py-3 text-left">Total</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                            {!report ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                                        Enter a Challenge ID and click Generate to view report rows.
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                                        No rows match your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((r) => {
                                    const entityName = r.entity_type === "user" ? (r.entity as any).username : (r.entity as any).name;

                                    const flagBest = r.summary?.flag?.best_score ?? 0;
                                    const procBest = r.summary?.procedure?.best_score ?? 0;
                                    const total = r.summary?.total_score ?? 0;
                                    const date = r.summary?.date ?? null;

                                    const stFlag = r.summary?.flag?.latest_status;
                                    const stProc = r.summary?.procedure?.latest_status;

                                    return (
                                        <tr key={r.row_id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{entityName}</div>
                                                <div className="text-sm md:text-base text-slate-500 capitalize">{r.entity_type}</div>
                                            </td>

                                            <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm md:text-base text-slate-700 capitalize">
                            {r.solution_type}
                          </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {stFlag ? badge(`Flag: ${stFlag}`, statusTone(stFlag)) : badge("Flag: —", "slate")}
                                                    {stProc ? badge(`Proc: ${stProc}`, statusTone(stProc)) : badge("Proc: —", "slate")}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-slate-500">{isoToLocal(date)}</td>

                                            <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-900">
                            {flagBest}
                          </span>
                                            </td>

                                            <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-900">
                            {procBest}
                          </span>
                                            </td>

                                            <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-900">
                            {total}
                          </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => setViewRowId(r.row_id)}
                                                        className="rounded-md border border-slate-300 px-3 py-2 text-sm md:text-base hover:bg-slate-50 flex items-center gap-1"
                                                    >
                                                        <FiEye size={16} /> See more
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

                    {/* Scrollable Modal */}
                    {selectedRow && (
                        <div
                            className="fixed inset-0 z-50 bg-black/40 px-3 py-6 md:py-10"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) closeModal();
                            }}
                        >
                            <div className="mx-auto w-full max-w-4xl">
                                <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
                                    {/* Sticky header */}
                                    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-xs md:text-sm text-slate-500">Report details</div>
                                                <h2 className="mt-0.5 text-xl md:text-2xl font-semibold text-slate-900">
                                                    {selectedRow.entity_type === "user"
                                                        ? (selectedRow.entity as any).username
                                                        : (selectedRow.entity as any).name}
                                                </h2>
                                                <div className="mt-1 text-sm md:text-base text-slate-600">
                                                    Challenge: <span className="font-medium text-slate-900">{report?.challenge?.title ?? "—"}</span>{" "}
                                                    • Solution: <span className="font-medium capitalize">{selectedRow.solution_type}</span>
                                                    {report?.challenge?.group_only ? (
                                                        <span className="ml-2">{badge("Group-only", "amber")}</span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <button
                                                onClick={closeModal}
                                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                                                aria-label="Close"
                                                title="Close"
                                            >
                                                <FiX size={18} />
                                            </button>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {badge(`Flag best: ${selectedRow.summary.flag.best_score}`, "slate")}
                                            {badge(`Procedure best: ${selectedRow.summary.procedure.best_score}`, "slate")}
                                            {badge(`Total: ${selectedRow.summary.total_score}`, "slate")}
                                            <span className="ml-auto text-sm md:text-base text-slate-500">
                        Latest: <span className="font-medium text-slate-700">{isoToLocal(selectedRow.summary.date)}</span>
                      </span>
                                        </div>
                                    </div>

                                    {/* Scroll body */}
                                    <div className="max-h-[78vh] overflow-y-auto px-5 py-5 space-y-5">
                                        {/* Correct solution first */}
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm md:text-base font-semibold text-slate-900">Correct solution (Admin)</div>
                                                <div className="text-xs md:text-sm text-slate-500">Sensitive • keep admin-only</div>
                                            </div>

                                            {/* show sections based on challenge solution_type */}
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(solutionLabel === "flag" || solutionLabel === "flag and procedure") && (
                                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                        <div className="text-sm md:text-base text-slate-500">Flag</div>
                                                        <pre className="mt-2 text-sm md:text-base text-slate-800 whitespace-pre-wrap break-words">
                              {selectedRow.see_more.correct_solution.flag_solution ?? "—"}
                            </pre>
                                                    </div>
                                                )}

                                                {(solutionLabel === "procedure" || solutionLabel === "flag and procedure") && (
                                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                        <div className="text-sm md:text-base text-slate-500">Procedure</div>
                                                        <pre className="mt-2 text-sm md:text-base text-slate-800 whitespace-pre-wrap break-words">
                              {selectedRow.see_more.correct_solution.procedure_solution ?? "—"}
                            </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Submissions below */}
                                        {(solutionLabel === "flag" || solutionLabel === "flag and procedure") && (
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm md:text-base font-semibold text-slate-900">Flag submissions</div>
                                                    {badge(`${selectedRow.see_more.attempts.flag.length} attempts`, "slate")}
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    {selectedRow.see_more.attempts.flag.length === 0 ? (
                                                        <div className="text-sm md:text-base text-slate-500">No flag attempts found.</div>
                                                    ) : (
                                                        selectedRow.see_more.attempts.flag.map((a, idx) => (
                                                            <div key={`flag-${idx}`}>{renderAttemptLine(a)}</div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(solutionLabel === "procedure" || solutionLabel === "flag and procedure") && (
                                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm md:text-base font-semibold text-slate-900">Procedure submissions</div>
                                                    {badge(`${selectedRow.see_more.attempts.procedure.length} attempts`, "slate")}
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    {selectedRow.see_more.attempts.procedure.length === 0 ? (
                                                        <div className="text-sm md:text-base text-slate-500">No procedure attempts found.</div>
                                                    ) : (
                                                        selectedRow.see_more.attempts.procedure.map((a, idx) => (
                                                            <div key={`proc-${idx}`}>{renderAttemptLine(a)}</div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer spacing */}
                                        <div className="h-2" />
                                    </div>

                                    {/* Sticky footer (optional) */}
                                    <div className="border-t border-slate-200 bg-white px-5 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={closeModal}
                                                className="rounded-md border border-slate-300 px-4 py-2 text-sm md:text-base hover:bg-slate-50"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 text-center text-xs md:text-sm text-white/70">
                                    Tip: Click outside the modal or press the close icon to exit.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminGenerateReport;
