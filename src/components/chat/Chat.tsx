// src/components/chat/Chat.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {ChatMessage} from "./types";
import {cx, uid, nowIso} from "./utils";
import {sendChatMessage} from "./api";
import type {Challenge} from "../../pages/PracticePage/types";
import {fetchChatHistory} from "../../pages/PracticePage/practice";

type Banner = {type: "error" | "info"; text: string} | null;

type HistoryResponse = {
    ok: boolean;
    data: {messages: ChatMessage[]; next?: string | null};
    error?: string;
};

const isAbort = (e: any) =>
    e?.name === "AbortError" ||
    e?.code === "ERR_CANCELED" ||
    /aborted|cancelled|canceled/i.test(String(e?.message || ""));

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function ChatWidget(props: {
    className?: string;
    context?: Record<string, any>;
    disabled?: boolean;
    maxChars?: number;
    initialMessages?: ChatMessage[];
    active?: boolean;
}) {
    const {className, context, disabled = false, maxChars = 4000, initialMessages = [], active = false} = props;

    const challengeId = Number(context?.challengeId ?? 0);

    // ----------------------------
    // Messages + history cursor state
    // ----------------------------
    const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages);

    const [historyNext, setHistoryNext] = useState<string | null>(null);
    const [historyLoadingLatest, setHistoryLoadingLatest] = useState(false);
    const [historyLoadingOlder, setHistoryLoadingOlder] = useState(false);

    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [banner, setBanner] = useState<Banner>(null);

    // ----------------------------
    // Refs
    // ----------------------------
    const abortRef = useRef<AbortController | null>(null); // for send
    const historyAbortRef = useRef<AbortController | null>(null); // for history fetch

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const inFlightRef = useRef(false);
    const bannerTimerRef = useRef<number | null>(null);

    const shouldAutoScrollRef = useRef(true);
    const prevActiveRef = useRef(false);
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            abortRef.current?.abort();
            historyAbortRef.current?.abort();
            if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
        };
    }, []);

    // ----------------------------
    // Styling tokens (match your “glassy slate” pages; minimal)
    // ----------------------------
    const bannerClass = (type: "error" | "info") =>
        cx(
            "mb-3 rounded-2xl border px-3 py-2 text-sm",
            type === "error"
                ? "border-rose-200 bg-rose-50/80 text-rose-700"
                : "border-emerald-200 bg-emerald-50/80 text-emerald-700"
        );

    const userBubble =
        "max-w-[85%] rounded-2xl ring-1 ring-sky-200/70 bg-sky-50/70 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap break-words";
    const botBubble =
        "max-w-[85%] rounded-2xl ring-1 ring-slate-200/60 bg-white/70 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap break-words";

    const inputShell =
        "rounded-2xl ring-1 ring-slate-200/60 bg-white/70 focus-within:bg-white focus-within:ring-sky-200/70";
    const inputBase =
        "w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:text-slate-400";

    const sendBtn =
        "rounded-2xl ring-1 ring-emerald-200/60 bg-white/70 px-4 py-2.5 text-sm font-normal text-emerald-700 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-slate-300";

    const subtleBtn =
        "rounded-xl ring-1 ring-slate-200/60 bg-white/70 px-3 py-1.5 text-xs font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-sky-300/30 disabled:opacity-50";

    // ----------------------------
    // Helpers
    // ----------------------------
    const clearBannerSoon = useCallback(() => {
        if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = window.setTimeout(() => {
            if (!alive.current) return;
            setBanner(null);
        }, 3000);
    }, []);

    const stopAll = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;

        historyAbortRef.current?.abort();
        historyAbortRef.current = null;

        inFlightRef.current = false;
        setSending(false);
        setHistoryLoadingLatest(false);
        setHistoryLoadingOlder(false);
    }, []);

    const dedupeByIdOldestFirst = useCallback((list: ChatMessage[]) => {
        const map = new Map<string, ChatMessage>();
        for (const m of list) map.set(String(m.id), m);

        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            const ta = Date.parse(a.createdAt || "") || 0;
            const tb = Date.parse(b.createdAt || "") || 0;
            return ta - tb;
        });
        return arr;
    }, []);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
        bottomRef.current?.scrollIntoView({behavior, block: "end"});
    }, []);

    const isNearBottom = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return true;
        const threshold = 140;
        return el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
    }, []);

    // ----------------------------
    // History loading (optimized + safe)
    // ----------------------------
    const loadOlder = useCallback(async () => {
        if (!challengeId) return;
        if (!historyNext) return;
        if (historyLoadingOlder) return;

        const el = scrollerRef.current;
        if (!el) return;

        const prevScrollHeight = el.scrollHeight;

        setHistoryLoadingOlder(true);
        historyAbortRef.current?.abort();
        const ac = new AbortController();
        historyAbortRef.current = ac;

        try {
            const res = (await fetchChatHistory({
                challengeId,
                cursorUrl: historyNext,
                signal: ac.signal,
            })) as HistoryResponse;

            if (ac.signal.aborted) return;

            setHistoryLoadingOlder(false);
            historyAbortRef.current = null;

            if (!res?.ok) return;

            const newestFirst = res.data.messages || [];
            const olderOldestFirst = [...newestFirst].reverse();

            setMessages((prev) => dedupeByIdOldestFirst([...olderOldestFirst, ...prev]));
            setHistoryNext(res.data.next ?? null);

            requestAnimationFrame(() => {
                const newScrollHeight = el.scrollHeight;
                el.scrollTop = clamp(newScrollHeight - prevScrollHeight, 0, newScrollHeight);
            });
        } catch (e: any) {
            if (isAbort(e)) return;
            setHistoryLoadingOlder(false);
            historyAbortRef.current = null;
        }
    }, [challengeId, historyNext, historyLoadingOlder, dedupeByIdOldestFirst]);

    const onScroll = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;

        shouldAutoScrollRef.current = isNearBottom();

        if (el.scrollTop <= 20) {
            void loadOlder();
        }
    }, [isNearBottom, loadOlder]);

    const loadLatest = useCallback(async () => {
        if (!challengeId) {
            setMessages(initialMessages);
            setHistoryNext(null);
            return;
        }

        setHistoryLoadingLatest(true);
        historyAbortRef.current?.abort();
        const ac = new AbortController();
        historyAbortRef.current = ac;

        try {
            const res = (await fetchChatHistory({
                challengeId,
                pageSize: 20,
                signal: ac.signal,
            })) as HistoryResponse;

            if (ac.signal.aborted) return;

            setHistoryLoadingLatest(false);
            historyAbortRef.current = null;

            if (!res?.ok) {
                setHistoryNext(null);
                setBanner({type: "error", text: res?.error || "Failed to load chat history."});
                clearBannerSoon();
                return;
            }

            const newestFirst = res.data.messages || [];
            const oldestFirst = [...newestFirst].reverse();

            const merged = dedupeByIdOldestFirst([...initialMessages, ...oldestFirst]);
            setMessages(merged);

            setHistoryNext(res.data.next ?? null);

            requestAnimationFrame(() => scrollToBottom("auto"));
        } catch (e: any) {
            if (isAbort(e)) return;

            setHistoryLoadingLatest(false);
            historyAbortRef.current = null;
            setBanner({type: "error", text: e?.message || "Failed to load chat history."});
            clearBannerSoon();
        }
    }, [challengeId, initialMessages, dedupeByIdOldestFirst, scrollToBottom, clearBannerSoon]);

    useEffect(() => {
        void loadLatest();
        return () => {
            historyAbortRef.current?.abort();
            historyAbortRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challengeId]);

    useEffect(() => {
        return () => {
            stopAll();
            if (bannerTimerRef.current) {
                window.clearTimeout(bannerTimerRef.current);
                bannerTimerRef.current = null;
            }
        };
    }, [stopAll]);

    // When user opens AI tab: jump to bottom + focus textarea
    useEffect(() => {
        const wasActive = prevActiveRef.current;
        prevActiveRef.current = active;

        if (active && !wasActive) {
            requestAnimationFrame(() => {
                scrollToBottom("auto");
                requestAnimationFrame(() => textareaRef.current?.focus());
            });
        }
    }, [active, scrollToBottom]);

    // ----------------------------
    // Sending logic
    // ----------------------------
    const canSend = useMemo(() => {
        const t = input.trim();
        return !disabled && !sending && t.length > 0 && t.length <= maxChars;
    }, [input, disabled, sending, maxChars]);

    const send = useCallback(async () => {
        if (!canSend) return;
        if (inFlightRef.current) return;

        inFlightRef.current = true;
        setBanner(null);
        setSending(true);

        const userText = input.trim();
        setInput("");

        const userMsg: ChatMessage = {id: uid(), role: "user", content: userText, createdAt: nowIso()};
        const placeholderId = uid();
        const placeholder: ChatMessage = {id: placeholderId, role: "assistant", content: "Thinking…", createdAt: nowIso()};

        setMessages((prev) => [...prev, userMsg, placeholder]);

        requestAnimationFrame(() => {
            if (shouldAutoScrollRef.current) scrollToBottom("smooth");
        });

        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const res = await sendChatMessage({text: userText, context}, ac.signal);

            if (ac.signal.aborted) return;

            if (!res.ok) {
                setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
                setBanner({type: "error", text: res.error || "Send failed."});
                clearBannerSoon();
                return;
            }

            setMessages((prev) => prev.map((m) => (m.id === placeholderId ? res.message : m)));

            requestAnimationFrame(() => {
                if (shouldAutoScrollRef.current) scrollToBottom("smooth");
            });
        } catch (e: any) {
            const aborted = isAbort(e) || abortRef.current?.signal?.aborted;

            setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
            setBanner({type: "error", text: aborted ? "Request aborted." : e?.message || "Send failed."});
            clearBannerSoon();
        } finally {
            abortRef.current = null;
            inFlightRef.current = false;
            if (!alive.current) return;
            setSending(false);
        }
    }, [canSend, input, context, clearBannerSoon, scrollToBottom]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    // ----------------------------
    // Render (NO outer card kept; style updates only)
    // ----------------------------
    return (
        <div className={cx("flex min-h-0 flex-1 flex-col bg-white/40 backdrop-blur-xl", className)}>
            {/* Messages */}
            <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
                aria-label="Chat messages"
            >
                {historyLoadingOlder ? (
                    <div className="mb-2 text-center text-xs text-slate-500">Loading older…</div>
                ) : null}

                {banner ? <div className={bannerClass(banner.type)}>{banner.text}</div> : null}

                {historyLoadingLatest && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-normal text-slate-700">Loading…</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm text-slate-500">Type below to start.</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {messages.map((m) => {
                            const isUser = m.role === "user";
                            return (
                                <div key={m.id} className={cx("flex w-full", isUser ? "justify-end" : "justify-start")}>
                                    <div className={isUser ? userBubble : botBubble}>{m.content}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="shrink-0 px-3 py-3 border-t border-white/40 bg-white/40 backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <div className={inputShell}>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                disabled={disabled || sending}
                                rows={3}
                                placeholder={disabled ? "Chat disabled" : "Message…"}
                                className={inputBase}
                            />
                        </div>

                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span>
                                {Math.min(input.trim().length, maxChars)}/{maxChars}
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                                {historyNext && !historyLoadingLatest ? (
                                    <button
                                        type="button"
                                        onClick={loadOlder}
                                        disabled={historyLoadingOlder}
                                        className={subtleBtn}
                                        title="Load older messages"
                                    >
                                        {historyLoadingOlder ? "Loading…" : "Load older"}
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={loadLatest}
                                    disabled={historyLoadingLatest}
                                    className={subtleBtn}
                                    title="Refresh chat history"
                                >
                                    {historyLoadingLatest ? "Refreshing…" : "Refresh"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button type="button" onClick={send} disabled={!canSend} className={sendBtn}>
                        {sending ? "Sending…" : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PracticeAssistPanel(props: {
    className?: string;

    answerTitle?: string;
    aiTitle?: string;
    aiSubtitle?: string;

    defaultTab?: "answer" | "ai";
    answerSlot?: React.ReactNode;

    chatContext?: Record<string, any>;

    showSegmentedTabs?: boolean;
    showMenu?: boolean;

    challenge?: Challenge;
}) {
    const {
        className,
        answerTitle = "Submit",
        aiTitle = "AI Assistant",
        aiSubtitle = "Ask about this challenge or your solution.",
        defaultTab = "answer",
        answerSlot,
        chatContext,
        showSegmentedTabs = true,
        showMenu = true,
    } = props;

    const [tab, setTab] = useState<"answer" | "ai">(defaultTab);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => setTab(defaultTab), [defaultTab]);

    useEffect(() => {
        if (!showMenu) return;
        const onDown = (e: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [showMenu]);

    const headerLabel = tab === "ai" ? aiTitle : answerTitle;

    // styling tokens (match your admin/contest pages)
    const shell =
        "flex min-h-0 flex-1 flex-col rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm overflow-hidden";
    const header = "shrink-0 border-b border-slate-200/70 bg-white/40 px-4 sm:px-5 py-3";
    const headerTitle = "text-sm font-normal text-slate-800";
    const subtitle = "text-xs text-slate-500";
    const segmentedWrap = "hidden sm:flex items-center rounded-2xl ring-1 ring-slate-200/60 bg-white/70 p-1";
    const segBtn = (activeBtn: boolean) =>
        cx(
            "rounded-xl px-3 py-1.5 text-xs font-normal transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            activeBtn ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70" : "text-slate-600 hover:text-slate-700"
        );
    const mobileBtn = (activeBtn: boolean) =>
        cx(
            "rounded-xl ring-1 px-3 py-2 text-xs font-normal transition",
            activeBtn ? "ring-sky-200/70 bg-sky-50 text-sky-700" : "ring-slate-200/60 bg-white/70 text-slate-600 hover:bg-white/90"
        );

    return (
        <section className={cx(shell, className)}>
            {/* Header */}
            <div className={header}>
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className={headerTitle}>{headerLabel}</div>
                        {tab === "ai" && aiSubtitle ? <div className={subtitle}>{aiSubtitle}</div> : null}
                    </div>

                    {showSegmentedTabs ? (
                        <div className={segmentedWrap}>
                            <button type="button" onClick={() => setTab("answer")} className={segBtn(tab === "answer")}>
                                Answer
                            </button>
                            <button type="button" onClick={() => setTab("ai")} className={segBtn(tab === "ai")}>
                                AI Assistant
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Mobile quick buttons */}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                    <button type="button" onClick={() => setTab("answer")} className={mobileBtn(tab === "answer")}>
                        Answer
                    </button>
                    <button type="button" onClick={() => setTab("ai")} className={mobileBtn(tab === "ai")}>
                        AI Assistant
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === "answer" ? (
                    <div className="p-4 sm:p-5 bg-white/40 backdrop-blur-xl">
                        <div className="mx-auto max-w-4xl">
                            {answerSlot ?? (
                                <div className="rounded-2xl ring-1 ring-slate-200/60 bg-white/70 p-4 text-sm text-slate-600">
                                    No answer slot provided.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <ChatWidget context={chatContext} active={tab === "ai"} className="min-h-0 flex-1" />
                )}
            </div>
        </section>
    );
}

export default PracticeAssistPanel;
