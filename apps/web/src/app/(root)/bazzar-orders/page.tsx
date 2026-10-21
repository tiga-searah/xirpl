'use client';
import type { BazzarOrder } from '@be/modules/bazzar-orders/model';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@fe/components/ui/alert-dialog';
import { Checkbox } from '@fe/components/ui/checkbox';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@fe/components/ui/combobox';
import PageHero from '@fe/components/page-hero';
import { useStudents } from '@fe/hooks/use-students';
import { useUser } from '@fe/hooks/use-user';
import api from '@fe/lib/api';
import { cn } from '@fe/lib/utils';
import { InfoHint } from '@xirpl/shared/components/info-hint';
import XiRplMascot from '@xirpl/shared/components/mascot';
import { Button } from '@xirpl/shared/components/ui/button';
import {
  CheckIcon,
  ChefHat,
  Coffee,
  LayoutList,
  Pencil,
  RefreshCw,
  Split,
  Table2,
  Trash2,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const FLAVORS = ['pedas', 'balado', 'manis'] as const;
const FLAVOR_LABEL: Record<string, string> = {
  pedas: 'Pedas',
  balado: 'Balado',
  manis: 'Manis',
};
const FLAVOR_STYLE: Record<string, string> = {
  Pedas: 'border-red-300 bg-red-100 text-red-800',
  Balado: 'border-orange-300 bg-orange-100 text-orange-800',
  Manis: 'border-pink-300 bg-pink-100 text-pink-800',
};

type FlavorRow = { id: number; picked: string[] };

type OrderForm = {
  customer_name: string;
  seller: string;
  food_quantity: number;
  drink_quantity: number;
  note: string;
  /** One row per pangsit: the flavours picked for that piece. */
  flavors: FlavorRow[];
};

const emptyForm: OrderForm = {
  customer_name: '',
  seller: '',
  food_quantity: 0,
  drink_quantity: 0,
  note: '',
  flavors: [],
};

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const clock = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

let flavorRowId = 0;
/** Keep picked flavours when the quantity grows; drop rows when it shrinks. */
const resizeFlavors = (flavors: FlavorRow[], quantity: number): FlavorRow[] =>
  Array.from(
    { length: quantity },
    (_, index) => flavors[index] ?? { id: flavorRowId++, picked: [] },
  );

const toPayloadFlavor = (picked: string[]) =>
  FLAVORS.filter((flavor) => picked.includes(flavor)).join('+');

const flavorLabel = (entry: string) =>
  entry
    .split('+')
    .map((flavor) => FLAVOR_LABEL[flavor] ?? flavor)
    .join(' + ');

/** Group identical picks so the summary reads "Pedas ×2" not "Pedas, Pedas". */
function flavorGroups(entries: string[]): { entry: string; count: number }[] {
  const groups = new Map<string, { entry: string; count: number }>();
  for (const entry of entries) {
    const group = groups.get(entry);
    if (group) group.count += 1;
    else groups.set(entry, { entry, count: 1 });
  }
  return [...groups.values()];
}

/** `entry` is the raw stored value: "pedas" or "pedas+manis". */
function FlavorChip({ entry }: { entry: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
        entry.includes('+')
          ? 'border-purple-300 bg-purple-100 text-purple-800'
          : (FLAVOR_STYLE[FLAVOR_LABEL[entry]] ??
              'border-border bg-muted text-muted-foreground'),
      )}
    >
      {entry.includes('+') && <Split className="size-3" />}
      {flavorLabel(entry)}
    </span>
  );
}

/** Searchable student picker. Free text is allowed because `seller` is text. */
function SellerCombobox({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [students, loading] = useStudents();
  const names = useMemo(
    () => students.map((student) => student.name),
    [students],
  );
  const nisByName = useMemo(
    () => new Map(students.map((student) => [student.name, student.nis])),
    [students],
  );

  return (
    <Combobox
      items={names}
      value={value || null}
      onValueChange={(name) => onChange(name ?? '')}
      // Free text is allowed: whatever is typed is the seller, not just picks.
      inputValue={value}
      onInputValueChange={(next) => onChange(next)}
      filter={(name, query) => {
        const needle = query.trim().toLowerCase();
        return (
          name.toLowerCase().includes(needle) ||
          String(nisByName.get(name) ?? '').includes(needle)
        );
      }}
      disabled={disabled}
      autoHighlight
    >
      <ComboboxInput
        aria-label="Nama penjual"
        placeholder="Cari nama atau NIS…"
        showClear
        className="h-11 w-full rounded-xl border-2"
      />
      <ComboboxContent>
        <ComboboxList>
          {names.map((name) => (
            <ComboboxItem key={name} value={name}>
              <span className="truncate font-semibold">{name}</span>
              <span className="text-muted-foreground ml-auto text-xs font-medium">
                {nisByName.get(name)}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>
          {loading
            ? 'Memuat siswa…'
            : 'Tidak ada siswa cocok. Nama tetap bisa diketik.'}
        </ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

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
  const [view, setView] = useState<'list' | 'table'>('list');
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    customer: string;
  } | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async (silent: boolean) => {
    if (busyRef.current) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await api['bazzar-orders'].get();
      if (!data) throw new Error('Gagal memuat pesanan.');
      setOrders(data.data);
      setSyncedAt(new Date());
      setError('');
    } catch {
      setError('Gagal memuat pesanan. Coba lagi.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void load(false);
  }, [allowed, load]);

  // Auto refresh every 5s; hidden tabs skip the poll.
  useEffect(() => {
    if (!allowed) return;
    const id = setInterval(() => {
      if (!document.hidden) void load(true);
    }, 5000);
    return () => clearInterval(id);
  }, [allowed, load]);

  const withBusy = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const setFoodQuantity = (quantity: number) =>
    setForm((current) => ({
      ...current,
      food_quantity: quantity,
      flavors: resizeFlavors(current.flavors, quantity),
    }));

  const toggleFlavor = (index: number, flavor: string) =>
    setForm((current) => ({
      ...current,
      flavors: current.flavors.map((row, at) =>
        at === index
          ? {
              ...row,
              picked: row.picked.includes(flavor)
                ? row.picked.filter((entry) => entry !== flavor)
                : [...row.picked, flavor],
            }
          : row,
      ),
    }));

  const foodCount = orders.reduce((sum, order) => sum + order.food_quantity, 0);
  const drinkCount = orders.reduce(
    (sum, order) => sum + order.drink_quantity,
    0,
  );
  const totalPrice = orders.reduce((sum, order) => sum + order.price, 0);
  const doneCount = orders.filter((order) => order.done).length;

  if (userLoading)
    return (
      <main className="mx-auto max-w-6xl p-6" role="status">
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
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
    if (form.food_quantity + form.drink_quantity === 0) {
      setError('Isi minimal satu pangsit goreng atau satu Lemon Tea Mager.');
      return;
    }
    const flavors = form.flavors.slice(0, form.food_quantity);
    if (flavors.some((row) => row.picked.length === 0)) {
      setError('Setiap pangsit goreng wajib dipilih minimal satu rasa.');
      return;
    }

    await withBusy(async () => {
      const body = {
        customer_name: form.customer_name.trim(),
        seller: form.seller.trim(),
        food_quantity: form.food_quantity,
        drink_quantity: form.drink_quantity,
        food_flavors: flavors.map((row) => toPayloadFlavor(row.picked)),
        note: form.note.trim() || undefined,
      };
      const response = editingId
        ? await api['bazzar-orders']({ id: editingId }).put(body)
        : await api['bazzar-orders'].post(body);
      if (response.error || !response.data)
        throw new Error('Gagal menyimpan pesanan.');
      reset();
      await load(true);
    });
  }

  async function editOrder(id: string) {
    await withBusy(async () => {
      const { data, error: requestError } = await api['bazzar-orders']({
        id,
      }).get();
      if (requestError || !data) throw new Error('Gagal memuat pesanan.');
      const order = data.data;
      setForm({
        customer_name: order.customer_name,
        seller: order.seller,
        food_quantity: order.food_quantity,
        drink_quantity: order.drink_quantity,
        note: order.note ?? '',
        flavors: resizeFlavors(
          order.food_flavors.map((entry) => ({
            id: flavorRowId++,
            picked: entry.split('+'),
          })),
          order.food_quantity,
        ),
      });
      setEditingId(id);
      document
        .getElementById('bazzar-order-form')
        ?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  async function toggleDone(order: BazzarOrder) {
    await withBusy(async () => {
      const { error: requestError } = await api['bazzar-orders']({
        id: order.id,
      }).done.patch({ done: !order.done });
      if (requestError) throw new Error('Gagal menandai pesanan.');
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, done: !item.done } : item,
        ),
      );
    });
  }

  async function deleteOrder(id: string) {
    if (busyRef.current) return;
    await withBusy(async () => {
      const { error: requestError } = await api['bazzar-orders']({
        id,
      }).delete();
      if (requestError) throw new Error('Gagal menghapus pesanan.');
      if (editingId === id) reset();
      await load(true);
    });
  }

  const totalItems = form.food_quantity + form.drink_quantity;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHero
        pill="Kantin bazzar"
        title="Pesanan Bazzar"
        desc="Pangsit goreng & Lemon Tea Mager — Rp5.000 per item. Pesanan baru masuk langsung terlihat dalam 5 detik."
      >
        <XiRplMascot
          pose="cheer"
          size={150}
          className="hidden h-auto w-28 shrink-0 sm:block sm:w-36"
        />
      </PageHero>

      {error && (
        <p
          role="alert"
          className="border-destructive bg-destructive/10 text-destructive rounded-xl border-2 p-3 font-semibold"
        >
          {error}
        </p>
      )}

      <section
        id="bazzar-order-form"
        className="duo-card scroll-mt-20 rounded-3xl border-2 bg-card p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="border-brand-blue/40 bg-pastel-blue text-brand-navy grid size-10 shrink-0 place-items-center rounded-2xl border-2">
            <ChefHat className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-extrabold">
              {editingId ? 'Ubah pesanan' : 'Catat pesanan baru'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {editingId
                ? 'Perubahan akan menggantikan data pesanan ini.'
                : 'Isi nama pemesan, siswa penerima, lalu rasanya.'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 font-bold">
            Nama pelanggan
            <input
              required
              maxLength={255}
              value={form.customer_name}
              onChange={(event) =>
                setForm({ ...form, customer_name: event.target.value })
              }
              placeholder="Siapa yang memesan?"
              className="border-input bg-background focus-visible:border-ring h-11 rounded-xl border-2 px-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <div className="grid gap-1.5">
            <span className="flex items-center gap-1.5 font-bold">
              Nama penjual
              <InfoHint
                label="Nama penjual"
                text="Siswa yang menerima pesanan ini."
              />
            </span>
            <SellerCombobox
              value={form.seller}
              disabled={busy}
              onChange={(seller) => setForm({ ...form, seller })}
            />
          </div>

          <div className="grid gap-3 rounded-2xl border-2 border-dashed p-4 sm:col-span-2 sm:grid-cols-[10rem_1fr]">
            <label className="grid content-start gap-1.5 font-bold">
              Pangsit Goreng
              <input
                type="number"
                min="0"
                max="214748"
                step="1"
                required
                value={form.food_quantity}
                onChange={(event) =>
                  setFoodQuantity(
                    event.target.value === '' ? 0 : Number(event.target.value),
                  )
                }
                className="border-input bg-background focus-visible:border-ring h-11 rounded-xl border-2 px-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm font-bold">
                Varian rasa per pangsit{' '}
                <span className="text-muted-foreground font-medium">
                  (boleh lebih dari satu = mix)
                </span>
              </p>
              {form.food_quantity === 0 && (
                <p className="text-muted-foreground rounded-xl border-2 border-dashed p-3 text-sm">
                  Isi jumlah pangsit dulu untuk memilih rasa.
                </p>
              )}
              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
                {form.flavors.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-2.5 py-2"
                  >
                    <span className="bg-card border-border grid size-7 shrink-0 place-items-center rounded-lg border-2 text-xs font-extrabold">
                      {index + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 max-sm:grid max-sm:flex-1 max-sm:grid-cols-2">
                      {FLAVORS.map((flavor) => {
                        const checked = row.picked.includes(flavor);
                        const id = `flavor-${row.id}-${flavor}`;
                        return (
                          <label
                            key={flavor}
                            htmlFor={id}
                            className={cn(
                              'flex cursor-pointer items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-sm font-bold transition-colors max-sm:justify-self-center',
                              // On phones Manis takes the centered second row under Pedas & Balado.
                              flavor === 'manis' && 'max-sm:col-span-2',
                              checked
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-card hover:bg-accent',
                            )}
                          >
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={() =>
                                toggleFlavor(index, flavor)
                              }
                              className="size-4 rounded"
                            />
                            {FLAVOR_LABEL[flavor]}
                          </label>
                        );
                      })}
                    </div>
                    {row.picked.length > 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-extrabold text-purple-800 max-sm:order-2">
                        <Split className="size-3" />
                        {flavorLabel(toPayloadFlavor(row.picked))} · mix
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <label className="grid gap-1.5 font-bold">
            Lemon Tea Mager
            <input
              type="number"
              min="0"
              max="214748"
              step="1"
              required
              value={form.drink_quantity}
              onChange={(event) =>
                setForm({
                  ...form,
                  drink_quantity:
                    event.target.value === '' ? 0 : Number(event.target.value),
                })
              }
              className="border-input bg-background focus-visible:border-ring h-11 rounded-xl border-2 px-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <label className="grid gap-1.5 font-bold">
            Catatan (opsional)
            <textarea
              value={form.note}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
              placeholder="Contoh: tanpa saus, bungkus terpisah…"
              className="border-input bg-background focus-visible:border-ring min-h-11 rounded-xl border-2 px-3 py-2 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3 sm:col-span-2">
            <p className="font-extrabold">
              Total pesanan:{' '}
              <span className="text-primary text-lg">
                {rupiah.format(totalItems * 5000)}
              </span>
              <span className="text-muted-foreground ml-2 text-sm font-medium">
                ({totalItems} item)
              </span>
            </p>
            <div className="flex gap-2">
              <Button type="submit" size="lg" disabled={busy}>
                {busy
                  ? 'Memproses…'
                  : editingId
                    ? 'Simpan perubahan'
                    : 'Tambah pesanan'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={busy}
                  onClick={reset}
                >
                  Batal
                </Button>
              )}
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-4" aria-labelledby="bazzar-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="bazzar-list-title"
              className="font-display text-2xl font-extrabold"
            >
              Daftar pesanan
            </h2>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
              <RefreshCw
                className={cn('size-3.5', loading && 'animate-spin')}
              />
              {syncedAt ? `Diperbarui otomatis setiap 5 detik` : 'Memuat…'}
            </p>
          </div>
          <div
            role="toolbar"
            aria-label="Tampilan daftar pesanan"
            className="border-border bg-card flex rounded-xl border-2 p-1"
          >
            {(
              [
                ['list', LayoutList],
                ['table', Table2],
              ] as const
            ).map(([mode, Icon]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
                  view === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p role="status" className="text-muted-foreground">
            Memuat pesanan…
          </p>
        ) : (
          <>
            <section
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              aria-label="Rekap pesanan"
            >
              {[
                {
                  label: 'Pesanan',
                  value: orders.length,
                  note: `${doneCount} selesai`,
                  Icon: Users,
                  tone: 'border-brand-blue/40 bg-pastel-blue/70 text-brand-navy',
                },
                {
                  label: 'Pangsit',
                  value: foodCount,
                  note: 'porsi',
                  Icon: UtensilsCrossed,
                  tone: 'border-orange-300 bg-orange-100/80 text-orange-900',
                },
                {
                  label: 'Lemon Tea',
                  value: drinkCount,
                  note: 'gelas',
                  Icon: Coffee,
                  tone: 'border-emerald-300 bg-pastel-green/80 text-emerald-900',
                },
                {
                  label: 'Total penjualan',
                  value: rupiah.format(totalPrice),
                  note: `${foodCount + drinkCount} item`,
                  Icon: Wallet,
                  tone: 'border-brand-yellow/70 bg-pastel-yellow/80 text-brand-navy',
                },
              ].map(({ label, value, note, Icon, tone }) => (
                <div
                  key={label}
                  className={cn('duo-card rounded-2xl border-2 p-3', tone)}
                >
                  <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase opacity-80">
                    <Icon className="size-3.5" /> {label}
                  </p>
                  <p className="font-display mt-1 text-2xl font-extrabold">
                    {value}
                  </p>
                  <p className="text-xs font-semibold opacity-70">{note}</p>
                </div>
              ))}
            </section>

            {orders.length === 0 ? (
              <div className="bg-card rounded-3xl border-2 border-dashed p-8 text-center">
                <p className="font-display text-lg font-extrabold">
                  Belum ada pesanan
                </p>
                <p className="text-muted-foreground text-sm">
                  Pesanan yang dicatat akan muncul di sini otomatis.
                </p>
              </div>
            ) : view === 'list' ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {orders.map((order) => {
                  const groups = flavorGroups(order.food_flavors);
                  return (
                    <li
                      key={order.id}
                      className={cn(
                        'duo-card relative overflow-hidden rounded-2xl border-2 p-4',
                        order.done
                          ? 'border-emerald-400 bg-pastel-green/60 [--duo-shade:rgb(16_185_129/0.35)]'
                          : 'bg-card',
                      )}
                    >
                      <span className="border-border absolute inset-y-0 left-0 border-r-2 border-dashed" />
                      <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
                        <div className="min-w-0">
                          <h3 className="font-display truncate text-lg font-extrabold">
                            {order.customer_name}
                          </h3>
                          <p className="text-muted-foreground flex items-center gap-1 text-sm font-semibold">
                            <Users className="size-3.5" />
                            Penjual: {order.seller}
                          </p>
                        </div>
                        <div className="text-right">
                          <strong className="font-display block text-lg">
                            {rupiah.format(order.price)}
                          </strong>
                          {order.done && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-extrabold text-white">
                              <CheckIcon className="size-3" /> Selesai
                            </span>
                          )}
                        </div>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-2 pl-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground text-xs font-bold uppercase">
                            Pangsit
                          </dt>
                          <dd className="font-extrabold">
                            {order.food_quantity} pcs
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground text-xs font-bold uppercase">
                            Lemon tea
                          </dt>
                          <dd className="font-extrabold">
                            {order.drink_quantity} gelas
                          </dd>
                        </div>
                      </dl>

                      {groups.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5 pl-2">
                          {groups.map((group) => (
                            <li
                              key={group.entry}
                              className="flex items-center gap-1"
                            >
                              <FlavorChip entry={group.entry} />
                              <span className="text-muted-foreground text-xs font-bold">
                                ×{group.count}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {order.note && (
                        <p className="mt-2 rounded-lg bg-black/5 px-2 py-1 pl-2 text-sm font-medium whitespace-pre-wrap">
                          {order.note}
                        </p>
                      )}

                      <p className="text-muted-foreground mt-2 pl-2 text-xs font-medium">
                        Dibuat: {clock(order.created_at)}
                        {order.updated_at !== order.created_at &&
                          ` · Diperbarui: ${clock(order.updated_at)}`}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 pl-2">
                        <Button
                          type="button"
                          variant={order.done ? 'outline' : 'special'}
                          size="sm"
                          disabled={busy}
                          onClick={() => toggleDone(order)}
                          aria-label={`${order.done ? 'Batalkan selesai' : 'Tandai selesai'} pesanan ${order.customer_name}`}
                        >
                          <CheckIcon />
                          {order.done ? 'Batal selesai' : 'Pesanan selesai'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => editOrder(order.id)}
                          aria-label={`Ubah pesanan ${order.customer_name}`}
                        >
                          <Pencil /> Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            setPendingDelete({
                              id: order.id,
                              customer: order.customer_name,
                            })
                          }
                          aria-label={`Hapus pesanan ${order.customer_name}`}
                        >
                          <Trash2 /> Hapus
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="duo-card overflow-hidden rounded-2xl border-2">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[60rem] border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted text-muted-foreground text-left text-xs font-extrabold uppercase">
                        <th scope="col" className="px-3 py-2">
                          Pelanggan
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Penjual
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Pangsit
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Rasa
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Teh
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Total
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Catatan
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Waktu
                        </th>
                        <th scope="col" className="px-3 py-2 text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr
                          key={order.id}
                          className={cn(
                            'border-border border-t-2',
                            order.done
                              ? 'bg-pastel-green/70 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-100'
                              : 'bg-card even:bg-muted/30',
                          )}
                        >
                          <td className="px-3 py-2 font-extrabold">
                            <span className="flex items-center gap-1.5">
                              {order.done && (
                                <CheckIcon className="size-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                              )}
                              {order.customer_name}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-semibold">
                            {order.seller}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {order.food_quantity}
                          </td>
                          <td className="px-3 py-2">
                            {order.food_flavors.length ? (
                              <span className="flex flex-wrap gap-1">
                                {flavorGroups(order.food_flavors).map(
                                  (group) => (
                                    <span
                                      key={group.entry}
                                      className="inline-flex items-center gap-1"
                                    >
                                      <FlavorChip entry={group.entry} />
                                      <span className="text-xs font-bold">
                                        ×{group.count}
                                      </span>
                                    </span>
                                  ),
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {order.drink_quantity}
                          </td>
                          <td className="px-3 py-2 font-bold tabular-nums">
                            {rupiah.format(order.price)}
                          </td>
                          <td className="text-muted-foreground max-w-56 truncate px-3 py-2">
                            {order.note ?? '—'}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 text-xs font-medium whitespace-nowrap">
                            {clock(order.created_at)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant={order.done ? 'outline' : 'special'}
                                size="xs"
                                disabled={busy}
                                onClick={() => toggleDone(order)}
                                aria-label={`${order.done ? 'Batalkan selesai' : 'Tandai selesai'} pesanan ${order.customer_name}`}
                              >
                                <CheckIcon />
                                {order.done ? 'Batal' : 'Selesai'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-xs"
                                disabled={busy}
                                onClick={() => editOrder(order.id)}
                                aria-label={`Ubah pesanan ${order.customer_name}`}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-xs"
                                disabled={busy}
                                onClick={() =>
                                  setPendingDelete({
                                    id: order.id,
                                    customer: order.customer_name,
                                  })
                                }
                                aria-label={`Hapus pesanan ${order.customer_name}`}
                              >
                                <Trash2 />
                              </Button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Hapus pesanan?</AlertDialogTitle>
          <AlertDialogDescription>
            Pesanan {pendingDelete?.customer} akan dihapus permanen. Tindakan
            ini tidak dapat dibatalkan.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={busy}>
                Batal
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (pendingDelete) {
                    void deleteOrder(pendingDelete.id);
                  }
                  setPendingDelete(null);
                }}
              >
                <Trash2 /> Hapus
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
