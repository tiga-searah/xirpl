'use client';

import type { HabitAdminCtx } from '@xirpl/shared/components/habit-admin/types';
import { useUser } from '../hooks/use-user';
import { fileUrl } from '../lib/api';
import {
  downloadRecapPdf,
  fetchClassSummary,
  fetchMemberDay,
  fetchMemberDetail,
  fetchMemberRows,
  fetchMembers,
  isAdminRole,
  MODULE_HEX,
} from './habit-admin';
import {
  attendanceCopy,
  checkinAt,
  fmtDate,
  fmtTime,
  HEAT_BG,
  HEAT_TEXT,
  IBADAH,
  isLateCheck,
  lateLabel,
  level,
  MODULES,
  MONTHS,
  sameDay,
  toLocalDate,
  WEEKDAYS,
} from './habit-data';

export const adminCtx: HabitAdminCtx = {
  useUser,
  isAdminRole,
  fileUrl,
  fetchMembers,
  fetchClassSummary,
  fetchMemberRows,
  fetchMemberDetail,
  fetchMemberDay,
  downloadRecapPdf,
  MODULE_HEX,
  MODULES,
  IBADAH,
  MONTHS,
  WEEKDAYS,
  HEAT_BG,
  HEAT_TEXT,
  sameDay,
  toLocalDate,
  fmtDate,
  fmtTime,
  checkinAt,
  isLateCheck,
  lateLabel,
  level,
  attendanceCopy,
};
