import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {FiAlertCircle, FiEdit, FiEye, FiInfo, FiRefreshCw, FiTrash2} from "react-icons/fi";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";
import {deleteBlog, getBlogs} from "./api";
import type {Blog as BlogType} from "./types";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

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
    return d.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
}

function safeString(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0;
}

const Card = memo(function Card({children}: { children: React.ReactNode }) {
    return (
        <section className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
            {children}
        </section>
    );
});

const BlogList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === "admin";

    const [blogs, setBlogs] = useState<BlogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // avoid setState after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const loadBlogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getBlogs();
            if (!alive.current) return;
            setBlogs(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            if (!alive.current) return;
            setError("Failed to load blogs.");
            setBlogs([]);
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBlogs();
    }, [loadBlogs]);

    const onDelete = useCallback(
        async (id: number) => {
            if (!Number.isFinite(id)) return;
            const ok = window.confirm("Are you sure you want to delete this blog? This cannot be undone.");
            if (!ok) return;

            try {
                await deleteBlog(id);
                await loadBlogs();
            } catch (e) {
                console.error(e);
                alert("Failed to delete blog. Please try again.");
            }
        },
        [loadBlogs]
    );

    const items = useMemo(() => {
        return blogs.map((b) => {
            const plain = htmlToPlainText(b.content || "");
            return {
                ...b,
                formattedDate: formatDateShort(b.created_at),
                excerpt: clampText(plain, 200),
                safeCover: safeString((b as any).cover_image) ? ((b as any).cover_image as string) : null,
            };
        });
    }, [blogs]);

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar/>

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                {/* Header */}
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">Blog</h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-500">
                            Articles, writeups, and updates. Open a post to read the full story.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={loadBlogs}
                            className={cx(
                                "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                                "ring-1 ring-slate-200/60 hover:bg-white/90 disabled:opacity-60",
                                focusRing
                            )}
                            disabled={loading}
                            aria-label="Refresh blogs"
                            title="Refresh"
                        >
                            <FiRefreshCw className={loading ? "animate-spin" : ""} size={16}/>
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </header>

                {/* Error */}
                {error ? (
                    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load blogs</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                                <button
                                    type="button"
                                    onClick={loadBlogs}
                                    className={cx(
                                        "mt-3 inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-rose-200 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    <FiRefreshCw size={14}/>
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Loading */}
                {loading ? (
                    <Card>
                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-200/80 animate-pulse shrink-0"/>
                                <div className="min-w-0 space-y-2">
                                    <div className="h-4 w-44 bg-slate-200/80 rounded animate-pulse"/>
                                    <div className="h-4 w-72 bg-slate-100 rounded animate-pulse"/>
                                </div>
                            </div>
                            <p className="mt-3 text-center text-sm text-slate-500">Loading blogs…</p>
                        </div>
                    </Card>
                ) : null}

                {/* Content */}
                {!loading && !error ? (
                    <>
                        {items.length === 0 ? (
                            <Card>
                                <div className="p-6 text-center">
                                    <div
                                        className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                        <FiInfo className="text-slate-500"/>
                                    </div>
                                    <p className="mt-3 text-sm sm:text-base text-slate-600">
                                        No blog posts yet.{" "}
                                        {isAdmin ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate("/blogs/new")}
                                                className={cx(
                                                    "text-emerald-700 hover:text-emerald-800 underline underline-offset-4 decoration-emerald-300/70",
                                                    focusRing
                                                )}
                                            >
                                                Write the first one.
                                            </button>
                                        ) : null}
                                    </p>
                                </div>
                            </Card>
                        ) : (
                            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {items.map((blog) => (
                                    <article
                                        key={blog.id}
                                        className={cx(
                                            "group flex h-full flex-col overflow-hidden rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm",
                                            "transition hover:bg-white/75 hover:shadow-md"
                                        )}
                                    >
                                        {/* Cover */}
                                        {blog.safeCover ? (
                                            <div className="relative h-40 overflow-hidden bg-slate-100/70">
                                                <img
                                                    src={blog.safeCover}
                                                    alt={safeString(blog.title) ? blog.title : "Blog cover"}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            </div>
                                        ) : null}

                                        {/* Content */}
                                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                                            <div className="mb-2 min-w-0">
                                                <h2 className="line-clamp-2 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                                    {safeString(blog.title) ? blog.title : "Untitled"}
                                                </h2>
                                                <div
                                                    className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                                                    {blog.formattedDate}
                                                </div>
                                            </div>

                                            <p className="mt-1 flex-1 text-sm sm:text-base text-slate-600 line-clamp-4">
                                                {blog.excerpt}
                                            </p>

                                            {/* Actions */}
                                            <div
                                                className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/60 pt-3">
                                                <Link
                                                    to={`/blogs/${blog.id}`}
                                                    className={cx(
                                                        "inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                                        "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                                        focusRing
                                                    )}
                                                    title="Read Full Blog"
                                                >
                                                    <FiEye size={16}/>
                                                    <span>Read</span>
                                                </Link>

                                                {isAdmin ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/blogs/edit/${blog.id}`)}
                                                            className={cx(
                                                                "inline-flex items-center justify-center rounded-xl bg-white/70 px-3 py-2 text-sm font-normal tracking-tight",
                                                                "ring-1 ring-amber-200/60 text-amber-700 hover:bg-white/90",
                                                                focusRing
                                                            )}
                                                            title="Edit Blog"
                                                            aria-label={`Edit blog ${safeString(blog.title) ? blog.title : ""}`}
                                                        >
                                                            <FiEdit size={16}/>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => onDelete(blog.id)}
                                                            className={cx(
                                                                "inline-flex items-center justify-center rounded-xl bg-white/70 px-3 py-2 text-sm font-normal tracking-tight",
                                                                "ring-1 ring-rose-200/60 text-rose-700 hover:bg-white/90",
                                                                focusRing
                                                            )}
                                                            title="Delete Blog"
                                                            aria-label={`Delete blog ${safeString(blog.title) ? blog.title : ""}`}
                                                        >
                                                            <FiTrash2 size={16}/>
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </section>
                        )}
                    </>
                ) : null}
            </main>
        </div>
    );
};

export default BlogList;
