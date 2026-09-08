import { redirect } from 'next/navigation';

// Admin panel lives in the separate admin app; env points at its origin.
export default function HabitAdminPage() {
  redirect((process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3620') + '/habit');
}
