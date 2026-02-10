import React, {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {toast} from "react-toastify";
import {ImSpinner8} from "react-icons/im";
import {useAuth} from "../../contexts/AuthContext";

interface LoginForm {
    username: string;
    password: string;
}

const Login: React.FC = () => {
    const {login, user} = useAuth();
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
        // No scroll, ever. Image + form "touch" seamlessly.
        <div className="w-[100dvw] h-[100dvh] overflow-hidden">
            <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden">
                {/* LEFT: image (no padding, no bg, no border, no rounding) */}
                <div className="flex-1 min-w-0 h-[55dvh] lg:h-full overflow-hidden">
                    <img
                        src="src/static/images/cover.png"
                        alt="Cover"
                        className="w-full h-full object-contain"
                        draggable={false}
                    />
                </div>

                {/* RIGHT: form (flush with image, no bg/border/shadow) */}
                <div
                    className="w-full lg:w-[420px] xl:w-[440px] h-[45dvh] lg:h-full overflow-hidden flex items-center justify-center">
                    {/* Scale down instead of scrolling on short screens */}
                    <div
                        className="
              w-full max-w-md px-5 sm:px-8
              [transform:scale(var(--s))]
              [transform-origin:center]
              [--s:1]
              max-[900px]:[--s:0.98]
              max-[820px]:[--s:0.95]
              max-[760px]:[--s:0.92]
              max-[700px]:[--s:0.88]
              max-[640px]:[--s:0.85]
              max-[600px]:[--s:0.82]
            "
                    >
                        <div className="flex justify-center mb-6">
                            <img
                                src="https://sso.nwmissouri.edu/adfs/portal/logo/logo.png?id=98124957C0CDEFFDBE90AF9EF19DB4BDA8EE87632170955806EE170BF250E5B6"
                                alt="Login"
                                className="h-12 sm:h-14 w-auto object-contain"
                                draggable={false}
                            />
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="username" className="block text-sm text-gray-700">
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
                                    className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-green-600"
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="password" className="block text-sm text-gray-700">
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
                                    className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:border-green-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center"
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

                            <div className="flex items-center justify-between pt-1">
                                <Link to="/verify-reset-password" className="text-sm text-blue-600 hover:underline">
                                    Forgot Password?
                                </Link>
                                <Link to="/register" className="text-sm text-green-700 hover:underline">
                                    Create account
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
