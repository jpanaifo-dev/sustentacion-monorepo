import React from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/auth-provider';
import { PublicLayout } from '../layouts/public-layout';
import { AdminLayout } from '../layouts/admin-layout';
import { PublicAgendaPage } from '../../pages/public/public-agenda-page';
import { PublicDefenseDetailPage } from '../../pages/public/public-defense-detail-page';
import { PublicInfrastructurePage } from '../../pages/public/public-infrastructure-page';
import { DashboardPage } from '../../pages/private/dashboard-page';
import { AgendaCalendarPage } from '../../pages/private/agenda/agenda-calendar-page';
import { DefensesListPage } from '../../pages/private/defenses/defenses-list-page';
import { DefenseDetailPage } from '../../pages/private/defenses/defense-detail-page';
import { DefenseFormPage } from '../../pages/private/defenses/defense-form-page';
import { UnitsPage } from '../../pages/private/units/units-page';
import { FacilitiesPage } from '../../pages/private/facilities/facilities-page';
import { SpacesPage } from '../../pages/private/spaces/spaces-page';
import { SpaceDetailPage } from '../../pages/private/spaces/space-detail-page';
import { PersonsPage } from '../../pages/private/persons/persons-page';
import { UsersPage } from '../../pages/private/users/users-page';
import { AuditPage } from '../../pages/private/audit/audit-page';
import { SettingsPage } from '../../pages/private/settings/settings-page';
import { AdminLoginPage } from '../../pages/private/admin-login-page';

const ProtectedAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Verificando sesión…</div>;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Public Portal Routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/agenda" replace />,
      },
      {
        path: 'agenda',
        element: <PublicAgendaPage />,
      },
      {
        path: 'agenda/:id',
        element: <PublicDefenseDetailPage />,
      },
      {
        path: 'infraestructura',
        element: <PublicInfrastructurePage />,
      },
    ],
  },

  // Private Administration Routes
  {
    path: '/admin',
    children: [
      { path: 'login', element: <AdminLoginPage /> },
      { path: 'agenda', element: <ProtectedAdmin><AgendaCalendarPage /></ProtectedAdmin> },
      { element: <ProtectedAdmin><AdminLayout /></ProtectedAdmin>, children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'defenses',
        element: <DefensesListPage />,
      },
      {
        path: 'defenses/new',
        element: <DefenseFormPage />,
      },
      {
        path: 'defenses/:id',
        element: <DefenseDetailPage />,
      },
      {
        path: 'defenses/:id/edit',
        element: <DefenseFormPage />,
      },
      {
        path: 'units',
        element: <UnitsPage />,
      },
      {
        path: 'facilities',
        element: <FacilitiesPage />,
      },
      {
        path: 'spaces',
        element: <SpacesPage />,
      },
      {
        path: 'spaces/:id',
        element: <SpaceDetailPage />,
      },
      {
        path: 'spaces/:id/availability',
        element: <SpaceDetailPage />,
      },
      {
        path: 'persons',
        element: <PersonsPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'audit',
        element: <AuditPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      ] },
    ],
  },

  // Fallback Route
  {
    path: '*',
    element: <Navigate to="/agenda" replace />,
  },
]);
