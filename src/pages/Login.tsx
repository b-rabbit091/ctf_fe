import React, {useEffect, useState} from "react";
import {useNavigate, Link} from "react-router-dom";
import {toast} from "react-toastify";
import {useAuth} from "../contexts/AuthContext";
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
            //const role = login.role;
            //if (role === "admin") navigate("/admin-dashboard");
            //else navigate("/dashboard");
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
        <div className="flex min-h-screen">
            {/* LEFT SECTION */}
            <div className="w-3/4 flex flex-col">
                {/* Header: Logo + University Info */}
                <div className="flex items-center px-12 pt-4 pb-2">
                    {/* Logo */}
                    <img
                        alt="Northwest Missouri State University"
                        src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                        className="object-contain"
                        style={{height: "90px", width: "90px"}}
                    />

                    {/* Text beside logo */}
                    <div className="flex flex-col ml-4 leading-tight">
            <span className="text-2xl font-bold text-[#006747]">
              NORTHWEST MISSOURI STATE UNIVERSITY
            </span>
                        <span className="text-xl font-semibold text-[#006747] mt-1">
              Department of Computer Science
            </span>
                    </div>
                </div>

                {/* Background starts after department name */}
                <div
                    className="flex-1 bg-cover bg-center"
                    style={{
                        backgroundImage: "url('src/static/images/unsplash.jpg')",
                    }}
                />
            </div>

            {/* RIGHT SECTION: LOGIN FORM */}
            <div className="w-1/4 flex items-center justify-center bg-white p-8 shadow-lg">
                <div className="w-full max-w-sm text-left">
                    {/* Image above Sign In */}
                    <div className="flex justify-center mb-6">
                        <img
                            src="https://sso.nwmissouri.edu/adfs/portal/logo/logo.png?id=98124957C0CDEFFDBE90AF9EF19DB4BDA8EE87632170955806EE170BF250E5B6"
                            alt="Login"
                            className="w-50 h-50 object-contain"
                        />
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-gray-700">
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
                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-gray-700">
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
                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white font-semibold px-4 py-2 hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center"
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
                    </form>

                    <p className="mt-6 text-center text-gray-600">
                        New student?{" "}
                        <Link to="/register" className="text-green-600 hover:underline">
                            Create your account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
