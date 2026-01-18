// src/pages/admin/AdminBlogList.tsx
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {motion} from "framer-motion";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

import {FiPlus, FiEye, FiEdit2, FiTrash2, FiRefreshCw} from "react-icons/fi";

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

    useEffect(() => {
        if (!user) return;

        if (user.role !== "admin") {
            navigate("/dashboard");
            return;
        }

        let mounted = true;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getBlogs();
                if (!mounted) return;
                setBlogs(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load blogs. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchData();
        return () => {
            mounted = false;
        };
    }, [user, navigate]);

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

    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const handleDelete = useCallback(
        async (id: number) => {
            if (!user || user.role !== "admin") {
                setMessage("Unauthorized: admin only.");
                return;
            }

            if (!window.confirm("Are you sure you want to delete this blog? This cannot be undone.")) return;

            const backup = blogs;
            setBlogs((prev) => prev.filter((b: any) => b.id !== id));
            setMessage("Deleting blog...");

            try {
                await deleteBlog(id);
                setMessage("Blog deleted.");
            } catch (err) {
                console.error(err);
                setBlogs(backup);
                setMessage("Failed to delete blog.");
            } finally {
                window.setTimeout(() => setMessage(null), 3500);
            }
        },
        [blogs, user]
    );

    const handleClearFilters = () => {
        setSearch("");
        setPage(1);
    };

    // --- responsive full-screen shell for guard states ---
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div className="w-full text-base md:text-lg text-slate-500">Checking permissions…</div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex flex-col">
                <Navbar/>
                <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                    <div
                        className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-base md:text-lg text-red-700">
                        Unauthorized – admin access required.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar/>

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                    {/* Header */}
                    <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">Manage Blogs</h1>
                            <p className="mt-1 text-sm sm:text-base md:text-lg text-slate-500">
                                Admin view of all blog posts. Create, review, and maintain articles from here.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/admin/blogs/new")}
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm sm:text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                        >
                            <FiPlus size={18}/>
                            <span>New Blog</span>
                        </button>
                    </header>

                    {/* Filters */}
                    <section
                        className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by title or content…"
                                className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm sm:text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />

                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm sm:text-base text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            >
                                Clear
                            </button>

                            <div className="ml-auto text-sm sm:text-base text-slate-500">
                                Total: <span className="font-medium text-slate-800">{total}</span>
                            </div>
                        </div>
                    </section>

                    {/* Alerts */}
                    {loading && (
                        <div
                            className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm sm:text-base text-slate-700 shadow-sm">
                            <span className="inline-flex items-center gap-2">
                                <FiRefreshCw className="animate-spin"/>
                                Loading blogs…
                            </span>
                        </div>
                    )}
                    {error && (
                        <div
                            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm sm:text-base text-red-700 shadow-sm">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div
                            className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm sm:text-base text-blue-800 shadow-sm">
                            {message}
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div
                                    className="rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-base md:text-lg text-slate-500 shadow-sm">
                                    No blogs found.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm sm:text-base">
                                        <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Date
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Excerpt
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                        {pageItems.map((b: any) => (
                                            <tr key={b.id}>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="max-w-xs">
                                                        <div
                                                            className="truncate font-medium text-slate-900 text-sm sm:text-base">
                                                            {b.title || "Untitled"}
                                                        </div>
                                                        <div className="mt-1 text-sm text-slate-500">
                                                            {b.cover_image ? "Has cover" : "No cover"}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 align-top text-sm sm:text-base text-slate-700 whitespace-nowrap">
                                                    {b.createdLabel}
                                                </td>

                                                <td className="px-4 py-3 align-top">
                                                    <div className="max-w-xl line-clamp-2 text-sm text-slate-600">
                                                        {b.excerpt || "—"}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex justify-end gap-2 text-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/blogs/${b.id}`)}
                                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <FiEye size={16}/>
                                                            <span>View</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/admin/blogs/edit/${b.id}`)}
                                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <FiEdit2 size={16}/>
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(Number(b.id))}
                                                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
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

                            {/* Pagination */}
                            {total > 0 && (
                                <div
                                    className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-600">
                                    <div>
                                        Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                                        <span className="font-semibold text-slate-900">{pageCount}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            type="button"
                                            disabled={page >= pageCount}
                                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default AdminBlogList;
