import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import { getBlogs, deleteBlog, Blog as BlogType } from "../api/blogs";
import { Link, useNavigate } from "react-router-dom";
import { FiPlus, FiEdit, FiTrash2, FiEye } from "react-icons/fi";

const truncateText = (html: string, maxLength: number) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const plainText = div.textContent || div.innerText || "";
    return plainText.length > maxLength ? plainText.slice(0, maxLength) + "..." : plainText;
};

const BlogList: React.FC = () => {
    const { user } = useAuth();
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-6xl mx-auto p-6">
                {/* Header + Create button */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Blogs</h1>
                    {user?.role === "admin" && (
                        <button
                            className="flex items-center gap-2 bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
                            onClick={() => navigate("/blogs/new")}
                            title="Create New Blog"
                        >
                            <FiPlus size={18} />
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
                )}

                {/* Blog grid */}
                {loading ? (
                    <p className="text-gray-600">Loading blogs...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {blogs.map((blog) => (
                            <div
                                key={blog.id}
                                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden"
                            >
                                {/* Cover Image */}
                                {blog.cover_image && typeof blog.cover_image === "string" && (
                                    <div className="relative h-48">
                                        <img
                                            src={blog.cover_image}
                                            alt={blog.title}
                                            className="w-full h-full object-cover rounded-t-lg"
                                        />
                                    </div>
                                )}

                                {/* Card content */}
                                <div className="p-4 flex flex-col flex-1">
                                    <h2 className="font-bold text-lg mb-1 line-clamp-2">{blog.title}</h2>
                                    <p className="text-gray-700 flex-1 text-sm line-clamp-3">
                                        {truncateText(blog.content, 150)}
                                    </p>

                                    <div className="mt-3 flex justify-between items-center">
                                        {/* Read More icon */}
                                        <Link
                                            to={`/blogs/${blog.id}`}
                                            className="text-green-600 hover:text-green-700"
                                            title="Read Full Blog"
                                        >
                                            <FiEye size={18} />
                                        </Link>

                                        {/* Admin actions */}
                                        {user?.role === "admin" && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => navigate(`/blogs/edit/${blog.id}`)}
                                                    className="text-yellow-500 hover:text-yellow-600"
                                                    title="Edit Blog"
                                                >
                                                    <FiEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                "Are you sure you want to delete this blog?"
                                                            )
                                                        ) {
                                                            deleteBlog(blog.id).then(() => fetchBlogs());
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-600"
                                                    title="Delete Blog"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-gray-400 text-xs mt-2">
                                        Posted on: {new Date(blog.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogList;
