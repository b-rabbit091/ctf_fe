// App.tsx
import React from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {AuthProvider} from "./contexts/AuthContext";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";
import VerifyResetPassword from "./pages/VerifyResetPassword";
import ResetPassword from "./pages/ResetPassword";
import BlogList from "./pages/BlogList";
import BlogDetail from "./pages/BlogDetail";
import BlogEditor from "./pages/BlogEditor";
import PracticeList from "./pages/PracticePage/PracticeList";
import PracticeDetail from "./pages/PracticePage";
import PracticeCreate from "./pages/PracticePage/PracticeCreate";


const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>
                    <Route path="/verify-email" element={<VerifyEmail/>}/>
                    <Route path="/verify-reset-password" element={<VerifyResetPassword/>}/>
                    <Route path="/reset-password" element={<ResetPassword/>}/>
                    {/* Blog listing - user/admin (admin also sees create/edit button inside) */}
                    <Route path="/blogs" element={<BlogList/>}/>

                    {/* Blog detail page - read-only for users */}
                    <Route path="/blogs/:id" element={<BlogDetail/>}/>

                    {/* Blog editor page - only admin can access */}
                    <Route path="/blogs/new" element={<BlogEditor/>}/>
                    <Route path="/blogs/edit/:id" element={<BlogEditor/>}/>
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute>
                                <Dashboard/>
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/admin-dashboard"
                        element={
                            <AdminRoute>
                                <AdminDashboard/>
                            </AdminRoute>
                        }
                    />
                    <Route path="/practice" element={<PracticeList/>}/>
                    <Route path="/practice/:id" element={< PracticeDetail/>}/>
                    <Route path="/practice/new" element={< PracticeCreate/>}/>

                </Routes>
            </BrowserRouter>
            <ToastContainer position="top-right"/>
        </AuthProvider>
    );
};

export default App;
