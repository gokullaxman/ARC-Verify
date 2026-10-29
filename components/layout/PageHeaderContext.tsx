'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PermissionKey, UserRole } from '@/types';

export interface PageHeaderState {
  title?: string;
  subtitle?: string;
  requiredPermission?: PermissionKey;
  requiredRoles?: UserRole[];
}

interface PageHeaderContextType {
  header: PageHeaderState;
  setHeader: React.Dispatch<React.SetStateAction<PageHeaderState>>;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export const PageHeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [header, setHeader] = useState<PageHeaderState>({});

  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export function usePageHeader(config: PageHeaderState) {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }

  const { setHeader } = context;
  const { title, subtitle, requiredPermission, requiredRoles } = config;
  const rolesKey = requiredRoles ? requiredRoles.join(',') : '';

  useEffect(() => {
    setHeader({
      title,
      subtitle,
      requiredPermission,
      requiredRoles,
    });
  }, [setHeader, title, subtitle, requiredPermission, rolesKey, requiredRoles]);
}

export function usePageHeaderContext() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error('usePageHeaderContext must be used within a PageHeaderProvider');
  }
  return context;
}
