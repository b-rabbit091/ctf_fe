import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";
import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {bulkUpdateChallenges, getChallenges} from "../../api/practice";
import {Challenge} from "../CompetitionPage/types";
import {FiCheckSquare, FiSquare, FiAlertCircle, FiInfo} from "react-icons/fi";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const AdminDraftAssignPracticeList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [allDrafts, setAllDrafts] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const [page, setPage] = useState(1);
    const pageSize = 10;

    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const busyRef = useRef(false);
    const msgTimer = useRef<number | null>(null);

    const resetMessages = useCallback(() => {
        setMessage(null);
        setError(null);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        msgTimer.current = null;
    }, []);

    const flashMessage = useCallback((text: string | null) => {
        setMessage(text);
        if (msgTimer.current) window.clearTimeout(msgTimer.current);
        if (!text) return;
        msgTimer.current = window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, 3500);
    }, []);

    // ---------------- SECURITY (TOP) ----------------
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/dashboard");
    }, [user, navigate]);

    const fetchDrafts = useCallback(async () => {
        if (!user) return;
        if (user.role !== "admin") return;

        setLoading(true);
        setError(null);

        try {
            const chals = await getChallenges();
            if (!alive.current) return;

            const draftsOnly = (chals || []).filter((c: any) => (c?.question_type ?? "") === "N/A");
            setAllDrafts(draftsOnly);
        } catch (e) {
            console.error(e);
            if (!alive.current) return;
            setError("Failed to load drafted questions (question_type = N/A). Please try again.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allDrafts;

        return allDrafts.filter((c: any) => {
            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();
            return title.includes(q) || desc.includes(q) || cat.includes(q);
        });
    }, [allDrafts, search]);

    // ✅ selected float to top after filtering
    const sortedFiltered = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const aSel = selectedIds.has(a.id) ? 1 : 0;
            const bSel = selectedIds.has(b.id) ? 1 : 0;
            if (aSel !== bSel) return bSel - aSel;
            return (b.id ?? 0) - (a.id ?? 0);
        });
        return arr;
    }, [filtered, selectedIds]);

    const total = sortedFiltered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedFiltered.slice(start, start + pageSize);
    }, [sortedFiltered, page]);

    const selectedCount = selectedIds.size;

    const toggleOne = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAllOnPage = useCallback(() => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const allSelected = pageItems.length > 0 && pageItems.every((c) => next.has(c.id));
            if (allSelected) pageItems.forEach((c) => next.delete(c.id));
            else pageItems.forEach((c) => next.add(c.id));
            return next;
        });
    }, [pageItems]);

    const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

    const resetSearch = useCallback(() => {
        setSearch("");
        setPage(1);
    }, []);

    const handleAssignToPractice = useCallback(async () => {
        resetMessages();

        if (!user || user.role !== "admin") {
            setError("Unauthorized: admin only.");
            return;
        }
        if (selectedIds.size === 0) {
            setError("Select at least one draft to assign.");
            return;
        }
        if (busyRef.current) return;

        const ok = window.confirm(`Assign ${selectedIds.size} draft question(s) as PRACTICE?`);
        if (!ok) return;

        busyRef.current = true;
        setError(null);
        flashMessage("Assigning selected drafts as practice...");

        const ids = Array.from(selectedIds);

        try {
            await bulkUpdateChallenges({
                ids,
                question_type: "practice",
                contest_id: null,
            });

            if (!alive.current) return;

            setAllDrafts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
            clearSelection();
            flashMessage("Assigned successfully.");
        } catch (e: any) {
            console.error(e);
            if (!alive.current) return;
            setError(e?.response?.data?.detail || e?.message || "Failed to assign drafts as practice.");
            setMessage(null);
        } finally {
            busyRef.current = false;
        }
    }, [resetMessages, user, selectedIds, flashMessage, clearSelection]);

    // --- full-screen responsive shell (match AdminPracticeList) ---
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
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    <div className="w-full rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 bg-white/40 px-4 sm:px-5 py-4">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                    Assign Drafts → Practice
                                </h1>
                                <p className="mt-1 text-sm sm:text-base text-slate-500">
                                    Lists drafts where <span className="text-slate-700">question_type = N/A</span>. Select drafts and assign them as practice.
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <button
                                    type="button"
                                    disabled={selectedCount === 0 || loading}
                                    onClick={handleAssignToPractice}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-xl bg-white/70 px-5 py-2 text-sm sm:text-base font-normal tracking-tight",
                                        selectedCount === 0 || loading
                                            ? "cursor-not-allowed ring-1 ring-slate-200/60 text-slate-300"
                                            : "ring-1 ring-emerald-200/60 text-emerald-700 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    Assign as practice
                                    {selectedCount > 0 ? (
                                        <span className="ml-1 inline-flex items-center rounded-full ring-1 ring-emerald-200/60 bg-emerald-50/60 px-2 py-0.5 text-xs text-emerald-700">
                                            {selectedCount}
                                        </span>
                                    ) : null}
                                </button>

                                <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-600">
                                    <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1">
                                        Total: <span className="ml-1 text-slate-800">{total}</span>
                                    </span>
                                    <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1">
                                        Selected: <span className="ml-1 text-slate-800">{selectedCount}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-4 sm:px-5 py-5">
                            {/* Controls */}
                            <section className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
                                <div className="px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex w-full items-center gap-3 md:w-auto">
                                        <div className="w-full md:w-[420px]">
                                            <input
                                                type="search"
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value);
                                                    setPage(1);
                                                }}
                                                placeholder="Search drafts by title, description, category…"
                                                className={cx(
                                                    "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                                    "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                                )}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={toggleAllOnPage}
                                            className={cx(
                                                "h-10 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                                "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                focusRing
                                            )}
                                        >
                                            Toggle page
                                        </button>

                                        <button
                                            type="button"
                                            onClick={clearSelection}
                                            className={cx(
                                                "h-10 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                                "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                focusRing
                                            )}
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 md:justify-end">
                                        <button
                                            type="button"
                                            onClick={resetSearch}
                                            className={cx(
                                                "h-10 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                                "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                focusRing
                                            )}
                                        >
                                            Reset search
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Alerts */}
                            {loading ? (
                                <div className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                                        <div className="min-w-0 space-y-2">
                                            <div className="h-4 w-52 bg-slate-200/80 rounded animate-pulse" />
                                            <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-center text-sm text-slate-500">Loading drafts…</p>
                                </div>
                            ) : null}

                            {error ? (
                                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                                    <div className="flex items-start gap-3">
                                        <FiAlertCircle className="mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-normal tracking-tight">Couldn’t load drafts</p>
                                            <p className="mt-1 text-sm whitespace-pre-line break-words text-rose-700/90">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {message ? (
                                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800">
                                    {message}
                                </div>
                            ) : null}

                            {/* Table / empty */}
                            {!loading && !error ? (
                                <>
                                    {total === 0 ? (
                                        <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                            <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                                <FiInfo className="text-slate-500" />
                                            </div>
                                            <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                                No drafts found
                                            </div>
                                            <div className="mt-1 text-sm sm:text-base text-slate-500">
                                                No items currently have <span className="text-slate-700">question_type = N/A</span>.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
                                            <table className="min-w-full text-sm sm:text-base">
                                                <thead className="bg-white/40 sticky top-0">
                                                <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                                    <th className="w-14 px-4 py-3 font-normal">Select</th>
                                                    <th className="px-4 py-3 font-normal">Title</th>
                                                    <th className="px-4 py-3 font-normal">Category</th>
                                                    <th className="px-4 py-3 font-normal">Difficulty</th>
                                                    <th className="px-4 py-3 font-normal">Status</th>
                                                </tr>
                                                </thead>

                                                <tbody className="bg-transparent">
                                                {pageItems.map((c: any) => {
                                                    const isSelected = selectedIds.has(c.id);
                                                    return (
                                                        <tr
                                                            key={c.id}
                                                            className={cx(
                                                                "border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition",
                                                                isSelected && "bg-emerald-50/40"
                                                            )}
                                                        >
                                                            <td className="px-4 py-3 align-top">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleOne(c.id)}
                                                                    className={cx(
                                                                        "inline-flex items-center justify-center rounded-xl bg-white/70 p-2",
                                                                        "ring-1 ring-slate-200/60 hover:bg-white/90",
                                                                        focusRing
                                                                    )}
                                                                    aria-label={isSelected ? "Unselect" : "Select"}
                                                                >
                                                                    {isSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                                                                </button>
                                                            </td>

                                                            <td className="px-4 py-3 align-top">
                                                                <div className="max-w-[34rem]">
                                                                    <div className="truncate font-normal tracking-tight text-slate-700">
                                                                        {c.title}
                                                                    </div>
                                                                    <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                                        {c.description}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-slate-600">
                                                                {c.category?.name || "—"}
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-slate-600">
                                                                {c.difficulty?.level || "N/A"}
                                                            </td>

                                                            <td className="px-4 py-3 align-top text-slate-600">
                                                                    <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm">
                                                                        Draft (N/A)
                                                                    </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {total > 0 ? (
                                        <div className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="text-sm sm:text-base text-slate-600">
                                                    Page <span className="text-slate-700">{page}</span> of{" "}
                                                    <span className="text-slate-700">{pageCount}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={page <= 1}
                                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                        className={cx(
                                                            "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                                            focusRing
                                                        )}
                                                    >
                                                        Prev
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={page >= pageCount}
                                                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                                        className={cx(
                                                            "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                                            focusRing
                                                        )}
                                                    >
                                                        Next
                                                    </button>
                                                </div>

                                                <div className="text-sm sm:text-base text-slate-600">
                                                    Showing{" "}
                                                    <span className="text-slate-700">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> –{" "}
                                                    <span className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                                    <span className="text-slate-700">{total}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminDraftAssignPracticeList;
