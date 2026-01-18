import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEdit, FiEye, FiPlus, FiTrash2 } from "react-icons/fi";

import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { deleteBlog, getBlogs } from "./api";
import { Blog as BlogType } from "./types";

/**
 * LeetCode-style listing notes:
 * - Never inject HTML into the list view.
 * - Derive a plain-text excerpt client-side.
 * - Keep UI minimal: title, date, excerpt, actions.
 */

function htmlToPlainText(html: string): string {
    // Strip tags safely without rendering raw HTML.
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
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const BlogList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === "admin";

    const [blogs, setBlogs] = useState<BlogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBlogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getBlogs();
            setBlogs(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setError("Failed to load blogs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBlogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onDelete = async (id: number) => {
        const ok = window.confirm("Are you sure you want to delete this blog? This cannot be undone.");
        if (!ok) return;

        try {
            await deleteBlog(id);
            await loadBlogs();
        } catch (e) {
            console.error(e);
            alert("Failed to delete blog. Please try again.");
        }
    };

    const items = useMemo(() => {
        return blogs.map((b) => {
            const plain = htmlToPlainText(b.content || "");
            return {
                ...b,
                formattedDate: formatDateShort(b.created_at),
                excerpt: clampText(plain, 200),
            };
        });
    }, [blogs]);

    const glassCard =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                {/* Header */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight">
                            Blog
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-600">
                            Articles, writeups, and updates. Open a post to read the full story.
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => navigate("/blogs/new")}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-sm sm:text-base font-normal text-emerald-700 shadow-sm backdrop-blur-xl transition hover:bg-emerald-50/85 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                            title="Create New Blog"
                        >
                            <FiPlus size={16} />
                            <span>New Post</span>
                        </button>
                    )}
                </div>

                {/* Status */}
                {error && (
                    <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className={glassCard}>
                        <div className="px-4 md:px-5 py-4 text-sm sm:text-base text-slate-600">
                            Loading blogs…
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {items.length === 0 ? (
                            <div className={glassCard}>
                                <div className="px-6 py-10 text-center">
                                    <p className="text-sm sm:text-base text-slate-600">
                                        No blog posts yet.{" "}
                                        {isAdmin && (
                                            <button
                                                onClick={() => navigate("/blogs/new")}
                                                className="text-emerald-700 hover:text-emerald-800 underline underline-offset-4 decoration-emerald-300/70"
                                            >
                                                Write the first one.
                                            </button>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {items.map((blog) => (
                                    <article
                                        key={blog.id}
                                        className={`${glassCard} group flex h-full flex-col overflow-hidden transition hover:bg-white/70`}
                                    >
                                        {/* Cover */}
                                        {blog.cover_image && typeof blog.cover_image === "string" && (
                                            <div className="relative h-40 overflow-hidden bg-slate-100/70">
                                                <img
                                                    src={blog.cover_image}
                                                    alt={blog.title}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex flex-1 flex-col px-4 md:px-5 py-4">
                                            <div className="mb-2 min-w-0">
                                                <h2 className="line-clamp-2 text-base md:text-lg font-normal text-slate-700">
                                                    {blog.title}
                                                </h2>
                                                <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                                                    {blog.formattedDate}
                                                </div>
                                            </div>

                                            <p className="mt-1 flex-1 text-sm sm:text-base text-slate-600 line-clamp-4">
                                                {blog.excerpt}
                                            </p>

                                            {/* Actions */}
                                            <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3">
                                                <Link
                                                    to={`/blogs/${blog.id}`}
                                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-100/50 px-3 py-2 text-sm font-normal text-slate-700 shadow-sm transition hover:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
                                                    title="Read Full Blog"
                                                >
                                                    <FiEye size={16} />
                                                    <span>Read</span>
                                                </Link>

                                                {isAdmin && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/blogs/edit/${blog.id}`)}
                                                            className="inline-flex items-center justify-center rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-sm font-normal text-amber-700 shadow-sm transition hover:bg-amber-50/85 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                                                            title="Edit Blog"
                                                        >
                                                            <FiEdit size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onDelete(blog.id)}
                                                            className="inline-flex items-center justify-center rounded-2xl border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-sm font-normal text-rose-700 shadow-sm transition hover:bg-rose-50/85 focus:outline-none focus:ring-2 focus:ring-rose-300/60"
                                                            title="Delete Blog"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default BlogList;
