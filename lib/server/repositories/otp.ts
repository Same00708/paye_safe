import bcrypt from "bcryptjs";
import { query } from "../db/pool";

export type OtpPurpose = "login" | "register";

export interface OtpMetadata {
  fullName?: string;
  username?: string;
}

export async function saveOtp(
  phone: string,
  code: string,
  options: {
    purpose: OtpPurpose;
    metadata?: OtpMetadata;
    ttlMinutes?: number;
  },
) {
  const ttl = options.ttlMinutes ?? 10;
  const codeHash = await bcrypt.hash(code, 10);
  await query(
    `INSERT INTO otp_sessions (phone_number, code_hash, expires_at, purpose, metadata)
     VALUES ($1, $2, NOW() + ($3::integer * INTERVAL '1 minute'), $4, $5)
     ON CONFLICT (phone_number) DO UPDATE
     SET code_hash = EXCLUDED.code_hash,
         expires_at = EXCLUDED.expires_at,
         purpose = EXCLUDED.purpose,
         metadata = EXCLUDED.metadata`,
    [
      phone,
      codeHash,
      ttl,
      options.purpose,
      options.metadata ? JSON.stringify(options.metadata) : null,
    ],
  );
}

export async function verifyOtp(
  phone: string,
  code: string,
  expectedPurpose?: OtpPurpose,
): Promise<{ valid: boolean; metadata?: OtpMetadata }> {
  const { rows } = await query<{
    code_hash: string;
    expires_at: Date;
    purpose: OtpPurpose;
    metadata: OtpMetadata | null;
  }>(
    "SELECT code_hash, expires_at, purpose, metadata FROM otp_sessions WHERE phone_number = $1",
    [phone],
  );
  const row = rows[0];
  if (!row) return { valid: false };
  if (new Date() > row.expires_at) return { valid: false };
  if (expectedPurpose && row.purpose !== expectedPurpose) return { valid: false };

  const valid = await bcrypt.compare(code, row.code_hash);
  let metadata: OtpMetadata | undefined;
  if (row.metadata) {
    metadata =
      typeof row.metadata === "string"
        ? (JSON.parse(row.metadata) as OtpMetadata)
        : (row.metadata as OtpMetadata);
  }
  return { valid, metadata };
}

export async function deleteOtp(phone: string) {
  await query("DELETE FROM otp_sessions WHERE phone_number = $1", [phone]);
}
