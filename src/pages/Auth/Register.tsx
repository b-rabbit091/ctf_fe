import React, {useState} from "react";
import {useAuth} from "../../contexts/AuthContext";
import {toast} from "react-toastify";
import {ImSpinner8} from "react-icons/im";
import {Link} from "react-router-dom";

const Register: React.FC = () => {
    const {register} = useAuth();
    const [form, setForm] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
    });
    const [loading, setLoading] = useState(false);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({...form, [e.target.name]: e.target.value});

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(form);
            toast.success("Registration successful!");
            setForm({username: "", email: "", first_name: "", last_name: ""});
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col bg-gradient-to-br from-[#e8f5f0] via-[#f5fbf8] to-white text-gray-800">
            {/* University Header */}
            <div className="w-full flex items-center gap-4 ">
                <img
                    alt="Northwest Missouri State University"
                    height="79px"
                    width="74px"
                    src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                />
                <div className="flex flex-col">
          <span className="text-2xl font-bold text-[#006747]">
            NORTHWEST MISSOURI STATE UNIVERSITY
          </span>
                    <span className="text-lg font-semibold text-[#006747]">
            Department of Computer Science
          </span>
                </div>
            </div>

            {/* Registration Card */}
            <div className="flex flex-1 items-center justify-center px-4 pb-12">
                <div className="w-full max-w-md bg-white shadow-xl rounded-xl border border-[#cce5da] p-8">
                    <h2 className="text-2xl font-semibold text-[#006747] mb-6 text-center">
                        Student Registration
                    </h2>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-gray-700 font-medium mb-1"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={form.username}
                                onChange={onChange}
                                required
                                placeholder="Enter username"
                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#006747]"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-gray-700 font-medium mb-1"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={onChange}
                                required
                                placeholder="Enter your email"
                                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#006747]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="first_name"
                                    className="block text-gray-700 font-medium mb-1"
                                >
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
                                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#006747]"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="last_name"
                                    className="block text-gray-700 font-medium mb-1"
                                >
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
                                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#006747]"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#006747] text-white font-semibold px-6 py-2 rounded-md hover:bg-[#00563a] transition-colors disabled:opacity-60 flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <ImSpinner8 className="animate-spin mr-2"/>
                                    Please wait...
                                </>
                            ) : (
                                "Register"
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-gray-600">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="text-[#006747] font-semibold hover:underline"
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
