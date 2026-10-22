'use client';
import type { BazzarOrder } from '@be/modules/bazzar-orders/model';
import PageHero from '@fe/components/page-hero';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@fe/components/ui/dropdown-menu';
import { useStudents } from '@fe/hooks/use-students';
import { useUser } from '@fe/hooks/use-user';
import api from '@fe/lib/api';
import { cn } from '@fe/lib/utils';
import { InfoHint } from '@xirpl/shared/components/info-hint';
import XiRplMascot from '@xirpl/shared/components/mascot';
import { Button } from '@xirpl/shared/components/ui/button';
import { Skeleton } from '@xirpl/shared/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@xirpl/shared/components/ui/tooltip';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Boxes,
  CheckIcon,
  ChefHat,
  ChevronDown,
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
import { useRouter } from 'next/navigation';
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
  original: 'Original',
};
const FLAVOR_STYLE: Record<string, string> = {
  Pedas:
    'border-red-300 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  Balado:
    'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300',
  Manis:
    'border-pink-300 bg-pink-100 text-pink-800 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300',
  Original:
    'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
};
type GroupBy = 'none' | 'students' | 'item';
type SortKey =
  | 'created_at'
  | 'customer_name'
  | 'seller'
  | 'food_quantity'
  | 'food_flavors'
  | 'drink_quantity'
  | 'price'
  | 'note'
  | 'done';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'created_at', label: 'Waktu' },
  { key: 'customer_name', label: 'Pelanggan' },
  { key: 'seller', label: 'Penjual' },
  { key: 'food_quantity', label: 'Pangsit' },
  { key: 'food_flavors', label: 'Rasa' },
  { key: 'drink_quantity', label: 'Lemon Tea' },
  { key: 'price', label: 'Total' },
  { key: 'note', label: 'Catatan' },
  { key: 'done', label: 'Status' },
];

const SORT_LABELS: Record<SortKey, string> = {
  created_at: 'Waktu',
  customer_name: 'Pelanggan',
  seller: 'Penjual',
  food_quantity: 'Pangsit',
  food_flavors: 'Rasa',
  drink_quantity: 'Lemon Tea',
  price: 'Total',
  note: 'Catatan',
  done: 'Status',
};
type StudentSortKey = 'orders' | 'revenue' | 'name' | 'nis' | 'food' | 'drink';

const STUDENT_SORT_OPTIONS: { key: StudentSortKey; label: string }[] = [
  { key: 'orders', label: 'Jumlah Pesanan' },
  { key: 'revenue', label: 'Total Penjualan' },
  { key: 'name', label: 'Nama Siswa' },
  { key: 'nis', label: 'Nomor NIS' },
  { key: 'food', label: 'Pangsit' },
  { key: 'drink', label: 'Lemon Tea' },
];

const STUDENT_SORT_LABELS: Record<StudentSortKey, string> = {
  orders: 'Jumlah Pesanan',
  revenue: 'Total Penjualan',
  name: 'Nama Siswa',
  nis: 'Nomor NIS',
  food: 'Pangsit',
  drink: 'Lemon Tea',
};

const TABLE_COLUMNS: {
  key: SortKey;
  label: string;
}[] = [
  { key: 'customer_name', label: 'Pelanggan' },
  { key: 'seller', label: 'Penjual' },
  { key: 'food_quantity', label: 'Pangsit' },
  { key: 'food_flavors', label: 'Rasa' },
  { key: 'drink_quantity', label: 'Lemon Tea' },
  { key: 'price', label: 'Total' },
  { key: 'note', label: 'Catatan' },
  { key: 'created_at', label: 'Waktu' },
];

function ActionTooltip({
  category,
  label,
  children,
}: {
  category: string;
  label: React.ReactNode;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-center font-medium shadow-md"
      >
        <span className="font-extrabold text-xs">{category}</span>
        {typeof label === 'string' ? (
          <span className="text-[11px] opacity-80">{label}</span>
        ) : (
          label
        )}
      </TooltipContent>
    </Tooltip>
  );
}

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

const toPayloadFlavor = (picked: string[]) => {
  const selected = FLAVORS.filter((flavor) => picked.includes(flavor));
  return selected.length > 0 ? selected.join('+') : 'original';
};

const flavorLabel = (entry: string) => {
  if (!entry || entry === 'original') return 'Original';
  return entry
    .split('+')
    .map((flavor) => FLAVOR_LABEL[flavor] ?? flavor)
    .join(' + ');
};

/** Group identical picks so the summary reads "Pedas ×2" not "Pedas, Pedas". */
function flavorGroups(
  entries: string[],
  foodQuantity?: number,
): { entry: string; count: number }[] {
  const groups = new Map<string, { entry: string; count: number }>();
  let recordedCount = 0;
  for (const entry of entries) {
    const key = !entry || entry === 'original' ? 'original' : entry;
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { entry: key, count: 1 });
    recordedCount += 1;
  }
  if (foodQuantity && foodQuantity > recordedCount) {
    const remaining = foodQuantity - recordedCount;
    const group = groups.get('original');
    if (group) group.count += remaining;
    else groups.set('original', { entry: 'original', count: remaining });
  }
  return [...groups.values()];
}

/** `entry` is the raw stored value: "pedas", "original", or "pedas+manis". */
function FlavorChip({ entry }: { entry: string }) {
  const isMix = entry.includes('+');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold',
        isMix
          ? 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300'
          : (FLAVOR_STYLE[FLAVOR_LABEL[entry] ?? 'Original'] ??
              'border-border bg-muted text-muted-foreground'),
      )}
    >
      {isMix && <Split className="size-3" />}
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
          {(name: string) => (
            <ComboboxItem key={name} value={name}>
              <span className="truncate font-semibold">{name}</span>
              <span className="text-muted-foreground ml-auto text-xs font-medium">
                {nisByName.get(name)}
              </span>
            </ComboboxItem>
          )}
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
function BazzarOrdersSkeleton({ canManage = false }: { canManage?: boolean }) {
  return (
    <main
      className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6"
      role="status"
      aria-label="Memuat pesanan bazzar"
    >
      <Skeleton className="h-40 rounded-3xl" />
      {canManage && <Skeleton className="h-72 rounded-3xl" />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function BazzarOrdersPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [students] = useStudents();
  const canManage =
    user?.id === 'd1f8f009-f157-49eb-abc8-44ae6a55a409' ||
    user?.role === 'developer';
  const [orders, setOrders] = useState<BazzarOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'table'>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [studentSortKey, setStudentSortKey] =
    useState<StudentSortKey>('orders');
  const [studentSortDir, setStudentSortDir] = useState<SortDir>('desc');
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    customer: string;
  } | null>(null);
  const busyRef = useRef(false);

  // ponytail: polling + immediate reload on action; upgrade to WebSocket/SSE if multi-user latency needs sub-second sync
  const load = useCallback(async (silent: boolean, force = false) => {
    if (busyRef.current && !force) return;
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
    if (!user) return;
    void load(false);
  }, [user, load]);

  // Auto refresh every 5s; hidden tabs skip the poll.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      if (!document.hidden) void load(true);
    }, 5000);
    return () => clearInterval(id);
  }, [user, load]);
  useEffect(() => {
    if (userLoading || user) return;
    router.replace('/login?r=%2Fbazzar-orders');
  }, [router, user, userLoading]);

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(
        key === 'created_at' ||
          key === 'price' ||
          key === 'food_quantity' ||
          key === 'drink_quantity'
          ? 'desc'
          : 'asc',
      );
    }
  };

  const sortOrders = useCallback(
    (list: BazzarOrder[]) => {
      return [...list].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'created_at':
            cmp =
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime();
            break;
          case 'customer_name':
            cmp = a.customer_name.localeCompare(b.customer_name, 'id-ID', {
              sensitivity: 'base',
            });
            break;
          case 'seller':
            cmp = a.seller.localeCompare(b.seller, 'id-ID', {
              sensitivity: 'base',
            });
            break;
          case 'food_quantity':
            cmp = a.food_quantity - b.food_quantity;
            break;
          case 'food_flavors':
            cmp = a.food_flavors
              .join('+')
              .localeCompare(b.food_flavors.join('+'), 'id-ID');
            break;
          case 'drink_quantity':
            cmp = a.drink_quantity - b.drink_quantity;
            break;
          case 'price':
            cmp = a.price - b.price;
            break;
          case 'note':
            cmp = (a.note ?? '').localeCompare(b.note ?? '', 'id-ID');
            break;
          case 'done':
            cmp = Number(a.done) - Number(b.done);
            break;
        }
        if (cmp === 0) {
          cmp =
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    },
    [sortKey, sortDir],
  );

  const sortedOrders = useMemo(() => sortOrders(orders), [orders, sortOrders]);

  const itemGroups = useMemo(() => {
    const foodOrders = sortedOrders.filter((o) => o.food_quantity > 0);
    const drinkOrders = sortedOrders.filter((o) => o.drink_quantity > 0);

    const foodSum = foodOrders.reduce((sum, o) => sum + o.food_quantity, 0);
    const drinkSum = drinkOrders.reduce((sum, o) => sum + o.drink_quantity, 0);

    return [
      {
        id: 'food',
        title: 'Pangsit Sitt',
        subtitle: 'Rp5.000/porsi · Varian: Pedas, Balado, Manis, Original',
        icon: UtensilsCrossed,
        orders: foodOrders,
        summary: {
          orderCount: foodOrders.length,
          foodCount: foodSum,
          drinkCount: 0,
          totalPrice: foodSum * 5000,
          doneCount: foodOrders.filter((o) => o.done).length,
        },
      },
      {
        id: 'drink',
        title: 'Es Lemon Tea Mager',
        subtitle: 'Rp5.000/cup · Minuman dingin segar',
        icon: Coffee,
        orders: drinkOrders,
        summary: {
          orderCount: drinkOrders.length,
          foodCount: 0,
          drinkCount: drinkSum,
          totalPrice: drinkSum * 5000,
          doneCount: drinkOrders.filter((o) => o.done).length,
        },
      },
    ];
  }, [sortedOrders]);

  const studentGroups = useMemo(() => {
    const known = new Set<string>();
    const list: { name: string; nis?: number }[] = [];

    for (const s of students) {
      const key = s.name.trim().toLowerCase();
      if (!known.has(key)) {
        known.add(key);
        list.push({ name: s.name, nis: s.nis });
      }
    }

    for (const o of orders) {
      const key = o.seller.trim().toLowerCase();
      if (key && !known.has(key)) {
        known.add(key);
        list.push({ name: o.seller });
      }
    }

    const result = list.map((st) => {
      const stOrders = sortedOrders.filter(
        (o) => o.seller.trim().toLowerCase() === st.name.trim().toLowerCase(),
      );
      const foodSum = stOrders.reduce((sum, o) => sum + o.food_quantity, 0);
      const drinkSum = stOrders.reduce((sum, o) => sum + o.drink_quantity, 0);
      const totalPrice = stOrders.reduce((sum, o) => sum + o.price, 0);
      const doneCount = stOrders.filter((o) => o.done).length;

      return {
        id: `student-${st.name}`,
        title: st.name,
        subtitle: st.nis ? `NIS: ${st.nis}` : 'Penjual',
        nis: st.nis,
        icon: Users,
        orders: stOrders,
        summary: {
          orderCount: stOrders.length,
          foodCount: foodSum,
          drinkCount: drinkSum,
          totalPrice,
          doneCount,
        },
      };
    });

    return result.sort((a, b) => {
      let cmp = 0;
      switch (studentSortKey) {
        case 'name':
          cmp = a.title.localeCompare(b.title, 'id-ID');
          break;
        case 'nis': {
          const nisA = a.nis ?? 999999;
          const nisB = b.nis ?? 999999;
          cmp = nisA - nisB;
          break;
        }
        case 'orders':
          cmp = a.summary.orderCount - b.summary.orderCount;
          break;
        case 'revenue':
          cmp = a.summary.totalPrice - b.summary.totalPrice;
          break;
        case 'food':
          cmp = a.summary.foodCount - b.summary.foodCount;
          break;
        case 'drink':
          cmp = a.summary.drinkCount - b.summary.drinkCount;
          break;
      }
      if (cmp === 0) {
        return a.title.localeCompare(b.title, 'id-ID');
      }
      return studentSortDir === 'asc' ? cmp : -cmp;
    });
  }, [students, orders, sortedOrders, studentSortKey, studentSortDir]);

  const activeGroups =
    groupBy === 'item'
      ? itemGroups
      : groupBy === 'students'
        ? studentGroups
        : null;

  if (userLoading || !user || (loading && orders.length === 0))
    return <BazzarOrdersSkeleton canManage={canManage} />;

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
      setError(
        'Isi minimal satu porsi Pangsit Sitt atau satu cup Es Lemon Tea Mager.',
      );
      return;
    }
    const flavors = form.flavors.slice(0, form.food_quantity);

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
      await load(true, true);
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
            picked:
              !entry || entry === 'original'
                ? []
                : entry
                    .split('+')
                    .filter((f) =>
                      FLAVORS.includes(f as (typeof FLAVORS)[number]),
                    ),
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
      await load(true, true);
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
      await load(true, true);
    });
  }
  const renderOrderCard = (order: BazzarOrder) => {
    const groups = flavorGroups(order.food_flavors, order.food_quantity);
    return (
      <li
        key={order.id}
        className={cn(
          'duo-card relative overflow-hidden rounded-2xl border-2 p-4',
          order.done
            ? 'border-emerald-400 bg-pastel-green/60 [--duo-shade:rgb(16_185_129/0.35)] dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:[--duo-shade:rgb(0_0_0/0.4)]'
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
              Pangsit Sitt
            </dt>
            <dd className="font-extrabold">{order.food_quantity} porsi</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-bold uppercase">
              Es Lemon Tea Mager
            </dt>
            <dd className="font-extrabold">{order.drink_quantity} cup</dd>
          </div>
        </dl>

        {groups.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 pl-2">
            {groups.map((group) => (
              <li key={group.entry} className="flex items-center gap-1">
                <FlavorChip entry={group.entry} />
                <span className="text-muted-foreground text-xs font-bold">
                  ×{group.count}
                </span>
              </li>
            ))}
          </ul>
        )}

        {order.note && (
          <p className="mt-2 rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1 pl-2 text-sm font-medium whitespace-pre-wrap">
            {order.note}
          </p>
        )}

        <p className="text-muted-foreground mt-2 pl-2 text-xs font-medium">
          Dibuat: {clock(order.created_at)}
          {order.updated_at !== order.created_at &&
            ` · Diperbarui: ${clock(order.updated_at)}`}
        </p>

        {canManage && (
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
        )}
      </li>
    );
  };

  const renderOrdersTable = (items: BazzarOrder[]) => (
    <div className="duo-card overflow-hidden rounded-2xl border-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] border-collapse text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-left text-xs font-extrabold uppercase">
              {TABLE_COLUMNS.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={() => handleSort(col.key)}
                    className="group/th cursor-pointer select-none px-3 py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    aria-sort={
                      isSorted
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {isSorted ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="size-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="size-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-30 transition-opacity group-hover/th:opacity-100" />
                      )}
                    </div>
                  </th>
                );
              })}
              {canManage && (
                <th scope="col" className="px-3 py-2 text-right">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((order) => (
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
                <td className="px-3 py-2 font-semibold">{order.seller}</td>
                <td className="px-3 py-2 tabular-nums">
                  {order.food_quantity}
                </td>
                <td className="px-3 py-2">
                  {order.food_quantity > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {flavorGroups(
                        order.food_flavors,
                        order.food_quantity,
                      ).map((group) => (
                        <span
                          key={group.entry}
                          className="inline-flex items-center gap-1"
                        >
                          <FlavorChip entry={group.entry} />
                          <span className="text-xs font-bold">
                            ×{group.count}
                          </span>
                        </span>
                      ))}
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
                {canManage && (
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const totalItems = form.food_quantity + form.drink_quantity;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHero
        pill="Kantin bazzar"
        title="Pesanan Bazzar"
        desc="Pangsit Sitt (Rp5.000/porsi) & Es Lemon Tea Mager (Rp5.000/cup)"
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

      {canManage && (
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
                Pangsit Sitt
                <input
                  type="number"
                  min="0"
                  max="214748"
                  step="1"
                  required
                  value={form.food_quantity}
                  onChange={(event) =>
                    setFoodQuantity(
                      event.target.value === ''
                        ? 0
                        : Number(event.target.value),
                    )
                  }
                  className="border-input bg-background focus-visible:border-ring h-11 rounded-xl border-2 px-3 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm font-bold">
                  Varian rasa per porsi Pangsit Sitt{' '}
                  <span className="text-muted-foreground font-medium">
                    (kosongkan untuk Original, boleh lebih dari satu = mix)
                  </span>
                </p>
                {form.food_quantity === 0 && (
                  <p className="text-muted-foreground rounded-xl border-2 border-dashed p-3 text-sm">
                    Isi jumlah porsi dulu untuk memilih rasa.
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
                      {row.picked.length === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-700 max-sm:order-2 dark:bg-slate-800 dark:text-slate-300">
                          Original
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <label className="grid gap-1.5 font-bold">
              Es Lemon Tea Mager
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
                      event.target.value === ''
                        ? 0
                        : Number(event.target.value),
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
      )}

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
            aria-label="Filter dan tampilan daftar pesanan"
            className="flex flex-wrap items-center gap-2"
          >
            {/* [Sort] */}
            <div className="border-border bg-card flex rounded-xl border-2 p-1">
              <DropdownMenu>
                <ActionTooltip
                  category="Urutkan"
                  label={
                    groupBy === 'students' ? (
                      <div className="flex flex-col items-center gap-0.5 text-[11px] opacity-90">
                        <span className="inline-flex items-center gap-1">
                          <span>{STUDENT_SORT_LABELS[studentSortKey]}</span>
                          {studentSortDir === 'asc' ? (
                            <ArrowUp className="size-3 text-primary shrink-0" />
                          ) : (
                            <ArrowDown className="size-3 text-primary shrink-0" />
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span>{SORT_LABELS[sortKey]}</span>
                          {sortDir === 'asc' ? (
                            <ArrowUp className="size-3 text-primary shrink-0" />
                          ) : (
                            <ArrowDown className="size-3 text-primary shrink-0" />
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] opacity-90">
                        <span>{SORT_LABELS[sortKey]}</span>
                        {sortDir === 'asc' ? (
                          <ArrowUp className="size-3 text-primary shrink-0" />
                        ) : (
                          <ArrowDown className="size-3 text-primary shrink-0" />
                        )}
                      </span>
                    )
                  }
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Urutkan pesanan"
                      className="flex items-center justify-center rounded-lg p-1.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ArrowUpDown className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                </ActionTooltip>
                <DropdownMenuContent align="end" className="w-56">
                  {groupBy === 'students' ? (
                    <>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          Urutkan pesanan
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent sideOffset={8} className="w-56">
                          <DropdownMenuLabel>
                            Urutkan berdasarkan
                          </DropdownMenuLabel>
                          <DropdownMenuRadioGroup
                            value={sortKey}
                            onValueChange={(val) => setSortKey(val as SortKey)}
                          >
                            {SORT_OPTIONS.map((opt) => (
                              <DropdownMenuRadioItem
                                key={opt.key}
                                value={opt.key}
                              >
                                {opt.label}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Arah urutan</DropdownMenuLabel>
                          <DropdownMenuRadioGroup
                            value={sortDir}
                            onValueChange={(val) => setSortDir(val as SortDir)}
                          >
                            <DropdownMenuRadioItem value="asc">
                              Menaik (A-Z, 0-9)
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="desc">
                              Menurun (Z-A, 9-0)
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Urutkan siswa</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={studentSortKey}
                        onValueChange={(val) => {
                          const nextKey = val as StudentSortKey;
                          setStudentSortKey(nextKey);
                          setStudentSortDir(
                            nextKey === 'name' || nextKey === 'nis'
                              ? 'asc'
                              : 'desc',
                          );
                        }}
                      >
                        {STUDENT_SORT_OPTIONS.map((opt) => (
                          <DropdownMenuRadioItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Arah urutan siswa</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={studentSortDir}
                        onValueChange={(val) =>
                          setStudentSortDir(val as SortDir)
                        }
                      >
                        <DropdownMenuRadioItem value="asc">
                          Menaik (A-Z, 0-9)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="desc">
                          Menurun (Z-A, 9-0)
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel>Urutkan berdasarkan</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={sortKey}
                        onValueChange={(val) => setSortKey(val as SortKey)}
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <DropdownMenuRadioItem key={opt.key} value={opt.key}>
                            {opt.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Arah urutan</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={sortDir}
                        onValueChange={(val) => setSortDir(val as SortDir)}
                      >
                        <DropdownMenuRadioItem value="asc">
                          Menaik (A-Z, 0-9)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="desc">
                          Menurun (Z-A, 9-0)
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* [None|Students|Item] */}
            <div className="border-border bg-card flex rounded-xl border-2 p-1">
              <ActionTooltip category="Kelompokkan" label="Tidak ada">
                <button
                  type="button"
                  aria-pressed={groupBy === 'none'}
                  onClick={() => setGroupBy('none')}
                  aria-label="Tanpa grup"
                  className={cn(
                    'flex items-center justify-center rounded-lg p-1.5 text-sm font-bold transition-colors',
                    groupBy === 'none'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Ban className="size-4" />
                </button>
              </ActionTooltip>

              <ActionTooltip category="Kelompokkan" label="Murid">
                <button
                  type="button"
                  aria-pressed={groupBy === 'students'}
                  onClick={() => setGroupBy('students')}
                  aria-label="Grup berdasarkan murid"
                  className={cn(
                    'flex items-center justify-center rounded-lg p-1.5 text-sm font-bold transition-colors',
                    groupBy === 'students'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Users className="size-4" />
                </button>
              </ActionTooltip>

              <ActionTooltip category="Kelompokkan" label="Item">
                <button
                  type="button"
                  aria-pressed={groupBy === 'item'}
                  onClick={() => setGroupBy('item')}
                  aria-label="Grup berdasarkan item"
                  className={cn(
                    'flex items-center justify-center rounded-lg p-1.5 text-sm font-bold transition-colors',
                    groupBy === 'item'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Boxes className="size-4" />
                </button>
              </ActionTooltip>
            </div>

            {/* [Grid|Table] */}
            <div className="border-border bg-card flex rounded-xl border-2 p-1">
              <ActionTooltip category="Tampilkan" label="Grid">
                <button
                  type="button"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                  aria-label="Tampilan grid"
                  className={cn(
                    'flex items-center justify-center rounded-lg p-1.5 text-sm font-bold transition-colors',
                    view === 'list'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <LayoutList className="size-4" />
                </button>
              </ActionTooltip>

              <ActionTooltip category="Tampilkan" label="Tabel">
                <button
                  type="button"
                  aria-pressed={view === 'table'}
                  onClick={() => setView('table')}
                  aria-label="Tampilan tabel"
                  className={cn(
                    'flex items-center justify-center rounded-lg p-1.5 text-sm font-bold transition-colors',
                    view === 'table'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Table2 className="size-4" />
                </button>
              </ActionTooltip>
            </div>
          </div>
        </div>
        {loading && orders.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
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
                  label: 'Pangsit Sitt',
                  value: foodCount,
                  note: 'porsi',
                  Icon: UtensilsCrossed,
                  tone: 'border-orange-300 bg-orange-100/80 text-orange-900',
                },
                {
                  label: 'Es Lemon Tea Mager',
                  value: drinkCount,
                  note: 'cup',
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
            ) : activeGroups ? (
              <div className="space-y-4">
                {groupBy === 'students' && (
                  <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
                    <span>{studentGroups.length} murid</span>
                    <span className="inline-flex items-center gap-1">
                      <span>
                        Urutan murid: {STUDENT_SORT_LABELS[studentSortKey]}
                      </span>
                      {studentSortDir === 'asc' ? (
                        <ArrowUp className="size-3 text-primary shrink-0" />
                      ) : (
                        <ArrowDown className="size-3 text-primary shrink-0" />
                      )}
                    </span>
                  </div>
                )}
                {activeGroups.map((group) => (
                  <details
                    key={group.id}
                    open={group.orders.length > 0}
                    className="duo-card group rounded-2xl border-2 bg-card overflow-hidden transition-all"
                  >
                    <summary className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer select-none hover:bg-muted/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 bg-pastel-blue/60 border-brand-blue/30 text-brand-navy dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-300">
                          <group.icon className="size-4" />
                        </span>
                        <div>
                          <h3 className="font-display text-base font-extrabold">
                            {group.title}
                          </h3>
                          {group.subtitle && (
                            <p className="text-muted-foreground text-xs font-medium">
                              {group.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                          <span className="rounded-lg border bg-muted/60 px-2 py-0.5">
                            {group.summary.orderCount} pesanan
                          </span>
                          {group.summary.foodCount > 0 && (
                            <span className="rounded-lg border border-orange-300 bg-orange-100/80 px-2 py-0.5 text-orange-950 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
                              {group.summary.foodCount} porsi
                            </span>
                          )}
                          {group.summary.drinkCount > 0 && (
                            <span className="rounded-lg border border-emerald-300 bg-pastel-green/70 px-2 py-0.5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                              {group.summary.drinkCount} cup
                            </span>
                          )}
                          <span className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                            {rupiah.format(group.summary.totalPrice)}
                          </span>
                          {group.summary.doneCount > 0 && (
                            <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-white">
                              {group.summary.doneCount} selesai
                            </span>
                          )}
                        </div>
                        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                      </div>
                    </summary>

                    <div className="border-t-2 border-border p-4">
                      {group.orders.length === 0 ? (
                        <p className="text-muted-foreground text-xs italic py-2 text-center">
                          Belum ada pesanan untuk {group.title}.
                        </p>
                      ) : view === 'list' ? (
                        <ul className="grid gap-3 md:grid-cols-2">
                          {group.orders.map((order) => renderOrderCard(order))}
                        </ul>
                      ) : (
                        renderOrdersTable(group.orders)
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ) : view === 'list' ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {sortedOrders.map((order) => renderOrderCard(order))}
              </ul>
            ) : (
              renderOrdersTable(sortedOrders)
            )}
          </>
        )}
      </section>

      {canManage && (
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
      )}
    </main>
  );
}
