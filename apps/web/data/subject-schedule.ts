export interface TimeSlot {
  period: string;
  start: string;
  end: string;
  type?: 'class' | 'break' | 'event';
}

export interface Lesson {
  time: string;
  subject: string;
  teacher: string;
  room?: string;
  color: string;
  /** Cell content for the timetable grid (optional; the timeline only uses `color`). */
  bg?: string;
  startTime: string;
  endTime: string;
}

export interface Day {
  name: string;
  lessons: Lesson[];
}

/** Period count in the timetable grid (Period 0 shows as an event in the timeline). */
export const TIMETABLE_PERIODS = 11;

export interface TimetableCell {
  period: number;
  span: number;
  lesson: Lesson | null;
}

/** Period ranges: 'Jam 6-10' -> [6, 10]; 'Jam 5' -> [5, 5]. */
export function periodSpan(time: string): [number, number] {
  const [start, end] = (time.match(/\d+/g) ?? []).map(Number);
  return start ? [start, end ?? start] : [0, 0];
}

/** One table row: lesson cells with colSpan, interspersed with empty cells. */
export function timetableCells(lessons: Lesson[]): TimetableCell[] {
  const starts = new Map<number, TimetableCell>();
  for (const lesson of lessons) {
    const [from, to] = periodSpan(lesson.time);
    if (from < 1 || from > TIMETABLE_PERIODS) continue;
    starts.set(from, {
      period: from,
      span: Math.min(to, TIMETABLE_PERIODS) - from + 1,
      lesson,
    });
  }

  const cells: TimetableCell[] = [];
  for (let period = 1; period <= TIMETABLE_PERIODS; ) {
    const hit = starts.get(period);
    cells.push(hit ?? { period, span: 1, lesson: null });
    period += hit?.span ?? 1;
  }
  return cells;
}

export const mondaySchedule: TimeSlot[] = [
  { period: 'Jam 0/Apel/Upacara', start: '07:00', end: '07:40', type: 'event' },
  { period: 'Jam 1', start: '07:40', end: '08:20', type: 'class' },
  { period: 'Jam 2', start: '08:20', end: '09:00', type: 'class' },
  { period: 'Istirahat', start: '09:00', end: '09:30', type: 'break' },
  { period: 'Jam 3', start: '09:30', end: '10:10', type: 'class' },
  { period: 'Jam 4', start: '10:10', end: '10:50', type: 'class' },
  { period: 'Jam 5', start: '10:50', end: '11:30', type: 'class' },
  { period: 'Istirahat 2', start: '11:30', end: '12:30', type: 'break' },
  { period: 'Jam 6', start: '12:30', end: '13:05', type: 'class' },
  { period: 'Jam 7', start: '13:05', end: '13:40', type: 'class' },
  { period: 'Jam 8', start: '13:40', end: '14:15', type: 'class' },
  { period: 'Jam 9', start: '14:15', end: '14:50', type: 'class' },
  { period: 'Jam 10', start: '14:50', end: '15:25', type: 'class' },
  { period: 'Check', start: '15:25', end: '15:30', type: 'class' },
];

export const timeSchedule: TimeSlot[] = [
  { period: 'Jam 1', start: '07:00', end: '07:40', type: 'class' },
  { period: 'Jam 2', start: '07:40', end: '08:20', type: 'class' },
  { period: 'Jam 3', start: '08:20', end: '09:00', type: 'class' },
  { period: 'Istirahat', start: '09:00', end: '09:30', type: 'break' },
  { period: 'Jam 4', start: '09:30', end: '10:10', type: 'class' },
  { period: 'Jam 5', start: '10:10', end: '10:50', type: 'class' },
  { period: 'Jam 6', start: '10:50', end: '11:30', type: 'class' },
  { period: 'Istirahat 2', start: '11:30', end: '12:30', type: 'break' },
  { period: 'Jam 7', start: '12:30', end: '13:05', type: 'class' },
  { period: 'Jam 8', start: '13:05', end: '13:40', type: 'class' },
  { period: 'Jam 9', start: '13:40', end: '14:15', type: 'class' },
  { period: 'Jam 10', start: '14:15', end: '14:50', type: 'class' },
  { period: 'Jam 11', start: '14:50', end: '15:25', type: 'class' },
  { period: 'Check', start: '15:25', end: '15:30', type: 'class' },
];

export const fridaySchedule: TimeSlot[] = [
  {
    period: 'Jam 0/Kegiatan Jumat',
    start: '07:00',
    end: '07:45',
    type: 'event',
  },
  { period: 'Jam 1', start: '07:45', end: '08:25', type: 'class' },
  { period: 'Jam 2', start: '08:25', end: '09:05', type: 'class' },
  { period: 'Istirahat', start: '09:05', end: '09:25', type: 'break' },
  { period: 'Jam 3', start: '09:25', end: '10:05', type: 'class' },
  { period: 'Jam 4', start: '10:05', end: '10:45', type: 'class' },
  { period: 'Jam 5', start: '10:45', end: '11:15', type: 'class' },
  { period: 'Istirahat 2', start: '11:15', end: '12:30', type: 'break' },
  { period: 'Jam 6', start: '12:30', end: '13:15', type: 'class' },
  { period: 'Jam 7', start: '13:15', end: '13:55', type: 'class' },
  { period: 'Check', start: '13:55', end: '14:00', type: 'class' },
];

export const scheduleData: Day[] = [
  {
    name: 'Senin',
    lessons: [
      {
        time: 'Jam 1-2',
        subject: 'Bahasa Inggris',
        teacher: 'Yuli Rahayu, S.Pd.',
        room: 'R 1',
        color: 'border-orange-400',
        bg: 'bg-[#ff9966]',
        startTime: '07:40',
        endTime: '09:00',
      },
      {
        time: 'Jam 3-5',
        subject: 'PABP',
        teacher: 'Laely Hilalliyah, S.Fil.I, M.Pd.',
        room: 'R 1',
        color: 'border-pink-400',
        bg: 'bg-[#f58bea]',
        startTime: '09:30',
        endTime: '11:30',
      },
      {
        time: 'Jam 6-10',
        subject: 'KIK',
        teacher: 'Yunida, S.Si., M.Pd.',
        room: 'R 1',
        color: 'border-amber-400',
        bg: 'bg-[#f8bb99]',
        startTime: '12:30',
        endTime: '15:25',
      },
    ],
  },
  {
    name: 'Selasa',
    lessons: [
      {
        time: 'Jam 1-9',
        subject: 'RPL-PTGM',
        teacher: 'Alfian Faiz, S.Pd.',
        room: 'Lab RPL',
        color: 'border-green-500',
        bg: 'bg-[#91ff60]',
        startTime: '07:00',
        endTime: '14:15',
      },
      {
        time: 'Jam 10-11',
        subject: 'Desain Grafis',
        teacher: 'Sigit Purnomo, S.Pd.',
        room: 'Lab RPL',
        color: 'border-sky-400',
        bg: 'bg-[#c9e3f0]',
        startTime: '14:15',
        endTime: '15:25',
      },
    ],
  },
  {
    name: 'Rabu',
    lessons: [
      {
        time: 'Jam 1-3',
        subject: 'RPL-PTGM',
        teacher: 'Alfian Faiz, S.Pd.',
        room: 'Lab RPL',
        color: 'border-green-500',
        bg: 'bg-[#91ff60]',
        startTime: '07:00',
        endTime: '09:00',
      },
      {
        time: 'Jam 4-9',
        subject: 'RPL-PWeb',
        teacher: 'Abdul Adjis, S.Kom.',
        room: 'Lab RPL',
        color: 'border-violet-500',
        bg: 'bg-[#ad8bea]',
        startTime: '09:30',
        endTime: '14:15',
      },
      {
        time: 'Jam 10-11',
        subject: 'Bahasa Jepang',
        teacher: 'Santi Ihtiarini, S.Pd.',
        room: 'Lab RPL',
        color: 'border-yellow-400',
        bg: 'bg-[#ffffbf]',
        startTime: '14:15',
        endTime: '15:25',
      },
    ],
  },
  {
    name: 'Kamis',
    lessons: [
      {
        time: 'Jam 1-3',
        subject: 'Bahasa Indonesia',
        teacher: 'Chanifah Ulfah, S.Pd.',
        room: 'R 1',
        color: 'border-blue-500',
        bg: 'bg-[#0bb7e8]',
        startTime: '07:00',
        endTime: '09:00',
      },
      {
        time: 'Jam 4-5',
        subject: 'Sejarah',
        teacher: 'Solekha, S.Pd.',
        room: 'R 1',
        color: 'border-amber-700',
        bg: 'bg-[#743700]',
        startTime: '09:30',
        endTime: '10:50',
      },
      {
        time: 'Jam 6-7',
        subject: 'Pendidikan Pancasila',
        teacher: 'Maria Ulfa, S.Pd.',
        room: 'R 1',
        color: 'border-sky-400',
        bg: 'bg-[#58b2df]',
        startTime: '10:50',
        endTime: '13:05',
      },
      {
        time: 'Jam 8-9',
        subject: 'Bahasa Inggris',
        teacher: 'Yuli Rahayu, S.Pd.',
        room: 'R 1',
        color: 'border-orange-400',
        bg: 'bg-[#ff9966]',
        startTime: '13:05',
        endTime: '14:15',
      },
      {
        time: 'Jam 10-11',
        subject: 'Bahasa Jawa',
        teacher: 'Suharti, S.Pd.',
        room: 'R 1',
        color: 'border-emerald-400',
        bg: 'bg-[#98ef8d]',
        startTime: '14:15',
        endTime: '15:25',
      },
    ],
  },
  {
    name: 'Jumat',
    lessons: [
      {
        time: 'Jam 1-2',
        subject: 'PJOK',
        teacher: 'Anggara Indra Prasetyadi, S.Pd.',
        room: 'R 1',
        color: 'border-orange-400',
        bg: 'bg-[#c89bea]',
        startTime: '07:45',
        endTime: '09:05',
      },
      {
        time: 'Jam 3-5',
        subject: 'Matematika',
        teacher: 'Nur Anisa Nika Ismawati, S.Pd.',
        room: 'R 1',
        color: 'border-rose-700',
        bg: 'bg-[#a83539]',
        startTime: '09:25',
        endTime: '11:15',
      },
      {
        time: 'Jam 6-7',
        subject: 'Bimbingan Konseling',
        teacher: 'Yeni Sri Utami, S.Pd.',
        room: 'R 1',
        color: 'border-yellow-400',
        bg: 'bg-[#ffff00]',
        startTime: '12:30',
        endTime: '13:55',
      },
    ],
  },
];
