// src/pages/dashboard/utils.ts
import type {
    DashboardOverviewResponse,
    DifficultyKey,
    DifficultyMap,
    RecentSubmission,
    ContestItem,
} from "./types";

export const isObject = (v: unknown): v is Record<string, any> =>
    v !== null && typeof v === "object" && !Array.isArray(v);

export const safeNumber = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

export const safeString = (v: unknown, fallback = ""): string =>
    typeof v === "string" ? v : fallback;

export const safeArray = <T, >(v: unknown, fallback: T[] = []): T[] =>
    Array.isArray(v) ? (v as T[]) : fallback;

export const clamp = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, n));

export const pct = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

export const safeDate = (iso: unknown): Date | null => {
    if (typeof iso !== "string" || !iso.trim()) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (iso: unknown): string => {
    const d = safeDate(iso);
    return d ? d.toLocaleDateString() : "—";
};

export const formatDateTime = (iso: unknown): string => {
    const d = safeDate(iso);
    return d ? d.toLocaleString() : "—";
};

export const getInitial = (username: unknown): string => {
    const u = safeString(username, "").trim();
    return u ? u.charAt(0).toUpperCase() : "U";
};

export const safeUsername = (u: unknown): string => {
    if (typeof u !== "string") return "";
    const name = u.trim();
    if (!name) return "";
    return name.length > 32 ? `${name.slice(0, 32)}…` : name;
};


export const sanitizeTitle = (title: unknown): string => {
    // React escapes text by default; we just normalize + trim.
    const t = safeString(title, "").trim();
    return t || "Untitled";
};

export const normalizeDifficulty = (input: unknown): DifficultyMap => {
    const out: DifficultyMap = {Easy: 0, Medium: 0, Hard: 0};
    if (!isObject(input)) return out;

    (Object.keys(out) as DifficultyKey[]).forEach((k) => {
        out[k] = safeNumber((input as any)[k], 0);
    });
    return out;
};

export const fallbackDashboard = (): DashboardOverviewResponse => ({
    user: {
        id: 0,
        username: "User",
        email: "",
        role: "Student",
        is_admin: false,
        is_student: true,
        date_joined: "",
    },
    practice_stats: {
        total_solved: 0,
        total_attempted: 0,
        difficulty: {Easy: 0, Medium: 0, Hard: 0},
        solved_challenge_ids: [],
    },
    competition_stats: {
        total_solved: 0,
        total_attempted: 0,
        difficulty: {Easy: 0, Medium: 0, Hard: 0},
        solved_challenge_ids: [],
    },
    overall_stats: {
        total_solved: 0,
        total_attempted: 0,
        category_breakdown: [],
    },
    recent_submissions: [],
    contests: {ongoing: [], upcoming: [], recent_past: []},
});

export const normalizeDashboard = (raw: unknown): DashboardOverviewResponse => {
    const fb = fallbackDashboard();
    if (!isObject(raw)) return fb;

    const userRaw = isObject((raw as any).user) ? (raw as any).user : {};
    const practiceRaw = isObject((raw as any).practice_stats) ? (raw as any).practice_stats : {};
    const compRaw = isObject((raw as any).competition_stats) ? (raw as any).competition_stats : {};
    const overallRaw = isObject((raw as any).overall_stats) ? (raw as any).overall_stats : {};
    const contestsRaw = isObject((raw as any).contests) ? (raw as any).contests : null;

    const normalizeContest = (c: any): ContestItem => ({
        id: safeNumber(c?.id, 0),
        name: safeString(c?.name, "Untitled"),
        slug: safeString(c?.slug, ""),
        description: c?.description ?? "",
        contest_type: safeString(c?.contest_type, ""),
        start_time: safeString(c?.start_time, ""),
        end_time: safeString(c?.end_time, ""),
        is_active: !!c?.is_active,
    });

    return {
        user: {
            id: safeNumber(userRaw.id, fb.user.id),
            username: safeString(userRaw.username, fb.user.username),
            email: safeString(userRaw.email, fb.user.email),
            role: safeString(userRaw.role, fb.user.role ?? ""),
            is_admin: !!userRaw.is_admin,
            is_student: !!userRaw.is_student,
            date_joined: safeString(userRaw.date_joined, fb.user.date_joined),
        },
        practice_stats: {
            total_solved: safeNumber(practiceRaw.total_solved, 0),
            total_attempted: safeNumber(practiceRaw.total_attempted, 0),
            difficulty: normalizeDifficulty(practiceRaw.difficulty),
            solved_challenge_ids: safeArray<number>(practiceRaw.solved_challenge_ids, []),
        },
        competition_stats: {
            total_solved: safeNumber(compRaw.total_solved, 0),
            total_attempted: safeNumber(compRaw.total_attempted, 0),
            difficulty: normalizeDifficulty(compRaw.difficulty),
            solved_challenge_ids: safeArray<number>(compRaw.solved_challenge_ids, []),
        },
        overall_stats: {
            total_solved: safeNumber(overallRaw.total_solved, 0),
            total_attempted: safeNumber(overallRaw.total_attempted, 0),
            category_breakdown: safeArray<any>(overallRaw.category_breakdown, []).map((c) => ({
                category_id: c?.category_id ?? null,
                category: c?.category ?? null,
                solved_count: safeNumber(c?.solved_count, 0),
            })),
        },
        recent_submissions: safeArray<any>((raw as any).recent_submissions, []).map(
            (s): RecentSubmission => ({
                id: safeNumber(s?.id, 0),
                type: safeString(s?.type, "unknown"),
                challenge_id: safeNumber(s?.challenge_id, 0),
                challenge_title: s?.challenge_title ?? null,
                question_type: safeString(s?.question_type, "unknown"),
                contest_id: s?.contest_id ?? null,
                contest_name: s?.contest_name ?? null,
                status: s?.status ?? null,
                submitted_at: safeString(s?.submitted_at, ""),
            })
        ),
        contests: contestsRaw
            ? {
                ongoing: safeArray<any>(contestsRaw.ongoing, []).map(normalizeContest),
                upcoming: safeArray<any>(contestsRaw.upcoming, []).map(normalizeContest),
                recent_past: safeArray<any>(contestsRaw.recent_past, []).map(normalizeContest),
            }
            : fb.contests,
    };
};

export const dedupeSubmissions = (rows: RecentSubmission[]) => {
    const seen = new Set<string>();
    const out: RecentSubmission[] = [];
    for (const r of rows) {
        // Backend sometimes duplicates {type,id}; include timestamp to avoid collisions
        const key = `${r.type}-${r.id}-${r.submitted_at}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
    }
    return out;
};

export const statusPillClass = (status: string | null) => {
    const s = safeString(status, "").toLowerCase();
    if (s === "solved" || s === "correct") return "bg-emerald-50 text-emerald-700";
    if (s === "incorrect" || s === "wrong" || s === "failed") return "bg-rose-50 text-rose-700";
    return "bg-slate-100 text-slate-600";
};

export const contestState = (c: ContestItem) => {
    if (c.is_active) return {text: "Active", cls: "bg-emerald-50 text-emerald-700"};
    const now = Date.now();
    const start = safeDate(c.start_time)?.getTime();
    const end = safeDate(c.end_time)?.getTime();
    if (start && start > now) return {text: "Upcoming", cls: "bg-sky-50 text-sky-700"};
    if (end && end < now) return {text: "Ended", cls: "bg-slate-100 text-slate-600"};
    return {text: "Inactive", cls: "bg-slate-100 text-slate-600"};
};
