import React, {useState} from "react";
import {useAuth} from "../contexts/AuthContext";
import {toast} from "react-toastify";
import {ImSpinner8} from "react-icons/im";
import {Link} from "react-router-dom";

const VerifyResetPassword: React.FC = () => {
    const {verifyResetPassword} = useAuth();
    const [form, setForm] = useState({
        email: "",

    });
    const [loading, setLoading] = useState(false);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({...form, [e.target.name]: e.target.value});

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await verifyResetPassword(form);
            toast.success("Password Reset email sent. Check your inbox.");
            setForm({email: "", });
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Reset Password Failed");
        }finally {
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
                        Reset Password
                    </h2>

                    <form onSubmit={submit} className="space-y-5">

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-gray-700 font-medium mb-1"
                            >
                                Please enter your email
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
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white font-semibold px-4 py-2 hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center"
                        >
                            {loading ? (
                                <>
                                    <ImSpinner8 className="animate-spin mr-2"/>
                                    Please wait...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </button>

                    </form>

                    <p className="mt-6 text-center text-gray-600">
                        Go go Login Page?{" "}
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

export default VerifyResetPassword;
