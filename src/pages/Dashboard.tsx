// src/pages/Dashboard.tsx
import React from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <>
            <Navbar />
            <main className="p-6">
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-4">Welcome back, {user?.username}</h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div > <h3 className="font-semibold">Progress</h3></div>
                        <div className="p-4 bg-slate-800 rounded-lg shadow"><h3 className="font-semibold">Challenges</h3></div>
                        <div className="p-4 bg-slate-800 rounded-lg shadow"><h3 className="font-semibold">History</h3></div>
                    </div>
                </motion.div>
            </main>
        </>
    );
};

export default Dashboard;
