import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { ImSpinner8 } from "react-icons/im";
import { FaShieldAlt, FaCheckCircle, FaTimesCircle, FaLock } from "react-icons/fa";

const ResetPassword: React.FC = () => {
    const [search] = useSearchParams();
    const token = search.get("token") || "";
    const { verifyEmailSetPassword } = useAuth();

    const [password, setPassword] = useState("");
    const [confirm_password, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const passwordsMatch = useMemo(
        () => Boolean(password && confirm_password && password === confirm_password),
        [password, confirm_password]
    );

    // Simple, logical “strength” score (no extra deps)
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
        if (!password) return "Start typing…";
        if (strength <= 1) return "Weak";
        if (strength === 2) return "Okay";
        if (strength === 3) return "Good";
        if (strength === 4) return "Strong";
        return "Elite";
    }, [strength, password]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Invalid or missing token. Please use the link from your email.");
            return;
        }
        if (!passwordsMatch) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError("");
        try {
            await verifyEmailSetPassword(token, password, confirm_password);
            navigate("/login");
        } catch (err) {
            // handled via toast in context
        } finally {
            setLoading(false);
        }
    };

    const progress = useMemo(() => {
        // gamified “setup” progress
        let filled = 0;
        if (password) filled += 1;
        if (confirm_password) filled += 1;
        if (passwordsMatch) filled += 1;
        if (strength >= 3) filled += 1;
        return Math.round((filled / 4) * 100);
    }, [password, confirm_password, passwordsMatch, strength]);

    return (
        <div className="min-h-screen w-full bg-white overflow-hidden">
            {/* NWMSU-style glow + subtle grid */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#006747]/15 blur-3xl" />
                <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
                        backgroundSize: "36px 36px",
                    }}
                />
            </div>

            <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10 sm:px-6">
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                    {/* LEFT: quest-style panel */}
                    <section className="rounded-3xl border border-[#006747]/15 bg-white/70 p-6 sm:p-8 backdrop-blur shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)]">
                        <div className="flex items-center gap-3">
                            <img
                                src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                                alt="Northwest Missouri State University"
                                className="h-12 w-12 object-contain"
                                draggable={false}
                            />
                            <div className="leading-tight">
                                <div className="text-sm font-bold text-[#006747]">
                                    NORTHWEST MISSOURI STATE UNIVERSITY
                                </div>
                                <div className="text-xs font-semibold text-[#006747]/90">
                                    Department of Computer Science
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#006747]/20 bg-white/70 px-3 py-1 text-xs font-semibold text-[#006747] backdrop-blur">
                            <FaShieldAlt />
                            Account Recovery Mission
                        </div>

                        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                            Set a new password
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Complete the steps below to secure your account and return to the cyber labs.
                        </p>

                        {/* Progress bar */}
                        <div className="mt-6 rounded-2xl border border-[#006747]/15 bg-white/70 p-4 backdrop-blur">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-900">Mission Progress</div>
                                <div className="text-sm font-semibold text-[#006747]">{progress}%</div>
                            </div>
                            <div className="mt-3 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[#006747] transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
                                    <FaLock className="text-[#006747]" />
                                    <span className="text-gray-700">Enter new password</span>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
                                    {strength >= 3 ? (
                                        <FaCheckCircle className="text-[#006747]" />
                                    ) : (
                                        <FaTimesCircle className="text-gray-400" />
                                    )}
                                    <span className="text-gray-700">Strength: {strengthLabel}</span>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
                                    {confirm_password ? (
                                        <FaCheckCircle className="text-[#006747]" />
                                    ) : (
                                        <FaTimesCircle className="text-gray-400" />
                                    )}
                                    <span className="text-gray-700">Confirm password</span>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
                                    {passwordsMatch ? (
                                        <FaCheckCircle className="text-[#006747]" />
                                    ) : (
                                        <FaTimesCircle className="text-gray-400" />
                                    )}
                                    <span className="text-gray-700">Passwords match</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 text-sm text-gray-600">
                            Remembered your password?{" "}
                            <Link to="/login" className="font-semibold text-[#006747] hover:underline">
                                Back to Sign In
                            </Link>
                        </div>
                    </section>

                    {/* RIGHT: form panel */}
                    <section className="rounded-3xl border border-[#006747]/15 bg-white/80 p-6 sm:p-8 backdrop-blur shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">New Credentials</h2>
                                <p className="mt-1 text-sm text-gray-600">Choose a strong password to continue.</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#006747]/15 bg-white px-3 py-2">
                                <FaShieldAlt className="text-[#006747]" />
                                <div className="text-xs leading-tight">
                                    <div className="font-semibold text-gray-900">Security Tip</div>
                                    <div className="text-gray-600">12+ chars recommended</div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submit} className="mt-6 space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Create a strong password"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#006747] focus:ring-4 focus:ring-[#006747]/10"
                                />

                                {/* Strength meter */}
                                <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                        <span>Password strength</span>
                                        <span className="font-semibold">{strengthLabel}</span>
                                    </div>
                                    <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[#006747] transition-all duration-300"
                                            style={{ width: `${(strength / 5) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-800">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirm_password"
                                    name="confirm_password"
                                    type="password"
                                    value={confirm_password}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Re-enter password"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#006747] focus:ring-4 focus:ring-[#006747]/10"
                                />
                            </div>

                            {/* Match indicator */}
                            {confirm_password && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm"
                                >
                                    {passwordsMatch ? (
                                        <div className="flex items-center gap-2 text-[#006747] font-semibold">
                                            <FaCheckCircle />
                                            Passwords match
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-500 font-semibold">
                                            <FaTimesCircle />
                                            Passwords do not match
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading || !passwordsMatch}
                                className="
                  w-full rounded-2xl px-4 py-3 text-sm font-bold text-white
                  bg-[#006747] hover:bg-[#00563a] transition-colors
                  disabled:opacity-60 flex items-center justify-center
                "
                            >
                                {loading ? (
                                    <>
                                        <ImSpinner8 className="animate-spin mr-2" />
                                        Securing account...
                                    </>
                                ) : (
                                    "Verify & Set Password"
                                )}
                            </button>

                            {!token && (
                                <p className="text-xs text-red-500">
                                    Missing token. Please open the password reset link from your email.
                                </p>
                            )}
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
