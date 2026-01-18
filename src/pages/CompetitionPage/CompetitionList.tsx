// src/pages/CompetePage/CompetitionList.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { getChallenges, getCategories, getDifficulties } from "./api";
import { useNavigate } from "react-router-dom";
import { FiEye, FiUsers, FiTag, FiFilter } from "react-icons/fi";
import { Challenge } from "./types";

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
    { label: "All", value: "ALL" },
    { label: "Ongoing", value: "ONGOING" },
    { label: "Upcoming", value: "UPCOMING" },
    { label: "Ended", value: "ENDED" },
    { label: "No contest", value: "NONE" },
];

const CONTEST_TYPE_TAGS: Array<{ label: string; value: ContestTypeFilter }> = [
    { label: "All", value: "ALL" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Custom", value: "custom" },
];

const PARTICIPATION_TAGS: Array<{ label: string; value: GroupFilter }> = [
    { label: "All", value: "ALL" },
    { label: "Group only", value: "GROUP_ONLY" },
    { label: "Open", value: "SOLO_ONLY" },
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
        badgeClass: "bg-slate-100/70 text-slate-600 border-slate-200/70",
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
            badgeClass: "bg-slate-100/70 text-slate-600 border-slate-200/70",
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
            badgeClass: "bg-sky-100/70 text-sky-700 border-sky-200/70",
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
            badgeClass: "bg-emerald-100/70 text-emerald-700 border-emerald-200/70",
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
        badgeClass: "bg-slate-100/70 text-slate-600 border-slate-200/70",
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

const CompetitionList: React.FC = () => {
    const navigate = useNavigate();

    const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [difficulties, setDifficulties] = useState<{ id: number; level: string }[]>([]);

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
    const pageSizeOptions = [6, 9, 12, 24];

    useEffect(() => {
        let mounted = true;

        const fetchInitial = async () => {
            setLoading(true);
            setError(null);
            try {
                const [cats, diffs, chals] = await Promise.all([
                    getCategories(),
                    getDifficulties(),
                    getChallenges({ type: "competition" }),
                ]);
                if (!mounted) return;
                setCategories(cats || []);
                setDifficulties(diffs || []);
                setAllChallenges(chals || []);
            } catch (err) {
                console.error("Failed to fetch competition data:", err);
                if (!mounted) return;
                setError("Failed to load competition challenges. Please try again.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        fetchInitial();
        return () => {
            mounted = false;
        };
    }, []);

    const contestOptions = useMemo(() => {
        const seen = new Map<string, { name: string; type: string | null; slug?: string | null; id?: any }>();
        allChallenges.forEach((c: any) => {
            const ac = c?.active_contest;
            if (!ac?.name) return;
            const key = String(ac.id ?? ac.slug ?? ac.name);
            if (!seen.has(key))
                seen.set(key, {
                    name: ac.name,
                    type: ac.contest_type ?? null,
                    slug: ac.slug ?? null,
                    id: ac.id,
                });
        });
        return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [allChallenges]);

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

            return (
                title.includes(searchLower) ||
                desc.includes(searchLower) ||
                cat.includes(searchLower) ||
                contestName.includes(searchLower)
            );
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
            const entry = { challenge: c, contest: meta };
            if (meta.status === "ONGOING") ongoing.push(entry);
            else if (meta.status === "UPCOMING") upcoming.push(entry);
            else others.push(entry);
        });

        return { ongoing, upcoming, others };
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

    const onPageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pageCount) return;
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const renderChallengeCard = ({ challenge: c, contest }: { challenge: Challenge; contest: ContestMeta }) => {
        const cc: any = c;

        const difficulty = cc.difficulty?.level || "N/A";
        const category = cc.category?.name || "N/A";

        const isGroupOnly = !!cc.group_only;
        const canParticipate = cc.can_participate !== undefined ? !!cc.can_participate : true;

        const difficultyLower = String(difficulty || "").toLowerCase();

        const difficultyColor =
            difficultyLower === "easy"
                ? "bg-emerald-100/70 text-emerald-700 border-emerald-200/70"
                : difficultyLower === "medium"
                    ? "bg-amber-100/70 text-amber-700 border-amber-200/70"
                    : difficultyLower === "hard"
                        ? "bg-rose-100/70 text-rose-700 border-rose-200/70"
                        : "bg-slate-100/70 text-slate-600 border-slate-200/70";

        const groupBadgeClass = isGroupOnly
            ? "bg-indigo-100/70 text-indigo-700 border-indigo-200/70"
            : "bg-slate-100/70 text-slate-600 border-slate-200/70";

        const cardShell =
            "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl " +
            "ring-1 ring-slate-200/50 transition hover:bg-white/70 hover:shadow-md";

        return (
            <article key={cc.id} className={`flex flex-col ${cardShell}`}>
                <div className="flex flex-1 flex-col p-6 md:p-7">
                    <div className="flex items-start justify-between gap-3">
                        {/* Title is the ONLY thing that is bigger; keep it normal weight */}
                        <h3 className="line-clamp-2 text-lg sm:text-xl md:text-2xl font-normal text-slate-700 leading-snug">
                            {cc.title}
                        </h3>

                        <span
                            className={`hidden sm:inline-flex items-center rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ${contest.badgeClass}`}
                            title="Contest status"
                        >
                            {contest.label}
                        </span>
                    </div>

                    <p className="mt-3 line-clamp-4 text-sm sm:text-base md:text-[17px] text-slate-600 leading-relaxed">
                        {truncateText(cc.description || "", 260)}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-100/60 px-3.5 py-2 text-xs sm:text-sm md:text-base text-slate-600">
                            <FiTag size={14} />
                            <span>Category:</span>
                            <span>{category}</span>
                        </span>

                        <span
                            className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ${difficultyColor}`}
                        >
                            <span className="mr-1">Difficulty:</span>
                            <span>{difficulty}</span>
                        </span>

                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base font-normal ${groupBadgeClass}`}
                            title={isGroupOnly ? "Group-only competition" : "Open competition"}
                        >
                            <FiUsers size={16} />
                            {isGroupOnly ? "GROUP" : "INDIVIDUAL"}
                        </span>

                        <span className={`sm:hidden inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-normal ${contest.badgeClass}`}>
                            {contest.label}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/40 bg-white/40 px-6 md:px-7 py-4 backdrop-blur-xl">
                    {isGroupOnly && !canParticipate ? (
                        <div className="inline-flex items-center gap-2 text-sm sm:text-base md:text-lg font-normal text-slate-600">
                            <FiUsers size={18} />
                            <span>Please create or join a group to participate.</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate(`/compete/${cc.id}`)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-blue-50/70 px-5 py-2.5 text-sm sm:text-base md:text-lg font-normal text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                            aria-label={`Participate in competition challenge ${cc.title}`}
                        >
                            <FiEye size={18} />
                            <span>Participate</span>
                        </button>
                    )}

                    <span className="text-xs sm:text-sm md:text-base text-slate-600">
                        Access: <span className="text-slate-600">{isGroupOnly ? "Group" : "Open"}</span>
                    </span>
                </div>
            </article>
        );
    };

    const filtersActive = useMemo(() => {
        return Boolean(
            categoryFilter ||
            difficultyFilter ||
            debouncedSearch.trim() ||
            statusFilter !== "ALL" ||
            groupFilter !== "ALL" ||
            contestNameFilter !== "ALL" ||
            contestTypeFilter !== "ALL"
        );
    }, [
        categoryFilter,
        difficultyFilter,
        debouncedSearch,
        statusFilter,
        groupFilter,
        contestNameFilter,
        contestTypeFilter,
    ]);

    // Tag chip: no bold, no black backgrounds; pleasant blue when active
    const tagClass = (active: boolean) =>
        [
            "rounded-full border px-3 py-1 text-xs sm:text-sm font-normal transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white/70",
            active
                ? "border-blue-200/70 bg-blue-50 text-blue-700"
                : "border-slate-200/70 bg-white/70 text-slate-600 hover:bg-white/90",
        ].join(" ");

    const renderContestGroup = (g: ContestGroup, accent: "emerald" | "sky" | "slate") => {
        const chip =
            accent === "emerald"
                ? "border-emerald-200/70 bg-emerald-100/70 text-emerald-700"
                : accent === "sky"
                    ? "border-sky-200/70 bg-sky-100/70 text-sky-700"
                    : "border-slate-200/70 bg-slate-100/70 text-slate-600";

        return (
            <section key={g.contestId} className="space-y-6">
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-90" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-normal text-slate-700 tracking-tight">
                                {g.contestName}
                            </h3>

                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm md:text-base font-normal ${chip}`}>
                                {g.entries.length} challenge{g.entries.length === 1 ? "" : "s"}
                            </span>

                            {g.contestType && (
                                <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-slate-600">
                                    {(g.contestType || "").toUpperCase()}
                                </span>
                            )}
                        </div>

                        {(g.timingPrimary || g.timingSecondary) && (
                            <div className="mt-1 text-sm sm:text-base text-slate-600">
                                {g.timingPrimary ? <span className="mr-3">{g.timingPrimary}</span> : null}
                                {g.timingSecondary ? <span>{g.timingSecondary}</span> : null}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {g.entries.map((e) => renderChallengeCard(e))}
                </div>
            </section>
        );
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar />

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full">
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            {/* Title only: bigger; no bold; avoid slate-900 */}
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-slate-700 tracking-tight">
                                Competition Challenges
                            </h1>
                        </div>

                        {filtersActive && (
                            <div className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                <FiFilter />
                                <span>Filters active</span>
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="ml-1 rounded-xl border border-slate-200/70 bg-white/70 px-2 py-1 text-xs font-normal text-slate-600 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                >
                                    Reset
                                </button>
                            </div>
                        )}
                    </header>

                    {/* Filters panel */}
                    <section className="mb-6 rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        <div className="px-4 py-4 space-y-3">
                            {/* Row 1 */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="min-w-[260px] flex-1 max-w-[720px]">
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
                                        className="h-10 w-full rounded-xl border border-slate-200/70 bg-white px-4 text-sm sm:text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                        className="h-10 w-[190px] rounded-xl border border-slate-200/70 bg-white px-3 pr-9 text-sm sm:text-base text-slate-700 shadow-sm hover:bg-slate-50/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
                                    className="h-10 shrink-0 rounded-xl border border-slate-200/70 bg-white/80 px-4 text-sm sm:text-base font-normal text-slate-600 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                >
                                    Reset
                                </button>

                                <div
                                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 text-sm sm:text-base text-slate-600"
                                    aria-live="polite"
                                >
                                    <span className="text-slate-500">Total:</span>
                                    <span className="ml-2 text-slate-600">{total}</span>
                                </div>
                            </div>

                            {/* Row 2: Tag filters */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Difficulty */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">Difficulty</span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDifficultyFilter("");
                                            setPage(1);
                                        }}
                                        className={tagClass(!difficultyFilter)}
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
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>

                                <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1" />

                                {/* Status */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">Status</span>
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
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1" />

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">Contest type</span>
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
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <span className="hidden sm:inline-block h-5 w-px bg-slate-200/70 mx-1" />

                                {/* Participation */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="mr-2 text-xs sm:text-sm text-slate-600 underline underline-offset-4 decoration-slate-300">Participation</span>
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
                                            >
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>


                        </div>
                    </section>

                    {loading && (
                        <div className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            Loading competition challenges...
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-rose-700 shadow-sm backdrop-blur-xl">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div className="rounded-2xl border border-white/30 bg-white/55 px-6 py-12 text-center text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <div className="text-base md:text-lg font-normal text-slate-700">No matches</div>
                                    <div className="mt-1 text-sm md:text-base text-slate-600">
                                        No competition challenges match your filters. Try resetting or broadening your search.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-12">
                                        {groupedOngoing.length > 0 && (
                                            <section className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-sm sm:text-base md:text-lg font-normal uppercase tracking-wide text-emerald-700">
                                                            Ongoing Contests
                                                        </h2>
                                                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-emerald-700">
                                                            LIVE: {byStatus.ongoing.length}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm sm:text-base text-slate-600">Grouped by contest name.</p>
                                                </div>

                                                <div className="space-y-10">{groupedOngoing.map((g) => renderContestGroup(g, "emerald"))}</div>
                                            </section>
                                        )}

                                        {groupedUpcoming.length > 0 && (
                                            <section className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-sm sm:text-base md:text-lg font-normal uppercase tracking-wide text-sky-700">
                                                            Upcoming Contests
                                                        </h2>
                                                        <span className="inline-flex items-center rounded-full border border-sky-200/70 bg-sky-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-sky-700">
                                                            {byStatus.upcoming.length} upcoming
                                                        </span>
                                                    </div>
                                                    <p className="text-sm sm:text-base text-slate-600">Grouped by contest name.</p>
                                                </div>

                                                <div className="space-y-10">{groupedUpcoming.map((g) => renderContestGroup(g, "sky"))}</div>
                                            </section>
                                        )}

                                        {groupedOthers.length > 0 && (
                                            <section className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-sm sm:text-base md:text-lg font-normal uppercase tracking-wide text-slate-600">
                                                            Other Challenges
                                                        </h2>
                                                        <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-normal text-slate-600">
                                                            {byStatus.others.length} listed
                                                        </span>
                                                    </div>
                                                    <p className="text-sm sm:text-base text-slate-600">Grouped by contest name.</p>
                                                </div>

                                                <div className="space-y-10">{groupedOthers.map((g) => renderContestGroup(g, "slate"))}</div>
                                            </section>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-600 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            >
                                                Prev
                                            </button>
                                            <span className="text-sm sm:text-base md:text-lg text-slate-600">
                                                Page <span className="text-slate-600">{page}</span> of{" "}
                                                <span className="text-slate-600">{pageCount}</span>
                                            </span>
                                            <button
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-sm sm:text-base font-normal text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-normal text-slate-600">Per page</span>
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
                                                    className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-sm sm:text-base md:text-lg text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-slate-600">
                                                Showing{" "}
                                                <span className="text-slate-600">
                                                    {total === 0 ? 0 : (page - 1) * pageSize + 1}
                                                </span>{" "}
                                                –{" "}
                                                <span className="text-slate-600">{Math.min(page * pageSize, total)}</span> of{" "}
                                                <span className="text-slate-600">{total}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CompetitionList;
