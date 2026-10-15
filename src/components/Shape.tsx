// Геометрические фигуры для вставок в заголовки и фона плиток.
export type ShapeName = "flower" | "star" | "ring" | "half" | "burst" | "bolt" | "petals";

function burst(points: number, r1: number, r2: number) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const BURST = burst(12, 12, 8.4);
const FLOWER = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 8;
  return [12 + 6.6 * Math.cos(a), 12 + 6.6 * Math.sin(a)] as const;
});

const SHAPES: Record<ShapeName, React.ReactNode> = {
  flower: (
    <>
      {FLOWER.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.6} />)}
      <circle cx={12} cy={12} r={4.2} />
    </>
  ),
  star: <path d="M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z" />,
  ring: <path fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm0 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />,
  half: <path d="M12 1a11 11 0 1 0 11 11H12Z" />,
  burst: <polygon points={BURST} />,
  bolt: <path d="M14.5 0 3 13.5h7.5L8.5 24 21 9.5h-7.6L14.5 0Z" />,
  petals: <path d="M12 0c3.3 0 6 2.7 6 6-3.3 0-6-2.7-6-6Zm0 0C8.7 0 6 2.7 6 6c3.3 0 6-2.7 6-6ZM24 12c0 3.3-2.7 6-6 6 0-3.3 2.7-6 6-6Zm0 0c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6ZM12 24c-3.3 0-6-2.7-6-6 3.3 0 6 2.7 6 6Zm0 0c3.3 0 6-2.7 6-6-3.3 0-6 2.7-6 6ZM0 12c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6Zm0 0c0 3.3 2.7 6 6 6 0-3.3-2.7-6-6-6Z" />,
};

export function Shape({ name, size = 24, className, style }: { name: ShapeName; size?: number | string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} fill="currentColor" aria-hidden focusable="false">
      {SHAPES[name]}
    </svg>
  );
}

const TILE_SHAPES: ShapeName[] = ["burst", "flower", "bolt", "petals", "star", "ring"];
const TILE_COLORS = ["ig-cream", "ig-mint", "ig-yellow", "ig-pink", "ig-sky"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Стабильный цвет и фигура для записи по её id */
export function lookFor(key: string, offset = 0) {
  const h = hash(key);
  return { color: TILE_COLORS[(h + offset) % TILE_COLORS.length], shape: TILE_SHAPES[(h >> 3) % TILE_SHAPES.length] };
}
