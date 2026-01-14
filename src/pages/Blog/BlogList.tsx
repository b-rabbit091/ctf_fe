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

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6 md:py-8">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Blog</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Articles, writeups, and updates. Open a post to read the full story.
                        </p>
                    </div>

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => navigate("/blogs/new")}
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                            title="Create New Blog"
                        >
                            <FiPlus size={16} />
                            <span>New Post</span>
                        </button>
                    )}
                </div>

                {/* Status */}
                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">
                        Loading blogs...
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {items.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                                <p className="text-sm text-slate-500">
                                    No blog posts yet.{" "}
                                    {isAdmin && (
                                        <button
                                            onClick={() => navigate("/blogs/new")}
                                            className="font-medium text-emerald-600 hover:text-emerald-700"
                                        >
                                            Write the first one.
                                        </button>
                                    )}
                                </p>
                            </div>
                        ) : (
                            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {items.map((blog) => (
                                    <article
                                        key={blog.id}
                                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                                    >
                                        {/* Cover */}
                                        {blog.cover_image && typeof blog.cover_image === "string" && (
                                            <div className="relative h-40 overflow-hidden bg-slate-100">
                                                <img
                                                    src={blog.cover_image}
                                                    alt={blog.title}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex flex-1 flex-col px-4 py-3">
                                            <div className="mb-2">
                                                <h2 className="line-clamp-2 text-base font-semibold text-slate-900">{blog.title}</h2>
                                                <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                                                    {blog.formattedDate}
                                                </div>
                                            </div>

                                            <p className="mt-1 flex-1 text-sm text-slate-600 line-clamp-4">{blog.excerpt}</p>

                                            {/* Actions */}
                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                                                <Link
                                                    to={`/blogs/${blog.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
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
                                                            className="inline-flex items-center text-xs text-amber-600 hover:text-amber-700 focus:outline-none"
                                                            title="Edit Blog"
                                                        >
                                                            <FiEdit size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onDelete(blog.id)}
                                                            className="inline-flex items-center text-xs text-red-600 hover:text-red-700 focus:outline-none"
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
