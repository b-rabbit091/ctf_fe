// src/pages/admin/AdminBlogList.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import {FiPlus, FiEye, FiEdit2, FiTrash2, FiAlertCircle, FiInfo} from "react-icons/fi";

import {getBlogs, deleteBlog} from "../Blog/api";
import type {Blog as BlogType} from "../Blog/types";

function htmlToPlainText(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
}

function clampText(text: string, maxLen: number): string {
    if (!text) return "";
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

function formatDateShort(iso?: string | null): string {
    if (!iso) return "Unknown date";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const AdminBlogList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [blogs, setBlogs] = useState<BlogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [search, setSearch] = useState("");

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

    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const flashMessage = useCallback((text: string | null) => {
        setMessage(text);
        if (!text) return;
        window.setTimeout(() => {
            if (!alive.current) return;
            setMessage(null);
        }, 3500);
    }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        if (user.role !== "admin") return;

        setLoading(true);
        setError(null);

        try {
            const data = await getBlogs();
            if (!alive.current) return;
            setBlogs(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            if (!alive.current) return;
            setError("Failed to load blogs. Please try again.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const rows = useMemo(() => {
        return (blogs || []).map((b: any) => {
            const plain = htmlToPlainText(b.content || "");
            return {
                ...b,
                createdLabel: formatDateShort((b as any)?.created_at ?? null),
                excerpt: clampText(plain, 180),
            };
        });
    }, [blogs]);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return rows;

        return rows.filter((b: any) => {
            const title = String(b.title || "").toLowerCase();
            const excerpt = String(b.excerpt || "").toLowerCase();
            return title.includes(s) || excerpt.includes(s);
        });
    }, [rows, search]);

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page]);

    const handleDelete = useCallback(
        async (id: number) => {
            if (!user || user.role !== "admin") {
                flashMessage("Unauthorized: admin only.");
                return;
            }
            if (busyRef.current) return;

            if (!window.confirm("Are you sure you want to delete this blog? This cannot be undone.")) return;

            busyRef.current = true;
            setError(null);

            const backup = blogs;
            setBlogs((prev) => prev.filter((b: any) => Number(b.id) !== id));
            flashMessage("Deleting blog...");

            try {
                await deleteBlog(id);
                if (!alive.current) return;
                flashMessage("Blog deleted.");
            } catch (err) {
                console.error(err);
                if (!alive.current) return;
                setBlogs(backup);
                flashMessage("Failed to delete blog.");
            } finally {
                busyRef.current = false;
            }
        },
        [blogs, user, flashMessage]
    );

    const handleClearFilters = useCallback(() => {
        setSearch("");
        setPage(1);
    }, []);

    // --- responsive full-screen shell for guard states (match your AdminPracticeList styling) ---
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar/>
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
                <Navbar/>
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
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
            <Navbar/>

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                                Manage Blogs
                            </h1>
                            <p className="mt-1 text-sm sm:text-base text-slate-500">
                                Admin view of all blog posts. Create, review, and maintain articles from here.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/admin/blogs/new")}
                            className={cx(
                                "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                                "ring-1 ring-emerald-200/60 text-emerald-700 hover:bg-white/90",
                                focusRing
                            )}
                        >
                            <FiPlus size={18}/>
                            <span>New Blog</span>
                        </button>
                    </header>

                    {/* Filters */}
                    <section className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
                        <div className="px-4 sm:px-5 py-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[240px] flex-1">
                                    <label className="sr-only" htmlFor="admin-blog-search">
                                        Search blogs
                                    </label>
                                    <input
                                        id="admin-blog-search"
                                        type="search"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search by title or content…"
                                        className={cx(
                                            "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                            "placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                        )}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className={cx(
                                        "h-10 shrink-0 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                        "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    Reset
                                </button>

                                <span className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3.5 py-2 text-xs sm:text-sm text-slate-600">
                                    <span className="text-slate-500">Total:</span>
                                    <span className="ml-1">{total}</span>
                                </span>
                            </div>
                        </div>
                    </section>

                    {loading ? (
                        <div className="mb-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0"/>
                                <div className="min-w-0 space-y-2">
                                    <div className="h-4 w-52 bg-slate-200/80 rounded animate-pulse"/>
                                    <div className="h-4 w-72 bg-slate-100 rounded animate-pulse"/>
                                </div>
                            </div>
                            <p className="mt-3 text-center text-sm text-slate-500">Loading blogs…</p>
                        </div>
                    ) : null}

                    {error ? (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="mt-0.5 shrink-0"/>
                                <div className="min-w-0">
                                    <p className="font-normal tracking-tight">Couldn’t load blogs</p>
                                    <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {message ? (
                        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sky-700">
                            {message}
                        </div>
                    ) : null}

                    {!loading && !error ? (
                        <>
                            {total === 0 ? (
                                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                    <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                        <FiInfo className="text-slate-500"/>
                                    </div>
                                    <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                        No matches
                                    </div>
                                    <div className="mt-1 text-sm sm:text-base text-slate-500">
                                        No blogs match your search. Try resetting or broadening your query.
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-x-auto">
                                    <table className="min-w-full text-sm sm:text-base">
                                        <thead className="bg-white/40 sticky top-0">
                                        <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-3 font-normal">Title</th>
                                            <th className="px-4 py-3 font-normal">Date</th>
                                            <th className="px-4 py-3 font-normal">Excerpt</th>
                                            <th className="px-4 py-3 text-right font-normal">Actions</th>
                                        </tr>
                                        </thead>

                                        <tbody className="bg-transparent">
                                        {pageItems.map((b: any) => (
                                            <tr
                                                key={b.id}
                                                className="border-b border-slate-100/70 last:border-0 hover:bg-white/60 transition"
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <div className="max-w-[34rem]">
                                                        <div className="truncate font-normal tracking-tight text-slate-700">
                                                            {b.title || "Untitled"}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {b.cover_image ? "Has cover" : "No cover"}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 align-top text-slate-600 whitespace-nowrap">
                                                    {b.createdLabel}
                                                </td>

                                                <td className="px-4 py-3 align-top">
                                                    <div className="max-w-xl line-clamp-2 text-sm text-slate-600">
                                                        {b.excerpt || "—"}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/blogs/${b.id}`)}
                                                            className={cx(
                                                                "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                                focusRing
                                                            )}
                                                        >
                                                            <FiEye size={16}/>
                                                            <span>View</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/admin/blogs/edit/${b.id}`)}
                                                            className={cx(
                                                                "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                                focusRing
                                                            )}
                                                        >
                                                            <FiEdit2 size={16}/>
                                                            <span>Edit</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(Number(b.id))}
                                                            className={cx(
                                                                "inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-xs sm:text-sm font-normal tracking-tight",
                                                                "ring-1 ring-rose-200/60 text-rose-700 hover:bg-white/90",
                                                                focusRing
                                                            )}
                                                        >
                                                            <FiTrash2 size={16}/>
                                                            <span>Delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

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
                                            <span className="text-slate-700">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>{" "}
                                            – <span className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                            <span className="text-slate-700">{total}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : null}
                </motion.div>
            </main>
        </div>
    );
};

export default AdminBlogList;
