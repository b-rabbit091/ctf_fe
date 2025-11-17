import React, {useEffect, useState} from "react";
import {useAuth} from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import {getBlogs, deleteBlog, Blog as BlogType} from "../api/blogs";
import {Link, useNavigate} from "react-router-dom";
import {FiPlus, FiEdit, FiTrash2, FiEye} from "react-icons/fi";

/**
 * Safely truncate HTML content by stripping tags first.
 * This ensures we never inject raw HTML into the listing.
 */
const truncateText = (html: string, maxLength: number) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const plainText = div.textContent || div.innerText || "";
    return plainText.length > maxLength
        ? plainText.slice(0, maxLength) + "..."
        : plainText;
};

const BlogList: React.FC = () => {
    const {user} = useAuth();
    const navigate = useNavigate();

    const [blogs, setBlogs] = useState<BlogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBlogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getBlogs();
            setBlogs(data || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load blogs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    const handleDelete = async (id: number) => {
        if (
            !window.confirm("Are you sure you want to delete this blog? This cannot be undone.")
        ) {
            return;
        }

        try {
            await deleteBlog(id);
            await fetchBlogs();
        } catch (err) {
            console.error(err);
            alert("Failed to delete blog. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar/>

            <main className="max-w-5xl lg:max-w-6xl mx-auto px-4 py-8">
                {/* Header + Create button */}
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                            Blog
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Articles, writeups, and updates from the team. Click into a post to
                            read the full story.
                        </p>
                    </div>

                    {user?.role === "admin" && (
                        <button
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                            onClick={() => navigate("/blogs/new")}
                            title="Create New Blog"
                        >
                            <FiPlus size={16}/>
                            <span>New Post</span>
                        </button>
                    )}
                </header>

                {/* Error */}
                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div
                        className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 shadow-sm">
                        Loading blogs...
                    </div>
                )}

                {/* Blog grid */}
                {!loading && !error && (
                    <>
                        {blogs.length === 0 ? (
                            <div
                                className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                                <p className="text-sm text-slate-500">
                                    No blog posts yet.{" "}
                                    {user?.role === "admin" && (
                                        <button
                                            onClick={() => navigate("/blogs/new")}
                                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                                        >
                                            Write the first one.
                                        </button>
                                    )}
                                </p>
                            </div>
                        ) : (
                            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {blogs.map((blog) => {
                                    const createdDate = blog.created_at
                                        ? new Date(blog.created_at)
                                        : null;
                                    const formattedDate = createdDate
                                        ? createdDate.toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })
                                        : "Unknown date";

                                    return (
                                        <article
                                            key={blog.id}
                                            className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            {/* Cover Image */}
                                            {blog.cover_image &&
                                                typeof blog.cover_image === "string" && (
                                                    <div className="relative h-40 overflow-hidden bg-slate-100">
                                                        <img
                                                            src={blog.cover_image}
                                                            alt={blog.title}
                                                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}

                                            {/* Card content */}
                                            <div className="flex flex-1 flex-col px-4 py-3">
                                                {/* Title + meta */}
                                                <div className="mb-2">
                                                    <h2 className="line-clamp-2 text-base font-semibold text-slate-900">
                                                        {blog.title}
                                                    </h2>
                                                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                                                        {formattedDate}
                                                    </p>
                                                </div>

                                                {/* Excerpt */}
                                                <p className="mt-1 flex-1 text-sm text-slate-600 line-clamp-4">
                                                    {truncateText(blog.content, 200)}
                                                </p>

                                                {/* Footer actions */}
                                                <div
                                                    className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                                                    <Link
                                                        to={`/blogs/${blog.id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                                                        title="Read Full Blog"
                                                    >
                                                        <FiEye size={16}/>
                                                        <span>Read</span>
                                                    </Link>

                                                    {user?.role === "admin" && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    navigate(`/blogs/edit/${blog.id}`)
                                                                }
                                                                className="inline-flex items-center text-xs text-amber-600 hover:text-amber-700 focus:outline-none"
                                                                title="Edit Blog"
                                                            >
                                                                <FiEdit size={16}/>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(blog.id)}
                                                                className="inline-flex items-center text-xs text-red-600 hover:text-red-700 focus:outline-none"
                                                                title="Delete Blog"
                                                            >
                                                                <FiTrash2 size={16}/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default BlogList;
