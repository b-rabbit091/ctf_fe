// src/routes/PrivateRoute.tsx
import React from "react";
import {Navigate, Outlet, useLocation} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";

const PrivateRoute: React.FC = () => {
    const {user, ready} = useAuth();
    const loc = useLocation();

    if (!ready) return null;
    if (!user) return <Navigate to="/login" replace state={{from: loc.pathname + loc.search}}/>;

    return <Outlet/>;
};

export default PrivateRoute;
