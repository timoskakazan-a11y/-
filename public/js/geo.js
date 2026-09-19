import { LINES } from './metroLines.js';

const KM = 15; // масштаб: 1 км -> 15 сцен-юнитов (компактный игровой мир)

function bearingDistToXZ(bearingDeg, distKm) {
  const rad = (bearingDeg * Math.PI) / 180;
  return {
    x: Math.sin(rad) * distKm * KM,
    z: -Math.cos(rad) * distKm * KM,
  };
}

// Catmull-Rom интерполяция по массиву точек {x,z}, возвращает точку в параметре t (0..points.length-1)
function catmullRom(points, t) {
  const n = points.length;
  const i = Math.floor(t);
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[Math.min(n - 1, i)];
  const p2 = points[Math.min(n - 1, i + 1)];
  const p3 = points[Math.min(n - 1, i + 2)];
  const f = t - i;
  const f2 = f * f;
  const f3 = f2 * f;
  const c = (a, b, cc, d) =>
    0.5 *
    (2 * b + (-a + cc) * f + (2 * a - 5 * b + 4 * cc - d) * f2 + (-a + 3 * b - 3 * cc + d) * f3);
  return { x: c(p0.x, p1.x, p2.x, p3.x), z: c(p0.z, p1.z, p2.z, p3.z) };
}

function buildLinearLinePath(line) {
  const anchorPts = line.anchors.map((a) => bearingDistToXZ(a.b, a.d));
  const n = line.stations.length;
  const segCount = anchorPts.length - 1;
  const stationPositions = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * segCount;
    stationPositions.push(catmullRom(anchorPts, t));
  }
  return stationPositions;
}

function buildCirclePath(line) {
  const n = line.stations.length;
  const positions = [];
  for (let i = 0; i < n; i++) {
    const angle = ((line.startBearing + (i / n) * 360) * Math.PI) / 180;
    positions.push({
      x: Math.sin(angle) * line.radius * KM,
      z: -Math.cos(angle) * line.radius * KM,
    });
  }
  return positions;
}

// Строим позиции станций для каждой линии
export function buildRawGeometry() {
  const result = {};
  for (const line of LINES) {
    result[line.id] = line.isCircle ? buildCirclePath(line) : buildLinearLinePath(line);
  }
  return result;
}

// Пересадочные узлы: одинаковые названия на разных линиях -> общая точка (среднее всех вхождений)
export function snapInterchanges(rawPositions) {
  const byName = new Map();
  for (const line of LINES) {
    const positions = rawPositions[line.id];
    line.stations.forEach((name, idx) => {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(positions[idx]);
    });
  }
  const centroid = new Map();
  for (const [name, pts] of byName.entries()) {
    if (pts.length > 1) {
      const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const z = pts.reduce((s, p) => s + p.z, 0) / pts.length;
      centroid.set(name, { x, z });
    }
  }
  for (const line of LINES) {
    const positions = rawPositions[line.id];
    line.stations.forEach((name, idx) => {
      if (centroid.has(name)) positions[idx] = { ...centroid.get(name) };
    });
  }
  return { positions: rawPositions, interchangeNames: new Set(centroid.keys()) };
}

export function distanceKm(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz) / KM;
}

export const SCALE_UNITS_PER_KM = KM;
