import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";

const VerifyEmail: React.FC = () => {
    const [search] = useSearchParams();
    const token = search.get("token") || "";
    const { verifyEmailSetPassword } = useAuth();
    const [password, setPassword] = useState("");
    const [confirm_password, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const passwordsMatch =
        password && confirm_password && password === confirm_password;

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
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
            // handled in context via toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e8f5f0] to-[#f9fdfb] p-6 relative overflow-hidden">
            {/* Decorative green blur */}
            <div className="absolute inset-0">
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#006747]/10 rounded-full blur-3xl"></div>
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#00a36c]/10 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-md w-full relative bg-white/90 p-8 rounded-xl shadow-lg border border-[#006747]/20 backdrop-blur-md z-10">
                {/* Logo and header */}
                <div className="flex items-center gap-4 mb-6">
                    <img
                        src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                        alt="Northwest Missouri State University"
                        width="60"
                        height="60"
                    />
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-[#006747] leading-tight">
                            NORTHWEST MISSOURI STATE UNIVERSITY
                        </h1>
                        <span className="text-sm text-[#006747]/90">
              Department of Computer Science
            </span>
                    </div>
                </div>

                <h2 className="text-xl font-semibold mb-4 text-[#006747] text-left">
                    Verify Your Email & Set Password
                </h2>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Custom styled inputs */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            New Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#006747] focus:border-[#006747] bg-white text-gray-800"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="confirm_password"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Confirm Password
                        </label>
                        <input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            value={confirm_password}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#006747] focus:border-[#006747] bg-white text-gray-800"
                        />
                    </div>

                    {/* Match indicator */}
                    {confirm_password && (
                        <motion.p
                            className={`text-sm ${
                                passwordsMatch ? "text-green-600" : "text-red-500"
                            }`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {passwordsMatch
                                ? "✅ Passwords match"
                                : "❌ Passwords do not match"}
                        </motion.p>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <Button
                        type="submit"
                        disabled={loading || !passwordsMatch}
                        className="bg-[#006747] hover:bg-[#00563a] text-white font-semibold px-4 py-2 rounded-md transition-all w-full"
                    >
                        {loading ? "Saving..." : "Set Password & Verify"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default VerifyEmail;
