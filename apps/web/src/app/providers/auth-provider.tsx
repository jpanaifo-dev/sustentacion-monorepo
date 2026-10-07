import React, { createContext, useContext, useEffect, useState } from 'react';
import { CurrentUser, RoleCode } from '../../types';
import { authService } from '../../services/auth.service';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permissionCode: string) => boolean;
  hasRole: (roleCode: RoleCode) => boolean;
  canAccessUnit: (unitId: string) => boolean;
  switchRole: (role: RoleCode) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.permissions.includes(permissionCode);
  };

  const hasRole = (roleCode: RoleCode): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin && roleCode === 'SUPER_ADMIN') return true;
    return user.roles.includes(roleCode);
  };

  const canAccessUnit = (unitId: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (user.roles.includes('ADMIN') || user.roles.includes('DEFENSE_MANAGER') || user.roles.includes('VIEWER')) {
      return true;
    }
    return user.units.includes(unitId);
  };

  const switchRole = async (role: RoleCode) => {
    const updated = await authService.setDemoRole(role);
    setUser(updated);
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const loggedUser = await authService.login(email, password);
    setUser(loggedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSuperAdmin: user?.isSuperAdmin ?? false,
        hasPermission,
        hasRole,
        canAccessUnit,
        switchRole,
        signOut,
        login,
        refreshUser: () => loadUser(true),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
