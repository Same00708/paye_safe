import { query } from "../db/pool";
import { PAYSAFE_USERS_TABLE } from "../db/paysafeSchema";

export type UserRole = "user" | "admin";

export interface UserRow {
  user_id: number;
  username: string;
  phone_number: string;
  full_name: string;
  avatar_url: string | null;
  fedapay_id: string | null;
  role: string;
  created_at: Date;
}

export function mapUser(row: UserRow) {
  const role = (row.role === "admin" ? "admin" : "user") as UserRole;
  return {
    userId: row.user_id,
    username: row.username,
    phoneNumber: row.phone_number,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    fedapayId: row.fedapay_id,
    role,
    createdAt: row.created_at?.toISOString?.() ?? new Date().toISOString(),
  };
}

export function phoneLookupVariants(normalizedE164: string): string[] {
  const variants = new Set<string>();
  variants.add(normalizedE164);

  const digits = normalizedE164.replace(/\D/g, "");
  if (digits.length >= 8) {
    variants.add(digits.slice(-8));
    variants.add(`+${digits}`);
    if (digits.startsWith("228") && digits.length >= 11) {
      variants.add(`+${digits}`);
      variants.add(digits.slice(3));
    }
  }

  return [...variants];
}

export async function findUserByPhone(normalizedE164: string) {
  const variants = phoneLookupVariants(normalizedE164);
  const { rows } = await query<UserRow>(
    `SELECT * FROM ${PAYSAFE_USERS_TABLE}
     WHERE phone_number = ANY($1::text[])
        OR RIGHT(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g'), 8) = RIGHT($2, 8)
     LIMIT 1`,
    [variants, normalizedE164.replace(/\D/g, "")],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: number) {
  const { rows } = await query<UserRow>(
    `SELECT * FROM ${PAYSAFE_USERS_TABLE} WHERE user_id = $1`,
    [id],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserByUsername(username: string) {
  const { rows } = await query<UserRow>(
    `SELECT * FROM ${PAYSAFE_USERS_TABLE} WHERE LOWER(username) = LOWER($1)`,
    [username],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findAllUsers() {
  const { rows } = await query<UserRow>(
    `SELECT * FROM ${PAYSAFE_USERS_TABLE} ORDER BY user_id`,
  );
  return rows.map(mapUser);
}

export async function countUsers() {
  const { rows } = await query<{ total: string; admins: string }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE role = 'admin')::text AS admins
     FROM ${PAYSAFE_USERS_TABLE}`,
  );
  return {
    total: Number(rows[0]?.total ?? 0),
    admins: Number(rows[0]?.admins ?? 0),
  };
}

export async function createUser(params: {
  username: string;
  phoneNumber: string;
  fullName: string;
  role?: UserRole;
}) {
  const { rows } = await query<UserRow>(
    `INSERT INTO ${PAYSAFE_USERS_TABLE} (username, phone_number, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.username, params.phoneNumber, params.fullName, params.role ?? "user"],
  );
  return mapUser(rows[0]!);
}

export async function setUserRole(userId: number, role: UserRole) {
  const { rows } = await query<UserRow>(
    `UPDATE ${PAYSAFE_USERS_TABLE} SET role = $2 WHERE user_id = $1 RETURNING *`,
    [userId, role],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function isUserAdmin(userId: number): Promise<boolean> {
  const user = await findUserById(userId);
  return user?.role === "admin";
}

export async function ensureDemoUsers() {
  const demos = [
    { username: "@marie", phoneNumber: "+22890123456", fullName: "Marie K." },
    { username: "@junior", phoneNumber: "+22890765432", fullName: "Junior A." },
  ];

  for (const demo of demos) {
    const existing = await findUserByPhone(demo.phoneNumber);
    if (!existing) {
      await createUser(demo);
    }
  }
}
