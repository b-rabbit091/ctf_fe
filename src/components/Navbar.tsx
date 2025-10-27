import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiLogOut, FiSettings } from "react-icons/fi";

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const onLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <nav className="w-full bg-white border-b border-[#006747]/20 px-8 py-3 flex items-center relative shadow-sm">
            {/* Left: University logo and name */}
            <div className="flex items-center gap-3">
                <img
                    src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                    alt="NW Logo"
                    width="38"
                    height="38"
                    className="object-contain"
                />
                <div className="leading-tight">
                    <h1 className="text-lg font-semibold text-[#006747]">
                        Northwest Missouri State University
                    </h1>
                    <p className="text-sm text-[#006747]/80">Department of Computer Science</p>
                </div>
            </div>

            {/* Center: CTF absolutely centered */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-semibold text-[#006747] tracking-wide">
                CTF Platform
            </div>

            {/* Right: Icons only */}
            <div className="ml-auto flex items-center gap-5 text-[#006747]">
                {user && (
                    <>
                        <FiSettings
                            size={20}
                            className="cursor-pointer hover:text-[#004f38] transition-colors"
                            onClick={() => navigate("/account")}
                            title="Account Settings"
                        />
                        <FiLogOut
                            size={20}
                            className="cursor-pointer text-red-500 hover:text-red-600 transition-colors"
                            onClick={onLogout}
                            title="Logout"
                        />
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
