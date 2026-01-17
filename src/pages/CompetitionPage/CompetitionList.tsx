// src/pages/CompetePage/CompetitionList.tsx
import React, {useCallback, useEffect, useMemo, useState} from "react";
import Navbar from "../../components/Navbar";
import {getChallenges, getCategories, getDifficulties} from "./api";
import {useNavigate} from "react-router-dom";
import {FiEye, FiUsers, FiTag, FiFilter} from "react-icons/fi";
import {Challenge} from "./types";

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
        badgeClass: "bg-slate-100/70 text-slate-700 border-slate-200",
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
            badgeClass: "bg-slate-100/70 text-slate-700 border-slate-200",
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
            badgeClass: "bg-sky-100/70 text-sky-800 border-sky-200",
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
            badgeClass: "bg-emerald-100/70 text-emerald-800 border-emerald-200",
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
        badgeClass: "bg-slate-100/70 text-slate-700 border-slate-200",
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
                    getChallenges({type: "competition"}),
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
            if (!seen.has(key)) seen.set(key, {
                name: ac.name,
                type: ac.contest_type ?? null,
                slug: ac.slug ?? null,
                id: ac.id
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

    const onPageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pageCount) return;
        setPage(newPage);
        window.scrollTo({top: 0, behavior: "smooth"});
    };

    const renderChallengeCard = ({challenge: c, contest}: { challenge: Challenge; contest: ContestMeta }) => {
        const cc: any = c;

        const difficulty = cc.difficulty?.level || "N/A";
        const category = cc.category?.name || "N/A";

        const isGroupOnly = !!cc.group_only;
        const canParticipate = cc.can_participate !== undefined ? !!cc.can_participate : true;

        const difficultyLower = String(difficulty || "").toLowerCase();

        const difficultyColor =
            difficultyLower === "easy"
                ? "bg-emerald-100/70 text-emerald-900 border-emerald-200"
                : difficultyLower === "medium"
                    ? "bg-amber-100/70 text-amber-900 border-amber-200"
                    : difficultyLower === "hard"
                        ? "bg-rose-100/70 text-rose-900 border-rose-200"
                        : "bg-slate-100/70 text-slate-800 border-slate-200";

        const groupBadgeClass = isGroupOnly
            ? "bg-indigo-100/70 text-indigo-900 border-indigo-200"
            : "bg-slate-100/70 text-slate-800 border-slate-200";

        // Bigger card (more padding + slightly larger type), still glassy + responsive
        const cardShell =
            "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl " +
            "ring-1 ring-slate-200/50 transition hover:bg-white/70 hover:shadow-md";

        return (
            <article key={cc.id} className={`flex flex-col ${cardShell}`}>
                <div className="flex flex-1 flex-col p-6 md:p-7">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 leading-snug">
                            {cc.title}
                        </h3>

                        <span
                            className={`hidden sm:inline-flex items-center rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base font-semibold ${contest.badgeClass}`}
                            title="Contest status"
                        >
                            {contest.label}
                        </span>
                    </div>

                    <p className="mt-3 line-clamp-4 text-sm sm:text-base md:text-[17px] text-slate-700 leading-relaxed">
                        {truncateText(cc.description || "", 260)}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <span
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/60 px-3.5 py-2 text-xs sm:text-sm md:text-base text-slate-800">
                            <FiTag size={14}/>
                            <span className="font-semibold">Category:</span>
                            <span className="font-medium">{category}</span>
                        </span>

                        <span
                            className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base ${difficultyColor}`}>
                            <span className="font-semibold mr-1">Difficulty:</span>
                            <span className="font-medium">{difficulty}</span>
                        </span>

                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs sm:text-sm md:text-base font-semibold ${groupBadgeClass}`}
                            title={isGroupOnly ? "Group-only competition" : "Open competition"}
                        >
                            <FiUsers size={16}/>
                            {isGroupOnly ? "GROUP" : "INDIVIDUAL"}
                        </span>

                        <span
                            className={`sm:hidden inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold ${contest.badgeClass}`}>
                            {contest.label}
                        </span>
                    </div>
                </div>

                <div
                    className="flex items-center justify-between border-t border-white/40 bg-white/40 px-6 md:px-7 py-4 backdrop-blur-xl">
                    {isGroupOnly && !canParticipate ? (
                        <div
                            className="inline-flex items-center gap-2 text-sm sm:text-base md:text-lg font-medium text-slate-800">
                            <FiUsers size={18}/>
                            <span>Please create or join a group to participate.</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate(`/compete/${cc.id}`)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-2.5 text-sm sm:text-base md:text-lg font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            aria-label={`Participate in competition challenge ${cc.title}`}
                        >
                            <FiEye size={18}/>
                            <span>Participate</span>
                        </button>
                    )}

                    <span className="text-xs sm:text-sm md:text-base text-slate-700">
                        Access: <span className="font-semibold">{isGroupOnly ? "Group" : "Open"}</span>
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

    const renderContestGroup = (g: ContestGroup, accent: "emerald" | "sky" | "slate") => {
        const chip =
            accent === "emerald"
                ? "border-emerald-200 bg-emerald-100/70 text-emerald-900"
                : accent === "sky"
                    ? "border-sky-200 bg-sky-100/70 text-sky-900"
                    : "border-slate-200 bg-slate-100/70 text-slate-900";

        return (
            <section key={g.contestId} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 truncate">
                                {g.contestName}
                            </h3>
                            <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm md:text-base font-semibold ${chip}`}>
                                {g.entries.length} challenge{g.entries.length === 1 ? "" : "s"}
                            </span>
                            {g.contestType && (
                                <span
                                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs sm:text-sm md:text-base font-semibold text-slate-800">
                                    {(g.contestType || "").toUpperCase()}
                                </span>
                            )}
                        </div>

                        {(g.timingPrimary || g.timingSecondary) && (
                            <div className="mt-1 text-sm sm:text-base text-slate-700">
                                {g.timingPrimary ? <span className="mr-3">{g.timingPrimary}</span> : null}
                                {g.timingSecondary ? <span>{g.timingSecondary}</span> : null}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bigger cards grid: fewer columns on large screens so each card is larger */}
                <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {g.entries.map((e) => renderChallengeCard(e))}
                </div>
            </section>
        );
    };

    return (
        <div
            className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans flex flex-col">
            <Navbar/>

            <main className="flex-1 w-full px-2 sm:px-3 md:px-5 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
                <div className="w-full">
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
                                Competition Challenges
                            </h1>
                        </div>

                        {filtersActive && (
                            <div
                                className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/55 px-3 py-2 text-sm text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                <FiFilter/>
                                <span className="font-semibold">Filters active</span>
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="ml-1 rounded-xl border border-slate-200 bg-white/60 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    Reset
                                </button>
                            </div>
                        )}
                    </header>

                    {/* Filters panel (LeetCode-like: search on left, compact filter row that wraps, mobile drawer-like stacking) */}
                    <section className="mb-6 rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                        <div className="px-4 py-4">
                            <div className="flex items-center gap-3">
                                {/* Search (fixed-ish, keeps left) */}
                                <div className="min-w-[260px] flex-1 max-w-[680px]">
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
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm sm:text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        aria-label="Search competition challenges"
                                    />
                                </div>

                                {/* Filters: ALWAYS horizontal. If not enough space -> horizontal scroll */}
                                <div className="min-w-0 flex-1">
                                    <div
                                        className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                        role="group"
                                        aria-label="Competition filters"
                                    >
                                        <label className="sr-only" htmlFor="difficulty-filter">Difficulty filter</label>
                                        <select
                                            id="difficulty-filter"
                                            value={difficultyFilter}
                                            onChange={(e) => {
                                                setDifficultyFilter(e.target.value);
                                                setPage(1);
                                            }}
                                            className="h-10 w-[160px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="">Difficulty</option>
                                            {difficulties.map((diff) => (
                                                <option key={diff.id} value={diff.level}>{diff.level}</option>
                                            ))}
                                        </select>

                                        <label className="sr-only" htmlFor="category-filter">Category filter</label>
                                        <select
                                            id="category-filter"
                                            value={categoryFilter}
                                            onChange={(e) => {
                                                setCategoryFilter(e.target.value);
                                                setPage(1);
                                            }}
                                            className="h-10 w-[170px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="">Category</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>

                                        <label className="sr-only" htmlFor="status-filter">Status filter</label>
                                        <select
                                            id="status-filter"
                                            value={statusFilter}
                                            onChange={(e) => {
                                                setStatusFilter(e.target.value as ContestStatus | "ALL");
                                                setPage(1);
                                            }}
                                            className="h-10 w-[150px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="ALL">Status</option>
                                            <option value="ONGOING">Ongoing</option>
                                            <option value="UPCOMING">Upcoming</option>
                                            <option value="ENDED">Ended</option>
                                            <option value="NONE">No contest</option>
                                        </select>

                                        <label className="sr-only" htmlFor="contest-type-filter">Contest type filter</label>
                                        <select
                                            id="contest-type-filter"
                                            value={contestTypeFilter}
                                            onChange={(e) => {
                                                setContestTypeFilter(e.target.value as ContestTypeFilter);
                                                setPage(1);
                                            }}
                                            className="h-10 w-[170px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="ALL">Contest type</option>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="custom">Custom</option>
                                        </select>

                                        <label className="sr-only" htmlFor="contest-name-filter">Contest name filter</label>
                                        <select
                                            id="contest-name-filter"
                                            value={contestNameFilter}
                                            onChange={(e) => {
                                                setContestNameFilter(e.target.value);
                                                setPage(1);
                                            }}
                                            className="h-10 w-[210px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="ALL">Contest</option>
                                            {contestOptions.map((c) => (
                                                <option key={`${c.name}-${c.type ?? ""}`} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>

                                        <label className="sr-only" htmlFor="participation-filter">Participation filter</label>
                                        <select
                                            id="participation-filter"
                                            value={groupFilter}
                                            onChange={(e) => {
                                                setGroupFilter(e.target.value as GroupFilter);
                                                setPage(1);
                                            }}
                                            className="h-10 w-[180px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm sm:text-base text-slate-900 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="ALL">Participation</option>
                                            <option value="GROUP_ONLY">Group only</option>
                                            <option value="SOLO_ONLY">Open</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={handleClearFilters}
                                            className="h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm sm:text-base font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            Reset
                                        </button>

                                        <div
                                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm sm:text-base text-slate-800"
                                            aria-live="polite"
                                        >
                                            <span className="text-slate-600">Total:</span>
                                            <span className="ml-2 font-semibold text-slate-900">{total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {loading && (
                        <div
                            className="mb-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                            Loading competition challenges...
                        </div>
                    )}
                    {error && (
                        <div
                            className="mb-4 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm sm:text-base md:text-lg text-red-900 shadow-sm backdrop-blur-xl">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div
                                    className="rounded-2xl border border-white/30 bg-white/55 px-6 py-12 text-center text-slate-700 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                    <div className="text-base md:text-lg font-semibold text-slate-900">No matches</div>
                                    <div className="mt-1 text-sm md:text-base text-slate-700">
                                        No competition challenges match your filters. Try resetting or broadening your
                                        search.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-12">
                                        {groupedOngoing.length > 0 && (
                                            <section className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-wide text-emerald-800">
                                                            Ongoing Contests
                                                        </h2>
                                                        <span
                                                            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-semibold text-emerald-900">
                                                            LIVE: {byStatus.ongoing.length}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm sm:text-base text-slate-700">Grouped by
                                                        contest name.</p>
                                                </div>

                                                <div className="space-y-10">
                                                    {groupedOngoing.map((g) => renderContestGroup(g, "emerald"))}
                                                </div>
                                            </section>
                                        )}

                                        {groupedUpcoming.length > 0 && (
                                            <section className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-wide text-sky-800">
                                                            Upcoming Contests
                                                        </h2>
                                                        <span
                                                            className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-semibold text-sky-900">
                                                            {byStatus.upcoming.length} upcoming
                                                        </span>
                                                    </div>
                                                    <p className="text-sm sm:text-base text-slate-700">Grouped by
                                                        contest name.</p>
                                                </div>

                                                <div className="space-y-10">
                                                    {groupedUpcoming.map((g) => renderContestGroup(g, "sky"))}
                                                </div>
                                            </section>
                                        )}

                                        {groupedOthers.length > 0 && (
                                            <section className="space-y-6">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-sm sm:text-base md:text-lg font-extrabold uppercase tracking-wide text-slate-800">
                                                            Other Challenges
                                                        </h2>
                                                        <span
                                                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/70 px-3 py-1 text-xs sm:text-sm md:text-base font-semibold text-slate-900">
                                                            {byStatus.others.length} listed
                                                        </span>
                                                    </div>
                                                    <p className="text-sm sm:text-base text-slate-700">Grouped by
                                                        contest name.</p>
                                                </div>

                                                <div className="space-y-10">
                                                    {groupedOthers.map((g) => renderContestGroup(g, "slate"))}
                                                </div>
                                            </section>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    <div
                                        className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/30 bg-white/55 px-5 py-4 text-sm sm:text-base md:text-lg text-slate-800 shadow-sm backdrop-blur-xl ring-1 ring-slate-200/50">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm sm:text-base font-semibold text-slate-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                Prev
                                            </button>
                                            <span className="text-sm sm:text-base md:text-lg">
                                                Page <span
                                                className="font-extrabold text-slate-900">{page}</span> of{" "}
                                                <span className="font-extrabold text-slate-900">{pageCount}</span>
                                            </span>
                                            <button
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm sm:text-base font-semibold text-slate-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Per page</span>
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
                                                    className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm sm:text-base md:text-lg text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-slate-700">
                                                Showing{" "}
                                                <span className="font-extrabold text-slate-900">
                                                    {total === 0 ? 0 : (page - 1) * pageSize + 1}
                                                </span>{" "}
                                                –{" "}
                                                <span
                                                    className="font-extrabold text-slate-900">{Math.min(page * pageSize, total)}</span> of{" "}
                                                <span className="font-extrabold text-slate-900">{total}</span>
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
