import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiEye, FiSave, FiX, FiImage } from "react-icons/fi";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { createBlog, updateBlog, getBlogById } from "../api/blogs";
import Navbar from "../components/Navbar";

export interface BlogEditorProps {}

const BlogEditor: React.FC<BlogEditorProps> = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || user.role !== "admin") navigate("/blogs");
        if (id) {
            // fetch blog for editing
            getBlogById(Number(id)).then((data) => {
                setTitle(data.title);
                setContent(data.content);
               // setCoverPreview(data.cover_image || null);
            });
        }
    }, [id, user]);

    const handleCoverChange = (file: File | null) => {
        if (!file) {
            setCoverImage(null);
            setCoverPreview(null);
            return;
        }
        setCoverImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setCoverPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!title || !content) return;

        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        if (coverImage) formData.append("cover_image", coverImage);

        setLoading(true);
        try {
            if (id) {
                await updateBlog(Number(id), formData);
            } else {
                await createBlog(formData);
            }
            navigate("/blogs");
        } catch (err) {
            console.error(err);
            alert("Failed to save blog");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">{id ? "Edit Blog" : "Write a blog"}</h1>

                {/* Preview toggle */}
                <div className="flex justify-end mb-4">
                    <button
                        className="flex items-center gap-1 bg-teal-500 text-white px-3 py-1 rounded hover:bg-teal-600 transition-colors"
                        onClick={() => setPreviewMode(!previewMode)}
                    >
                        {previewMode ? <FiX /> : <FiEye />}
                        {previewMode ? "Edit Mode" : "Preview Mode"}
                    </button>
                </div>

                {previewMode ? (
                    <div className="bg-white p-6 rounded shadow-md">
                        {coverPreview && (
                            <img
                                src={coverPreview}
                                alt="cover"
                                className="w-full h-64 object-cover rounded mb-4"
                            />
                        )}
                        <h2 className="text-2xl font-bold mb-2">{title}</h2>
                        <div className="prose max-w-full" dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded shadow-md flex flex-col gap-4">
                        {/* Cover Image */}
                        <div>
                            <label className="block mb-1 font-medium">Cover Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    handleCoverChange(e.target.files ? e.target.files[0] : null)
                                }
                            />
                            {coverPreview && (
                                <img
                                    src={coverPreview}
                                    alt="cover preview"
                                    className="w-full h-64 object-cover rounded mt-2 shadow"
                                />
                            )}
                        </div>

                        {/* Title */}
                        <input
                            type="text"
                            placeholder="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 "
                        />

                        {/* Content */}
                        <ReactQuill
                            value={content}
                            onChange={setContent}
                            modules={{
                                toolbar: [
                                    [{ header: [1, 2, 3, false] }],
                                    ["bold", "italic", "underline", "strike"],
                                    [{ list: "ordered" }, { list: "bullet" }],
                                    ["link", "image"],
                                    ["clean"],
                                ],
                            }}
                            formats={[
                                "header",
                                "bold",
                                "italic",
                                "underline",
                                "strike",
                                "list",
                                "bullet",
                                "link",
                                "image",
                            ]}
                            theme="snow"
                        />

                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                            >
                                <FiSave />
                                {id ? "Update" : "Create"}
                            </button>
                            <button
                                onClick={() => navigate("/blogs")}
                                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogEditor;
