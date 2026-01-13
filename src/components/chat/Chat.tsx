// src/components/chat/Chat.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {ChatMessage} from "./types";
import {cx, uid, nowIso} from "./utils";
import {sendChatMessage} from "./api";
import type {Challenge} from "../../pages/PracticePage/types";
import {fetchChatHistory} from "../../pages/PracticePage/practice";

type Banner = { type: "error" | "info"; text: string } | null;

type HistoryResponse = {
    ok: boolean;
    data: { messages: ChatMessage[]; next?: string | null };
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
    const {
        className,
        context,
        disabled = false,
        maxChars = 4000,
        initialMessages = [],
        active = false,
    } = props;

    const challengeId = Number(context?.challengeId ?? 0);

    // ----------------------------
    // Messages + history cursor state
    // ----------------------------
    const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages);

    const [historyNext, setHistoryNext] = useState<string | null>(null); // older cursor URL
    const [historyLoadingLatest, setHistoryLoadingLatest] = useState(false);
    const [historyLoadingOlder, setHistoryLoadingOlder] = useState(false);

    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [banner, setBanner] = useState<Banner>(null);

    // ----------------------------
    // Refs
    // ----------------------------
    const abortRef = useRef<AbortController | null>(null);        // for send
    const historyAbortRef = useRef<AbortController | null>(null); // for history fetch

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // prevents double-send race due to async state updates
    const inFlightRef = useRef(false);

    // banner timeout cleanup
    const bannerTimerRef = useRef<number | null>(null);

    // we only auto-scroll to bottom if user is already near bottom (ChatGPT-like)
    const shouldAutoScrollRef = useRef(true);

    // track "active" edge so we only jump once when user opens AI tab
    const prevActiveRef = useRef(false);

    // ----------------------------
    // Helpers
    // ----------------------------
    const clearBannerSoon = useCallback(() => {
        if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = window.setTimeout(() => setBanner(null), 3000);
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
            return ta - tb; // oldest -> newest
        });
        return arr;
    }, []);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
        bottomRef.current?.scrollIntoView({behavior, block: "end"});
    }, []);

    const isNearBottom = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return true;
        const threshold = 140; // px
        return el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
    }, []);

    const onScroll = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;

        shouldAutoScrollRef.current = isNearBottom();

        if (el.scrollTop <= 20) {
            void loadOlder();
        }
    }, [isNearBottom]);

    // ----------------------------
    // History loading
    // ----------------------------
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

    // When user opens AI tab: jump to bottom + focus textarea (no manual scroll)
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
        const placeholder: ChatMessage = {
            id: placeholderId,
            role: "assistant",
            content: "Thinking…",
            createdAt: nowIso()
        };

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
            setBanner({
                type: "error",
                text: aborted ? "Request aborted." : (e?.message || "Send failed."),
            });
            clearBannerSoon();
        } finally {
            abortRef.current = null;
            inFlightRef.current = false;
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
    // Render (NO BOXES: no border, no card, no rounded container)
    // ----------------------------
    return (
        <div className={cx("flex min-h-0 flex-1 flex-col bg-white", className)}>
            {/* Messages */}
            <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="min-h-0 flex-1 overflow-y-auto bg-white px-3 py-3"
            >
                {historyLoadingOlder && (
                    <div className="mb-2 text-center text-xs text-slate-500">Loading older…</div>
                )}

                {banner && (
                    <div
                        className={cx(
                            "mb-3 rounded-xl border px-3 py-2 text-sm",
                            banner.type === "error"
                                ? "border-rose-200 bg-rose-50 text-rose-800"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        )}
                    >
                        {banner.text}
                    </div>
                )}

                {historyLoadingLatest && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-semibold text-slate-900">Loading…</div>
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
                                    <div
                                        className={cx(
                                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                                            isUser ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
                                        )}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div ref={bottomRef}/>
            </div>

            {/* Composer (still present, but no surrounding box/card) */}
            <div className="shrink-0 bg-white px-3 py-3">
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            disabled={disabled || sending}
                            rows={3}
                            placeholder={disabled ? "Chat disabled" : "Message…"}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300 focus:bg-white"
                        />
                        <div className="mt-1 text-[11px] text-slate-400">
                            {Math.min(input.trim().length, maxChars)}/{maxChars}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={send}
                        disabled={!canSend}
                        className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
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

    return (
        <section className={cx("flex min-h-0 flex-1 flex-col bg-white", className)}>
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-700">{headerLabel}</div>

                    <div className="flex items-center gap-2">
                        {showSegmentedTabs && (
                            <div className="hidden sm:flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setTab("answer")}
                                    className={cx(
                                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                                        tab === "answer" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                    )}
                                >
                                    Answer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTab("ai")}
                                    className={cx(
                                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                                        tab === "ai" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                    )}
                                >
                                    AI Assistant
                                </button>
                            </div>
                        )}

                        {showMenu && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((s) => !s)}
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                >
                                    ⋯
                                </button>

                                {menuOpen && (
                                    <div
                                        role="menu"
                                        className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
                                    >
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setTab("answer");
                                                setMenuOpen(false);
                                            }}
                                            className={cx(
                                                "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                                                tab === "answer" ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"
                                            )}
                                        >
                                            Answer
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setTab("ai");
                                                setMenuOpen(false);
                                            }}
                                            className={cx(
                                                "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                                                tab === "ai" ? "bg-gray-50 font-semibold text-gray-900" : "text-gray-700"
                                            )}
                                        >
                                            AI Assistant
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile quick buttons */}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                    <button
                        type="button"
                        onClick={() => setTab("answer")}
                        className={cx(
                            "rounded-xl border px-3 py-2 text-xs font-semibold",
                            tab === "answer" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700"
                        )}
                    >
                        Answer
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("ai")}
                        className={cx(
                            "rounded-xl border px-3 py-2 text-xs font-semibold",
                            tab === "ai" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700"
                        )}
                    >
                        AI Assistant
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-0">
                {tab === "answer" ? (
                    // keep answer area as-is (you can remove this box too if you want)
                    <div className="p-4">
                        <div className="mx-auto max-w-4xl">
                            {answerSlot ?? (
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
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
