import { studentTimeline, type TimelineDay } from '../charts/student-timeline';
import { drawSvg } from '../svg';
import { text } from '../text';
import { AVATAR_COLORS, COLORS, FONTS, P2, pt, SIZES } from '../theme';

export type StudentRecap = {
  id: string;
  nis: number | null;
  name: string;
  modules: { key: string; days: TimelineDay[] }[];
  rate: number;
  streaks: number;
};

/** First letter of the name, matching the reference's single-initial avatar. */
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

/** Stable colour per student, so a name always gets the same avatar. */
const avatarColor = (seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
};

/**
 * One student block: avatar with initial, name, NIS, the four-track activity
 * timeline, and Rate/Streaks on the right. `top` is the block's top edge in
 * reference px.
 */
export const drawStudent = (
  doc: PDFKit.PDFDocument,
  student: StudentRecap,
  days: number,
  top: number,
) => {
  const { avatar, nameX, nameBaseline, nisBaseline, stat } = P2;

  doc
    .circle(pt(avatar.cx), pt(top + avatar.cy), pt(avatar.r))
    .fill(avatarColor(student.id || student.name));
  doc.font(FONTS.bold).fontSize(SIZES.avatar);
  doc
    .fillColor(COLORS.white)
    .text(
      initial(student.name),
      pt(avatar.cx) - doc.widthOfString(initial(student.name)) / 2,
      pt(top + avatar.letterBaseline),
      { baseline: 'alphabetic', lineBreak: false },
    );

  text(doc, student.name, {
    font: FONTS.bold,
    size: SIZES.studentName,
    color: COLORS.ink,
    x: nameX,
    y: top + nameBaseline,
  });
  text(doc, student.nis === null ? '\u2014' : String(student.nis), {
    font: FONTS.regular,
    size: SIZES.studentNis,
    color: COLORS.ink,
    x: nameX,
    y: top + nisBaseline,
  });

  drawSvg(doc, studentTimeline(student.modules, days, top));

  const rows = [
    ['Rate', `${student.rate}%`, stat.rateBaseline],
    ['Streaks', String(student.streaks), stat.streakBaseline],
  ] as const;
  for (const [label, value, baseline] of rows) {
    text(doc, label, {
      font: FONTS.bold,
      size: SIZES.studentStat,
      color: COLORS.ink,
      x: stat.labelX,
      y: top + baseline,
    });
    text(doc, value, {
      font: FONTS.regular,
      size: SIZES.studentStat,
      color: COLORS.ink,
      right: stat.valueRight,
      y: top + baseline,
    });
  }
};
