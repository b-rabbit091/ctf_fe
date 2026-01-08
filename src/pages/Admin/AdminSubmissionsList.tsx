import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
    getFlagSubmissions,
    getTextSubmissions,
    deleteSubmission,
    AdminFlagSubmission,
    AdminTextSubmission
} from "../../api/adminSubmissions";
import { FiTrash2, FiEye } from "react-icons/fi";

type AnySubmission = AdminFlagSubmission | AdminTextSubmission;

const AdminSubmissionsList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [submissions, setSubmissions] = useState<AnySubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const [typeFilter, setTypeFilter] = useState<"ALL" | "flag" | "text">("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [message, setMessage] = useState<string | null>(null);

    const [viewItem, setViewItem] = useState<AnySubmission | null>(null);

    useEffect(() => {
        if (!user || user.role !== "admin") {
            navigate("/dashboard");
            return;
        }

        let mounted = true;
        setLoading(true);

        Promise.all([getFlagSubmissions(), getTextSubmissions()])
            .then(([flags, texts]) => {
                if (!mounted) return;
                setSubmissions([...flags, ...texts]);
            })
            .catch(() => setError("Failed to load submissions."))
            .finally(() => setLoading(false));

        return () => {
            mounted = false;
        };
    }, [user, navigate]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return submissions.filter((s) => {
            if (typeFilter !== "ALL" && s.type !== typeFilter) return false;

            if (statusFilter !== "ALL" && s.status?.status !== statusFilter)
                return false;

            if (!query) return true;

            return (
                s.user.username.toLowerCase().includes(query) ||
                s.user.email.toLowerCase().includes(query) ||
                s.challenge.title.toLowerCase().includes(query)
            );
        });
    }, [submissions, search, typeFilter, statusFilter]);

    const handleDelete = async (s: AnySubmission) => {
        if (!window.confirm("Delete this submission?")) return;

        const backup = submissions;
        setSubmissions((prev) => prev.filter((x) => x.id !== s.id));
        setMessage("Deleting…");

        try {
            await deleteSubmission(s.id, s.type);
            setMessage("Deleted.");
        } catch {
            setMessage("Failed. Rolling back.");
            setSubmissions(backup);
        } finally {
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-slate-50 px-4 py-6">
                <div className="mx-auto max-w-6xl">
                    <header className="mb-5">
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Submissions Overview
                        </h1>
                        <p className="text-sm text-slate-500">
                            Monitor all flag + text submissions in the system.
                        </p>
                    </header>

                    {/* Filters */}
                    <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <input
                            type="text"
                            placeholder="Search username, email, challenge…"
                            className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                            className="rounded border border-slate-300 px-3 py-2 text-sm"
                            value={typeFilter}
                            onChange={(e) =>
                                setTypeFilter(e.target.value as "ALL" | "flag" | "text")
                            }
                        >
                            <option value="ALL">All Types</option>
                            <option value="flag">Flag</option>
                            <option value="text">Text</option>
                        </select>

                        <select
                            className="rounded border border-slate-300 px-3 py-2 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            {Array.from(new Set(submissions.map((s) => s.status.status))).map(
                                (st) => (
                                    <option key={st} value={st}>
                                        {st}
                                    </option>
                                )
                            )}
                        </select>

                        <div className="ml-auto text-xs text-slate-500">
                            Total: {filtered.length}
                        </div>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700 border border-red-200">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 rounded-md bg-blue-50 p-3 text-blue-700 border border-blue-200">
                            {message}
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="px-4 py-2 text-left">User</th>
                                <th className="px-4 py-2 text-left">Challenge</th>
                                <th className="px-4 py-2 text-left">Type</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {filtered.map((s) => (
                                <tr key={`${s.type}-${s.id}`}>
                                    <td className="px-4 py-2">
                                        <div className="font-medium">
                                            {s.user.username}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {s.user.email}
                                        </div>
                                    </td>

                                    <td className="px-4 py-2 text-slate-700">
                                        {s.challenge.title}
                                    </td>

                                    <td className="px-4 py-2 capitalize text-slate-700">
                                        {s.type}
                                    </td>

                                    <td className="px-4 py-2 text-slate-700">
                                        {s.status.status}
                                    </td>

                                    <td className="px-4 py-2 text-slate-500">
                                        {new Date(s.submitted_at).toLocaleString()}
                                    </td>

                                    <td className="px-4 py-2">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setViewItem(s)}
                                                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 flex items-center gap-1"
                                            >
                                                <FiEye size={14} /> View
                                            </button>

                                            <button
                                                onClick={() => handleDelete(s)}
                                                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1"
                                            >
                                                <FiTrash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* View Modal */}
                    {viewItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                            <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-6">
                                <h2 className="text-lg font-semibold mb-2">Submission</h2>
                                <p className="text-xs text-slate-500 mb-4">
                                    Submitted on:{" "}
                                    {new Date(viewItem.submitted_at).toLocaleString()}
                                </p>

                                <div className="border p-3 rounded bg-slate-50">
                                    {viewItem.type === "flag" ? (
                                        <pre className="text-sm text-slate-800 whitespace-pre-wrap">
                                            {viewItem.value}
                                        </pre>
                                    ) : (
                                        <pre className="text-sm text-slate-800 whitespace-pre-wrap">
                                            {viewItem.content}
                                        </pre>
                                    )}
                                </div>

                                <button
                                    className="mt-4 rounded bg-slate-800 px-4 py-2 text-white text-sm"
                                    onClick={() => setViewItem(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default AdminSubmissionsList;
