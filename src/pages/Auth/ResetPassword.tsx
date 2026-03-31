import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ImSpinner8 } from "react-icons/im";
import { FiCheckCircle, FiKey, FiLock, FiShield } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import AuthShell from "../../components/auth/AuthShell";
import {normalizeApiError} from "../../utils/apiError";

const fieldClass =
    "w-full rounded-2xl border border-[#09684f]/10 bg-white/80 px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#09684f] focus:ring-4 focus:ring-[#09684f]/10";

const ResetPassword: React.FC = () => {
    const [search] = useSearchParams();
    const token = search.get("token") || "";
    const { resetPasswordWithToken } = useAuth();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const passwordsMatch = useMemo(
        () => Boolean(password && confirmPassword && password === confirmPassword),
        [password, confirmPassword]
    );

    const strength = useMemo(() => {
        const p = password || "";
        let score = 0;
        if (p.length >= 8) score += 1;
        if (p.length >= 12) score += 1;
        if (/[A-Z]/.test(p)) score += 1;
        if (/[0-9]/.test(p)) score += 1;
        if (/[^A-Za-z0-9]/.test(p)) score += 1;
        return Math.min(score, 5);
    }, [password]);

    const strengthLabel = useMemo(() => {
        if (!password) return "Waiting";
        if (strength <= 1) return "Weak";
        if (strength === 2) return "Fair";
        if (strength === 3) return "Good";
        if (strength === 4) return "Strong";
        return "Excellent";
    }, [password, strength]);

    const progress = useMemo(() => {
        let total = 0;
        if (token) total += 1;
        if (password) total += 1;
        if (confirmPassword) total += 1;
        if (passwordsMatch) total += 1;
        if (strength >= 3) total += 1;
        return Math.round((total / 5) * 100);
    }, [token, password, confirmPassword, passwordsMatch, strength]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Invalid or missing token. Please use the link from your email.");
            return;
        }
        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            await resetPasswordWithToken(token, password, confirmPassword);
            navigate("/login");
        } catch (err: unknown) {
            setError(normalizeApiError(err, "Unable to reset password.").message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            badge="Set New Password"
            title="Create a fresh password and move straight back into your coursework."
            subtitle="This screen is tuned for clear recovery: visible progress, simple password guidance, and layouts that scale cleanly across devices."
            panelTitle="Secure your account again"
            panelBody="Choose a strong new password. Once confirmed, you’ll be sent back to login and can continue learning without losing progress."
            progressLabel="Reset Progress"
            progressValue={progress}
            footer={
                <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <Link to="/login" className="font-semibold text-[#09684f] hover:underline">
                        Back to login
                    </Link>
                    <p className="text-slate-500">Use at least 8 characters and mix different character types.</p>
                </div>
            }
        >
            <form onSubmit={submit} className="flex h-full flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[28px] border border-[#09684f]/10 bg-white/75 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7f2] text-[#09684f]">
                                <FiShield />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-900">Password strength</div>
                                <div className="text-sm text-slate-600">{strengthLabel}</div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-[28px] border border-[#d8c6a8] bg-[#fcf7eb] p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-[#7d5a1f]">
                                <FiCheckCircle />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-900">Match status</div>
                                <div className="text-sm text-slate-600">{confirmPassword ? (passwordsMatch ? "Passwords match" : "Need to match") : "Waiting for confirmation"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <FiLock className="text-[#09684f]" />
                        New password
                    </span>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Create a strong password"
                        className={fieldClass}
                    />
                </label>

                <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <FiKey className="text-[#09684f]" />
                        Confirm password
                    </span>
                    <input
                        id="confirm_password"
                        name="confirm_password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Re-enter your password"
                        className={fieldClass}
                    />
                </label>

                {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
                {!token ? (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Missing token. Please open the password reset link from your email.
                    </p>
                ) : null}

                <button
                    type="submit"
                    disabled={loading || !passwordsMatch}
                    className="mt-auto inline-flex w-full items-center justify-center rounded-2xl bg-[#09684f] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0b7d5f] disabled:opacity-60"
                >
                    {loading ? (
                        <>
                            <ImSpinner8 className="mr-2 animate-spin" />
                            Securing your account...
                        </>
                    ) : (
                        "Save new password"
                    )}
                </button>
            </form>
        </AuthShell>
    );
};

export default ResetPassword;
