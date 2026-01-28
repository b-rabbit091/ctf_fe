// src/pages/blogs/AdminBlogEditor.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {motion} from "framer-motion";

import Navbar from "../../components/Navbar";
import {useAuth} from "../../contexts/AuthContext";

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
    FiAlertCircle,
    FiInfo,
} from "react-icons/fi";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import {createBlog, getBlogById, updateBlog} from "../Blog/api";

export interface BlogEditorProps {}

type SaveState = "idle" | "saving" | "saved" | "error";

const MAX_COVER_MB = 5;
const AUTOSAVE_MS = 8000;

const bytesToMB = (bytes: number) => bytes / (1024 * 1024);

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

const stripHtmlToText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
};

const estimateReadingTimeMin = (text: string) => {
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return Math.max(1, Math.round(words / 200));
};

/**
 * Minimal in-app sanitizer for preview.
 * NOTE: Server-side sanitization is still required.
 */
const sanitizeHtmlForPreview = (unsafeHtml: string) => {
    try {
        const doc = new DOMParser().parseFromString(unsafeHtml || "", "text/html");
        doc.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((n) => n.remove());
        doc.querySelectorAll<HTMLElement>("*").forEach((el) => {
            Array.from(el.attributes).forEach((attr) => {
                const name = attr.name.toLowerCase();
                const value = (attr.value || "").toLowerCase().trim();
                if (name.startsWith("on")) el.removeAttribute(attr.name);
                if ((name === "href" || name === "src") && (value.startsWith("javascript:") || value.startsWith("data:text/html"))) {
                    el.removeAttribute(attr.name);
                }
            });
        });
        return doc.body.innerHTML;
    } catch {
        return "";
    }
};

const AdminBlogEditor: React.FC<BlogEditorProps> = () => {
    const {user} = useAuth();
    const navigate = useNavigate();
    const {id} = useParams<{ id: string }>();

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

    const lastSavedSnapshot = useRef<{ title: string; content: string }>({title: "", content: ""});
    const autosaveTimer = useRef<number | null>(null);

    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const busyRef = useRef(false);

    const draftKey = useMemo(() => (blogId ? `blog_draft_${blogId}` : "blog_draft_new"), [blogId]);

    const glassCard =
        "rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm";

    // --- Guard: only admins ---
    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") navigate("/blogs");
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

                const rawDraft = localStorage.getItem(draftKey);
                if (rawDraft) {
                    try {
                        const parsed = JSON.parse(rawDraft) as { title?: string; content?: string; updatedAt?: string };
                        const useDraft = window.confirm(
                            `A local draft exists${
                                parsed?.updatedAt ? ` (saved ${new Date(parsed.updatedAt).toLocaleString()})` : ""
                            }.\n\nRestore it?`
                        );
                        if (useDraft) {
                            const t = parsed.title || data.title || "";
                            const c = parsed.content || data.content || "";
                            setTitle(t);
                            setContent(c);
                            lastSavedSnapshot.current = {title: t, content: c};
                            setDirty(false);
                            setSaveState("idle");
                            return;
                        }
                    } catch {
                        // ignore
                    }
                }

                setTitle(data.title || "");
                setContent(data.content || "");
                lastSavedSnapshot.current = {title: data.title || "", content: data.content || ""};
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

    // --- Load draft for NEW blog ---
    useEffect(() => {
        if (blogId) return;

        const rawDraft = localStorage.getItem(draftKey);
        if (!rawDraft) return;

        try {
            const parsed = JSON.parse(rawDraft) as { title?: string; content?: string; updatedAt?: string };
            const useDraft = window.confirm(
                `A local draft exists${
                    parsed?.updatedAt ? ` (saved ${new Date(parsed.updatedAt).toLocaleString()})` : ""
                }.\n\nRestore it?`
            );
            if (useDraft) {
                setTitle(parsed.title || "");
                setContent(parsed.content || "");
                lastSavedSnapshot.current = {title: parsed.title || "", content: parsed.content || ""};
                setDirty(false);
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
        return () => {
            if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
        };
    }, [coverPreview]);

    // --- Quill modules ---
    const quillModules = useMemo(() => {
        return {
            toolbar: {
                container: [
                    [{header: [1, 2, 3, 4, false]}],
                    [{font: []}, {size: ["small", false, "large", "huge"]}],
                    ["bold", "italic", "underline", "strike"],
                    [{color: []}, {background: []}],
                    [{script: "sub"}, {script: "super"}],
                    [{list: "ordered"}, {list: "bullet"}, {indent: "-1"}, {indent: "+1"}],
                    [{direction: "rtl"}, {align: []}],
                    ["blockquote", "code-block"],
                    ["link", "image", "video"],
                    ["clean"],
                ],
                handlers: {
                    image: () => {
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
            history: {delay: 1000, maxStack: 250, userOnly: true},
            clipboard: {matchVisual: false},
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
        const nowDirty = title !== snap.title || content !== snap.content || !!coverImage;
        setDirty(nowDirty);
    }, [title, content, coverImage]);

    // --- Local autosave ---
    const saveDraftLocal = useCallback(() => {
        const payload = {title, content, updatedAt: new Date().toISOString()};
        try {
            localStorage.setItem(draftKey, JSON.stringify(payload));
        } catch {
            // ignore
        }
    }, [title, content, draftKey]);

    useEffect(() => {
        if (!dirty) return;

        if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(() => {
            saveDraftLocal();
            setSaveState((s) => (s === "saving" ? s : "saved"));
            window.setTimeout(() => {
                if (!alive.current) return;
                setSaveState((s) => (s === "saved" ? "idle" : s));
            }, 2000);
        }, AUTOSAVE_MS);

        return () => {
            if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
        };
    }, [dirty, saveDraftLocal]);

    // --- Save to server ---
    const handleSave = useCallback(async () => {
        if (busyRef.current) return;
        busyRef.current = true;

        setErrorMsg(null);

        if (!title.trim()) {
            setErrorMsg("Title is required.");
            busyRef.current = false;
            return;
        }
        if (!plainText.trim()) {
            setErrorMsg("Content is required.");
            busyRef.current = false;
            return;
        }

        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("content", content);
        if (coverImage) formData.append("cover_image", coverImage);

        setSaveState("saving");
        try {
            if (blogId) await updateBlog(blogId, formData);
            else await createBlog(formData);

            lastSavedSnapshot.current = {title, content};
            setDirty(false);
            setSaveState("saved");

            try {
                localStorage.removeItem(draftKey);
            } catch {
                // ignore
            }

            navigate("/blogs");
        } catch (e) {
            console.error(e);
            setSaveState("error");
            setErrorMsg("Failed to save blog. Please try again.");
        } finally {
            busyRef.current = false;
            window.setTimeout(() => {
                if (!alive.current) return;
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
            setTitle(lastSavedSnapshot.current.title);
            setContent(lastSavedSnapshot.current.content);
        } else {
            setTitle("");
            setContent("");
            lastSavedSnapshot.current = {title: "", content: ""};
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
        const base =
            "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs sm:text-sm font-normal ring-1 shadow-sm backdrop-blur-xl";
        if (initialLoading) {
            return (
                <span className={cx(base, "ring-slate-200/60 bg-slate-100/70 text-slate-600")}>
                    <FiRefreshCw className="animate-spin"/>
                    Loading…
                </span>
            );
        }
        if (saveState === "saving") {
            return (
                <span className={cx(base, "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700")}>
                    <FiRefreshCw className="animate-spin"/>
                    Saving…
                </span>
            );
        }
        if (saveState === "saved") {
            return (
                <span className={cx(base, "ring-emerald-200/60 bg-emerald-50/70 text-emerald-700")}>
                    <FiCheckCircle/>
                    Draft saved
                </span>
            );
        }
        if (saveState === "error") {
            return (
                <span className={cx(base, "ring-rose-200/60 bg-rose-50/70 text-rose-700")}>
                    <FiAlertTriangle/>
                    Save failed
                </span>
            );
        }
        if (!dirty) {
            return (
                <span className={cx(base, "ring-slate-200/60 bg-slate-100/70 text-slate-600")}>
                    <FiCheckCircle/>
                    Up to date
                </span>
            );
        }
        return (
            <span className={cx(base, "ring-amber-200/60 bg-amber-50/70 text-amber-700")}>
                <FiAlertTriangle/>
                Unsaved changes
            </span>
        );
    }, [saveState, dirty, initialLoading]);

    const safePreviewHtml = useMemo(() => sanitizeHtmlForPreview(content), [content]);

    // --- Guard shells to match your other admin pages ---
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar/>
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4 text-sm sm:text-base text-slate-600">
                        Checking permissions…
                    </div>
                </main>
            </div>
        );
    }

    if (user.role !== "admin") {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
                <Navbar/>
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Unauthorized</p>
                                <p className="mt-1 text-sm text-rose-700/90">Admin access required.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col font-sans text-slate-700">
            <Navbar/>

            {/* Sticky editor header */}
            <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-3">
                    <div className={glassCard}>
                        <div className="px-4 sm:px-5 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start justify-between gap-3 md:items-center md:justify-start">
                                <div className="flex flex-col leading-tight min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs sm:text-sm font-normal uppercase tracking-wider text-slate-500">
                                            {isEdit ? "Edit blog" : "New blog"}
                                        </span>
                                        {statusPill}
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500">
                                        <span className="inline-flex items-center gap-1.5">
                                            <FiFileText/>
                                            {wordCount.toLocaleString()} words
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <FiClock/>
                                            ~{readingMin} min read
                                        </span>
                                        <span className="hidden text-slate-400 md:inline">
                                            Tip: Ctrl/Cmd + Z works with editor history.
                                        </span>
                                    </div>
                                </div>

                                <div className="md:hidden">
                                    <button
                                        type="button"
                                        onClick={togglePreview}
                                        className={cx(
                                            "inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-normal tracking-tight",
                                            "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                            focusRing
                                        )}
                                    >
                                        {previewMode ? <FiX/> : <FiEye/>}
                                        {previewMode ? "Edit" : "Preview"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={togglePreview}
                                    className={cx(
                                        "hidden md:inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    {previewMode ? <FiX/> : <FiEye/>}
                                    {previewMode ? "Back to edit" : "Preview"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDiscardDraft}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                        focusRing
                                    )}
                                    title="Discard local draft"
                                >
                                    <FiTrash2/>
                                    <span className="hidden sm:inline">Discard draft</span>
                                    <span className="sm:hidden">Discard</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!canPublish}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-emerald-200/60 text-emerald-700 hover:bg-white/90 disabled:opacity-60",
                                        focusRing
                                    )}
                                >
                                    <FiSave/>
                                    {isEdit ? "Update" : "Publish"}
                                </button>

                                <button
                                    type="button"
                                    onClick={goBack}
                                    className={cx(
                                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-normal tracking-tight text-slate-500 hover:text-slate-700",
                                        focusRing
                                    )}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full px-3 sm:px-4 py-5">
                <div className="mx-auto w-full max-w-6xl">
                    <motion.div initial={{opacity: 0, y: 6}} animate={{opacity: 1, y: 0}} className="w-full">
                        {/* Error banner */}
                        {errorMsg ? (
                            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                                <div className="flex items-start gap-3">
                                    <FiAlertTriangle className="mt-0.5 shrink-0"/>
                                    <div className="min-w-0">
                                        <p className="font-normal tracking-tight">Something went wrong</p>
                                        <p className="mt-1 text-sm break-words text-rose-700/90">{errorMsg}</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <section className={glassCard}>
                            <div className="px-3 sm:px-4 md:px-6 py-4 md:py-5">
                                {initialLoading ? (
                                    <div className="flex items-center gap-3 py-16 text-sm sm:text-base text-slate-600">
                                        <FiRefreshCw className="animate-spin"/>
                                        Loading editor…
                                    </div>
                                ) : previewMode ? (
                                    <div className="mx-auto w-full max-w-4xl">
                                        {coverPreview ? (
                                            <div className={cx(glassCard, "mb-4 overflow-hidden")}>
                                                <img
                                                    src={coverPreview}
                                                    alt="cover"
                                                    className="h-[220px] sm:h-[280px] md:h-[360px] w-full object-cover"
                                                />
                                            </div>
                                        ) : null}

                                        <h1 className="mb-3 text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight leading-tight">
                                            {title.trim() ? title : "Untitled"}
                                        </h1>

                                        <div className="mb-5 h-px w-16 bg-slate-200/70"/>

                                        <article className="prose prose-slate max-w-none prose-headings:tracking-tight prose-strong:font-normal prose-strong:text-slate-700 prose-a:underline prose-a:decoration-slate-300 hover:prose-a:decoration-slate-500 prose-img:rounded-2xl prose-img:border prose-img:border-slate-200/70">
                                            <div dangerouslySetInnerHTML={{__html: safePreviewHtml}}/>
                                        </article>
                                    </div>
                                ) : (
                                    <div className="mx-auto w-full max-w-5xl">
                                        {/* Cover uploader */}
                                        <div className="mb-5">
                                            {coverPreview ? (
                                                <div className={cx(glassCard, "mb-3 overflow-hidden")}>
                                                    <img
                                                        src={coverPreview}
                                                        alt="cover preview"
                                                        className="h-[220px] sm:h-[280px] md:h-[360px] w-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={cx(glassCard, "mb-3 p-4")}>
                                                    <div className="flex items-start gap-3 text-slate-600">
                                                        <FiInfo className="mt-0.5 shrink-0"/>
                                                        <div className="text-sm">
                                                            Add a cover image (optional). It will show on the blog card and the preview.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                                <label
                                                    className={cx(
                                                        "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                                        "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                                        focusRing
                                                    )}
                                                >
                                                    <FiImage/>
                                                    <span>{coverPreview ? "Change cover image" : "Add cover image"}</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
                                                    />
                                                </label>

                                                {coverPreview ? (
                                                    <button
                                                        type="button"
                                                        className={cx(
                                                            "inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                                            "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                                            focusRing
                                                        )}
                                                        onClick={() => handleCoverChange(null)}
                                                    >
                                                        Remove cover
                                                    </button>
                                                ) : null}

                                                <span className="text-xs text-slate-500">Max {MAX_COVER_MB}MB · JPG/PNG/WebP</span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Write a title that people can’t ignore…"
                                                className="w-full border-none bg-transparent text-2xl sm:text-3xl md:text-4xl font-normal leading-tight text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-0"
                                                maxLength={200}
                                            />
                                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                                <span>Keep it clear. You can refine later.</span>
                                                <span>{title.trim().length}/200</span>
                                            </div>
                                        </div>

                                        {/* Editor */}
                                        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/55 backdrop-blur-xl ring-1 ring-slate-200/50">
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
                                                className="min-h-[520px] md:min-h-[620px]"
                                            />
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                            <span>Supports headings, code blocks, embeds, images & video.</span>
                                            <button
                                                type="button"
                                                className={cx(
                                                    "inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                                    "ring-1 ring-slate-200/60 text-slate-700 hover:bg-white/90",
                                                    focusRing
                                                )}
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
                    </motion.div>
                </div>
            </main>

            <style>{`
        /* Quill: clean + mobile-friendly */
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid rgba(226,232,240,0.85) !important;
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(16px);
        }
        .ql-container.ql-snow { border: none !important; background: transparent; }
        .ql-editor {
          min-height: 520px;
          padding: 18px 18px 24px 18px;
          font-size: 16px;
          line-height: 1.85;
          color: #334155;
        }
        .ql-editor p, .ql-editor li { color: #475569; font-weight: 400; }
        .ql-editor strong { font-weight: 400; color: #334155; }
        .ql-editor.ql-blank::before { color: #cbd5e1; font-style: normal; }
        @media (max-width: 640px) {
          .ql-editor { padding: 14px 14px 18px 14px; min-height: 520px; }
        }
      `}</style>
        </div>
    );
};

export default AdminBlogEditor;
