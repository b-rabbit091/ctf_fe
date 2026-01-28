// src/routes/AdminRoute.tsx
import React from "react";
import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";

const AdminRoute: React.FC = () => {
    const {user, ready} = useAuth();

    if (!ready) return null;
    if (!user) return <Navigate to="/login" replace/>;

    const role = (user.role || "").toLowerCase();
    if (role !== "admin") return <Navigate to="/dashboard" replace/>;

    return <Outlet/>;
};

export default AdminRoute;
