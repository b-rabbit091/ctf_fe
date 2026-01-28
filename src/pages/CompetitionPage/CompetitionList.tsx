// src/pages/CompetePage/CompetitionList.tsx
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Navbar from "../../components/Navbar";
import {getChallenges, getCategories, getDifficulties} from "./api";
import {useNavigate} from "react-router-dom";
import {FiAlertCircle, FiEye, FiInfo, FiRefreshCw, FiTag, FiUsers} from "react-icons/fi";
import type {Challenge} from "./types";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70";

/** Truncate text safely */
const truncateText = (text: string, maxLength: number) =>
    text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

/** Debounce hook */
function useDebouncedValue<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

type ContestStatus = "ONGOING" | "UPCOMING" | "ENDED" | "NONE";
type GroupFilter = "ALL" | "GROUP_ONLY" | "SOLO_ONLY";
type ContestTypeFilter = "ALL" | "daily" | "weekly" | "monthly" | "custom";

/** LeetCode-like tag options */
const DIFFICULTY_TAGS = ["Easy", "Medium", "Hard"] as const;

const STATUS_TAGS: Array<{ label: string; value: ContestStatus | "ALL" }> = [
    {label: "All", value: "ALL"},
    {label: "Ongoing", value: "ONGOING"},
    {label: "Upcoming", value: "UPCOMING"},
    {label: "Ended", value: "ENDED"},
    {label: "No contest", value: "NONE"},
];

const CONTEST_TYPE_TAGS: Array<{ label: string; value: ContestTypeFilter }> = [
    {label: "All", value: "ALL"},
    {label: "Daily", value: "daily"},
    {label: "Weekly", value: "weekly"},
    {label: "Monthly", value: "monthly"},
    {label: "Custom", value: "custom"},
];

const PARTICIPATION_TAGS: Array<{ label: string; value: GroupFilter }> = [
    {label: "All", value: "ALL"},
    {label: "Group only", value: "GROUP_ONLY"},
    {label: "Open", value: "SOLO_ONLY"},
];

interface ContestMeta {
    label: string;
    badgeClass: string;
    timingPrimary: string | null;
    timingSecondary: string | null;
    status: ContestStatus;
    contestId: string | null;
    contestName: string | null;
    contestType: string | null;
    startIso: string | null;
    endIso: string | null;
}

function formatDateTimeLocal(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getContestMeta(challenge: Challenge): ContestMeta {
    const activeContest = (challenge as any).active_contest ?? null;

    const baseNone: ContestMeta = {
        label: "NO CONTEST",
        badgeClass: "bg-slate-100/70 text-slate-600 ring-slate-200/60",
        timingPrimary: null,
        timingSecondary: null,
        status: "NONE",
        contestId: null,
        contestName: null,
        contestType: null,
        startIso: null,
        endIso: null,
    };

    if (!activeContest) return baseNone;

    const nowMs = Date.now();
    const startIso = activeContest.start_time ?? null;
    const endIso = activeContest.end_time ?? null;

    const start = startIso ? new Date(startIso) : new Date("invalid");
    const end = endIso ? new Date(endIso) : new Date("invalid");

    const startMs = start.getTime();
    const endMs = end.getTime();

    const contestName = activeContest.name ?? null;
    const contestType = activeContest.contest_type ?? null;
    const contestId = String(activeContest.id ?? activeContest.slug ?? activeContest.name ?? "contest");

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return {
            label: "SCHEDULED",
            badgeClass: "bg-slate-100/70 text-slate-600 ring-slate-200/60",
            timingPrimary: startIso ? `Opens: ${formatDateTimeLocal(startIso)}` : null,
            timingSecondary: endIso ? `Ends: ${formatDateTimeLocal(endIso)}` : null,
            status: "UPCOMING",
            contestId,
            contestName,
            contestType,
            startIso,
            endIso,
        };
    }

    if (nowMs < startMs) {
        return {
            label: "UPCOMING",
            badgeClass: "bg-sky-100/70 text-sky-700 ring-sky-200/60",
            timingPrimary: `Opens: ${formatDateTimeLocal(startIso!)}`,
            timingSecondary: `Ends: ${formatDateTimeLocal(endIso!)}`,
            status: "UPCOMING",
            contestId,
            contestName,
            contestType,
            startIso,
            endIso,
        };
    }

    if (nowMs >= startMs && nowMs < endMs) {
        return {
            label: "ONGOING",
            badgeClass: "bg-emerald-100/70 text-emerald-700 ring-emerald-200/60",
            timingPrimary: null,
            timingSecondary: `Ends: ${formatDateTimeLocal(endIso!)}`,
            status: "ONGOING",
            contestId,
            contestName,
            contestType,
            startIso,
            endIso,
        };
    }

    return {
        label: "ENDED",
        badgeClass: "bg-slate-100/70 text-slate-600 ring-slate-200/60",
        timingPrimary: null,
        timingSecondary: `Ended: ${formatDateTimeLocal(endIso!)}`,
        status: "ENDED",
        contestId,
        contestName,
        contestType,
        startIso,
        endIso,
    };
}

type ContestGroup = {
    contestId: string;
    contestName: string;
    contestType: string | null;
    timingPrimary: string | null;
    timingSecondary: string | null;
    entries: { challenge: Challenge; contest: ContestMeta }[];
};

function groupByContestName(items: { challenge: Challenge; contest: ContestMeta }[]): ContestGroup[] {
    const map = new Map<string, ContestGroup>();

    items.forEach((it) => {
        const c = it.contest;
        const contestId = c.contestId ?? "no-contest";
        const contestName = c.contestName ?? "No Contest";
        const key = contestId;

        if (!map.has(key)) {
            map.set(key, {
                contestId,
                contestName,
                contestType: c.contestType ?? null,
                timingPrimary: c.timingPrimary ?? null,
                timingSecondary: c.timingSecondary ?? null,
                entries: [],
            });
        }

        const g = map.get(key)!;
        g.entries.push(it);

        g.timingPrimary = g.timingPrimary || c.timingPrimary || null;
        g.timingSecondary = g.timingSecondary || c.timingSecondary || null;
    });

    const groups = Array.from(map.values());
    const rank = (name: string) => (name === "No Contest" ? 1 : 0);

    groups.sort((a, b) => {
        const ra = rank(a.contestName);
        const rb = rank(b.contestName);
        if (ra !== rb) return ra - rb;
        return a.contestName.localeCompare(b.contestName);
    });

    return groups;
}

const Card = memo(function Card({
                                    title,
                                    right,
                                    children,
                                }: {
    title?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm">
            {title ? (
                <>
                    <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                        <h2 className="min-w-0 truncate text-base sm:text-lg font-normal tracking-tight text-slate-700">
                            {title}
                        </h2>
                        {right}
                    </div>
                    <div className="h-px bg-slate-200/70"/>
                </>
            ) : null}
            <div className={cx("px-4 sm:px-5", title ? "py-4" : "py-4")}>{children}</div>
        </section>
    );
});

// Tag chip: no bold, no black backgrounds; pleasant sky when active
const tagClass = (active: boolean) =>
    cx(
        "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
        focusRing,
        active
            ? "border-sky-200/70 bg-sky-50 text-sky-700"
            : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90"
    );

const CompetitionList: React.FC = () => {
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [, setDifficulties] = useState<{ id: number; level: string }[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [categoryFilter, setCategoryFilter] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 350);

    const [statusFilter, setStatusFilter] = useState<ContestStatus | "ALL">("ALL");
    const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");

    const [contestNameFilter, setContestNameFilter] = useState<string>("ALL");
    const [contestTypeFilter, setContestTypeFilter] = useState<ContestTypeFilter>("ALL");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const pageSizeOptions = useMemo(() => [6, 9, 12, 24], []);

    // avoid setState after unmount
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const fetchInitial = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [cats, diffs, chals] = await Promise.all([
                getCategories(),
                getDifficulties(),
                getChallenges({type: "competition"}),
            ]);

            if (!alive.current) return;

            setCategories(cats || []);
            setDifficulties(diffs || []);
            setAllChallenges(chals || []);
        } catch (err) {
            console.error("Failed to fetch competition data:", err);
            if (!alive.current) return;
            setError("Failed to load competition challenges. Please try again.");
        } finally {
            if (!alive.current) return;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    const filteredChallenges = useMemo(() => {
        const searchLower = debouncedSearch.trim().toLowerCase();

        return allChallenges.filter((c: any) => {
            if (categoryFilter && c.category?.name !== categoryFilter) return false;
            if (difficultyFilter && c.difficulty?.level !== difficultyFilter) return false;

            const meta = getContestMeta(c);

            if (statusFilter !== "ALL" && meta.status !== statusFilter) return false;

            if (groupFilter === "GROUP_ONLY" && !c.group_only) return false;
            if (groupFilter === "SOLO_ONLY" && c.group_only) return false;

            if (contestNameFilter !== "ALL") {
                const activeName = meta.contestName || "NO CONTEST";
                if (activeName !== contestNameFilter) return false;
            }

            if (contestTypeFilter !== "ALL") {
                const t = (meta.contestType || "").toLowerCase();
                if (t !== contestTypeFilter) return false;
            }

            if (!searchLower) return true;

            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();
            const contestName = (meta.contestName || "").toLowerCase();

            return title.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower) || contestName.includes(searchLower);
        });
    }, [
        allChallenges,
        categoryFilter,
        difficultyFilter,
        debouncedSearch,
        statusFilter,
        groupFilter,
        contestNameFilter,
        contestTypeFilter,
    ]);

    const total = filteredChallenges.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

    const currentPageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredChallenges.slice(start, start + pageSize);
    }, [filteredChallenges, page, pageSize]);

    const byStatus = useMemo(() => {
        const ongoing: { challenge: Challenge; contest: ContestMeta }[] = [];
        const upcoming: { challenge: Challenge; contest: ContestMeta }[] = [];
        const others: { challenge: Challenge; contest: ContestMeta }[] = [];

        currentPageItems.forEach((c) => {
            const meta = getContestMeta(c);
            const entry = {challenge: c, contest: meta};
            if (meta.status === "ONGOING") ongoing.push(entry);
            else if (meta.status === "UPCOMING") upcoming.push(entry);
            else others.push(entry);
        });

        return {ongoing, upcoming, others};
    }, [currentPageItems]);

    const groupedOngoing = useMemo(() => groupByContestName(byStatus.ongoing), [byStatus.ongoing]);
    const groupedUpcoming = useMemo(() => groupByContestName(byStatus.upcoming), [byStatus.upcoming]);
    const groupedOthers = useMemo(() => groupByContestName(byStatus.others), [byStatus.others]);

    const handleClearFilters = useCallback(() => {
        setCategoryFilter("");
        setDifficultyFilter("");
        setSearch("");
        setStatusFilter("ALL");
        setGroupFilter("ALL");
        setContestNameFilter("ALL");
        setContestTypeFilter("ALL");
        setPage(1);
    }, []);

    const onPageChange = useCallback(
        (newPage: number) => {
            if (newPage < 1 || newPage > pageCount) return;
            setPage(newPage);
            window.scrollTo({top: 0, behavior: "smooth"});
        },
        [pageCount]
    );

    const renderChallengeCard = useCallback(
        ({challenge: c, contest}: { challenge: Challenge; contest: ContestMeta }) => {
            const cc: any = c;

            const difficulty = cc.difficulty?.level || "N/A";
            const category = cc.category?.name || "N/A";

            const isGroupOnly = !!cc.group_only;
            const canParticipate = cc.can_participate !== undefined ? !!cc.can_participate : true;

            const difficultyLower = String(difficulty || "").toLowerCase();

            const difficultyColor =
                difficultyLower === "easy"
                    ? "bg-emerald-100/70 text-emerald-700 ring-emerald-200/60"
                    : difficultyLower === "medium"
                        ? "bg-amber-100/70 text-amber-800 ring-amber-200/60"
                        : difficultyLower === "hard"
                            ? "bg-rose-100/70 text-rose-700 ring-rose-200/60"
                            : "bg-slate-100/70 text-slate-600 ring-slate-200/60";

            const groupBadgeClass = isGroupOnly
                ? "bg-indigo-100/70 text-indigo-700 ring-indigo-200/60"
                : "bg-slate-100/70 text-slate-600 ring-slate-200/60";

            return (
                <article
                    key={cc.id}
                    className={cx(
                        "flex flex-col rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm",
                        "transition hover:bg-white/75 hover:shadow-md"
                    )}
                >
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 line-clamp-2 text-lg sm:text-xl md:text-2xl font-normal tracking-tight text-slate-700 leading-snug">
                                {cc.title}
                            </h3>

                            <span
                                className={cx(
                                    "hidden sm:inline-flex items-center rounded-full px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ring-1",
                                    contest.badgeClass
                                )}
                                title="Contest status"
                            >
                                {contest.label}
                            </span>
                        </div>

                        <p className="mt-3 line-clamp-4 text-sm sm:text-base md:text-[17px] text-slate-600 leading-relaxed">
                            {truncateText(cc.description || "", 260)}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-2.5">
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full ring-1 ring-slate-200/60 bg-slate-50/60 px-3.5 py-2 text-xs sm:text-sm md:text-base text-slate-600">
                                <FiTag size={14}/>
                                <span>Category:</span>
                                <span className="truncate max-w-[14rem]">{category}</span>
                            </span>

                            <span
                                className={cx("inline-flex items-center rounded-full px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ring-1", difficultyColor)}>
                                <span className="mr-1">Difficulty:</span>
                                <span>{difficulty}</span>
                            </span>

                            <span
                                className={cx(
                                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ring-1",
                                    groupBadgeClass
                                )}
                                title={isGroupOnly ? "Group-only competition" : "Open competition"}
                            >
                                <FiUsers size={16}/>
                                {isGroupOnly ? "GROUP" : "INDIVIDUAL"}
                            </span>

                            <span
                                className={cx(
                                    "sm:hidden inline-flex items-center rounded-full px-3.5 py-2 text-xs font-normal ring-1",
                                    contest.badgeClass
                                )}
                            >
                                {contest.label}
                            </span>
                        </div>

                        {contest.timingPrimary || contest.timingSecondary ? (
                            <div className="mt-4 text-xs sm:text-sm text-slate-500">
                                {contest.timingPrimary ? <span className="mr-3">{contest.timingPrimary}</span> : null}
                                {contest.timingSecondary ? <span>{contest.timingSecondary}</span> : null}
                            </div>
                        ) : null}
                    </div>

                    <div
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 bg-white/40 px-5 sm:px-6 py-4 backdrop-blur-xl">
                        {isGroupOnly && !canParticipate ? (
                            <div
                                className="inline-flex items-center gap-2 text-sm sm:text-base font-normal text-slate-600">
                                <FiUsers size={18}/>
                                <span>Join or create a group to participate.</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate(`/compete/${cc.id}`)}
                                className={cx(
                                    "inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2.5 text-sm sm:text-base font-normal tracking-tight",
                                    "ring-1 ring-sky-200/60 text-sky-700 hover:bg-white/90",
                                    focusRing
                                )}
                                aria-label={`Participate in competition challenge ${cc.title}`}
                            >
                                <FiEye size={18}/>
                                <span>Participate</span>
                            </button>
                        )}

                        <span className="text-xs sm:text-sm text-slate-500">
              Access: <span className="text-slate-600">{isGroupOnly ? "Group" : "Open"}</span>
            </span>
                    </div>
                </article>
            );
        },
        [navigate]
    );

    const renderContestGroup = useCallback(
        (g: ContestGroup, accent: "emerald" | "sky" | "slate") => {
            const chip =
                accent === "emerald"
                    ? "ring-emerald-200/60 bg-emerald-100/70 text-emerald-700"
                    : accent === "sky"
                        ? "ring-sky-200/60 bg-sky-100/70 text-sky-700"
                        : "ring-slate-200/60 bg-slate-100/70 text-slate-600";

            return (
                <section key={g.contestId} className="space-y-4">
                    <div className="h-px w-full bg-slate-200/70"/>

                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="text-lg sm:text-xl md:text-2xl font-normal tracking-tight text-slate-700">
                                    {g.contestName}
                                </h3>

                                <span
                                    className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm md:text-base font-normal ring-1", chip)}>
                                    {g.entries.length} challenge{g.entries.length === 1 ? "" : "s"}
                                </span>

                                {g.contestType ? (
                                    <span
                                        className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-white/60 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-slate-600">
                    {(g.contestType || "").toUpperCase()}
                  </span>
                                ) : null}
                            </div>

                            {(g.timingPrimary || g.timingSecondary) ? (
                                <div className="mt-1 text-sm sm:text-base text-slate-500">
                                    {g.timingPrimary ? <span className="mr-3">{g.timingPrimary}</span> : null}
                                    {g.timingSecondary ? <span>{g.timingSecondary}</span> : null}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {g.entries.map((e) => renderChallengeCard(e))}
                    </div>
                </section>
            );
        },
        [renderChallengeCard]
    );

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-slate-700 flex flex-col">
            <Navbar/>

            <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5">
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl sm:text-3xl font-normal tracking-tight text-slate-700">
                            Competition Challenges
                        </h1>
                        <p className="mt-1 text-sm sm:text-base text-slate-500">
                            Filter contests by status, type, and participation — then jump in.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchInitial}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-2 text-sm font-normal tracking-tight",
                            "ring-1 ring-slate-200/60 hover:bg-white/90 disabled:opacity-60",
                            focusRing
                        )}
                        disabled={loading}
                        aria-label="Refresh competition challenges"
                        title="Refresh"
                    >
                        <FiRefreshCw className={loading ? "animate-spin" : ""} size={16}/>
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </header>

                {/* Filters panel */}
                <Card>
                    <div className="space-y-3">
                        {/* Row 1 */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-[240px] flex-1">
                                <label className="sr-only" htmlFor="competition-search">
                                    Search competition challenges
                                </label>
                                <input
                                    id="competition-search"
                                    type="search"
                                    placeholder="Search title, description, category, contest..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className={cx(
                                        "h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm",
                                        "placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/30 focus:outline-none"
                                    )}
                                    aria-label="Search competition challenges"
                                />
                            </div>

                            <div className="shrink-0">
                                <label className="sr-only" htmlFor="category-filter">
                                    Category filter
                                </label>
                                <select
                                    id="category-filter"
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className={cx(
                                        "h-10 w-[190px] max-w-full rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm",
                                        "hover:bg-slate-50/70 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                                    )}
                                >
                                    <option value="">Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className={cx(
                                    "h-10 shrink-0 rounded-xl bg-white/70 px-4 text-sm sm:text-base font-normal tracking-tight",
                                    "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90",
                                    focusRing
                                )}
                            >
                                Reset
                            </button>
                        </div>

                        {/* Row 2 */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Difficulty */}
                            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                  Difficulty
                </span>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setDifficultyFilter("");
                                        setPage(1);
                                    }}
                                    className={tagClass(!difficultyFilter)}
                                    aria-pressed={!difficultyFilter}
                                >
                                    All
                                </button>

                                {DIFFICULTY_TAGS.map((d) => {
                                    const active = difficultyFilter === d;
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => {
                                                setDifficultyFilter(active ? "" : d);
                                                setPage(1);
                                            }}
                                            className={tagClass(active)}
                                            aria-pressed={active}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>

                            <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1"/>

                            {/* Status */}
                            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                  Status
                </span>

                                {STATUS_TAGS.map((t) => {
                                    const active = statusFilter === t.value;
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter(t.value);
                                                setPage(1);
                                            }}
                                            className={tagClass(active)}
                                            aria-pressed={active}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1"/>

                            {/* Contest type */}
                            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                  Contest type
                </span>

                                {CONTEST_TYPE_TAGS.map((t) => {
                                    const active = contestTypeFilter === t.value;
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                setContestTypeFilter(t.value);
                                                setPage(1);
                                            }}
                                            className={tagClass(active)}
                                            aria-pressed={active}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1"/>

                            {/* Participation */}
                            <div className="flex flex-wrap items-center gap-2">
                <span
                    className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">
                  Participation
                </span>

                                {PARTICIPATION_TAGS.map((t) => {
                                    const active = groupFilter === t.value;
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                setGroupFilter(t.value);
                                                setPage(1);
                                            }}
                                            className={tagClass(active)}
                                            aria-pressed={active}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Loading / Error */}
                {loading ? (
                    <div
                        className="mt-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-200/80 animate-pulse shrink-0"/>
                            <div className="min-w-0 space-y-2">
                                <div className="h-4 w-44 bg-slate-200/80 rounded animate-pulse"/>
                                <div className="h-4 w-72 bg-slate-100 rounded animate-pulse"/>
                            </div>
                        </div>
                        <p className="mt-3 text-center text-sm text-slate-500">Loading competition challenges…</p>
                    </div>
                ) : null}

                {error ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
                        <div className="flex items-start gap-3">
                            <FiAlertCircle className="mt-0.5 shrink-0"/>
                            <div className="min-w-0">
                                <p className="font-normal tracking-tight">Couldn’t load competition challenges</p>
                                <p className="mt-1 text-sm break-words text-rose-700/90">{error}</p>
                                <button
                                    type="button"
                                    onClick={fetchInitial}
                                    className={cx(
                                        "mt-3 inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-normal tracking-tight",
                                        "ring-1 ring-rose-200 hover:bg-white/90",
                                        focusRing
                                    )}
                                >
                                    <FiRefreshCw size={14}/>
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Content */}
                {!loading && !error ? (
                    <>
                        {total === 0 ? (
                            <div
                                className="mt-4 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-6 text-center">
                                <div
                                    className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                                    <FiInfo className="text-slate-500"/>
                                </div>
                                <div className="mt-3 text-base sm:text-lg font-normal tracking-tight text-slate-700">
                                    No matches
                                </div>
                                <div className="mt-1 text-sm sm:text-base text-slate-500">
                                    No competition challenges match your filters. Try resetting or broadening your
                                    search.
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 space-y-10">
                                    {groupedOngoing.length > 0 ? (
                                        <section className="space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-sm sm:text-base font-normal uppercase tracking-wide text-emerald-700">
                                                        Ongoing Contests
                                                    </h2>
                                                    <span
                                                        className="inline-flex items-center rounded-full ring-1 ring-emerald-200/60 bg-emerald-100/70 px-3 py-1 text-xs sm:text-sm font-normal text-emerald-700">
                                                        LIVE: {byStatus.ongoing.length}
                                                    </span>
                                                </div>
                                                <p className="text-sm sm:text-base text-slate-500">Grouped by contest
                                                    name.</p>
                                            </div>

                                            <div
                                                className="space-y-8">{groupedOngoing.map((g) => renderContestGroup(g, "emerald"))}</div>
                                        </section>
                                    ) : null}

                                    {groupedUpcoming.length > 0 ? (
                                        <section className="space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-sm sm:text-base font-normal uppercase tracking-wide text-sky-700">
                                                        Upcoming Contests
                                                    </h2>
                                                    <span
                                                        className="inline-flex items-center rounded-full ring-1 ring-sky-200/60 bg-sky-100/70 px-3 py-1 text-xs sm:text-sm font-normal text-sky-700">
                                                        {byStatus.upcoming.length} upcoming
                                                    </span>
                                                </div>
                                                <p className="text-sm sm:text-base text-slate-500">Grouped by contest
                                                    name.</p>
                                            </div>

                                            <div
                                                className="space-y-8">{groupedUpcoming.map((g) => renderContestGroup(g, "sky"))}</div>
                                        </section>
                                    ) : null}

                                    {groupedOthers.length > 0 ? (
                                        <section className="space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-sm sm:text-base font-normal uppercase tracking-wide text-slate-600">
                                                        Other Challenges
                                                    </h2>
                                                    <span
                                                        className="inline-flex items-center rounded-full ring-1 ring-slate-200/60 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm font-normal text-slate-600">
                                                        {byStatus.others.length} listed
                                                    </span>
                                                </div>
                                                <p className="text-sm sm:text-base text-slate-500">Grouped by contest
                                                    name.</p>
                                            </div>

                                            <div
                                                className="space-y-8">{groupedOthers.map((g) => renderContestGroup(g, "slate"))}</div>
                                        </section>
                                    ) : null}
                                </div>

                                {/* Pagination */}
                                <div
                                    className="mt-6 rounded-2xl bg-white/65 backdrop-blur-xl ring-1 ring-slate-200/60 shadow-sm p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className={cx(
                                                    "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                                    "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    focusRing
                                                )}
                                            >
                                                Prev
                                            </button>

                                            <span className="text-sm sm:text-base text-slate-600">
                        Page <span className="text-slate-700">{page}</span> of{" "}
                                                <span className="text-slate-700">{pageCount}</span>
                      </span>

                                            <button
                                                type="button"
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className={cx(
                                                    "rounded-xl bg-white/70 px-4 py-2 text-sm sm:text-base font-normal tracking-tight",
                                                    "ring-1 ring-slate-200/60 text-slate-600 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    focusRing
                                                )}
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm sm:text-base text-slate-600">Per page</span>
                                                <label className="sr-only" htmlFor="page-size">
                                                    Items per page
                                                </label>
                                                <select
                                                    id="page-size"
                                                    value={pageSize}
                                                    onChange={(e) => {
                                                        setPageSize(Number(e.target.value));
                                                        setPage(1);
                                                    }}
                                                    className={cx(
                                                        "rounded-xl bg-white/70 px-3 py-2 text-sm sm:text-base text-slate-700 shadow-sm",
                                                        "ring-1 ring-slate-200/60 hover:bg-white/90",
                                                        focusRing
                                                    )}
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-sm sm:text-base text-slate-600">
                                                Showing{" "}
                                                <span className="text-slate-700">
                          {total === 0 ? 0 : (page - 1) * pageSize + 1}
                        </span>{" "}
                                                – <span
                                                className="text-slate-700">{Math.min(page * pageSize, total)}</span> of{" "}
                                                <span className="text-slate-700">{total}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : null}
            </main>
        </div>
    );
};

export default CompetitionList;
