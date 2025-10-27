// src/pages/AdminDashboard.tsx
import React from "react";
import Navbar from "../components/Navbar";
import AdminRegister from "./AdminRegister";
import { motion } from "framer-motion";

const AdminDashboard: React.FC = () => {
    return (
        <>
            <Navbar />
            <main className="p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-4">Admin Console</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="bg-slate-800 p-4 rounded-lg shadow">Stats</div>
                        <div className="bg-slate-800 p-4 rounded-lg shadow">Users</div>
                        <div className="bg-slate-800 p-4 rounded-lg shadow"><AdminRegister /></div>
                    </div>
                </motion.div>
            </main>
        </>
    );
};

export default AdminDashboard;
