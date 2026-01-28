import React, {useEffect, useMemo, useRef, useState, useCallback} from "react";
import {useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {getBlogById} from "./api";
import {Blog} from "./types";
import {FiAlertCircle, FiInfo} from "react-icons/fi";

const safeDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

const htmlToTextSafe = (html: string) => {
    // Defensive: avoid crashing if document is not available (rare, but safe)
    if (typeof document === "undefined") return "";
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
};

const calcReadingTime = (html: string) => {
    const text = htmlToTextSafe(html);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 220));
    return {words, mins};
};

// Lightweight client-side sanitization to reduce risk from unsafe HTML.
// NOTE: Best practice is to sanitize on backend too.
const sanitizeHtmlBasic = (html: string) => {
    if (typeof document === "undefined") return html || "";
    const doc = document.implementation.createHTMLDocument("san");
    const wrapper = doc.createElement("div");
    wrapper.innerHTML = html || "";

    // remove dangerous elements
    wrapper.querySelectorAll("script, iframe, object, embed, link, meta").forEach((n) => n.remove());

    // strip dangerous attributes
    wrapper.querySelectorAll("*").forEach((el) => {
        // remove inline handlers & style (style can be abused in some contexts)
        Array.from(el.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = (attr.value || "").toLowerCase();
            if (name.startsWith("on")) el.removeAttribute(attr.name);
            if (name === "style") el.removeAttribute(attr.name);
            if (name === "srcdoc") el.removeAttribute(attr.name);
            // block javascript: / data: on href/src
            if ((name === "href" || name === "src") && (value.startsWith("javascript:") || value.startsWith("data:"))) {
                el.removeAttribute(attr.name);
            }
        });

        // harden external links
        if (el.tagName.toLowerCase() === "a") {
            el.setAttribute("rel", "noopener noreferrer");
            // keep target behavior if your HTML already sets it; don't force target="_blank"
        }
    });

    return wrapper.innerHTML;
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const BlogDetail: React.FC = () => {
    const {id} = useParams<{id: string}>();

    const [blog, setBlog] = useState<Blog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const articleRef = useRef<HTMLElement | null>(null);
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const blogId = useMemo(() => {
        const n = id ? Number(id) : NaN;
        return Number.isFinite(n) ? n : NaN;
    }, [id]);

    const load = useCallback(async () => {
        if (!blogId || Number.isNaN(blogId)) {
            setError("Invalid blog id.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await getBlogById(blogId);
            if (!alive.current) return;
            setBlog(data);
        } catch (e) {
            console.error(e);
            if (!alive.current) return;
            setError("Failed to load blog. Please try again.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, [blogId]);

    useEffect(() => {
        load();
    }, [load]);

    const hasCover = !!(blog?.cover_image && typeof blog.cover_image === "string");

    const glassCard =
        "rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden";

    const meta = useMemo(() => {
        if (!blog) return null;
        const created = safeDate((blog as any)?.created_at ?? null);
        const rt = calcReadingTime(blog.content || "");
        return {
            createdLabel: created
                ? created.toLocaleDateString(undefined, {year: "numeric", month: "long", day: "numeric"})
                : null,
            mins: rt.mins,
            words: rt.words,
        };
    }, [blog]);

    const safeContent = useMemo(() => {
        if (!blog?.content) return "";
        return sanitizeHtmlBasic(blog.content);
    }, [blog?.content]);

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col font-sans text-slate-700">
            <Navbar />

            {/* Loading */}
            {loading ? (
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className={glassCard}>
                        <div className="px-4 sm:px-5 py-4">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0" />
                                <div className="min-w-0 space-y-2">
                                    <div className="h-4 w-52 bg-slate-200/80 rounded animate-pulse" />
                                    <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                                </div>
                            </div>
                            <p className="mt-3 text-center text-sm text-slate-500">Loading…</p>
                        </div>
                    </div>
                </main>
            ) : null}

            {/* Error */}
            {!loading && error ? (
                <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load blog</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                            </div>
                        </div>
                    </div>
                </main>
            ) : null}

            {/* Content */}
            {!loading && !error && blog ? (
                <>
                    {/* Cover */}
                    {hasCover ? (
                        <div className="w-full pt-4">
                            <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">
                                <div className={glassCard}>
                                    <div className="relative aspect-[16/9] sm:aspect-[21/9]">
                                        <img
                                            src={blog.cover_image as string}
                                            alt={blog.title}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Main */}
                    <main className={cx("flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 pb-10 md:pb-12", hasCover ? "pt-4" : "pt-4 md:pt-6")}>
                        <div className="w-full">
                            {/* Title block */}
                            <header className="mb-4 px-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight leading-tight text-slate-700">
                                    {blog.title}
                                </h1>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm sm:text-base text-slate-600">
                                    {meta?.createdLabel ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                            {meta.createdLabel}
                                        </span>
                                    ) : null}
                                    <span className="text-slate-300">•</span>
                                    <span>{meta?.mins ?? 1} min read</span>
                                    {typeof meta?.words === "number" ? (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-500">{meta.words.toLocaleString()} words</span>
                                        </>
                                    ) : null}
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                    <FiInfo className="inline -mt-0.5 mr-1" />
                                    Content is rendered as rich text. External links open with safe rel attributes.
                                </p>
                            </header>

                            {/* Article */}
                            <article
                                ref={(node) => {
                                    articleRef.current = node as any;
                                }}
                                className={cx(glassCard, "w-full", "px-4 sm:px-6 md:px-10 lg:px-14", "py-5 sm:py-7 md:py-10")}
                            >
                                <div
                                    className={cx(
                                        "prose max-w-none prose-slate",
                                        "prose-headings:tracking-tight",
                                        "prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl",
                                        "prose-p:text-[16px] sm:prose-p:text-[17px] md:prose-p:text-[18px] lg:prose-p:text-[19px]",
                                        "prose-p:leading-8 md:prose-p:leading-9",
                                        "prose-li:text-[15px] sm:prose-li:text-[16px] md:prose-li:text-[17px]",
                                        "prose-li:leading-8 md:prose-li:leading-9",
                                        "prose-a:text-slate-700 prose-a:underline prose-a:decoration-slate-300 hover:prose-a:decoration-slate-500",
                                        "prose-blockquote:border-l-slate-300 prose-blockquote:text-slate-600",
                                        "prose-hr:border-slate-200/70",
                                        "prose-img:rounded-2xl prose-img:border prose-img:border-slate-200/70",
                                        "prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-200/70",
                                        "prose-code:rounded prose-code:bg-slate-100/60 prose-code:px-1 prose-code:py-0.5",
                                        "prose-strong:text-slate-700 prose-strong:font-normal"
                                    )}
                                    dangerouslySetInnerHTML={{__html: safeContent}}
                                />
                            </article>
                        </div>
                    </main>
                </>
            ) : null}
        </div>
    );
};

export default BlogDetail;
