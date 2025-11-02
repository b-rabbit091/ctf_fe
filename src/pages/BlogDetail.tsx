import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getBlogById, Blog } from "../api/blogs";

const BlogDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [blog, setBlog] = useState<Blog | null>(null);

    useEffect(() => {
        if (id) getBlogById(Number(id)).then(setBlog);
    }, [id]);

    if (!blog) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow-md">
                {blog.cover_image && typeof blog.cover_image === "string" && (
                    <img
                        src={blog.cover_image}
                        alt={blog.title}
                        className="w-full h-64 object-cover rounded mb-4"
                    />
                )}
                <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: blog.content }} className="prose max-w-full" />
            </div>
        </div>
    );
};

export default BlogDetail;
