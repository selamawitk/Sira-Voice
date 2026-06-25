import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Link } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';

const LandingPage = lazy(() => import('../pages/Landing/LandingPage.jsx'));
const Register = lazy(() => import('../pages/Auth/Register.jsx'));
const Login = lazy(() => import('../pages/Auth/Login.jsx'));
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword.jsx'));
const ChooseRolePage = lazy(() => import('../pages/Auth/ChooseRolePage.jsx'));

const Dashboard = lazy(() => import('../pages/Worker/Dashboard.jsx'));
const JobList = lazy(() => import('../pages/Worker/JobList.jsx'));
const TalkToSira = lazy(() => import('../pages/Worker/TalkToSira.jsx'));
const Map = lazy(() => import('../pages/Worker/Map.jsx'));
const Profile = lazy(() => import('../pages/Worker/Profile.jsx'));
const VoiceToCV = lazy(() => import('../pages/Worker/VoiceToCV.jsx'));
const ApplicationHistory = lazy(() => import('../pages/Worker/ApplicationHistory.jsx'));
const WorkerPayments = lazy(() => import('../pages/Worker/WorkerPayments.jsx'));
const JobDetails = lazy(() => import('../pages/Worker/JobDetails.jsx'));

const EmployerDashboard = lazy(() => import('../pages/Employer/Dashboard.jsx'));
const PostJob = lazy(() => import('../pages/Employer/PostJob.jsx'));
const Applicants = lazy(() => import('../pages/Employer/Applicants.jsx'));
const ActiveContracts = lazy(() => import('../pages/Employer/ActiveContracts.jsx'));
const PaymentHistory = lazy(() => import('../pages/Employer/PaymentHistory.jsx'));
const VoiceJobPosting = lazy(() => import('../pages/Employer/VoiceJobPosting.jsx'));

const Ratings = lazy(() => import('../pages/Shared/Ratings.jsx'));
const Notifications = lazy(() => import('../pages/Shared/Notifications.jsx'));
const ChatLayout = lazy(() => import('../pages/chat/ChatLayout.jsx'));
const SiraTalkPage = lazy(() => import('../pages/sira/SiraTalkPage.jsx'));
const PaymentSuccess = lazy(() => import('../pages/Shared/PaymentSuccess.jsx'));
const AdminDashboard = lazy(() => import('../pages/Admin/Dashboard.jsx'));
const AdminUsers = lazy(() => import('../pages/Admin/Users.jsx'));
const ScamLog = lazy(() => import('../pages/Admin/ScamLog.jsx'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-[#1A2E35]">
    <div className="w-10 h-10 border-4 border-[#2BB8B8] border-t-transparent rounded-full animate-spin" />
  </div>
);

const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#1A2E35] text-white">
    <h1 className="text-8xl font-black mb-4 italic tracking-tighter text-[#2BB8B8]">404</h1>
    <p className="text-xl text-white/40 font-bold uppercase tracking-widest">Route Not Found</p>
    <Link
      to="/"
      className="mt-8 px-10 py-4 bg-[#2BB8B8] text-slate-950 rounded-2xl font-black hover:scale-105 transition-all"
    >
      RETURN HOME
    </Link>
  </div>
);

const WorkerSection = () => (
  <ProtectedRoute>
    <RoleRoute allow="worker">
      <MainLayout>
        <Outlet />
      </MainLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const EmployerSection = () => (
  <ProtectedRoute>
    <RoleRoute allow="employer">
      <MainLayout>
        <Outlet />
      </MainLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const SharedSection = () => (
  <ProtectedRoute>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </ProtectedRoute>
);

const AdminSection = () => (
  <ProtectedRoute>
    <RoleRoute allow="admin">
      <MainLayout>
        <Outlet />
      </MainLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const AppRouter = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#1A2E35]">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/choose-role" element={<ChooseRolePage />} />

            <Route element={<WorkerSection />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/available-jobs" element={<JobList />} />
              <Route path="/talk-to-sira" element={<TalkToSira />} />
              <Route path="/job-map" element={<Map />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/voice-to-cv" element={<VoiceToCV />} />
              <Route path="/application-history" element={<ApplicationHistory />} />
              <Route path="/payments" element={<WorkerPayments />} />
            </Route>

            <Route element={<EmployerSection />}>
              <Route path="/employer-dashboard" element={<EmployerDashboard />} />
              <Route path="/post-job" element={<PostJob />} />
              <Route path="/voice-job-posting" element={<VoiceJobPosting />} />
              <Route path="/applicants" element={<Applicants />} />
              <Route path="/contracts" element={<ActiveContracts />} />
              <Route path="/employer-payments" element={<PaymentHistory />} />
            </Route>

            <Route element={<SharedSection />}>
              <Route path="/ratings" element={<Ratings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/chat" element={<ChatLayout />} />
              <Route path="/sira" element={<SiraTalkPage />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
            </Route>

            <Route element={<AdminSection />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin-users" element={<AdminUsers />} />
              <Route path="/admin-scam-log" element={<ScamLog />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
};

export default AppRouter;