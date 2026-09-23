import app from './app';
import { startCheckinReminders } from './modules/notifications/reminders';

const stopReminders = startCheckinReminders();

app
  .onStop(stopReminders)
  .listen(process.env.PORT ?? 3601, (server) =>
    console.log(`API is now running on ${server.url.href}`),
  );

process.on('uncaughtException', (e) => console.error(e.message, e.stack));
process.on('unhandledRejection', (e) =>
  console.error('Unhandled rejection', e),
);
