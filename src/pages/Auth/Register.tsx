import React, {useMemo, useState} from "react";
import {ImSpinner8} from "react-icons/im";
import {Link} from "react-router-dom";

import {useAuth} from "../../contexts/AuthContext";
import {collectFieldErrors, normalizeApiError} from "../../utils/apiError";

const Register: React.FC = () => {
    const {register} = useAuth();
    const [form, setForm] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successEmail, setSuccessEmail] = useState("");

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setForm((prev) => ({...prev, [name]: value}));
        setFormError("");
        setFieldErrors((prev) => ({...prev, [name]: []}));
    };

    const progress = useMemo(() => {
        const fields = [
            form.first_name.trim(),
            form.last_name.trim(),
            form.username.trim(),
            form.email.trim(),
        ];
        return Math.round((fields.filter(Boolean).length / fields.length) * 100);
    }, [form]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFormError("");
        setFieldErrors({});

        try {
            await register(form);
            setSuccessEmail(form.email);
            setForm({username: "", email: "", first_name: "", last_name: ""});
        } catch (err: unknown) {
            const normalized = normalizeApiError(err, "Registration failed.");
            const grouped = collectFieldErrors(normalized.messages);
            setFieldErrors(grouped.fieldErrors);
            setFormError(
                grouped.formErrors[0] ??
                (Object.keys(grouped.fieldErrors).length ? "Please fix the highlighted fields." : normalized.message)
            );
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
                <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_minmax(440px,560px)] lg:gap-14">
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
                                    <p className="text-sm font-medium tracking-wide text-[#006747]/70">
                                        Northwest Missouri State University
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
                                <div className="rounded-3xl border border-white/40 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006747]">Profile</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-600">Create your learner identity with just the essentials.</div>
                                </div>
                                <div className="rounded-3xl border border-white/40 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006747]">Verification</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-600">Finish activation through email before entering the platform.</div>
                                </div>
                                <div className="rounded-3xl border border-white/40 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#006747]">Learning</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-600">Move from onboarding straight into labs, contests, and rankings.</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="w-full max-w-xl justify-self-center rounded-3xl border border-[#006747]/12 bg-white/95 p-6 shadow-[0_28px_90px_-36px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
                        <div className="mb-6 flex items-center justify-center gap-4">
                            <img
                                src="https://sso.nwmissouri.edu/adfs/portal/logo/logo.png?id=98124957C0CDEFFDBE90AF9EF19DB4BDA8EE87632170955806EE170BF250E5B6"
                                alt="Register"
                                className="h-12 w-auto object-contain select-none sm:h-14"
                                draggable={false}
                            />
                        </div>

                        {successEmail ? (
                            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                                <div className="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                    Registration Complete
                                </div>
                                <h2 className="mt-6 text-3xl font-semibold text-slate-900">Thank you for registering</h2>
                                <p className="mt-4 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
                                    An email has been sent to <span className="font-semibold text-slate-900">{successEmail}</span> for verification.
                                </p>
                                <Link
                                    to="/login"
                                    className="mt-8 inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                                >
                                    Go to login
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 text-center">
                                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Create Account</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Register with your basic profile details to begin your workspace setup.
                                    </p>
                                </div>

                                <div className="mb-5 rounded-2xl border border-[#006747]/10 bg-[#f4faf6] px-4 py-3">
                                    <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                                        <span>Setup progress</span>
                                        <span className="text-[#006747]">{progress}%</span>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-[#006747] transition-all duration-300"
                                            style={{width: `${progress}%`}}
                                        />
                                    </div>
                                </div>

                                <form onSubmit={submit} className="space-y-5">
                                    {formError ? (
                                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                            {formError}
                                        </div>
                                    ) : null}

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label htmlFor="first_name" className="block text-sm font-medium text-slate-700">
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
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400"
                                            />
                                            {fieldErrors.first_name?.map((message) => (
                                                <p key={message} className="text-sm text-rose-700">{message}</p>
                                            ))}
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="last_name" className="block text-sm font-medium text-slate-700">
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
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400"
                                            />
                                            {fieldErrors.last_name?.map((message) => (
                                                <p key={message} className="text-sm text-rose-700">{message}</p>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                                            Username
                                        </label>
                                        <input
                                            id="username"
                                            name="username"
                                            type="text"
                                            value={form.username}
                                            onChange={onChange}
                                            required
                                            placeholder="Choose a username for the platform"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400"
                                        />
                                        {fieldErrors.username?.map((message) => (
                                            <p key={message} className="text-sm text-rose-700">{message}</p>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
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
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400"
                                        />
                                        {fieldErrors.email?.map((message) => (
                                            <p key={message} className="text-sm text-rose-700">{message}</p>
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                    >
                                        {loading ? (
                                            <>
                                                <ImSpinner8 className="mr-2 animate-spin" />
                                                Creating profile...
                                            </>
                                        ) : (
                                            "Create Account"
                                        )}
                                    </button>

                                    <div className="flex flex-col gap-2 pt-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                                        <Link to="/login" className="text-green-700 hover:underline">
                                            Click here to sign in
                                        </Link>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
