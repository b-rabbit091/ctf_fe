// src/routes/PrivateRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    const { user, ready } = useAuth();
    if (!ready) return null; // or loading spinner
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

export default PrivateRoute;
