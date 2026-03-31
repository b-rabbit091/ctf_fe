import type {
    CategoryStat,
    ContestItem,
    DashboardOverviewResponse,
    DifficultyKey,
    DifficultyMap,
    RecentSubmission,
} from "./types";

type GenericRecord = Record<string, unknown>;

export const isObject = (v: unknown): v is GenericRecord =>
    v !== null && typeof v === "object" && !Array.isArray(v);

export const safeNumber = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

export const safeString = (v: unknown, fallback = ""): string =>
    typeof v === "string" ? v : fallback;

export const safeArray = <T,>(v: unknown, fallback: T[] = []): T[] =>
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
    const t = safeString(title, "").trim();
    return t || "Untitled";
};

export const normalizeDifficulty = (input: unknown): DifficultyMap => {
    const out: DifficultyMap = {Easy: 0, Medium: 0, Hard: 0};
    if (!isObject(input)) return out;

    (Object.keys(out) as DifficultyKey[]).forEach((k) => {
        out[k] = safeNumber(input[k], 0);
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

const toContestItem = (value: unknown): ContestItem => {
    const contest = isObject(value) ? value : {};
    return {
        id: safeNumber(contest.id, 0),
        name: safeString(contest.name, "Untitled"),
        slug: safeString(contest.slug, ""),
        description: safeString(contest.description, ""),
        contest_type: safeString(contest.contest_type, ""),
        start_time: safeString(contest.start_time, ""),
        end_time: safeString(contest.end_time, ""),
        is_active: Boolean(contest.is_active),
    };
};

const toCategoryStat = (value: unknown): CategoryStat => {
    const category = isObject(value) ? value : {};
    return {
        category_id: typeof category.category_id === "number" ? category.category_id : null,
        category: typeof category.category === "string" ? category.category : null,
        solved_count: safeNumber(category.solved_count, 0),
    };
};

const toRecentSubmission = (value: unknown): RecentSubmission => {
    const submission = isObject(value) ? value : {};
    const questionType = safeString(submission.question_type, "unknown");

    return {
        id: safeNumber(submission.id, 0),
        type: safeString(submission.type, "unknown"),
        challenge_id: safeNumber(submission.challenge_id, 0),
        challenge_title: typeof submission.challenge_title === "string" ? submission.challenge_title : null,
        question_type: questionType,
        contest_id: typeof submission.contest_id === "number" ? submission.contest_id : null,
        contest_name: typeof submission.contest_name === "string" ? submission.contest_name : null,
        status: typeof submission.status === "string" ? submission.status : null,
        submitted_at: safeString(submission.submitted_at, ""),
    };
};

export const normalizeDashboard = (raw: unknown): DashboardOverviewResponse => {
    const fb = fallbackDashboard();
    if (!isObject(raw)) return fb;

    const userRaw = isObject(raw.user) ? raw.user : {};
    const practiceRaw = isObject(raw.practice_stats) ? raw.practice_stats : {};
    const compRaw = isObject(raw.competition_stats) ? raw.competition_stats : {};
    const overallRaw = isObject(raw.overall_stats) ? raw.overall_stats : {};
    const contestsRaw = isObject(raw.contests) ? raw.contests : null;

    return {
        user: {
            id: safeNumber(userRaw.id, fb.user.id),
            username: safeString(userRaw.username, fb.user.username),
            email: safeString(userRaw.email, fb.user.email),
            role: safeString(userRaw.role, fb.user.role ?? ""),
            is_admin: Boolean(userRaw.is_admin),
            is_student: Boolean(userRaw.is_student),
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
            category_breakdown: safeArray(overallRaw.category_breakdown, []).map(toCategoryStat),
        },
        recent_submissions: safeArray(raw.recent_submissions, []).map(toRecentSubmission),
        contests: contestsRaw
            ? {
                ongoing: safeArray(contestsRaw.ongoing, []).map(toContestItem),
                upcoming: safeArray(contestsRaw.upcoming, []).map(toContestItem),
                recent_past: safeArray(contestsRaw.recent_past, []).map(toContestItem),
            }
            : fb.contests,
    };
};

export const dedupeSubmissions = (rows: RecentSubmission[]) => {
    const seen = new Set<string>();
    const out: RecentSubmission[] = [];
    for (const r of rows) {
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
