import { cookies } from 'next/headers';
import crypto from 'crypto';

export const SID_COOKIE = 'as_uid';

export async function getSid(): Promise<string | null> {
  return (await cookies()).get(SID_COOKIE)?.value ?? null;
}

export function newSid(): string {
  return crypto.randomBytes(12).toString('hex');
}
