// src/pages/blogs/BlogEditor.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import {
    FiEye,
    FiSave,
    FiX,
    FiImage,
    FiRefreshCw,
    FiAlertTriangle,
    FiTrash2,
    FiCheckCircle,
    FiClock,
    FiFileText,
} from "react-icons/fi";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { createBlog, updateBlog, getBlogById } from "./api";

export interface BlogEditorProps {}

type SaveState = "idle" | "saving" | "saved" | "error";

const MAX_COVER_MB = 5;
const AUTOSAVE_MS = 8000;

const bytesToMB = (bytes: number) => bytes / (1024 * 1024);

const stripHtmlToText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
};

const estimateReadingTimeMin = (text: string) => {
    // ~200 wpm
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return Math.max(1, Math.round(words / 200));
};

/**
 * Minimal in-app sanitizer for preview.
 * NOTE: Server-side sanitization is still required for true security.
 * This removes script/style/iframe/object/embed and strips event handlers and javascript: URLs.
 */
const sanitizeHtmlForPreview = (unsafeHtml: string) => {
    try {
        const doc = new DOMParser().parseFromString(unsafeHtml || "", "text/html");

        // remove dangerous nodes
        doc
            .querySelectorAll("script, style, iframe, object, embed, link, meta")
            .forEach((n) => n.remove());

        // strip dangerous attrs
        doc.querySelectorAll<HTMLElement>("*").forEach((el) => {
            Array.from(el.attributes).forEach((attr) => {
                const name = attr.name.toLowerCase();
                const value = (attr.value || "").toLowerCase().trim();

                // remove inline JS handlers like onclick, onerror, etc.
                if (name.startsWith("on")) el.removeAttribute(attr.name);

                // remove javascript: or data:text/html URLs
                if (
                    (name === "href" || name === "src") &&
                    (value.startsWith("javascript:") || value.startsWith("data:text/html"))
                ) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        return doc.body.innerHTML;
    } catch {
        return "";
    }
};

const BlogEditor: React.FC<BlogEditorProps> = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const isEdit = !!id;
    const blogId = isEdit ? Number(id) : null;

    const quillRef = useRef<ReactQuill | null>(null);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [previewMode, setPreviewMode] = useState(false);

    const [initialLoading, setInitialLoading] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [dirty, setDirty] = useState(false);
    const lastSavedSnapshot = useRef<{ title: string; content: string }>({ title: "", content: "" });
    const autosaveTimer = useRef<number | null>(null);

    const draftKey = useMemo(() => {
        // separate drafts for create vs edit
        return blogId ? `blog_draft_${blogId}` : "blog_draft_new";
    }, [blogId]);

    // --- Guard: only admins can edit/create ---
    useEffect(() => {
        if (!user || user.role !== "admin") {
            navigate("/blogs");
        }
    }, [user, navigate]);

    // --- Confirm navigation if dirty ---
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    // --- Load blog when editing ---
    useEffect(() => {
        let mounted = true;

        const run = async () => {
            if (!blogId) return;

            setInitialLoading(true);
            setErrorMsg(null);

            try {
                const data = await getBlogById(blogId);

                if (!mounted) return;

                // Try draft restore first if present (to prevent overwriting local progress)
                const rawDraft = localStorage.getItem(draftKey);
                if (rawDraft) {
                    const parsed = JSON.parse(rawDraft) as { title?: string; content?: string; updatedAt?: string };
                    const useDraft = window.confirm(
                        `A local draft exists${parsed?.updatedAt ? ` (saved ${new Date(parsed.updatedAt).toLocaleString()})` : ""}.\n\nRestore it?`
                    );
                    if (useDraft) {
                        setTitle(parsed.title || data.title || "");
                        setContent(parsed.content || data.content || "");
                        lastSavedSnapshot.current = { title: parsed.title || data.title || "", content: parsed.content || data.content || "" };
                        setDirty(false);
                        setSaveState("idle");
                        return;
                    }
                }

                setTitle(data.title || "");
                setContent(data.content || "");
                lastSavedSnapshot.current = { title: data.title || "", content: data.content || "" };
                setDirty(false);
                setSaveState("idle");
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setErrorMsg("Failed to load blog. Please refresh and try again.");
            } finally {
                if (mounted) setInitialLoading(false);
            }
        };

        run();
        return () => {
            mounted = false;
        };
    }, [blogId, draftKey]);

    // --- Load draft for NEW blog (without prompt) ---
    useEffect(() => {
        if (blogId) return;

        const rawDraft = localStorage.getItem(draftKey);
        if (!rawDraft) return;

        try {
            const parsed = JSON.parse(rawDraft) as { title?: string; content?: string; updatedAt?: string };
            const useDraft = window.confirm(
                `A local draft exists${parsed?.updatedAt ? ` (saved ${new Date(parsed.updatedAt).toLocaleString()})` : ""}.\n\nRestore it?`
            );
            if (useDraft) {
                setTitle(parsed.title || "");
                setContent(parsed.content || "");
                lastSavedSnapshot.current = { title: parsed.title || "", content: parsed.content || "" };
                setDirty(false);
            } else {
                // keep it (user might want later). Don’t delete.
            }
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Cover image handling ---
    const handleCoverChange = useCallback((file: File | null) => {
        setErrorMsg(null);

        if (!file) {
            setCoverImage(null);
            setCoverPreview(null);
            setDirty(true);
            return;
        }

        if (!file.type.startsWith("image/")) {
            setErrorMsg("Cover image must be an image file (PNG/JPG/WebP).");
            return;
        }
        if (bytesToMB(file.size) > MAX_COVER_MB) {
            setErrorMsg(`Cover image is too large. Max ${MAX_COVER_MB} MB.`);
            return;
        }

        setCoverImage(file);
        const url = URL.createObjectURL(file);
        setCoverPreview(url);
        setDirty(true);
    }, []);

    useEffect(() => {
        // cleanup object URL
        return () => {
            if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
        };
    }, [coverPreview]);

    // --- Quill modules (full-feature toolbar) ---
    const quillModules = useMemo(() => {
        return {
            toolbar: {
                container: [
                    [{ header: [1, 2, 3, 4, false] }],
                    [{ font: [] }, { size: ["small", false, "large", "huge"] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ color: [] }, { background: [] }],
                    [{ script: "sub" }, { script: "super" }],
                    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
                    [{ direction: "rtl" }, { align: [] }],
                    ["blockquote", "code-block"],
                    ["link", "image", "video"],
                    ["clean"],
                ],
                handlers: {
                    image: () => {
                        // Custom: embed selected image as base64 inside content (no API changes).
                        const input = document.createElement("input");
                        input.setAttribute("type", "file");
                        input.setAttribute("accept", "image/*");
                        input.click();

                        input.onchange = () => {
                            const file = input.files?.[0];
                            if (!file) return;

                            if (!file.type.startsWith("image/")) {
                                setErrorMsg("Only image files can be inserted.");
                                return;
                            }
                            if (bytesToMB(file.size) > 8) {
                                setErrorMsg("Inserted image is too large (max 8 MB).");
                                return;
                            }

                            const reader = new FileReader();
                            reader.onload = () => {
                                const editor = quillRef.current?.getEditor();
                                if (!editor) return;
                                const range = editor.getSelection(true);
                                const base64 = String(reader.result || "");
                                editor.insertEmbed(range ? range.index : 0, "image", base64, "user");
                                editor.setSelection((range ? range.index : 0) + 1);
                                setDirty(true);
                            };
                            reader.readAsDataURL(file);
                        };
                    },
                },
            },
            history: { delay: 1000, maxStack: 250, userOnly: true },
            clipboard: { matchVisual: false },
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const quillFormats = useMemo(
        () => [
            "header",
            "font",
            "size",
            "bold",
            "italic",
            "underline",
            "strike",
            "color",
            "background",
            "script",
            "list",
            "bullet",
            "indent",
            "direction",
            "align",
            "blockquote",
            "code-block",
            "link",
            "image",
            "video",
        ],
        []
    );

    // --- Derived stats ---
    const plainText = useMemo(() => stripHtmlToText(content), [content]);
    const wordCount = useMemo(() => (plainText ? plainText.split(/\s+/).filter(Boolean).length : 0), [plainText]);
    const readingMin = useMemo(() => estimateReadingTimeMin(plainText), [plainText]);

    const canPublish = useMemo(() => {
        const tOk = title.trim().length > 0;
        const cOk = plainText.trim().length > 0;
        return tOk && cOk && !initialLoading && saveState !== "saving";
    }, [title, plainText, initialLoading, saveState]);

    // --- Dirty tracking ---
    useEffect(() => {
        const snap = lastSavedSnapshot.current;
        const nowDirty = title !== snap.title || content !== snap.content || !!coverImage; // cover always considered unsaved here
        setDirty(nowDirty);
    }, [title, content, coverImage]);

    // --- Local autosave (draft) ---
    const saveDraftLocal = useCallback(() => {
        const payload = {
            title,
            content,
            updatedAt: new Date().toISOString(),
        };
        try {
            localStorage.setItem(draftKey, JSON.stringify(payload));
        } catch {
            // ignore
        }
    }, [title, content, draftKey]);

    useEffect(() => {
        // schedule autosave when dirty
        if (!dirty) return;

        if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(() => {
            saveDraftLocal();
            setSaveState((s) => (s === "saving" ? s : "saved"));
            // fade back to idle after a bit
            window.setTimeout(() => {
                setSaveState((s) => (s === "saved" ? "idle" : s));
            }, 2000);
        }, AUTOSAVE_MS);

        return () => {
            if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
        };
    }, [dirty, saveDraftLocal]);

    // --- Save to server (existing APIs) ---
    const handleSave = useCallback(async () => {
        setErrorMsg(null);

        if (!title.trim()) {
            setErrorMsg("Title is required.");
            return;
        }
        if (!plainText.trim()) {
            setErrorMsg("Content is required.");
            return;
        }

        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("content", content);
        if (coverImage) formData.append("cover_image", coverImage);

        setSaveState("saving");
        try {
            if (blogId) {
                await updateBlog(blogId, formData);
            } else {
                await createBlog(formData);
            }

            lastSavedSnapshot.current = { title, content };
            setDirty(false);
            setSaveState("saved");

            // Clear local draft after successful save/publish
            try {
                localStorage.removeItem(draftKey);
            } catch {
                // ignore
            }

            // After save, go back to list (same as your current behavior)
            navigate("/blogs");
        } catch (e) {
            console.error(e);
            setSaveState("error");
            setErrorMsg("Failed to save blog. Please try again.");
        } finally {
            // let "saved" show briefly (if saved)
            window.setTimeout(() => {
                setSaveState((s) => (s === "saved" ? "idle" : s));
            }, 1800);
        }
    }, [title, content, coverImage, blogId, navigate, plainText, draftKey]);

    const handleDiscardDraft = useCallback(() => {
        const ok = window.confirm("Discard local draft and reset this editor? This cannot be undone.");
        if (!ok) return;

        try {
            localStorage.removeItem(draftKey);
        } catch {
            // ignore
        }

        if (blogId) {
            // reload from server values in snapshot
            setTitle(lastSavedSnapshot.current.title);
            setContent(lastSavedSnapshot.current.content);
        } else {
            setTitle("");
            setContent("");
            lastSavedSnapshot.current = { title: "", content: "" };
        }

        setCoverImage(null);
        setCoverPreview(null);
        setDirty(false);
        setErrorMsg(null);
        setSaveState("idle");
    }, [draftKey, blogId]);

    const togglePreview = useCallback(() => {
        setPreviewMode((p) => !p);
        setErrorMsg(null);
    }, []);

    const goBack = useCallback(() => {
        if (!dirty) {
            navigate("/blogs");
            return;
        }
        const ok = window.confirm("You have unsaved changes. Leave anyway?");
        if (ok) navigate("/blogs");
    }, [dirty, navigate]);

    const statusPill = useMemo(() => {
        if (initialLoading) {
            return (
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600">
          <FiRefreshCw className="animate-spin" />
          Loading…
        </span>
            );
        }

        if (saveState === "saving") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
          <FiRefreshCw className="animate-spin" />
          Saving…
        </span>
            );
        }

        if (saveState === "saved") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
          <FiCheckCircle />
          Draft saved
        </span>
            );
        }

        if (saveState === "error") {
            return (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          <FiAlertTriangle />
          Save failed
        </span>
            );
        }

        if (!dirty) {
            return (
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600">
          <FiCheckCircle />
          Up to date
        </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
        <FiAlertTriangle />
        Unsaved changes
      </span>
        );
    }, [saveState, dirty, initialLoading]);

    const safePreviewHtml = useMemo(() => sanitizeHtmlForPreview(content), [content]);

    return (
        <div className="min-h-screen bg-[#f6f7fb]">
            <Navbar />

            {/* Sticky editor header */}
            <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/85 backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start justify-between gap-3 md:items-center md:justify-start">
                        <div className="flex flex-col leading-tight">
                            <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {isEdit ? "Edit blog" : "New blog"}
                </span>
                                {statusPill}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <FiFileText />
                    {wordCount.toLocaleString()} words
                </span>
                                <span className="inline-flex items-center gap-1.5">
                  <FiClock />
                  ~{readingMin} min read
                </span>
                                <span className="hidden text-zinc-400 md:inline">Tip: Ctrl/Cmd + Z works with editor history.</span>
                            </div>
                        </div>

                        <div className="md:hidden">
                            <button
                                type="button"
                                onClick={togglePreview}
                                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                            >
                                {previewMode ? <FiX /> : <FiEye />}
                                {previewMode ? "Edit" : "Preview"}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={togglePreview}
                            className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 md:inline-flex"
                        >
                            {previewMode ? <FiX /> : <FiEye />}
                            {previewMode ? "Back to edit" : "Preview"}
                        </button>

                        <button
                            type="button"
                            onClick={handleDiscardDraft}
                            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                            title="Discard local draft"
                        >
                            <FiTrash2 />
                            Discard draft
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!canPublish}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                        >
                            <FiSave />
                            {isEdit ? "Update" : "Publish"}
                        </button>

                        <button
                            type="button"
                            onClick={goBack}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
                {/* Error banner */}
                {errorMsg && (
                    <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        <div className="flex items-start gap-2">
                            <FiAlertTriangle className="mt-0.5 shrink-0" />
                            <div className="leading-relaxed">{errorMsg}</div>
                        </div>
                    </div>
                )}

                {/* Layout: editor + side panel (collapses on mobile) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Main surface */}
                    <section className="rounded-3xl border border-zinc-200/70 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                        <div className="px-4 py-4 sm:px-6">
                            {initialLoading ? (
                                <div className="flex items-center gap-3 py-16 text-zinc-600">
                                    <FiRefreshCw className="animate-spin" />
                                    Loading editor…
                                </div>
                            ) : previewMode ? (
                                <div className="mx-auto max-w-3xl py-2">
                                    {coverPreview && (
                                        <div className="mb-6 overflow-hidden rounded-3xl bg-zinc-100">
                                            <img src={coverPreview} alt="cover" className="h-[320px] w-full object-cover" />
                                        </div>
                                    )}

                                    <h1 className="mb-3 text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
                                        {title.trim() ? title : "Untitled"}
                                    </h1>

                                    <div className="mb-7 h-px w-16 bg-zinc-200" />

                                    <article className="prose prose-zinc max-w-none prose-headings:font-semibold prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:border prose-img:border-zinc-100">
                                        <div dangerouslySetInnerHTML={{ __html: safePreviewHtml }} />
                                    </article>
                                </div>
                            ) : (
                                <div className="mx-auto max-w-3xl py-2">
                                    {/* Cover uploader */}
                                    <div className="mb-6">
                                        {coverPreview && (
                                            <div className="mb-3 overflow-hidden rounded-3xl bg-zinc-100">
                                                <img src={coverPreview} alt="cover preview" className="h-[320px] w-full object-cover" />
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-zinc-400 bg-white px-4 py-2 font-semibold hover:bg-zinc-50">
                                                <FiImage />
                                                <span>{coverPreview ? "Change cover image" : "Add a cover image"}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
                                                />
                                            </label>

                                            {coverPreview && (
                                                <button
                                                    type="button"
                                                    className="rounded-full px-3 py-2 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                                                    onClick={() => handleCoverChange(null)}
                                                >
                                                    Remove cover
                                                </button>
                                            )}

                                            <span className="text-[11px] text-zinc-400">Max {MAX_COVER_MB}MB · JPG/PNG/WebP</span>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div className="mb-5">
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Write a title that people can’t ignore…"
                                            className="w-full border-none bg-transparent text-3xl font-semibold leading-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-0 sm:text-4xl"
                                            maxLength={200}
                                        />
                                        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                                            <span>Keep it clear. You can refine later.</span>
                                            <span>{title.trim().length}/200</span>
                                        </div>
                                    </div>

                                    {/* Editor */}
                                    <div className="overflow-hidden rounded-2xl border border-zinc-200">
                                        <ReactQuill
                                            ref={(r) => (quillRef.current = r)}
                                            value={content}
                                            onChange={(val) => {
                                                setContent(val);
                                                setSaveState("idle");
                                                setErrorMsg(null);
                                            }}
                                            modules={quillModules}
                                            formats={quillFormats}
                                            theme="snow"
                                            className="min-h-[420px]"
                                        />
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span className="text-zinc-400">
                      Supports headings, color, alignment, code blocks, embeds, images & video.
                    </span>
                                        <button
                                            type="button"
                                            className="rounded-full border border-zinc-200 bg-white px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-50"
                                            onClick={() => {
                                                saveDraftLocal();
                                                setSaveState("saved");
                                                window.setTimeout(() => setSaveState("idle"), 1500);
                                            }}
                                        >
                                            Save draft locally
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Side panel */}
                    <aside className="space-y-4">
                        <div className="rounded-3xl border border-zinc-200/70 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                            <div className="mb-3 text-sm font-semibold text-zinc-900">Publishing checklist</div>

                            <ul className="space-y-2 text-sm text-zinc-600">
                                <li className="flex items-start gap-2">
                                    <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${title.trim() ? "bg-emerald-500" : "bg-zinc-300"}`} />
                                    <span>Title is set</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${plainText.trim() ? "bg-emerald-500" : "bg-zinc-300"}`} />
                                    <span>Content has text</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${coverPreview ? "bg-emerald-500" : "bg-zinc-300"}`} />
                                    <span>Cover image (optional)</span>
                                </li>
                            </ul>

                            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                                <div className="font-semibold text-zinc-800">Draft safety</div>
                                <div className="mt-1 leading-relaxed">
                                    This editor auto-saves a local draft every {Math.round(AUTOSAVE_MS / 1000)} seconds while you type.
                                    Server save happens only when you publish/update.
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-zinc-200/70 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                            <div className="mb-2 text-sm font-semibold text-zinc-900">Quick actions</div>

                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const editor = quillRef.current?.getEditor();
                                        if (!editor) return;
                                        editor.format("header", 1);
                                        editor.focus();
                                    }}
                                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                    Make selection H1
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const editor = quillRef.current?.getEditor();
                                        if (!editor) return;
                                        editor.format("blockquote", true);
                                        editor.focus();
                                    }}
                                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                    Blockquote
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const editor = quillRef.current?.getEditor();
                                        if (!editor) return;
                                        editor.format("code-block", true);
                                        editor.focus();
                                    }}
                                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                    Code block
                                </button>
                            </div>

                            <div className="mt-4 text-[11px] text-zinc-400">
                                If your backend supports it later, you can switch to uploading inline images instead of base64 without changing the editor UI much.
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Quill toolbar tweaks (kept local) */}
            <style>{`
        /* Make Quill feel more "industry editor" + clean on mobile */
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid rgba(228,228,231,0.8) !important;
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(10px);
        }
        .ql-container.ql-snow {
          border: none !important;
        }
        .ql-editor {
          min-height: 420px;
          padding: 18px 18px 24px 18px;
          font-size: 16px;
          line-height: 1.85;
        }
        .ql-editor p, .ql-editor li {
          color: #18181b;
        }
        .ql-editor.ql-blank::before {
          color: #a1a1aa;
          font-style: normal;
        }
        @media (max-width: 640px) {
          .ql-editor { padding: 14px 14px 18px 14px; }
        }
      `}</style>
        </div>
    );
};

export default BlogEditor;
