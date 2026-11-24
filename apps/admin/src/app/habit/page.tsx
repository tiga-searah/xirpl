import { SITE_NAME } from '@xirpl/shared/constants';
import AdminDashboard from '@xirpl/shared/components/habit-admin/dashboard';
import { HabitAdminProvider } from '@xirpl/shared/components/habit-admin/context';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminNailong } from '../../components/day-theme-sync';
import { adminCtx } from '../../data/admin-ctx';

export const metadata: Metadata = {
  title: `Dasbor Kebiasaan | ${SITE_NAME}`,
  description: `Rekap kebiasaan seluruh anggota ${SITE_NAME}`,
};

export default function Home() {
  return (
    <HabitAdminProvider value={adminCtx}>
      <div className="relative">
        <AdminNailong
          src="/images/nailong-11.webp"
          className="pointer-events-none fixed right-6 bottom-6 z-40 hidden w-20 sm:block drop-shadow-[0_8px_16px_rgba(10,37,64,0.25)]"
        />
        <Suspense>
          <AdminDashboard />
        </Suspense>
      </div>
    </HabitAdminProvider>
  );
}
