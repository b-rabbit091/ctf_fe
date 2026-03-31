import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {FiAlertCircle} from "react-icons/fi";

import {LearningShell} from "../../components/layout/LearningShell";
import {getBlogById} from "./api";
import {Blog} from "./types";
import {normalizeApiError} from "../../utils/apiError";

const safeDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

const htmlToTextSafe = (html: string) => {
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

const sanitizeHtmlBasic = (html: string) => {
    if (typeof document === "undefined") return html || "";
    const doc = document.implementation.createHTMLDocument("san");
    const wrapper = doc.createElement("div");
    wrapper.innerHTML = html || "";

    wrapper.querySelectorAll("script, iframe, object, embed, link, meta").forEach((n) => n.remove());

    wrapper.querySelectorAll("*").forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = (attr.value || "").toLowerCase();
            if (name.startsWith("on")) el.removeAttribute(attr.name);
            if (name === "style") el.removeAttribute(attr.name);
            if (name === "srcdoc") el.removeAttribute(attr.name);
            if ((name === "href" || name === "src") && (value.startsWith("javascript:") || value.startsWith("data:"))) {
                el.removeAttribute(attr.name);
            }
        });

        if (el.tagName.toLowerCase() === "a") {
            el.setAttribute("rel", "noopener noreferrer");
        }
    });

    return wrapper.innerHTML;
};

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const isImageSource = (value: Blog["cover_image"]): value is string =>
    typeof value === "string" && value.trim().length > 0;

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
            setError(normalizeApiError(e, "Failed to load blog. Please try again.").message);
        } finally {
            if (alive.current) {
                setLoading(false);
            }
        }
    }, [blogId]);

    useEffect(() => {
        load();
    }, [load]);

    const glassCard = "overflow-hidden rounded-2xl bg-white/72 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-xl";

    const meta = useMemo(() => {
        if (!blog) return null;
        const created = safeDate(blog.created_at ?? null);
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

    const coverSrc = useMemo<string | undefined>(() => {
        const value = blog?.cover_image;
        if (typeof value === "string" && value.trim().length > 0) {
            return value;
        }
        return undefined;
    }, [blog?.cover_image]);

    const hasCover = Boolean(coverSrc);

    return (
        <LearningShell headerClassName="hidden">
            {loading ? (
                <main className="mx-auto w-full max-w-[1440px] px-2 sm:px-4">
                    <div className={glassCard}>
                        <div className="px-4 py-4 sm:px-5">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200/80" />
                                <div className="min-w-0 space-y-2">
                                    <div className="h-4 w-52 animate-pulse rounded bg-slate-200/80" />
                                    <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
                                </div>
                            </div>
                            <p className="mt-3 text-center text-sm text-slate-500">Loading...</p>
                        </div>
                    </div>
                </main>
            ) : null}

            {!loading && error ? (
                <main className="mx-auto w-full max-w-[1440px] px-2 sm:px-4">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Could not load blog</p>
                                <p className="mt-1 break-words text-sm text-rose-700/90">{error}</p>
                            </div>
                        </div>
                    </div>
                </main>
            ) : null}

            {!loading && !error && blog ? (
                <>
                    {hasCover ? (
                        <div className="mx-auto w-full max-w-[1680px] px-2 pt-2 sm:px-4 sm:pt-4">
                            <div className={glassCard}>
                                <div className="relative aspect-[16/9] sm:aspect-[21/9] xl:aspect-[3/1]">
                                    <img
                                        src={coverSrc}
                                        alt={blog.title}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <main
                        className={cx(
                            "mx-auto w-full max-w-[1680px] px-2 pb-12 sm:px-4 md:pb-16",
                            hasCover ? "pt-4" : "pt-3 md:pt-5"
                        )}
                    >
                        <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(780px,940px)_minmax(0,1fr)]">
                            <div className="hidden xl:block" />

                            <div className="w-full">
                                <header className="mb-6 px-1 sm:px-2">
                                    <h1 className="max-w-4xl text-3xl font-normal leading-tight tracking-tight text-slate-800 sm:text-4xl md:text-5xl lg:text-6xl">
                                        {blog.title}
                                    </h1>

                                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 sm:text-base">
                                        {meta?.createdLabel ? <span>{meta.createdLabel}</span> : null}
                                        {meta?.createdLabel ? <span className="text-slate-300">•</span> : null}
                                        <span>{meta?.mins ?? 1} min read</span>
                                    </div>
                                </header>

                                <article
                                    ref={(node) => {
                                        articleRef.current = node;
                                    }}
                                    className={cx(
                                        glassCard,
                                        "w-full px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-10 lg:px-14"
                                    )}
                                >
                                    <div
                                        className={cx(
                                            "prose max-w-none prose-slate",
                                            "prose-headings:text-slate-800 prose-headings:tracking-tight",
                                            "prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl",
                                            "prose-p:text-[16px] prose-p:leading-8 sm:prose-p:text-[17px] md:prose-p:text-[18px] md:prose-p:leading-9 lg:prose-p:text-[19px]",
                                            "prose-li:text-[15px] prose-li:leading-8 sm:prose-li:text-[16px] md:prose-li:text-[17px] md:prose-li:leading-9",
                                            "prose-a:text-slate-800 prose-a:underline prose-a:decoration-slate-300 hover:prose-a:decoration-slate-500",
                                            "prose-blockquote:border-l-slate-300 prose-blockquote:text-slate-600",
                                            "prose-hr:border-slate-200/70",
                                            "prose-img:rounded-2xl prose-img:border prose-img:border-slate-200/70",
                                            "prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-200/70",
                                            "prose-code:rounded prose-code:bg-slate-100/60 prose-code:px-1 prose-code:py-0.5",
                                            "prose-strong:font-medium prose-strong:text-slate-800"
                                        )}
                                        dangerouslySetInnerHTML={{__html: safeContent}}
                                    />
                                </article>
                            </div>

                            <div className="hidden xl:block" />
                        </div>
                    </main>
                </>
            ) : null}
        </LearningShell>
    );
};

export default BlogDetail;
