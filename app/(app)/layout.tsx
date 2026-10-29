'use client';

import React from 'react';
import { PageHeaderProvider } from '@/components/layout/PageHeaderContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { AiHelpChat } from '@/components/chat/AiHelpChat';

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageHeaderProvider>
      <AppLayout>
        {children}
        <AiHelpChat />
      </AppLayout>
    </PageHeaderProvider>
  );
}


