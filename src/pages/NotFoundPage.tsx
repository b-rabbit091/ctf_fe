import React from "react";
import {Link, useLocation} from "react-router-dom";

const NotFoundPage: React.FC = () => {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[linear-gradient(140deg,_#f4f8f5_0%,_#ffffff_48%,_#eef6f0_100%)] px-4 py-10">
            <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
                <div className="w-full rounded-[32px] border border-[#006747]/10 bg-white/90 p-8 text-center shadow-[0_28px_90px_-36px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-12">
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                        Page not found
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                        The page does not exist.
                    </p>

                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            to="/dashboard"
                            className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-[#006747] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a7f5a]"
                        >
                            Go to dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
