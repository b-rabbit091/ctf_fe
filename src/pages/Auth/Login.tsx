import React, {useEffect, useState} from "react";
import {useNavigate, Link} from "react-router-dom";
import {toast} from "react-toastify";
import {useAuth} from "../../contexts/AuthContext";
import {ImSpinner8} from "react-icons/im";

interface LoginForm {
    username: string;
    password: string;
}

const Login: React.FC = () => {
    const {login} = useAuth();
    const {user} = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState<LoginForm>({username: "", password: ""});
    const [loading, setLoading] = useState(false);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({...form, [e.target.name]: e.target.value});

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(form.username, form.password);
            toast.success("Welcome back!");
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role) {
            if (user.role === "admin") navigate("/admin-dashboard");
            else navigate("/dashboard");
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen w-full bg-white">
            {/* Mobile-first: stack. Desktop: 2 columns */}
            <div className="min-h-screen w-full flex flex-col lg:flex-row">
                {/* LEFT (hero) */}
                <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 py-4">
                        <img
                            alt="Northwest Missouri State University"
                            src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                            className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain shrink-0"
                        />

                        <div className="min-w-0 flex flex-col leading-tight">
                            <span className="text-base sm:text-xl lg:text-2xl font-bold text-[#006747] truncate">
                                NORTHWEST MISSOURI STATE UNIVERSITY
                            </span>
                            <span className="text-sm sm:text-lg lg:text-xl font-semibold text-[#006747] mt-1 truncate">
                                Department of Computer Science
                            </span>
                        </div>
                    </div>

                    {/* Background image: visible on lg+; on small screens use a compact banner */}
                    <div className="relative w-full lg:flex-1">
                        <div
                            className="h-36 sm:h-56 lg:h-full w-full bg-cover bg-center"
                            style={{backgroundImage: "url('src/static/images/unsplash.jpg')"}}
                        />
                        <div
                            className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/0 to-white/30 lg:hidden"/>
                    </div>
                </div>

                {/* RIGHT (form) */}
                <div
                    className="w-full lg:w-1/3 xl:w-1/4 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8 py-8 lg:py-0 shadow-none lg:shadow-lg">
                    <div className="w-full max-w-md lg:max-w-sm text-left">
                        {/* Logo above Sign In */}
                        <div className="flex justify-center mb-6">
                            <img
                                src="https://sso.nwmissouri.edu/adfs/portal/logo/logo.png?id=98124957C0CDEFFDBE90AF9EF19DB4BDA8EE87632170955806EE170BF250E5B6"
                                alt="Login"
                                className="h-16 w-auto sm:h-20 object-contain"
                            />
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <label htmlFor="username" className="block text-gray-700 text-sm sm:text-base">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={form.username}
                                    onChange={onChange}
                                    required
                                    placeholder="Enter your username"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-600"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-gray-700 text-sm sm:text-base">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={onChange}
                                    required
                                    placeholder="Enter your password"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center"
                            >
                                {loading ? (
                                    <>
                                        <ImSpinner8 className="animate-spin mr-2"/>
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </button>

                            {/* Forgot password link */}
                            <p className="text-center mt-2 text-sm sm:text-base">
                                <Link to="/verify-reset-password" className="text-blue-600 hover:underline">
                                    Forgot Password?
                                </Link>
                            </p>

                            {/* Divider */}
                            <div className="flex items-center my-4">
                                <div className="flex-grow border-t border-gray-300"/>
                                <span className="px-2 text-gray-500 text-xs sm:text-sm">OR</span>
                                <div className="flex-grow border-t border-gray-300"/>
                            </div>

                            {/* Create account button */}
                            <div className="flex justify-center mt-4">
                                <Link
                                    to="/register"
                                    className="w-full sm:w-auto text-center bg-green-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Create New Account
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
