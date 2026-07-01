import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Profile from './Profile';
import BatchView from './BatchView';
import AdminView from './AdminView';
import SubjectView from './SubjectView';
import ChapterView from './ChapterView';
import ChatList from './ChatList';
import Chat from './Chat';
import NewMessageMenu from './NewMessageMenu';
import CreateGroupContacts from './CreateGroupContacts';
import CreateGroupDetails from './CreateGroupDetails';
import LoadingScreen from './LoadingScreen';
import LandingPage from './LandingPage';
import HowItWorks from './HowItWorks';
import Payment from './Payment';
import PaymentVerification from './PaymentVerification';

// Protected Route ensuring user logins to access features
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Admin Guard preventing students from entering administration routes
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile || profile.role !== 'admin' || user?.email !== 'ayushless0211@gmail.com') {
    return (
      <div className="fixed top-0 left-0 bg-white text-black p-4 z-[9999] font-bold">
        Access Denied !
      </div>
    );
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public Routes - Users can browse introduction and courses */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Protected Student Routes */}
            <Route path="/payment/:batchId" element={<Payment />} />
            <Route path="/payment-verification" element={<PaymentVerification />} />
            <Route path="/batch/:id" element={<BatchView />} />
            <Route path="/batch/:batchId/subject/:subjectId" element={<SubjectView />} />
            <Route path="/batch/:batchId/subject/:subjectId/chapter/:chapterId" element={<ChapterView />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/new-message" element={<NewMessageMenu />} />
            <Route path="/create-group-contacts" element={<CreateGroupContacts />} />
            <Route path="/create-group-details" element={<CreateGroupDetails />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />

            {/* Protected Admin Only Routes */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminView />
                </AdminRoute>
              } 
            />

            {/* Fallback routing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
