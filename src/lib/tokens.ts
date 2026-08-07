import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type StoredToken = { accessToken: string; refreshToken?: string; expiresAt: number };
type Store = { x?: StoredToken; google?: StoredToken };

const FILE = path.join(process.cwd(), '.data', 'tokens.json');

export async function readTokens(): Promise<Store> {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return {};
  }
}

export async function saveToken(service: 'x' | 'google', token: StoredToken): Promise<void> {
  const store = await readTokens();
  store[service] = token;
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2));
}
