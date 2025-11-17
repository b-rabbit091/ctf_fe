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
        if (!user || user.role !== "admin") {
            navigate("/blogs");
            return;
        }
        if (id) {
            getBlogById(Number(id)).then((data) => {
                setTitle(data.title);
                setContent(data.content);
                // if backend sends a cover image URL in future:
                // setCoverPreview(data.cover_image || null);
            });
        }
    }, [id, user, navigate]);

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
        <div className="min-h-screen bg-[#f5f5f5]">
            <Navbar />

            {/* Top bar – minimal, like Medium's editor header */}
            <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
                    <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {id ? "Edit story" : "New story"}
            </span>
                        <span className="text-[11px] text-zinc-500">
              Draft · Not auto-saved
            </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setPreviewMode(!previewMode)}
                            className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                        >
                            {previewMode ? <FiX size={14} /> : <FiEye size={14} />}
                            <span>{previewMode ? "Back to edit" : "Preview"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                        >
                            <FiSave size={14} />
                            <span>{id ? "Update" : "Publish"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/blogs")}
                            className="inline-flex items-center rounded-full px-3 py-1.5 font-medium text-zinc-500 hover:text-zinc-700 focus:outline-none"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">
                {/* PREVIEW MODE – article-style view */}
                {previewMode ? (
                    <section className="mx-auto max-w-3xl">
                        {coverPreview && (
                            <div className="mb-6 overflow-hidden rounded-3xl bg-zinc-100">
                                <img
                                    src={coverPreview}
                                    alt="cover"
                                    className="h-[320px] w-full object-cover"
                                />
                            </div>
                        )}

                        <h1 className="mb-3 text-4xl font-semibold leading-tight text-zinc-900">
                            {title || "Untitled"}
                        </h1>

                        <div className="mb-6 h-px w-16 bg-zinc-300" />

                        <article className="prose prose-zinc max-w-none prose-headings:font-semibold prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:border prose-img:border-zinc-100">
                            <div dangerouslySetInnerHTML={{ __html: content }} />
                        </article>
                    </section>
                ) : (
                    // EDIT MODE – open page, no obvious box
                    <section className="mx-auto max-w-3xl">
                        {/* Cover image area – inline, not boxed */}
                        <div className="mb-6">
                            {coverPreview && (
                                <div className="mb-3 overflow-hidden rounded-3xl bg-zinc-100">
                                    <img
                                        src={coverPreview}
                                        alt="cover preview"
                                        className="h-[320px] w-full object-cover"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-zinc-400 bg-white/80 px-3 py-1.5 font-medium hover:bg-zinc-50">
                                    <FiImage size={14} />
                                    <span>
                    {coverPreview ? "Change cover image" : "Add a cover image"}
                  </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) =>
                                            handleCoverChange(
                                                e.target.files ? e.target.files[0] : null
                                            )
                                        }
                                    />
                                </label>
                                {coverPreview && (
                                    <button
                                        type="button"
                                        className="text-[11px] text-zinc-400 hover:text-zinc-600"
                                        onClick={() => handleCoverChange(null)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Big open title input */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border-none bg-transparent text-3xl md:text-[2.5rem] font-semibold leading-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-0"
                            />
                        </div>

                        {/* Open editor area – no surrounding card/box */}
                        <div className="mt-2">
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
                                className="min-h-[320px]"
                            />
                        </div>

                        <p className="mt-3 text-[11px] text-zinc-400">
                            Write your story freely. Use headings, lists and images to shape
                            the narrative. You can preview it before publishing.
                        </p>

                        {/* Bottom actions – same functionality, repeated for convenience */}
                        <div className="mt-6 flex items-center justify-end gap-3 text-xs">
                            <button
                                type="button"
                                onClick={() => setPreviewMode(true)}
                                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                            >
                                <FiEye size={14} />
                                <span>Preview</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                            >
                                <FiSave size={14} />
                                <span>{id ? "Update" : "Publish"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/blogs")}
                                className="inline-flex items-center rounded-full px-3 py-1.5 font-medium text-zinc-500 hover:text-zinc-700 focus:outline-none"
                            >
                                Cancel
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default BlogEditor;
