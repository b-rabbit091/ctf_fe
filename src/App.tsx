// App.tsx
import React from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {AuthProvider} from "./contexts/AuthContext";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import DashboardOverview from "./pages/Dashboard/DashboardOverview";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";
import VerifyResetPassword from "./pages/Auth/VerifyResetPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import BlogList from "./pages/Blog/BlogList";
import BlogDetail from "./pages/Blog/BlogDetail";
import BlogEditor from "./pages/Blog/BlogEditor";
import PracticeList from "./pages/PracticePage/PracticeList";
import PracticeDetail from "./pages/PracticePage";
import CompetitionDetail from "./pages/CompetitionPage";
import PracticeCreate from "./pages/PracticePage/PracticeCreate";
import CompetitionList from "./pages/CompetitionPage/CompetitionList";
import CompetitionCreate from "./pages/CompetitionPage/CompetitionCreate";
import AdminCompetitionList from "./pages/Admin/AdminCompetitionList";
import AdminCompetitionEdit from "./pages/Admin/AdminCompetitionEdit";
import AdminPracticeList from "./pages/PracticePage/AdminPracticeList";
import AdminPracticeEdit from "./pages/PracticePage/AdminPracticeEdit";
import AdminChallengeMetadata from "./pages/CategoryDifficultySolutionTypes/AdminChallengeMetadata";
import AdminUserList from "./pages/Admin/AdminUserList";
import AdminSubmissionsList from "./pages/Admin/AdminSubmissionsList";
import LeaderboardPage from "./pages/LeaderboardPage";
import UserGroupPage from "./pages/CompetitionPage/UserGroupPage";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminGroupList from "./pages/Admin/AdminGroupList";
import AccountSettings from "./pages/AccountSettings/AccountSettings";



const App: React.FC = () => {
    return (
        <ErrorBoundary>

        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>
                    <Route path="/verify-email" element={<VerifyEmail/>}/>
                    <Route path="/verify-reset-password" element={<VerifyResetPassword/>}/>
                    <Route path="/reset-password" element={<ResetPassword/>}/>
                    <Route path="/blogs" element={<BlogList/>}/>

                    <Route path="/blogs/:id" element={<BlogDetail/>}/>

                    <Route path="/blogs/new" element={<BlogEditor/>}/>
                    <Route path="/blogs/edit/:id" element={<BlogEditor/>}/>
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute>
                                <DashboardOverview/>
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
                    <Route path="/compete" element={< CompetitionList/>}/>
                    <Route path="/compete/:id" element={< CompetitionDetail/>}/>
                    {/*<Route path="/compete/new" element={< CompetitionCreate/>}/>*/}
                    <Route path="/admin/contests" element={<AdminCompetitionList/>}/>
                    <Route path="/admin/contests/new" element={<CompetitionCreate/>}/>
                    // Later you can add:
                    <Route path="/admin/contests/:id" element={<AdminCompetitionEdit/>}/>
                    <Route path="/admin/challenges" element={<AdminPracticeList/>}/>
                    <Route path="/admin/practice/new" element={<CompetitionCreate/>}/>
                    <Route path="/admin/practice/:id" element={<AdminPracticeEdit/>}/>
                    <Route path="/admin/taxonomy" element={<AdminChallengeMetadata/>}/>
                    <Route path="/admin/users" element={<AdminUserList/>}/>
                    <Route path="/admin/submissions" element={<AdminSubmissionsList/>}/>
                    <Route path="/admin/groups" element={<AdminGroupList/>}/>
                    <Route path="/leaderboard" element={<LeaderboardPage/>}/>
                    <Route path="/my-group" element={<UserGroupPage/>}/>
                    <Route path="/account" element={<AccountSettings />} />


                </Routes>
            </BrowserRouter>
            <ToastContainer position="top-right"/>
        </AuthProvider>
        </ErrorBoundary>

    );
};

export default App;
