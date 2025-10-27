// src/routes/AdminRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AdminRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    const { user, ready } = useAuth();
    if (!ready) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return children;
};

export default AdminRoute;
