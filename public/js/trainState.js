import { DWELL_SECONDS } from './metroLines.js';

export const SCHEDULE_PERIOD = 90000; // цикл повторения суточного расписания, сек

const ACCEL_FRACTION = 0.32;
const DECEL_FRACTION = 0.32;

// Трапецеидальный профиль скорости: доля пройденного пути s и текущая доля от макс. скорости v
function trapezoidProgress(t, T) {
  const ta = T * ACCEL_FRACTION;
  const td = T * DECEL_FRACTION;
  const tc = Math.max(0, T - ta - td);
  const vmax = 1 / (0.5 * ta + tc + 0.5 * td);
  if (t <= ta) {
    const v = vmax * (t / Math.max(ta, 1e-6));
    return { s: (0.5 * vmax * t * t) / Math.max(ta, 1e-6), v };
  }
  if (t <= ta + tc) {
    const sAtTa = 0.5 * vmax * ta;
    return { s: sAtTa + vmax * (t - ta), v: vmax };
  }
  const sAtCruiseEnd = 0.5 * vmax * ta + vmax * tc;
  const dt = t - ta - tc;
  const v = vmax * (1 - dt / Math.max(td, 1e-6));
  const s = sAtCruiseEnd + vmax * dt - (0.5 * vmax * dt * dt) / Math.max(td, 1e-6);
  return { s: Math.min(1, s), v: Math.max(0, v) };
}

function lerp(a, b, f) {
  return a + (b - a) * f;
}

// Находит фазу поездки по elapsed времени с момента отправления, в рамках одной направленной модели
function locateTrain(dirModel, elapsed) {
  const { cumulativeArrival, segTravel, positions } = dirModel;
  const lastIdx = positions.length - 1;
  if (elapsed >= cumulativeArrival[lastIdx]) {
    const p = positions[lastIdx];
    return { status: 'terminus', stopIndex: lastIdx, x: p.x, z: p.z, speedFrac: 0, headingFrom: lastIdx, headingTo: lastIdx };
  }
  for (let i = 0; i < lastIdx; i++) {
    const dwellHere = i === 0 ? 0 : DWELL_SECONDS;
    const dwellStart = cumulativeArrival[i];
    const dwellEnd = dwellStart + dwellHere;
    const arriveNext = cumulativeArrival[i + 1];
    if (elapsed < dwellEnd) {
      const p = positions[i];
      return { status: 'dwell', stopIndex: i, x: p.x, z: p.z, speedFrac: 0, headingFrom: i, headingTo: i + 1 };
    }
    if (elapsed <= arriveNext) {
      const T = segTravel[i];
      const t = elapsed - dwellEnd;
      const { s, v } = trapezoidProgress(Math.max(0, t), T);
      const from = positions[i];
      const to = positions[i + 1];
      return {
        status: 'moving',
        stopIndex: i,
        x: lerp(from.x, to.x, s),
        z: lerp(from.z, to.z, s),
        speedFrac: v,
        headingFrom: i,
        headingTo: i + 1,
      };
    }
  }
  const p = positions[lastIdx];
  return { status: 'terminus', stopIndex: lastIdx, x: p.x, z: p.z, speedFrac: 0, headingFrom: lastIdx, headingTo: lastIdx };
}

// simSeconds - непрерывное время симуляции (может расти бесконечно)
export function computeActiveTrains(simSeconds, linesModel) {
  const effective = ((simSeconds % SCHEDULE_PERIOD) + SCHEDULE_PERIOD) % SCHEDULE_PERIOD;
  const trains = [];
  for (const line of linesModel) {
    for (const dir of line.directions) {
      const dirModel = line.directionalModels[dir];
      const deps = line.departures[dir];
      for (const depTime of deps) {
        const elapsed = effective - depTime;
        if (elapsed < 0 || elapsed > line.totalDuration) continue;
        const phase = locateTrain(dirModel, elapsed);
        trains.push({
          id: `${line.id}-${dir}-${depTime}`,
          lineId: line.id,
          lineName: line.name,
          color: line.color,
          dir,
          status: phase.status,
          x: phase.x,
          z: phase.z,
          speedFrac: phase.speedFrac,
          headingFrom: phase.headingFrom,
          headingTo: phase.headingTo,
          dirPositions: dirModel.positions,
        });
      }
    }
  }
  return trains;
}

// Ближайшие прибытия на станцию (для инфопанели). stationIndex - индекс в исходном (line.stations) порядке.
export function upcomingArrivals(lineModel, stationIndex, simSeconds, count = 4) {
  const effective = ((simSeconds % SCHEDULE_PERIOD) + SCHEDULE_PERIOD) % SCHEDULE_PERIOD;
  const results = [];
  for (const dir of lineModel.directions) {
    const dirModel = lineModel.directionalModels[dir];
    const reversed = dir === lineModel.directions[1];
    const idx = reversed ? dirModel.positions.length - 1 - stationIndex : stationIndex;
    const arrivalOffset = dirModel.cumulativeArrival[idx];
    for (const dep of lineModel.departures[dir]) {
      const arrival = dep + arrivalOffset;
      const eta = arrival - effective;
      if (eta >= -10 && eta < 3600) {
        results.push({ dir, etaSeconds: eta });
      }
    }
  }
  results.sort((a, b) => a.etaSeconds - b.etaSeconds);
  return results.slice(0, count);
}
