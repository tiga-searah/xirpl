'use client';

import { Checkbox } from '@fe/components/ui/checkbox';
import { useUser } from '@fe/hooks/use-user';
import api from '@fe/lib/api';
import { useEffect, useRef, useState } from 'react';

function apiError(status: number) {
  if (status === 401)
    return new Error('Sesi berakhir. Muat ulang lalu masuk kembali.');
  if (status === 503)
    return new Error('Pengingat belum tersedia. Coba lagi nanti.');
  if (status === 409)
    return new Error(
      'Langganan masih terhubung ke akun lain. Coba aktifkan kembali.',
    );
  return new Error(
    'Gagal menyimpan pengingat. Periksa koneksi lalu coba lagi.',
  );
}

function NotificationControl({
  userId,
  onRetry,
}: {
  userId: string;
  onRetry: () => void;
}) {
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const working = useRef(false);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<{
    enabled: boolean;
    publicKey: string | null;
  } | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !window.isSecureContext ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setSupported(false);
      setPending(false);
      return;
    }

    let cancelled = false;
    setPending(true);
    setError(null);
    setPermission(Notification.permission);
    (async () => {
      await navigator.serviceWorker.register('/sw.js');
      const worker = await navigator.serviceWorker.ready;
      const subscription = await worker.pushManager.getSubscription();
      const result = await api.notifications.subscriptions.get({
        query: subscription ? { endpoint: subscription.endpoint } : {},
      });
      if (result.error) throw apiError(result.error.status);
      if (!result.data?.success)
        throw new Error('Gagal memuat status pengingat. Coba lagi.');
      if (!cancelled) {
        registration.current = worker;
        setSettings(result.data.data);
      }
    })()
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Gagal memuat pengingat. Coba lagi.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    const worker = registration.current;
    if (!worker || !settings || working.current) return;
    const enable = !settings.enabled;
    working.current = true;
    setPending(true);
    setError(null);

    try {
      if (enable) {
        if (!settings.publicKey)
          throw new Error('Pengingat belum tersedia. Coba lagi nanti.');
        // Permission must stay inside this user gesture, before other async work.
        const nextPermission =
          Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;
        setPermission(nextPermission);
        if (nextPermission !== 'granted') {
          throw new Error(
            nextPermission === 'denied'
              ? 'Izin notifikasi diblokir. Ubah izin situs di pengaturan browser.'
              : 'Izin notifikasi belum diberikan. Aktifkan kembali untuk mencoba.',
          );
        }
      }

      const session = await api.me.get();
      if (session.error) throw apiError(session.error.status);
      if (session.data?.data.id !== userId) {
        throw new Error(
          'Akun berubah. Muat ulang halaman sebelum mengubah pengingat.',
        );
      }

      let subscription = await worker.pushManager.getSubscription();
      if (enable) {
        const key = settings.publicKey!;
        const decoded = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
        const applicationServerKey = Uint8Array.from(decoded, (char) =>
          char.charCodeAt(0),
        );
        const subscribe = () =>
          worker.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        const save = (value: PushSubscription) => {
          const keys = value.toJSON().keys;
          if (!keys?.p256dh || !keys.auth)
            throw new Error('Kunci langganan tidak tersedia. Coba lagi.');
          return api.notifications.subscriptions.post({
            endpoint: value.endpoint,
            keys: { p256dh: keys.p256dh, auth: keys.auth },
            enabled: false,
          });
        };

        if (!subscription) subscription = await subscribe();
        let result = await save(subscription);
        if (result.error?.status === 409) {
          // Never transfer another account's endpoint; replace only on explicit opt-in.
          if (!(await subscription.unsubscribe())) {
            throw new Error(
              'Gagal melepas langganan akun sebelumnya. Coba lagi.',
            );
          }
          subscription = await subscribe();
          result = await save(subscription);
        }
        if (result.error) throw apiError(result.error.status);
        if (!result.data?.success)
          throw new Error('Gagal mendaftarkan pengingat. Coba lagi.');
      }

      if (!subscription) {
        throw new Error(
          'Langganan browser berubah. Muat ulang halaman lalu coba lagi.',
        );
      }
      const result = await api.notifications.subscriptions.patch({
        endpoint: subscription.endpoint,
        enabled: enable,
      });
      if (result.error) throw apiError(result.error.status);
      if (!result.data?.success)
        throw new Error('Gagal menyimpan pengingat. Coba lagi.');
      setSettings({ ...settings, enabled: enable });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Gagal menyimpan pengingat. Coba lagi.',
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  };

  const status = !supported
    ? 'Browser ini belum mendukung notifikasi. Gunakan browser yang mendukung melalui HTTPS; di iPhone/iPad, tambahkan situs ke Layar Utama.'
    : pending
      ? 'Memproses pengingat…'
      : permission === 'denied'
        ? 'Izin notifikasi diblokir. Ubah izin situs di pengaturan browser untuk menerima pengingat.'
        : settings?.enabled
          ? 'Pengingat aktif untuk akun ini di browser ini.'
          : settings && !settings.publicKey
            ? 'Pengingat belum tersedia karena konfigurasi server belum lengkap.'
            : 'Pengingat belum aktif di browser ini.';

  return (
    <section
      aria-label="Pengingat check-in"
      className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8"
    >
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <div className="flex items-start gap-3">
          <Checkbox
            id="habit-reminder"
            checked={settings?.enabled ?? false}
            disabled={
              pending ||
              !supported ||
              !settings ||
              (!settings.enabled &&
                (!settings.publicKey || permission === 'denied'))
            }
            onCheckedChange={() => void toggle()}
            aria-describedby="habit-reminder-description habit-reminder-status"
            aria-busy={pending}
          />
          <div className="space-y-1">
            <label
              htmlFor="habit-reminder"
              className="font-semibold text-foreground"
            >
              Ingatkan check-in pukul 06.45 WIB
            </label>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        {error && !settings && !pending && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
          >
            Coba lagi
          </button>
        )}
      </div>
    </section>
  );
}

export default function HabitNotifications() {
  const { user, loading, isAuthenticated } = useUser();
  const [attempt, setAttempt] = useState(0);
  if (loading || !isAuthenticated || !user) return null;
  return (
    <NotificationControl
      key={`${user.id}:${attempt}`}
      userId={user.id}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}
