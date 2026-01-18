import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getBlogById } from "./api";
import { Blog } from "./types";

const safeDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

const htmlToText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
};

const calcReadingTime = (html: string) => {
    const text = htmlToText(html);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.round(words / 220));
    return { words, mins };
};

const BlogDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [blog, setBlog] = useState<Blog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const articleRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const data = await getBlogById(Number(id));
                if (!mounted) return;
                setBlog(data);
            } catch (e) {
                console.error(e);
                if (!mounted) return;
                setError("Failed to load blog. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [id]);

    const meta = useMemo(() => {
        if (!blog) return null;
        const created = safeDate((blog as any)?.created_at ?? null);
        const rt = calcReadingTime(blog.content || "");
        return {
            createdLabel: created
                ? created.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })
                : null,
            mins: rt.mins,
            words: rt.words,
        };
    }, [blog]);

    const hasCover = !!(blog?.cover_image && typeof blog.cover_image === "string");

    const glassCard =
        "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50";

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col font-sans">
            <Navbar />

            {loading && (
                <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                    <div className={glassCard}>
                        <div className="px-4 md:px-5 py-4 text-sm sm:text-base text-slate-600">Loading…</div>
                    </div>
                </main>
            )}

            {error && (
                <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 py-4 md:py-5">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm sm:text-base text-rose-700 shadow-sm backdrop-blur-xl">
                        {error}
                    </div>
                </main>
            )}

            {!loading && !error && blog && (
                <>
                    {/* ✅ Cover becomes true full-width (no max wrapper) */}
                    {hasCover && (
                        <div className="w-full pt-4 md:pt-5">
                            <div className="w-full px-2 sm:px-3 lg:px-4 xl:px-5">
                                <div className={`${glassCard} overflow-hidden`}>
                                    <div className="relative h-[220px] sm:h-[320px] md:h-[520px]">
                                        <img
                                            src={blog.cover_image as string}
                                            alt={blog.title}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ✅ Main is full-width; content scales by breakpoint (no fixed max-4xl) */}
                    <main
                        className={[
                            "flex-1 w-full px-2 sm:px-3 lg:px-4 xl:px-5 pb-10 md:pb-12",
                            hasCover ? "pt-4 md:pt-5" : "pt-4 md:pt-6",
                        ].join(" ")}
                    >
                        {/* Full-width container (keeps nice readable measure on small, expands on large) */}
                        <div className="w-full">
                            {/* Title block */}
                            <header className="mb-4">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-slate-700 tracking-tight leading-tight">
                                    {blog.title}
                                </h1>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm sm:text-base text-slate-600">
                                    {meta?.createdLabel && (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                            {meta.createdLabel}
                                        </span>
                                    )}
                                    <span className="text-slate-300">•</span>
                                    <span>{meta?.mins ?? 1} min read</span>
                                    {typeof meta?.words === "number" && (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-500">{meta.words.toLocaleString()} words</span>
                                        </>
                                    )}
                                </div>
                            </header>

                            {/* ✅ Article surface: full width, but adds internal padding and grows with screen */}
                            <article
                                ref={(node) => {
                                    articleRef.current = node as any;
                                }}
                                className={[
                                    glassCard,
                                    "w-full",
                                    "px-4 sm:px-6 md:px-10 lg:px-14",
                                    "py-5 sm:py-7 md:py-10",
                                ].join(" ")}
                            >
                                <div
                                    className={[
                                        // Typography: keep readable on mobile; more spacious on large screens
                                        "prose max-w-none",
                                        "prose-slate",
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
                                        "prose-strong:text-slate-700 prose-strong:font-normal",
                                    ].join(" ")}
                                    dangerouslySetInnerHTML={{ __html: blog.content }}
                                />
                            </article>
                        </div>
                    </main>
                </>
            )}
        </div>
    );
};

export default BlogDetail;
