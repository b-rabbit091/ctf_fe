import React, {useEffect, useMemo, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import Navbar from "../../components/Navbar";
import {getBlogById} from "./api";
import {Blog} from "./types";


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
    return {words, mins};
};

const BlogDetail: React.FC = () => {
    const {id} = useParams<{ id: string }>();

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

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900">
            <Navbar/>

            {loading && (
                <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-600">
                    Loading…
                </div>
            )}

            {error && (
                <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-red-600">
                    {error}
                </div>
            )}

            {!loading && !error && blog && (
                <>
                    {/* Cover (only if exists) */}
                    {hasCover && (
                        <div className="w-full bg-[#fafafa]">
                            <div className="mx-auto max-w-6xl px-4 pt-8">
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="relative h-[220px] md:h-[520px]">
                                        <img
                                            src={blog.cover_image as string}
                                            alt={blog.title}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                        <div
                                            className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main */}
                    <main
                        className={[
                            "mx-auto px-4 pb-16",
                            hasCover ? "max-w-4xl pt-8 md:pt-10" : "max-w-4xl pt-10 md:pt-12",
                        ].join(" ")}
                    >
                        {/* Title block */}
                        <header className="mb-6">
                            <h1 className="text-[30px] font-semibold leading-[1.12] tracking-tight text-slate-900 md:text-[56px]">
                                {blog.title}
                            </h1>

                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                {meta?.createdLabel && (
                                    <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>
                                        {meta.createdLabel}
                  </span>
                                )}
                                <span className="text-slate-300">•</span>
                                <span>{meta?.mins ?? 1} min read</span>
                                {typeof meta?.words === "number" && (
                                    <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-500">
                      {meta.words.toLocaleString()} words
                    </span>
                                    </>
                                )}
                            </div>
                        </header>

                        {/* Content */}
                        <article
                            ref={(node) => {
                                articleRef.current = node as any;
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm md:px-14 md:py-14"
                        >
                            <div
                                className={[
                                    "prose max-w-none",
                                    "prose-slate",
                                    "prose-headings:tracking-tight",
                                    "prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl",
                                    "prose-p:text-[19px] prose-p:leading-9",
                                    "prose-li:text-[18px] prose-li:leading-9",
                                    "prose-a:text-slate-900 prose-a:underline prose-a:decoration-slate-300 hover:prose-a:decoration-slate-900",
                                    "prose-blockquote:border-l-slate-900 prose-blockquote:text-slate-700",
                                    "prose-hr:border-slate-200",
                                    "prose-img:rounded-2xl prose-img:border prose-img:border-slate-200",
                                    "prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-200",
                                    "prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5",
                                    "prose-strong:text-slate-900",
                                ].join(" ")}
                                dangerouslySetInnerHTML={{__html: blog.content}}
                            />
                        </article>
                    </main>
                </>
            )}
        </div>
    );
};

export default BlogDetail;
