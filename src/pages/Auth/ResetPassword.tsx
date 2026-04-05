import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ImSpinner8 } from "react-icons/im";
import { FiCheckCircle, FiKey, FiLock, FiShield } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import {collectFieldErrors, normalizeApiError} from "../../utils/apiError";

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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState("");

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

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Invalid or missing token. Please use the link from your email.");
            setSuccessMessage("");
            return;
        }
        if (!passwordsMatch) {
            setError("Passwords do not match.");
            setFieldErrors({});
            setSuccessMessage("");
            return;
        }

        setLoading(true);
        setError("");
        setFieldErrors({});
        setSuccessMessage("");
        try {
            await resetPasswordWithToken(token, password, confirmPassword);
            setSuccessMessage("Password reset successfully. You can now sign in with your new password.");
            setPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            const normalized = normalizeApiError(err, "Unable to reset password.");
            const grouped = collectFieldErrors(normalized.messages);
            setFieldErrors(grouped.fieldErrors);
            setError(grouped.formErrors[0] ?? normalized.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#f4f8f5]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,103,71,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(22,163,74,0.12),_transparent_28%),linear-gradient(135deg,_#f4f8f5_0%,_#eef6f0_45%,_#f7faf8_100%)]" />
            <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, rgba(0,0,0,0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.7) 1px, transparent 1px)",
                    backgroundSize: "42px 42px",
                }}
            />
            <div className="absolute left-1/2 top-[-5rem] h-64 w-64 -translate-x-1/2 rounded-full bg-[#006747]/12 blur-3xl sm:h-80 sm:w-80" />
            <div className="absolute bottom-[-6rem] right-[-5rem] h-72 w-72 rounded-full bg-emerald-300/18 blur-3xl sm:h-96 sm:w-96" />

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-10">
                <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_minmax(420px,520px)] lg:gap-14">
                    <section className="hidden lg:block">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-4">
                                <img
                                    src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                                    alt="NW Missouri State"
                                    className="h-14 w-14 shrink-0 object-contain select-none"
                                    draggable={false}
                                />

                                <div>
                                    <h1 className="text-5xl font-bold tracking-tight text-[#006747]">
                                        Bearcat CTF
                                    </h1>
                                    <p className="text-sm font-medium text-[#006747]/70 tracking-wide">
                                        Northwest Missouri State University
                                    </p>
                                </div>
                            </div>



                            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4">


                                <div className="rounded-3xl border border-[#006747]/15 bg-white/80 p-4 shadow-sm backdrop-blur-md">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006747]">
                                        Reset
                                    </div>
                                    <div className="mt-2 text-sm leading-6 text-slate-600">
                                        Set a new password and regain access.
                                    </div>
                                </div>
                            </div>




                        </div>
                    </section>

                    <div className="w-full max-w-lg justify-self-center rounded-3xl border border-[#006747]/12 bg-white/95 p-6 shadow-[0_28px_90px_-36px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Set New Password</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Choose a strong password, confirm it, and continue to login.
                            </p>
                        </div>

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
                                {fieldErrors.password?.map((message) => (
                                    <p key={message} className="mt-2 text-sm text-rose-700">{message}</p>
                                ))}
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
                                {fieldErrors.confirm_password?.map((message) => (
                                    <p key={message} className="mt-2 text-sm text-rose-700">{message}</p>
                                ))}
                            </label>

                            {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
                            {successMessage ? (
                                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    {successMessage}
                                </p>
                            ) : null}
                            {!token ? (
                                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    Missing token. Please open the password reset link from your email.
                                </p>
                            ) : null}

                            <button
                                type="submit"
                                disabled={loading || !passwordsMatch || Boolean(successMessage)}
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

                            {successMessage ? (
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    className="text-center text-sm font-semibold text-[#09684f] hover:underline"
                                >
                                    Continue to login
                                </button>
                            ) : (
                                <Link to="/login" className="text-center text-sm font-semibold text-[#09684f] hover:underline">
                                    Back to login
                                </Link>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
