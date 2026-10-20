'use client';
import type { BazzarOrder } from '@be/modules/bazzar-orders/model';

import { useUser } from '@fe/hooks/use-user';
import api from '@fe/lib/api';
import { Button } from '@xirpl/shared/components/ui/button';
import { type FormEvent, useEffect, useState } from 'react';

type OrderForm = {
  customer_name: string;
  seller: string;
  food_quantity: number;
  drink_quantity: number;
  note: string;
};

const emptyForm: OrderForm = {
  customer_name: '',
  seller: '',
  food_quantity: 0,
  drink_quantity: 0,
  note: '',
};
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function BazzarOrdersPage() {
  const { user, loading: userLoading } = useUser();
  const allowed =
    user?.id === 'd1f8f009-f157-49eb-abc8-44ae6a55a409' ||
    user?.role === 'developer';
  const [orders, setOrders] = useState<BazzarOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!allowed) return;
    void revision;
    let active = true;
    api['bazzar-orders']
      .get()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) throw new Error('Gagal memuat pesanan.');
        setOrders(data.data);
        setError('');
      })
      .catch(() => {
        if (active) setError('Gagal memuat pesanan. Coba lagi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, revision]);
  if (userLoading)
    return (
      <main className="mx-auto max-w-5xl p-6" role="status">
        Memeriksa akses…
      </main>
    );
  if (!allowed)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="font-display text-2xl font-bold">Akses ditolak</h1>
        <p>Halaman ini hanya untuk petugas bazzar.</p>
      </main>
    );

  const refresh = () => {
    setLoading(true);
    setRevision((value) => value + 1);
  };
  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };
  const foodCount = orders.reduce((sum, order) => sum + order.food_quantity, 0);
  const drinkCount = orders.reduce(
    (sum, order) => sum + order.drink_quantity,
    0,
  );
  const totalPrice = orders.reduce((sum, order) => sum + order.price, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!form.customer_name.trim() || !form.seller.trim()) {
      setError('Nama pelanggan dan penjual wajib diisi.');
      return;
    }
    if (
      ![form.food_quantity, form.drink_quantity].every(
        (value) => Number.isSafeInteger(value) && value >= 0 && value <= 214748,
      )
    ) {
      setError(
        'Isi jumlah makanan dan minuman dengan bilangan bulat dari 0 sampai 214748.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = {
        ...form,
        customer_name: form.customer_name.trim(),
        seller: form.seller.trim(),
        note: form.note.trim() || undefined,
      };
      const response = editingId
        ? await api['bazzar-orders']({ id: editingId }).put(body)
        : await api['bazzar-orders'].post(body);
      if (response.error || !response.data)
        throw new Error('Gagal menyimpan pesanan.');
      reset();
      refresh();
    } catch {
      setError('Gagal menyimpan pesanan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function editOrder(id: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data, error } = await api['bazzar-orders']({ id }).get();
      if (error || !data) throw new Error('Gagal memuat pesanan.');
      const order = data.data;
      setForm({
        customer_name: order.customer_name,
        seller: order.seller,
        food_quantity: order.food_quantity,
        drink_quantity: order.drink_quantity,
        note: order.note ?? '',
      });
      setEditingId(id);
      document
        .getElementById('bazzar-order-form')
        ?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      setError('Gagal memuat pesanan untuk diedit. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteOrder(id: string, customer: string) {
    if (
      busy ||
      !window.confirm(
        `Hapus pesanan ${customer}? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      const { error } = await api['bazzar-orders']({ id }).delete();
      if (error) throw new Error('Gagal menghapus pesanan.');
      if (editingId === id) reset();
      refresh();
    } catch {
      setError('Gagal menghapus pesanan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold">Pesanan Bazzar</h1>
        <p className="text-muted-foreground">
          Catat makanan dan minuman. Harga setiap item Rp5.000.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive bg-destructive/10 p-3 text-destructive"
        >
          {error}
        </p>
      )}
      <section
        id="bazzar-order-form"
        className="bg-card rounded-2xl border p-5"
      >
        <h2 className="mb-4 text-xl font-bold">
          {editingId ? 'Ubah pesanan' : 'Tambah pesanan'}
        </h2>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 font-semibold">
            Nama pelanggan
            <input
              required
              maxLength={255}
              value={form.customer_name}
              onChange={(e) =>
                setForm({ ...form, customer_name: e.target.value })
              }
              className="bg-background rounded-lg border p-2"
            />
          </label>
          <label className="grid gap-1 font-semibold">
            Nama penjual
            <input
              required
              maxLength={255}
              value={form.seller}
              onChange={(e) => setForm({ ...form, seller: e.target.value })}
              className="bg-background rounded-lg border p-2"
            />
          </label>
          <fieldset className="grid gap-3 rounded-xl border p-3 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 font-semibold">Jumlah pesanan</legend>
            <label className="grid gap-1">
              Makanan
              <input
                type="number"
                min="0"
                max="214748"
                step="1"
                required
                value={form.food_quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    food_quantity:
                      e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                className="bg-background rounded-lg border p-2"
              />
            </label>
            <label className="grid gap-1">
              Minuman
              <input
                type="number"
                min="0"
                max="214748"
                step="1"
                required
                value={form.drink_quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    drink_quantity:
                      e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                className="bg-background rounded-lg border p-2"
              />
            </label>
          </fieldset>
          <label className="grid gap-1 font-semibold sm:col-span-2">
            Catatan (opsional)
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="bg-background min-h-20 rounded-lg border p-2"
            />
          </label>
          <p className="font-bold sm:col-span-2">
            Total pesanan:{' '}
            {rupiah.format((form.food_quantity + form.drink_quantity) * 5000)}
          </p>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy
                ? 'Memproses…'
                : editingId
                  ? 'Simpan perubahan'
                  : 'Tambah pesanan'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={reset}
              >
                Batal
              </Button>
            )}
          </div>
        </form>
      </section>
      <section className="space-y-4" aria-labelledby="bazzar-list-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="bazzar-list-title" className="text-xl font-bold">
            Daftar pesanan
          </h2>
          <Button
            type="button"
            variant="outline"
            disabled={loading || busy}
            onClick={refresh}
          >
            Muat ulang
          </Button>
        </div>
        {loading ? (
          <p role="status">Memuat pesanan…</p>
        ) : (
          <>
            <section
              className="bg-card grid gap-2 rounded-xl border p-4 sm:grid-cols-4"
              aria-label="Rekap pesanan"
            >
              <p>
                Pesanan: <strong>{orders.length}</strong>
              </p>
              <p>
                Makanan: <strong>{foodCount}</strong> · Minuman:{' '}
                <strong>{drinkCount}</strong>
              </p>
              <p>
                Total item: <strong>{foodCount + drinkCount}</strong>
              </p>
              <p>
                Total penjualan: <strong>{rupiah.format(totalPrice)}</strong>
              </p>
            </section>
            {orders.length === 0 ? (
              <p>Belum ada pesanan.</p>
            ) : (
              <ul className="grid gap-3">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="bg-card space-y-2 rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold">{order.customer_name}</h3>
                        <p className="text-muted-foreground text-sm">
                          Penjual: {order.seller}
                        </p>
                      </div>
                      <strong>{rupiah.format(order.price)}</strong>
                    </div>
                    <p>
                      Makanan: {order.food_quantity} · Minuman:{' '}
                      {order.drink_quantity} · Total:{' '}
                      {order.food_quantity + order.drink_quantity} item
                    </p>
                    {order.note && (
                      <p className="whitespace-pre-wrap">
                        Catatan: {order.note}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      Dibuat:{' '}
                      {new Date(order.created_at).toLocaleString('id-ID')}
                      {order.updated_at &&
                        ` · Diperbarui: ${new Date(order.updated_at).toLocaleString('id-ID')}`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => editOrder(order.id)}
                        aria-label={`Ubah pesanan ${order.customer_name}`}
                      >
                        Ubah
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          deleteOrder(order.id, order.customer_name)
                        }
                        aria-label={`Hapus pesanan ${order.customer_name}`}
                      >
                        Hapus
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}
