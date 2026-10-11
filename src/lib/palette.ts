// Пастельные цвета для плиток и папок — стабильный цвет по id
export const FOLDER_COLORS = ["f-sky", "f-yellow", "f-lilac", "f-pink", "f-mint", "f-blue", "f-orange"] as const;

export function colorFor(key: string | number) {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return FOLDER_COLORS[h % FOLDER_COLORS.length];
}
