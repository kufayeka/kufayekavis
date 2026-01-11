import { customAlphabet } from "nanoid";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const nanoid5 = customAlphabet(ALPHABET, 5);

export function createShortId(): string {
  return nanoid5();
}

export function isShortId(id: string): boolean {
  return typeof id === "string" && /^[a-z0-9]{5}$/.test(id);
}
