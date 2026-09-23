import HabitNotifications from '@fe/components/habit-notifications';
import { Suspense } from 'react';
import HabitJournal from './journal';

export default function HabitPage() {
  return (
    <Suspense>
      <HabitNotifications />
      <HabitJournal />
    </Suspense>
  );
}
