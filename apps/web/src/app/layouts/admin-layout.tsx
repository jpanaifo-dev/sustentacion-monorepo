import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/auth-provider';
import { RoleCode } from '../../types';
import {
  Calendar,
  GraduationCap,
  Building2,
  DoorOpen,
  Users,
  ShieldCheck,
  FileText,
  Settings,
  LayoutDashboard,
  ExternalLink,
  ChevronDown,
  Menu,
  X,
  UserCog,
  LogOut,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

export const AdminLayout: React.FC = () => {
  const { user, hasPermission, switchRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Inicio', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Agenda', path: '/admin/agenda', icon: Calendar, permission: 'calendar.view' },
    { label: 'Sustentaciones', path: '/admin/defenses', icon: GraduationCap, permission: 'defenses.view' },
    { label: 'Unidades', path: '/admin/units', icon: Building2, permission: 'units.view' },
    { label: 'Instalaciones', path: '/admin/facilities', icon: Building2, permission: 'facilities.view' },
    { label: 'Espacios', path: '/admin/spaces', icon: DoorOpen, permission: 'spaces.view' },
    { label: 'Personas', path: '/admin/persons', icon: Users, permission: 'defenses.view' },
    { label: 'Usuarios', path: '/admin/users', icon: UserCog, permission: 'users.view' },
    { label: 'Auditoría', path: '/admin/audit', icon: FileText, permission: 'audit.view' },
    { label: 'Configuración', path: '/admin/settings', icon: Settings, permission: 'roles.view' },
  ];

  const visibleNav = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const demoRoles: { code: RoleCode; label: string }[] = [
    { code: 'SUPER_ADMIN', label: 'SUPER_ADMIN' },
    { code: 'ADMIN', label: 'Administrador' },
    { code: 'DEFENSE_MANAGER', label: 'Gestor de Sustentaciones' },
    { code: 'AGENDA_MANAGER', label: 'Encargado de Agenda' },
    { code: 'UNIT_COORDINATOR', label: 'Coordinador de Unidad' },
    { code: 'IT_SUPPORT', label: 'Soporte Informático' },
    { code: 'VIEWER', label: 'Visualizador' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-unap-navy text-white px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <img src="/brands/postgrado_brandwhite.webp" alt="Escuela de Postgrado UNAP" className="h-10 w-auto max-w-[210px] object-contain object-left" />
          <div>
            <div className="font-bold text-xs uppercase tracking-wider">UNAP Postgrado</div>
            <div className="text-[10px] text-slate-300">Agenda Institucional</div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded text-slate-200 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block md:w-64 md:sticky md:top-0 md:h-screen bg-unap-navy text-slate-200 shrink-0 border-r border-slate-800 flex flex-col justify-between overflow-hidden`}
      >
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800 hidden md:flex items-center gap-3">
            <img src="/brands/postgrado_brandwhite.webp" alt="Escuela de Postgrado UNAP" className="h-14 w-auto max-w-[220px] object-contain object-left" />
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Menú Principal
            </div>
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-unap-gold text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* User profile & Role switcher */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60">
          <div className="px-2 py-1.5 flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              {user?.profile.first_name[0]}
              {user?.profile.last_name[0]}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {user?.profile.first_name} {user?.profile.last_name}
              </div>
              <div className="text-[11px] text-amber-300/90 font-mono truncate">
                {user?.roles.join(', ') || 'VIEWER'}
              </div>
            </div>
          </div>

          {/* Role test quick switcher */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="text-[10px] text-slate-400 block mb-1 font-medium">
              Simular Rol (Modo Evaluación):
            </label>
            <div className="relative">
              <select
                value={user?.roles[0] || 'SUPER_ADMIN'}
                onChange={(e) => switchRole(e.target.value as RoleCode)}
                className="w-full bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {demoRoles.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 absolute right-2 top-2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80">
            <button onClick={() => void signOut()} className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded hover:bg-slate-800">
              <LogOut className="h-3.5 w-3.5" />
              <span>Cerrar sesión</span>
            </button>
            <NavLink
              to="/agenda"
              target="_blank"
              className="flex items-center justify-between text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
            >
              <span>Ver Portal Público</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar */}
        <header className="h-14 sticky top-0 z-30 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-900">EPG UNAP</span>
            <span>/</span>
            <span className="capitalize">
              {location.pathname.replace('/admin/', '').replace('/admin', 'Dashboard') || 'Inicio'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium">Sistema Institucional Activo</span>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 text-slate-700"
            >
              <NavLink to="/agenda">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Portal Público</span>
              </NavLink>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 max-w-7xl w-full mx-auto flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
