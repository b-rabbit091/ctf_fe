import React, { useState} from "react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {useAuth} from "../../contexts/AuthContext";
import {collectFieldErrors, normalizeApiError} from "../../utils/apiError";

const VerifyEmail: React.FC = () => {
    const [search] = useSearchParams();
    const token = search.get("token") || "";
    const {verifyEmailSetPassword} = useAuth();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState("");
    const navigate = useNavigate();

    const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);


    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setError("Invalid or missing token. Please use the verification link from your email.");
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
            await verifyEmailSetPassword(token, password, confirmPassword);
            setSuccessMessage("Password set successfully. Your account is now active.");
            setPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            const normalized = normalizeApiError(err, "Unable to verify your account.");
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
            <div className="absolute bottom-[14%] left-[12%] hidden h-40 w-40 rounded-full border border-[#006747]/10 bg-[#006747]/8 blur-sm lg:block" />

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
                                <div className="rounded-3xl border border-white/40 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006747]">Verification</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-600">Your email link confirms that you’re finishing account activation safely.</div>
                                </div>
                                <div className="rounded-3xl border border-white/40 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006747]">Password</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-600">Create and confirm the password you’ll use to sign in next.</div>
                                </div>
                                <div className="rounded-3xl border border-white/40 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006747]">Access</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-600">Once activated, you can enter labs, contests, and the learner dashboard.</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="w-full max-w-lg justify-self-center rounded-3xl border border-[#006747]/12 bg-white/95 p-6 shadow-[0_28px_90px_-36px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
                        <div className="mb-6 flex items-center justify-center gap-4">
                            <img
                                src="https://sso.nwmissouri.edu/adfs/portal/logo/logo.png?id=98124957C0CDEFFDBE90AF9EF19DB4BDA8EE87632170955806EE170BF250E5B6"
                                alt="Verify Email"
                                className="h-12 w-auto object-contain select-none sm:h-14"
                                draggable={false}
                            />
                        </div>

                        <div className="mb-6 text-center">

                            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Activate Account</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Set your password to complete verification and activate your account.
                            </p>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Create your password"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400"
                                />
                                {fieldErrors.password?.map((message) => (
                                    <p key={message} className="text-sm text-rose-700">{message}</p>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-700">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirm_password"
                                    name="confirm_password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Confirm your password"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400"
                                />
                                {fieldErrors.confirm_password?.map((message) => (
                                    <p key={message} className="text-sm text-rose-700">{message}</p>
                                ))}
                            </div>

                            {error ? (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    {error}
                                </div>
                            ) : null}

                            {successMessage ? (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    {successMessage}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={loading || !passwordsMatch || Boolean(successMessage)}
                                className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                                {loading ? "Activating account..." : "Activate Account"}
                            </button>

                            <div className="flex flex-col gap-2 pt-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                                {successMessage ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate("/login")}
                                        className="text-green-700 hover:underline"
                                    >
                                        Continue to login
                                    </button>
                                ) : null}
                                <Link to="/login" className="text-blue-600 hover:underline">
                                    Back to login
                                </Link>

                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
