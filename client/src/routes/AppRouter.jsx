import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/layout/Layout';

import { Onboarding } from '../pages/Onboarding/Onboarding';
import { Login } from '../pages/Auth/Login';
import { SplashScreen } from '../pages/Auth/SplashScreen';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Products } from '../pages/Products/Products';
import { Inventory } from '../pages/Inventory/Inventory';
import { Orders } from '../pages/Orders/Orders';
import { Marketplaces } from '../pages/Marketplaces/Marketplaces';
import { Purchases } from '../pages/Purchases/Purchases';
import { Warehouses } from '../pages/Warehouses/Warehouses';
import { Customers } from '../pages/Customers/Customers';
import { Finance } from '../pages/Finance/Finance';
import { Reports } from '../pages/Reports/Reports';
import { Employees } from '../pages/Employees/Employees';
import { Settings } from '../pages/Settings/Settings';
import { MediaGallery } from '../pages/Media/MediaGallery';
import { ImageStudio } from '../pages/Studio/ImageStudio';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const hasSeenTour = localStorage.getItem('erp_tour_completed') === 'true' || localStorage.getItem('erp_has_onboarded') === 'true';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-9 h-9 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Starting tour: strictly ONE-TIME for new users!
    // If user has already seen the tour, navigate straight to /login
    return <Navigate to={hasSeenTour ? '/login' : '/onboarding'} replace />;
  }

  return children;
};

export const AppRouter = () => {
  return (
    <Routes>
      {/* Step 1: Onboarding Tour */}
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Step 2: Login */}
      <Route path="/login" element={<Login />} />

      {/* Step 3: High-Tech Splash Screen Transition */}
      <Route
        path="/splash"
        element={
          <ProtectedRoute>
            <SplashScreen />
          </ProtectedRoute>
        }
      />

      {/* Step 4: Executive Dashboard & Enterprise Modules */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<Orders />} />
        <Route path="marketplaces" element={<Marketplaces />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="customers" element={<Customers />} />
        <Route path="finance" element={<Finance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="employees" element={<Employees />} />
        <Route path="media" element={<MediaGallery />} />
        <Route path="studio" element={<ImageStudio />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
