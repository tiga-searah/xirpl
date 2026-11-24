export const TZ_OFFSET = 420; // WIB UTC+7 in minutes

export const MODULE_MAX = {
  checkins: 30,
  prays: 20,
  sports: 25,
  studies: 25,
} as const;

export const MODULE_UI_MAX = {
  hadir: 30,
  ibadah: 20,
  olahraga: 25,
  belajar: 25,
} as const;

export function getWibHour(d: Date | string): number {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(date.getTime() + TZ_OFFSET * 60_000).getUTCHours();
}

/** WIB minutes since midnight (0-1439). */
export function getWibMinuteOfDay(d: Date | string): number {
  const date = typeof d === 'string' ? new Date(d) : d;
  const wib = new Date(date.getTime() + TZ_OFFSET * 60_000);
  return wib.getUTCHours() * 60 + wib.getUTCMinutes();
}
export const GRACE_HOUR = 3; // 03:00 AM WIB

export function getEditableJournalDates(now: Date = new Date()): string[] {
  const wibTime = now.getTime() + TZ_OFFSET * 60_000;
  const todayStr = new Date(wibTime).toISOString().slice(0, 10);
  const hour = new Date(wibTime).getUTCHours();
  if (hour < GRACE_HOUR) {
    const yesterdayStr = new Date(wibTime - 86_400_000)
      .toISOString()
      .slice(0, 10);
    return [todayStr, yesterdayStr];
  }
  return [todayStr];
}

export type CheckinScoreData = {
  checked_in_at?: Date | string | null;
  type?: 'school' | 'morning' | string | null;
  date?: string | null;
};

export function computeCheckinScore(checkin?: CheckinScoreData | null): number {
  if (!checkin?.checked_in_at) return 0;
  const at =
    typeof checkin.checked_in_at === 'string'
      ? new Date(checkin.checked_in_at)
      : checkin.checked_in_at;
  const m = getWibMinuteOfDay(at);
  const type = checkin.type === 'morning' ? 'morning' : 'school';
  // 06:01 on wake-up days, 07:01 on school days: 00:00-06:00 keeps 30.
  const deadline = 60 * (type === 'morning' ? 6 : 7) + 1;

  if (m < deadline) return 30;
  const lateHours = Math.floor((m - deadline) / 60) + 1;
  return Math.max(0, 30 - lateHours);
}

export type PrayScoreData = {
  prayed_dhuha?: boolean | null;
  prayed_tahajud?: boolean | null;
  prayed_qabliyah_fajr?: boolean | null;
  prayed_badiyah_isya?: boolean | null;
};

export function computePrayScore(prays?: PrayScoreData | null): number {
  if (!prays) return 0;
  let score = 0;
  if (prays.prayed_dhuha === true) score += 5;
  if (prays.prayed_tahajud === true) score += 7;
  if (prays.prayed_qabliyah_fajr === true) score += 4;
  if (prays.prayed_badiyah_isya === true) score += 4;
  return score;
}

export type SportScoreData = {
  did_sport?: boolean | null;
  sport_type?: string | null;
  sport_duration?: number | string | null;
  sport_proof_url?: string | null;
  sport_skip_reason?: string | null;
};

function hasDuration(val?: number | string | null): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return val > 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '00:00:00' || trimmed === '0') return false;
    const [h = 0, m = 0] = trimmed.split(':').map(Number);
    return h * 60 + m > 0;
  }
  return false;
}

export function computeSportScore(sport?: SportScoreData | null): number {
  if (!sport || sport.did_sport === null || sport.did_sport === undefined)
    return 0;
  if (sport.did_sport === true) {
    let score = 3;
    if (sport.sport_type?.trim()) score += 5;
    if (hasDuration(sport.sport_duration)) score += 5;
    if (sport.sport_proof_url?.trim()) score += 12;
    return score;
  }
  let score = 1;
  if (sport.sport_skip_reason?.trim()) score += 2;
  return score;
}

export type StudyScoreData = {
  did_study?: boolean | null;
  study_about?: string | null;
  study_media?: string | null;
  study_start_proof_url?: string | null;
  study_end_proof_url?: string | null;
  study_skip_reason?: string | null;
};

export function computeStudyScore(study?: StudyScoreData | null): number {
  if (!study || study.did_study === null || study.did_study === undefined)
    return 0;
  if (study.did_study === true) {
    let score = 3;
    if (study.study_about?.trim()) score += 4;
    if (study.study_media?.trim()) score += 4;
    if (study.study_start_proof_url?.trim()) score += 7;
    if (study.study_end_proof_url?.trim()) score += 7;
    return score;
  }
  let score = 1;
  if (study.study_skip_reason?.trim()) score += 2;
  return score;
}

export type DayScoreResult = {
  checkins: number;
  prays: number;
  sports: number;
  studies: number;
  total: number;
};

export function computeDayScore(
  journal?: (PrayScoreData & SportScoreData & StudyScoreData) | null,
  checkin?: CheckinScoreData | null,
): DayScoreResult {
  const checkins = computeCheckinScore(checkin);
  const prays = computePrayScore(journal);
  const sports = computeSportScore(journal);
  const studies = computeStudyScore(studyScoreData(journal));
  return {
    checkins,
    prays,
    sports,
    studies,
    total: checkins + prays + sports + studies,
  };
}

function studyScoreData(
  journal?: (PrayScoreData & SportScoreData & StudyScoreData) | null,
): StudyScoreData | null {
  if (!journal) return null;
  return {
    did_study: journal.did_study,
    study_about: journal.study_about,
    study_media: journal.study_media,
    study_start_proof_url: journal.study_start_proof_url,
    study_end_proof_url: journal.study_end_proof_url,
    study_skip_reason: journal.study_skip_reason,
  };
}
