import { resolve } from 'node:path';
import { db, genders, roles, usersTable } from './index';

type Role = (typeof roles)[number];
type Gender = (typeof genders)[number];
// ponytail: simple CSV line parser sufficient for unquoted/quoted class list without multi-line cells.
export async function seedUsersFromCsv(filePath?: string) {
  const csvPath =
    filePath ??
    resolve(
      import.meta.dir,
      '../../../drizzle-data-2026-10-20T02_01_09.793Z.csv',
    );
  const file = Bun.file(csvPath);
  if (!(await file.exists())) {
    throw new Error(`CSV seed file not found: ${csvPath}`);
  }

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return 0;

  const rows = lines.slice(1).map((line) => {
    // Parse CSV line handling quoted fields
    const matches: string[] = [];
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    let match: RegExpExecArray | null = null;
    while (true) {
      match = regex.exec(line);
      if (!match) break;
      matches.push(match[1] ?? match[2] ?? '');
    }
    const [id, email, username, nis, display_name, gender, role] = matches;
    const roleValue = (roles as readonly string[]).includes(role ?? '')
      ? (role as Role)
      : 'member';
    const genderValue = (genders as readonly string[]).includes(gender ?? '')
      ? (gender as Gender)
      : null;
    return {
      id: id!,
      email: email!,
      username: username!,
      nis: nis ? Number.parseInt(nis, 10) : null,
      display_name: display_name || null,
      gender: genderValue,
      role: roleValue,
    };
  });
  let count = 0;
  for (const row of rows) {
    await db
      .insert(usersTable)
      .values(row)
      .onConflictDoUpdate({
        target: usersTable.id,
        set: {
          email: row.email,
          username: row.username,
          nis: row.nis,
          display_name: row.display_name,
          gender: row.gender,
          role: row.role,
        },
      });
    count++;
  }

  return count;
}

if (import.meta.main) {
  const count = await seedUsersFromCsv();
  console.log(`Seeded ${count} users from CSV into database.`);
}
