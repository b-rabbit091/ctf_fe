import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiLogOut, FiSettings, FiUser } from "react-icons/fi";

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const onLogout = () => {
        logout();
        navigate("/login");
    };

    const navLinks = [
        { name: "Practice", path: "/practice" },
        { name: "Compete", path: "/compete" },
        { name: "Leaderboard", path: "/leaderboard" },
        { name: "Blogs", path: "/blogs" },
    ];

    return (
        <nav className="w-full bg-white border-b border-[#006747]/20 px-8 py-3 flex items-center justify-between shadow-sm">
            {/* Left: Logo & University */}
            <div className="flex items-center gap-3 min-w-max">
                <img
                    src="https://www.nwmissouri.edu/layout/v2019/images/svg/logo-n.svg"
                    alt="NW Logo"
                    width="38"
                    height="38"
                    className="object-contain"
                />
                <div className="leading-tight">
                    <h1 className="text-lg font-semibold text-[#006747] whitespace-nowrap">
                        Northwest Missouri State University
                    </h1>
                    <p className="text-sm text-[#006747]/80 whitespace-nowrap">
                        Department of Computer Science
                    </p>
                </div>
            </div>

            {/* Center Navigation */}
            <div className="flex gap-8 items-center flex-1 justify-center min-w-max">
                <Link
                    to="/"
                    className="text-lg font-semibold hover:text-[#004f38] transition-colors"
                >
                    CTF Platform
                </Link>
                {navLinks.map((link) => (
                    <Link
                        key={link.name}
                        to={link.path}
                        className="hover:text-[#004f38] transition-colors whitespace-nowrap"
                    >
                        {link.name}
                    </Link>
                ))}
                {user?.role === "admin" && (
                    <Link
                        to="/admin"
                        className="hover:text-[#004f38] transition-colors font-semibold whitespace-nowrap"
                    >
                        Admin
                    </Link>
                )}
            </div>

            {/* Right: Profile & Logout */}
            <div className="ml-auto flex items-center gap-5 text-[#006747] min-w-max">
                {user && (
                    <>
                        <div
                            className="flex items-center gap-2 cursor-pointer hover:text-[#004f38] transition-colors"
                            onClick={() => navigate("/account")}
                        >
                            <FiUser size={20} />
                            <span className="hidden sm:inline">{user.username}</span>
                        </div>
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
