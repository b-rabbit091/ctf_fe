// src/pages/CompetePage/CompetitionList.tsx
import React, {useCallback, useEffect, useMemo, useState} from "react";
import Navbar from "../../components/Navbar";
import {getChallenges, getCategories, getDifficulties} from "./api";
import {useNavigate} from "react-router-dom";
import {FiEye, FiUsers} from "react-icons/fi";
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

interface ContestMeta {
    label: string;
    badgeClass: string;
    timingPrimary: string | null;
    timingSecondary: string | null;
    status: ContestStatus;
}

function getContestMeta(challenge: Challenge): ContestMeta {
    const activeContest = (challenge as any).active_contest ?? null;

    const baseNone: ContestMeta = {
        label: "NO CONTEST",
        badgeClass: "bg-slate-50 text-slate-500 border-slate-100",
        timingPrimary: null,
        timingSecondary: null,
        status: "NONE",
    };

    if (!activeContest) return baseNone;

    const nowMs = Date.now();
    const start = new Date(activeContest.start_time);
    const end = new Date(activeContest.end_time);
    const startMs = start.getTime();
    const endMs = end.getTime();

    if (nowMs < startMs) {
        return {
            label: "UPCOMING",
            badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
            timingPrimary: `Contest Opens: ${start.toLocaleString()}`,
            timingSecondary: `Contest Ends: ${end.toLocaleString()}`,
            status: "UPCOMING",
        };
    } else if (nowMs >= startMs && nowMs < endMs) {
        return {
            label: "ONGOING",
            badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
            timingPrimary: null,
            timingSecondary: null,
            status: "ONGOING",
        };
    }

    return {
        label: "ENDED",
        badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
        timingPrimary: null,
        timingSecondary: null,
        status: "ENDED",
    };
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

    //  NEW: group competition filter
    const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(9);
    const pageSizeOptions = [6, 9, 12, 24];
    const STATUS_OPTIONS: { key: ContestStatus | "ALL"; label: string }[] = [
        {key: "ALL", label: "All"},
        {key: "ONGOING", label: "Ongoing"},
        {key: "UPCOMING", label: "Upcoming"},
        {key: "ENDED", label: "Ended"},
        {key: "NONE", label: "No contest"},
    ];


    /** Fetch initial data */
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

    /** Filtered + searched challenges */
    const filteredChallenges = useMemo(() => {
        const searchLower = debouncedSearch.trim().toLowerCase();

        return allChallenges.filter((c: any) => {
            // existing filters
            if (categoryFilter && c.category?.name !== categoryFilter) return false;
            if (difficultyFilter && c.difficulty?.level !== difficultyFilter) return false;

            // existing status filter
            if (statusFilter !== "ALL") {
                const meta = getContestMeta(c);
                if (meta.status !== statusFilter) return false;
            }

            //  NEW: group filter
            // - GROUP_ONLY: only challenges where group_only = true
            // - SOLO_ONLY: only challenges where group_only = false
            if (groupFilter === "GROUP_ONLY" && !c.group_only) return false;
            if (groupFilter === "SOLO_ONLY" && c.group_only) return false;

            // existing search
            if (!searchLower) return true;

            const title = (c.title || "").toLowerCase();
            const desc = (c.description || "").toLowerCase();
            const cat = (c.category?.name || "").toLowerCase();

            return title.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower);
        });
    }, [allChallenges, categoryFilter, difficultyFilter, debouncedSearch, statusFilter, groupFilter]);

    /** Pagination */
    const total = filteredChallenges.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [pageCount, page]);

    const currentPageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredChallenges.slice(start, start + pageSize);
    }, [filteredChallenges, page, pageSize]);

    /** Group current page by contest status (for layout only) */
    const groupedChallenges = useMemo(() => {
        const result = {
            ongoing: [] as { challenge: Challenge; contest: ContestMeta }[],
            upcoming: [] as { challenge: Challenge; contest: ContestMeta }[],
            others: [] as { challenge: Challenge; contest: ContestMeta }[],
        };

        currentPageItems.forEach((c) => {
            const meta = getContestMeta(c);
            if (meta.status === "ONGOING") result.ongoing.push({challenge: c, contest: meta});
            else if (meta.status === "UPCOMING") result.upcoming.push({challenge: c, contest: meta});
            else result.others.push({challenge: c, contest: meta});
        });

        return result;
    }, [currentPageItems]);

    const handleClearFilters = useCallback(() => {
        setCategoryFilter("");
        setDifficultyFilter("");
        setSearch("");
        setStatusFilter("ALL");
        setGroupFilter("ALL"); //  reset
        setPage(1);
    }, []);

    const onPageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pageCount) return;
        setPage(newPage);
        window.scrollTo({top: 0, behavior: "smooth"});
    };

    const renderChallengeCard = ({
                                     challenge: c,
                                     contest,
                                 }: {
        challenge: Challenge;
        contest: ContestMeta;
    }) => {
        const cc: any = c; // to access backend-added fields safely
        const difficulty = cc.difficulty?.level || "N/A";
        const category = cc.category?.name || "N/A";

        const isGroupOnly = !!cc.group_only;
        const canParticipate = cc.can_participate !== undefined ? !!cc.can_participate : true;

        const difficultyColor =
            difficulty.toLowerCase() === "easy"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : difficulty.toLowerCase() === "Moderate"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : difficulty.toLowerCase() === "hard"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-slate-50 text-slate-600 border-slate-100";

        const groupBadgeClass = isGroupOnly
            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
            : "bg-slate-50 text-slate-600 border-slate-100";

        return (
            <article
                key={cc.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
                <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 text-sm md:text-base font-semibold text-slate-900">
                            {cc.title}
                        </h2>
                    </div>

                    <p className="mt-2 line-clamp-4 text-xs text-slate-600">
                        {truncateText(cc.description || "", 200)}
                    </p>

                    <div className="mt-3 flex flex-col gap-1 text-[11px]">
                        <div className="flex flex-wrap items-center gap-2">
              <span
                  className="inline-flex items-center rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-slate-600">
                <span className="mr-1 font-medium">Category:</span>
                  {category}
              </span>

                            <span
                                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${difficultyColor}`}
                            >
                <span className="mr-1 font-medium">Difficulty:</span>
                                {difficulty}
              </span>

                            <span
                                className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold tracking-wide ${contest.badgeClass}`}
                            >
                {contest.label}
              </span>

                            {/*  Group-only badge */}
                            <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${groupBadgeClass}`}
                                title={isGroupOnly ? "Group-only competition" : "Open competition"}
                            >
                <FiUsers size={14}/>
                                {isGroupOnly ? "GROUP" : "INDIVIDUAL"}
              </span>
                        </div>

                        {(contest.timingPrimary || contest.timingSecondary) && (
                            <div className="mt-1 flex flex-col text-[11px] text-slate-500">
                                {contest.timingPrimary && <span>{contest.timingPrimary}</span>}
                                {contest.timingSecondary && <span>{contest.timingSecondary}</span>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    {/*  RULE:
              - if group_only && !can_participate -> show "Group competition" text, no View button
              - else -> show View button (existing behavior)
          */}
                    {isGroupOnly && !canParticipate ? (
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                            <FiUsers size={16}/>
                            <span>Please create or a join a group.</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate(`/compete/${cc.id}`)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                            aria-label={`View competition challenge ${cc.title}`}
                        >
                            <FiEye size={16}/>
                            <span>PARTICIPATE</span>
                        </button>
                    )}
                </div>
            </article>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Navbar/>

            <main className="w-full px-4 py-8">
                <div className="mx-auto">
                    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                                Competition Challenges
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Join time-bound contests and compete on curated problems.
                            </p>
                        </div>
                    </header>

                    {/* Filters panel */}

                    <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* Top row: LeetCode-like toolbar */}
                        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                            {/* Left: Search */}
                            <div className="flex w-full items-center gap-3 md:w-auto">
                                <div className="relative w-full md:w-[360px]">
                                    <input
                                        type="search"
                                        placeholder="Search challenges..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />

                                </div>
                            </div>

                            {/* Right: dropdowns + reset + total */}
                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                {/* Difficulty (LeetCode-like select) */}
                                <div className="relative">
                                    <select
                                        value={difficultyFilter}
                                        onChange={(e) => {
                                            setDifficultyFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Difficulty</option>
                                        {difficulties.map((diff) => (
                                            <option key={diff.id} value={diff.level}>
                                                {diff.level}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category */}
                                <div className="relative">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => {
                                            setCategoryFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status */}
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value as ContestStatus | "ALL");
                                            setPage(1);
                                        }}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="ALL">Status</option>
                                        <option value="ONGOING">Ongoing</option>
                                        <option value="UPCOMING">Upcoming</option>
                                        <option value="ENDED">Ended</option>
                                        <option value="NONE">No contest</option>
                                    </select>
                                </div>

                                {/* Group */}
                                <div className="relative">
                                    <select
                                        value={groupFilter}
                                        onChange={(e) => {
                                            setGroupFilter(e.target.value as GroupFilter);
                                            setPage(1);
                                        }}
                                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="ALL">Participation</option>
                                        <option value="GROUP_ONLY">Group only</option>
                                        <option value="SOLO_ONLY">Open</option>
                                    </select>
                                </div>

                                {/* Clear */}
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    Reset
                                </button>

                                {/* Total */}
                                <span
                                    className="ml-1 inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
        <span className="text-slate-500">Total:</span>
        <span className="ml-1 font-semibold text-slate-900">{total}</span>
      </span>
                            </div>
                        </div>

                        {/* Bottom row: LeetCode-style “chip” quick filters (optional but looks pro) */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5">
                            {/* Difficulty chips */}
                            {["Easy", "Moderate", "Hard"].map((lvl) => {
                                const active = difficultyFilter === lvl;
                                return (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => {
                                            setDifficultyFilter(active ? "" : lvl);
                                            setPage(1);
                                        }}
                                        className={[
                                            "rounded-full border px-3 py-1 text-xs",
                                            active
                                                ? "border-slate-900 bg-slate-900 text-white"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                        ].join(" ")}
                                    >
                                        {lvl}
                                    </button>
                                );
                            })}

                            <span className="mx-1 h-5 w-px bg-slate-200"/>


                            {STATUS_OPTIONS.map((opt) => {
                                const active = statusFilter === opt.key;

                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => {
                                            setStatusFilter(opt.key);
                                            setPage(1);
                                        }}
                                        className={[
                                            "rounded-full border px-3 py-1 text-xs",
                                            active
                                                ? "border-slate-900 bg-slate-900 text-white"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                        ].join(" ")}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}

                        </div>
                    </section>


                    {/*    <section className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4 shadow-sm">*/}
                    {/*        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">*/}
                    {/*            <div className="flex flex-wrap items-center gap-3">*/}
                    {/*                <div className="relative">*/}
                    {/*                    <input*/}
                    {/*                        type="search"*/}
                    {/*                        placeholder="Search by title, description, category..."*/}
                    {/*                        value={search}*/}
                    {/*                        onChange={(e) => {*/}
                    {/*                            setSearch(e.target.value);*/}
                    {/*                            setPage(1);*/}
                    {/*                        }}*/}
                    {/*                        className="w-64 md:w-80 rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"*/}
                    {/*                    />*/}
                    {/*                </div>*/}

                    {/*                <select*/}
                    {/*                    value={categoryFilter}*/}
                    {/*                    onChange={(e) => {*/}
                    {/*                        setCategoryFilter(e.target.value);*/}
                    {/*                        setPage(1);*/}
                    {/*                    }}*/}
                    {/*                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"*/}
                    {/*                >*/}
                    {/*                    <option value="">All Categories</option>*/}
                    {/*                    {categories.map((cat) => (*/}
                    {/*                        <option key={cat.id} value={cat.name}>*/}
                    {/*                            {cat.name}*/}
                    {/*                        </option>*/}
                    {/*                    ))}*/}
                    {/*                </select>*/}

                    {/*                <select*/}
                    {/*                    value={difficultyFilter}*/}
                    {/*                    onChange={(e) => {*/}
                    {/*                        setDifficultyFilter(e.target.value);*/}
                    {/*                        setPage(1);*/}
                    {/*                    }}*/}
                    {/*                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"*/}
                    {/*                >*/}
                    {/*                    <option value="">All Difficulties</option>*/}
                    {/*                    {difficulties.map((diff) => (*/}
                    {/*                        <option key={diff.id} value={diff.level}>*/}
                    {/*                            {diff.level}*/}
                    {/*                        </option>*/}
                    {/*                    ))}*/}
                    {/*                </select>*/}

                    {/*                /!*  NEW: Group competition filter *!/*/}
                    {/*                <div className="flex flex-wrap items-center gap-1 text-[11px] md:text-xs">*/}
                    {/*                    <span className="mr-1 text-slate-500">Group:</span>*/}
                    {/*                    {[*/}
                    {/*                        { key: "ALL", label: "All" },*/}
                    {/*                        { key: "GROUP_ONLY", label: "Group only" },*/}
                    {/*                        { key: "SOLO_ONLY", label: "Open" },*/}
                    {/*                    ].map((opt) => {*/}
                    {/*                        const active = groupFilter === (opt.key as GroupFilter);*/}
                    {/*                        return (*/}
                    {/*                            <button*/}
                    {/*                                key={opt.key}*/}
                    {/*                                type="button"*/}
                    {/*                                onClick={() => {*/}
                    {/*                                    setGroupFilter(opt.key as GroupFilter);*/}
                    {/*                                    setPage(1);*/}
                    {/*                                }}*/}
                    {/*                                className={[*/}
                    {/*                                    "rounded-full border px-2.5 py-1",*/}
                    {/*                                    "transition-colors",*/}
                    {/*                                    active*/}
                    {/*                                        ? "border-slate-900 bg-slate-900 text-white"*/}
                    {/*                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",*/}
                    {/*                                ].join(" ")}*/}
                    {/*                            >*/}
                    {/*                                {opt.label}*/}
                    {/*                            </button>*/}
                    {/*                        );*/}
                    {/*                    })}*/}
                    {/*                </div>*/}

                    {/*                /!* Status filter *!/*/}
                    {/*                <div className="flex flex-wrap items-center gap-1 text-[11px] md:text-xs">*/}
                    {/*                    <span className="mr-1 text-slate-500">Status:</span>*/}
                    {/*                    {[*/}
                    {/*                        { key: "ALL", label: "All" },*/}
                    {/*                        { key: "ONGOING", label: "Ongoing" },*/}
                    {/*                        { key: "UPCOMING", label: "Upcoming" },*/}
                    {/*                        { key: "ENDED", label: "Ended" },*/}
                    {/*                        { key: "NONE", label: "No contest" },*/}
                    {/*                    ].map((opt) => {*/}
                    {/*                        const active = statusFilter === opt.key;*/}
                    {/*                        return (*/}
                    {/*                            <button*/}
                    {/*                                key={opt.key}*/}
                    {/*                                type="button"*/}
                    {/*                                onClick={() => {*/}
                    {/*                                    setStatusFilter(opt.key as ContestStatus | "ALL");*/}
                    {/*                                    setPage(1);*/}
                    {/*                                }}*/}
                    {/*                                className={[*/}
                    {/*                                    "rounded-full border px-2.5 py-1",*/}
                    {/*                                    "transition-colors",*/}
                    {/*                                    active*/}
                    {/*                                        ? "border-slate-900 bg-slate-900 text-white"*/}
                    {/*                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",*/}
                    {/*                                ].join(" ")}*/}
                    {/*                            >*/}
                    {/*                                {opt.label}*/}
                    {/*                            </button>*/}
                    {/*                        );*/}
                    {/*                    })}*/}
                    {/*                </div>*/}

                    {/*                <button*/}
                    {/*                    onClick={handleClearFilters}*/}
                    {/*                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-xs md:text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300"*/}
                    {/*                >*/}
                    {/*                    Clear*/}
                    {/*                </button>*/}
                    {/*            </div>*/}

                    {/*            <div className="flex items-center gap-3 text-xs text-slate-500">*/}
                    {/*<span className="rounded-full bg-slate-100 px-3 py-1">*/}
                    {/*  Total: <span className="font-medium">{total}</span>*/}
                    {/*</span>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*    </section>*/}

                    {/* Alerts / status */}
                    {loading && (
                        <div
                            className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                            Loading competition challenges...
                        </div>
                    )}
                    {error && (
                        <div
                            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
                            {error}
                        </div>
                    )}

                    {/* List */}
                    {!loading && !error && (
                        <>
                            {total === 0 ? (
                                <div
                                    className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center text-slate-500 shadow-sm">
                                    No competition challenges match your filters.
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-8">
                                        {groupedChallenges.ongoing.length > 0 && (
                                            <section>
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <div>
                                                        <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                                            Ongoing Contests
                                                        </h2>
                                                        <p className="text-xs text-slate-500">
                                                            Live contests currently accepting submissions.
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-emerald-700/80">
                            {groupedChallenges.ongoing.length} live
                          </span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                                    {groupedChallenges.ongoing.map((entry) => renderChallengeCard(entry))}
                                                </div>
                                            </section>
                                        )}

                                        {groupedChallenges.upcoming.length > 0 && (
                                            <section>
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <div>
                                                        <h2 className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                                                            Upcoming Contests
                                                        </h2>
                                                        <p className="text-xs text-slate-500">
                                                            Scheduled contests you can plan for in advance.
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-sky-700/80">
                            {groupedChallenges.upcoming.length} upcoming
                          </span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                                    {groupedChallenges.upcoming.map((entry) => renderChallengeCard(entry))}
                                                </div>
                                            </section>
                                        )}

                                        {groupedChallenges.others.length > 0 && (
                                            <section>
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <div>
                                                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                                                            Other Challenges
                                                        </h2>
                                                        <p className="text-xs text-slate-500">
                                                            Practice and past contests you can still solve.
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-slate-600/80">
                            {groupedChallenges.others.length} listed
                          </span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                                    {groupedChallenges.others.map((entry) => renderChallengeCard(entry))}
                                                </div>
                                            </section>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    <div
                                        className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onPageChange(page - 1)}
                                                disabled={page <= 1}
                                                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Prev
                                            </button>
                                            <span className="text-xs md:text-sm">
                        Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                                                <span className="font-semibold text-slate-900">{pageCount}</span>
                      </span>
                                            <button
                                                onClick={() => onPageChange(page + 1)}
                                                disabled={page >= pageCount}
                                                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                                            <div className="flex items-center gap-2">
                                                <span>Per page</span>
                                                <select
                                                    value={pageSize}
                                                    onChange={(e) => {
                                                        setPageSize(Number(e.target.value));
                                                        setPage(1);
                                                    }}
                                                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {pageSizeOptions.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="text-slate-500">
                                                Showing{" "}
                                                <span className="font-medium text-slate-900">
                          {total === 0 ? 0 : (page - 1) * pageSize + 1}
                        </span>{" "}
                                                –{" "}
                                                <span className="font-medium text-slate-900">
                          {Math.min(page * pageSize, total)}
                        </span>{" "}
                                                of <span className="font-medium text-slate-900">{total}</span>
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
