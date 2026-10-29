'use client';

import React from 'react';
import { PageHeaderProvider } from '@/components/layout/PageHeaderContext';
import { AppLayout } from '@/components/layout/AppLayout';

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageHeaderProvider>
      <AppLayout>{children}</AppLayout>
    </PageHeaderProvider>
  );
}

