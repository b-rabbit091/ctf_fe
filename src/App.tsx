// src/App.tsx
import React from "react";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ErrorBoundary from "./components/ErrorBoundary";
import {AuthProvider} from "./contexts/AuthContext";

// Guards (must be Outlet-based)
import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";

// Public pages
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import VerifyResetPassword from "./pages/Auth/VerifyResetPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

// Private pages
import DashboardOverview from "./pages/Dashboard/DashboardOverview";
import BlogList from "./pages/Blog/BlogList";
import BlogDetail from "./pages/Blog/BlogDetail";
import AdminBlogEditor from "./pages/Admin/AdminBlogEditor";

import PracticeList from "./pages/PracticePage/PracticeList";
import PracticeDetail from "./pages/PracticePage";
import CompetitionList from "./pages/CompetitionPage/CompetitionList";
import CompetitionDetail from "./pages/CompetitionPage";

import LeaderboardPage from "./pages/LeaderboardPage";
import UserGroupPage from "./pages/CompetitionPage/UserGroupPage";
import AccountSettings from "./pages/AccountSettings/AccountSettings";

// Admin pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminCompetitionList from "./pages/Admin/AdminCompetitionList";
import AdminCompetitionEdit from "./pages/Admin/AdminCompetitionEdit";
import AdminPracticeList from "./pages/Admin/AdminPracticeList";
import AdminPracticeEdit from "./pages/Admin/AdminPracticeEdit";
import AdminChallengeMetadata from "./pages/CategoryDifficultySolutionTypes/AdminChallengeMetadata";
import AdminUserList from "./pages/Admin/AdminUserList";
import AdminGenerateReport from "./pages/Admin/AdminGenerateReport";
import AdminGroupList from "./pages/Admin/AdminGroupList";
import AdminBlogList from "./pages/Admin/AdminBlogList";
import AdminDraftQuestionsList from "./pages/Admin/AdminDraftQuestionsList";
import AdminQuestionCreate from "./pages/Admin/AdminQuestionCreate";
import AdminDraftAssignPracticeList from "./pages/Admin/AdminDraftAssignPracticeList";
import AdminCompetitionAssign from "./pages/Admin/AdminCompetitionAssign";
import AdminContestList from "./pages/Admin/AdminContestList";
import AdminContestEdit from "./pages/Admin/AdminContestEdit";
import AdminContestCreate from "./pages/Admin/AdminContestCreate";
import AdminDraftEdit from "./pages/Admin/AdminDraftEdit";

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* ---------------- Public ---------------- */}
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/register" element={<Register/>}/>
                        <Route path="/verify-email" element={<VerifyEmail/>}/>
                        <Route path="/verify-reset-password" element={<VerifyResetPassword/>}/>
                        <Route path="/reset-password" element={<ResetPassword/>}/>

                        {/* ---------------- Everything else: Auth required ---------------- */}
                        <Route element={<PrivateRoute/>}>
                            <Route path="/" element={<Navigate to="/dashboard" replace/>}/>

                            {/* Blogs */}
                            <Route path="/blogs" element={<BlogList/>}/>
                            <Route path="/blogs/:id" element={<BlogDetail/>}/>

                            {/* User pages */}
                            <Route path="/dashboard" element={<DashboardOverview/>}/>
                            <Route path="/practice" element={<PracticeList/>}/>
                            <Route path="/practice/:id" element={<PracticeDetail/>}/>
                            <Route path="/compete" element={<CompetitionList/>}/>
                            <Route path="/compete/:id" element={<CompetitionDetail/>}/>
                            <Route path="/leaderboard" element={<LeaderboardPage/>}/>
                            <Route path="/my-group" element={<UserGroupPage/>}/>
                            <Route path="/account" element={<AccountSettings/>}/>

                            {/* ---------------- Admin only ---------------- */}
                            <Route element={<AdminRoute/>}>
                                <Route path="/admin-dashboard" element={<AdminDashboard/>}/>

                                <Route path="/admin/competition" element={<AdminCompetitionList/>}/>
                                <Route path="/admin/competition/new" element={<AdminCompetitionAssign/>}/>
                                <Route path="/admin/competition/:id" element={<AdminCompetitionEdit/>}/>
                                <Route path="/admin/contests" element={<AdminContestList/>}/>
                                <Route path="/admin/contests/new" element={<AdminContestCreate/>}/>
                                <Route path="/admin/contests/:id" element={<AdminContestEdit/>}/>

                                <Route path="/admin/practice" element={<AdminPracticeList/>}/>
                                <Route path="/admin/practice/new" element={<AdminDraftAssignPracticeList/>}/>
                                <Route path="/admin/practice/:id" element={<AdminPracticeEdit/>}/>

                                <Route path="/admin/blogs" element={<AdminBlogList/>}/>
                                <Route path="/admin/blogs/new" element={<AdminBlogEditor/>}/>
                                <Route path="/admin/blogs/edit/:id" element={<AdminBlogEditor/>}/>

                                <Route path="/admin/taxonomy" element={<AdminChallengeMetadata/>}/>
                                <Route path="/admin/users" element={<AdminUserList/>}/>
                                <Route path="/admin/submissions" element={<AdminGenerateReport/>}/>
                                <Route path="/admin/groups" element={<AdminGroupList/>}/>
                                <Route path="/admin/questions/create" element={<AdminDraftQuestionsList/>}/>
                                <Route path="/admin/drafts/new" element={<AdminQuestionCreate/>}/>
                                <Route path="/admin/drafts/:id" element={<AdminDraftEdit/>}/>

                            </Route>
                        </Route>

                    </Routes>
                </BrowserRouter>

                <ToastContainer position="top-right"/>
            </AuthProvider>
        </ErrorBoundary>
    );
};

export default App;
