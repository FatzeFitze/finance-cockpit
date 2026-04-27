export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeTagKey(value: string): string {
  return normalizeTagName(value).toLocaleLowerCase();
}