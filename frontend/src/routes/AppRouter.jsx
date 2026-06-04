import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Link } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';

import LandingPage from '../pages/Landing/LandingPage.jsx';
import Register from '../pages/Auth/Register.jsx';
import Login from '../pages/Auth/Login.jsx';
import ForgotPassword from '../pages/Auth/ForgotPassword.jsx';
import ResetPassword from '../pages/Auth/ResetPassword.jsx';
import ChooseRolePage from '../pages/Auth/ChooseRolePage.jsx';

import Dashboard from '../pages/Worker/Dashboard.jsx';
import JobList from '../pages/Worker/JobList.jsx';
import TalkToSira from '../pages/Worker/TalkToSira.jsx';
import Map from '../pages/Worker/Map.jsx';
import Profile from '../pages/Worker/Profile.jsx';
import VoiceToCV from '../pages/Worker/VoiceToCV.jsx';
import ApplicationHistory from '../pages/Worker/ApplicationHistory.jsx';
import WorkerPayments from '../pages/Worker/WorkerPayments.jsx';

import EmployerDashboard from '../pages/Employer/Dashboard.jsx';
import PostJob from '../pages/Employer/PostJob.jsx';
import Applicants from '../pages/Employer/Applicants.jsx';
import ActiveContracts from '../pages/Employer/ActiveContracts.jsx';
import PaymentHistory from '../pages/Employer/PaymentHistory.jsx';

import Ratings from '../pages/Shared/Ratings.jsx';
import Notifications from '../pages/Shared/Notifications.jsx';
import ChatLayout from '../pages/chat/ChatLayout.jsx';
import SiraTalkPage from '../pages/sira/SiraTalkPage.jsx';
import AdminDashboard from '../pages/Admin/Dashboard.jsx';
import ScamLog from '../pages/Admin/ScamLog.jsx';

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
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/choose-role" element={<ChooseRolePage />} />

          <Route element={<WorkerSection />}>
            <Route path="/dashboard" element={<Dashboard />} />
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
            <Route path="/applicants" element={<Applicants />} />
            <Route path="/contracts" element={<ActiveContracts />} />
            <Route path="/payments" element={<PaymentHistory />} />
          </Route>

          <Route element={<SharedSection />}>
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chat" element={<ChatLayout />} />
            <Route path="/sira" element={<SiraTalkPage />} />
          </Route>

          <Route element={<AdminSection />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-scam-log" element={<ScamLog />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
};

export default AppRouter;