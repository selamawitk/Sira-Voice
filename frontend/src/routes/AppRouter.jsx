import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';

// Public pages
import LandingPage from '../pages/Landing/LandingPage.jsx';
import Register from '../pages/Auth/Register.jsx';
import Login from '../pages/Auth/Login.jsx';
import ForgotPassword from '../pages/Auth/ForgotPassword.jsx';
import ResetPassword from '../pages/Auth/ResetPassword.jsx';

// Role selection page (IMPORTANT)
import ChooseRolePage from '../pages/Auth/ChooseRolePage.jsx';

// Worker pages
import Dashboard from '../pages/Worker/Dashboard.jsx';
import JobList from '../pages/Worker/JobList.jsx';
import TalkToSira from '../pages/Worker/TalkToSira.jsx';
import Map from '../pages/Worker/Map.jsx';
import Profile from '../pages/Worker/Profile.jsx';
import VoiceToCV from '../pages/Worker/VoiceToCV.jsx';
import ApplicationHistory from '../pages/Worker/ApplicationHistory.jsx';
import Subscription from '../pages/Worker/Subscription.jsx';

// Employer pages
import EmployerDashboard from '../pages/Employer/Dashboard.jsx';
import PostJob from '../pages/Employer/PostJob.jsx';
import Applicants from '../pages/Employer/Applicants.jsx';

// Admin pages
import AdminDashboard from '../pages/Admin/Dashboard.jsx';
import ScamLog from '../pages/Admin/ScamLog.jsx';
import Ratings from '../pages/Shared/Ratings.jsx';
import SubscriptionSuccess from '../pages/Shared/SubscriptionSuccess.jsx';

const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#1A2E35] text-white">
    <h1 className="text-6xl font-black mb-4">404</h1>
    <p className="text-xl text-white/70">Page not found</p>
    <button
      onClick={() => (window.location.href = '/')}
      className="mt-6 px-8 py-3 bg-[#2BB8B8] text-slate-950 rounded-full font-bold"
    >
      Go Home
    </button>
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

          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/subscription-success" element={<SubscriptionSuccess />} />

          {/* 🔥 ROLE SELECTION ROUTE (ADDED) */}
          <Route path="/choose-role" element={<ChooseRolePage />} />

          {/* Worker */}
          <Route element={<WorkerSection />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/available-jobs" element={<JobList />} />
            <Route path="/talk-to-sira" element={<TalkToSira />} />
            <Route path="/job-map" element={<Map />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/voice-to-cv" element={<VoiceToCV />} />
            <Route path="/application-history" element={<ApplicationHistory />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/ratings" element={<Ratings />} />
          </Route>

          {/* Employer */}
          <Route element={<EmployerSection />}>
            <Route path="/employer-dashboard" element={<EmployerDashboard />} />
            <Route path="/post-job" element={<PostJob />} />
            <Route path="/applicants" element={<Applicants />} />
            <Route path="/ratings" element={<Ratings />} />
          </Route>

          {/* Admin */}
          <Route element={<AdminSection />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-scam-log" element={<ScamLog />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
};

export default AppRouter;