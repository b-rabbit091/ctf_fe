import React, { useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import { ImSpinner8 } from "react-icons/im";
import { Link } from "react-router-dom";
import { FaShieldAlt, FaTrophy, FaBolt, FaCheckCircle } from "react-icons/fa";

const Register: React.FC = () => {
    const { register } = useAuth();
    const [form, setForm] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
    });
    const [loading, setLoading] = useState(false);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const progress = useMemo(() => {
        const fields = [
            form.username.trim(),
            form.email.trim(),
            form.first_name.trim(),
            form.last_name.trim(),
        ];
        const filled = fields.filter(Boolean).length;
        return Math.round((filled / fields.length) * 100);
    }, [form]);

    const rank = useMemo(() => {
        if (progress <= 25) return { name: "Novice", icon: <FaBolt /> };
        if (progress <= 50) return { name: "Apprentice", icon: <FaShieldAlt /> };
        if (progress <= 75) return { name: "Analyst", icon: <FaTrophy /> };
        return { name: "Ready", icon: <FaCheckCircle /> };
    }, [progress]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(form);
            toast.success("Registration successful!");
            setForm({ username: "", email: "", first_name: "", last_name: "" });
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full overflow-hidden bg-white">
            {/* Background glow + subtle grid */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#006747]/15 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
                        backgroundSize: "36px 36px",
                    }}
                />
            </div>

            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:py-0">
                {/* LEFT: Gamified intro */}
                <section className="lg:w-[52%]">
                    <div className="flex items-center gap-3">
                        <img
                            alt="Northwest Missouri State University"
                            src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                            className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
                            draggable={false}
                        />
                        <div className="leading-tight">
                            <div className="text-sm sm:text-base font-bold text-[#006747]">
                                NORTHWEST MISSOURI STATE UNIVERSITY
                            </div>
                            <div className="text-xs sm:text-sm font-semibold text-[#006747]/90">
                                Department of Computer Science
                            </div>
                        </div>
                    </div>

                    <div className="mt-7">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#006747]/20 bg-white/70 px-3 py-1 text-xs font-semibold text-[#006747] backdrop-blur">
                            <span className="h-2 w-2 rounded-full bg-[#006747]" />
                            Cyber Lab Onboarding
                        </div>

                        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                            Create your <span className="text-[#006747]">Bearcats</span> account
                        </h1>
                        <p className="mt-3 text-gray-600">
                            Start Practice Labs, join Competitions (Solo/Group), and climb the
                            Leaderboard — all powered by AI feedback.
                        </p>

                        {/* Progress / Rank */}
                        <div className="mt-6 rounded-2xl border border-[#006747]/15 bg-white/70 p-4 backdrop-blur">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-900">
                                    Profile Setup
                                </div>
                                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#006747]">
                                    <span className="text-base">{rank.icon}</span>
                                    {rank.name}
                                </div>
                            </div>

                            <div className="mt-3 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-[#006747] transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                                <span>{progress}% complete</span>
                                <span>Finish setup to unlock labs</span>
                            </div>

                            {/* Mini “perks” row */}
                            <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                                    <div className="text-xs font-semibold text-gray-900">Practice</div>
                                    <div className="text-[11px] text-gray-600">Question cards</div>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                                    <div className="text-xs font-semibold text-gray-900">Competition</div>
                                    <div className="text-[11px] text-gray-600">Solo / Group</div>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                                    <div className="text-xs font-semibold text-gray-900">Leaderboard</div>
                                    <div className="text-[11px] text-gray-600">Rank & badges</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT: Registration card (sleek, “game UI” vibe) */}
                <section className="mt-8 lg:mt-0 lg:w-[48%]">
                    <div className="rounded-3xl border border-[#006747]/15 bg-white/80 p-6 sm:p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                    Student Registration
                                </h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Create your profile to start the cyber labs.
                                </p>
                            </div>

                        </div>

                        <div className="mt-6">
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="first_name" className="block text-sm font-semibold text-gray-800">
                                            First Name
                                        </label>
                                        <input
                                            id="first_name"
                                            name="first_name"
                                            type="text"
                                            value={form.first_name}
                                            onChange={onChange}
                                            required
                                            placeholder="John"
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#006747] focus:ring-4 focus:ring-[#006747]/10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="last_name" className="block text-sm font-semibold text-gray-800">
                                            Last Name
                                        </label>
                                        <input
                                            id="last_name"
                                            name="last_name"
                                            type="text"
                                            value={form.last_name}
                                            onChange={onChange}
                                            required
                                            placeholder="Doe"
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#006747] focus:ring-4 focus:ring-[#006747]/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="username" className="block text-sm font-semibold text-gray-800">
                                        Username
                                    </label>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        value={form.username}
                                        onChange={onChange}
                                        required
                                        placeholder="Choose a handle (e.g., bearcat_anil)"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#006747] focus:ring-4 focus:ring-[#006747]/10"
                                    />
                                    <div className="text-[11px] text-gray-500">
                                        Tip: Use something you’d like to see on the leaderboard.
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-800">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={onChange}
                                        required
                                        placeholder="you@nwmissouri.edu"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#006747] focus:ring-4 focus:ring-[#006747]/10"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="
                    w-full rounded-2xl px-4 py-3 text-sm font-bold text-white
                    bg-[#006747] hover:bg-[#00563a] transition-colors
                    disabled:opacity-60 flex items-center justify-center
                  "
                                >
                                    {loading ? (
                                        <>
                                            <ImSpinner8 className="animate-spin mr-2" />
                                            Creating profile...
                                        </>
                                    ) : (
                                        "Start My Cyber Journey"
                                    )}
                                </button>
                            </form>

                            <div className="mt-5 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Already have an account?{" "}
                                    <Link to="/login" className="font-semibold text-[#006747] hover:underline">
                                        Sign in
                                    </Link>
                                </p>


                            </div>
                        </div>
                    </div>

                    {/* tiny footer */}
                    <div className="mt-4 text-center text-xs text-gray-500">
                        By registering, you agree to participate in ethical, educational cybersecurity labs.
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Register;
