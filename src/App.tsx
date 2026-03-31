// src/App.tsx
import React, {Suspense, lazy} from "react";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ErrorBoundary from "./components/ErrorBoundary";
import {AuthProvider} from "./contexts/AuthContext";

// Guards (must be Outlet-based)
import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";

const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const VerifyEmail = lazy(() => import("./pages/Auth/VerifyEmail"));
const VerifyResetPassword = lazy(() => import("./pages/Auth/VerifyResetPassword"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));

const DashboardOverview = lazy(() => import("./pages/Dashboard/DashboardOverview"));
const BlogList = lazy(() => import("./pages/Blog/BlogList"));
const BlogDetail = lazy(() => import("./pages/Blog/BlogDetail"));
const PracticeList = lazy(() => import("./pages/PracticePage/PracticeList"));
const PracticeDetail = lazy(() => import("./pages/PracticePage"));
const CompetitionList = lazy(() => import("./pages/CompetitionPage/CompetitionList"));
const CompetitionDetail = lazy(() => import("./pages/CompetitionPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const UserGroupPage = lazy(() => import("./pages/CompetitionPage/UserGroupPage"));
const AccountSettings = lazy(() => import("./pages/AccountSettings/AccountSettings"));

const AdminDashboard = lazy(() => import("./pages/Admin/AdminDashboard"));
const AdminCompetitionList = lazy(() => import("./pages/Admin/AdminCompetitionList"));
const AdminCompetitionEdit = lazy(() => import("./pages/Admin/AdminCompetitionEdit"));
const AdminPracticeList = lazy(() => import("./pages/Admin/AdminPracticeList"));
const AdminPracticeEdit = lazy(() => import("./pages/Admin/AdminPracticeEdit"));
const AdminChallengeMetadata = lazy(() => import("./pages/CategoryDifficultySolutionTypes/AdminChallengeMetadata"));
const AdminUserList = lazy(() => import("./pages/Admin/AdminUserList"));
const AdminGenerateReport = lazy(() => import("./pages/Admin/AdminGenerateReport"));
const AdminGroupList = lazy(() => import("./pages/Admin/AdminGroupList"));
const AdminBlogList = lazy(() => import("./pages/Admin/AdminBlogList"));
const AdminBlogEditor = lazy(() => import("./pages/Admin/AdminBlogEditor"));
const AdminDraftQuestionsList = lazy(() => import("./pages/Admin/AdminDraftQuestionsList"));
const AdminQuestionCreate = lazy(() => import("./pages/Admin/AdminQuestionCreate"));
const AdminDraftAssignPracticeList = lazy(() => import("./pages/Admin/AdminDraftAssignPracticeList"));
const AdminCompetitionAssign = lazy(() => import("./pages/Admin/AdminCompetitionAssign"));
const AdminContestList = lazy(() => import("./pages/Admin/AdminContestList"));
const AdminContestEdit = lazy(() => import("./pages/Admin/AdminContestEdit"));
const AdminContestCreate = lazy(() => import("./pages/Admin/AdminContestCreate"));
const AdminDraftEdit = lazy(() => import("./pages/Admin/AdminDraftEdit"));

const RouteFallback: React.FC = () => (
    <div className="min-h-screen w-full bg-[linear-gradient(160deg,_#f8fbff_0%,_#ffffff_44%,_#eef4ff_100%)]">
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="rounded-3xl border border-white/80 bg-white/80 px-6 py-5 text-sm tracking-tight text-slate-600 shadow-sm backdrop-blur-xl">
                Loading page...
            </div>
        </div>
    </div>
);

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <BrowserRouter basename="/ctf">
                    <Suspense fallback={<RouteFallback />}>
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
                    </Suspense>
                </BrowserRouter>

                <ToastContainer position="top-right"/>
            </AuthProvider>
        </ErrorBoundary>
    );
};

export default App;
