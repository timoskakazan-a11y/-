import { LINES, SERVICE_START, SERVICE_END, CRUISE_SPEED_KMH, DWELL_SECONDS, TERMINUS_DWELL_SECONDS } from './metroLines.js';
import { distanceKm } from './geo.js';

// Ускорение/торможение поезда (упрощённая, но реалистичная кинематика)
const ACCEL_FRACTION = 0.32; // доля времени сегмента на разгон
const DECEL_FRACTION = 0.32; // доля времени сегмента на торможение
const MIN_SEGMENT_SECONDS = 45;

function headwaySeconds(daySeconds) {
  const h = (daySeconds / 3600) % 24;
  if ((h >= 7 && h < 10) || (h >= 17 && h < 20)) return 95; // час пик
  if (h >= 10 && h < 17) return 165; // день
  if (h >= 20 && h < 23.5) return 210; // вечер
  return 320; // утро/ночь
}

// Строит модель одной линии: длины сегментов, тайминги, расписание отправлений в обе стороны
export function buildLineSchedules(positionsByLine) {
  const linesModel = [];

  for (const line of LINES) {
    const positions = positionsByLine[line.id];
    const n = line.stations.length;
    const segLengthsKm = [];
    for (let i = 0; i < n - 1; i++) {
      segLengthsKm.push(Math.max(0.35, distanceKm(positions[i], positions[i + 1])));
    }
    const closingSegKm = line.isCircle ? Math.max(0.35, distanceKm(positions[n - 1], positions[0])) : null;

    const segTravelSeconds = segLengthsKm.map((km) =>
      Math.max(MIN_SEGMENT_SECONDS, (km / CRUISE_SPEED_KMH) * 3600)
    );
    const closingTravelSeconds = closingSegKm
      ? Math.max(MIN_SEGMENT_SECONDS, (closingSegKm / CRUISE_SPEED_KMH) * 3600)
      : null;

    // Для кольцевых линий строим полный цикл станций (замыкание в конец списка)
    const stopCount = line.isCircle ? n + 1 : n;
    const allSegTravel = line.isCircle ? [...segTravelSeconds, closingTravelSeconds] : segTravelSeconds;
    const allSegKm = line.isCircle ? [...segLengthsKm, closingSegKm] : segLengthsKm;

    // Кумулятивное время от старта до прибытия на каждую станцию (индекс stationIdx в направлении forward)
    const cumulativeArrival = [0];
    for (let i = 0; i < allSegTravel.length; i++) {
      const dwell = i === 0 ? 0 : DWELL_SECONDS;
      cumulativeArrival.push(cumulativeArrival[i] + dwell + allSegTravel[i]);
    }
    const totalDuration = cumulativeArrival[cumulativeArrival.length - 1] + TERMINUS_DWELL_SECONDS;

    const directions = line.isCircle ? ['cw', 'ccw'] : ['fwd', 'rev'];

    const departures = { [directions[0]]: [], [directions[1]]: [] };
    for (const dir of directions) {
      let t = SERVICE_START + Math.floor(Math.random() * 40);
      while (t < SERVICE_END) {
        departures[dir].push(t);
        t += headwaySeconds(t);
      }
    }

    // Направленные модели: для обратного направления разворачиваем порядок станций/сегментов,
    // чтобы не мираппировать координаты на лету при симуляции.
    const buildDirectional = (reversed) => {
      const pos = reversed ? positions.slice().reverse() : positions.slice();
      const segTravelDir = reversed ? allSegTravel.slice().reverse() : allSegTravel.slice();
      const cum = [0];
      for (let i = 0; i < segTravelDir.length; i++) {
        const dwell = i === 0 ? 0 : DWELL_SECONDS;
        cum.push(cum[i] + dwell + segTravelDir[i]);
      }
      return { positions: pos, segTravel: segTravelDir, cumulativeArrival: cum };
    };

    const directionalModels = {
      [directions[0]]: buildDirectional(false),
      [directions[1]]: buildDirectional(true),
    };

    linesModel.push({
      id: line.id,
      num: line.num,
      name: line.name,
      color: line.color,
      isCircle: !!line.isCircle,
      stations: line.stations,
      positions,
      stopCount,
      segKm: allSegKm,
      segTravel: allSegTravel,
      cumulativeArrival,
      totalDuration,
      directions,
      departures,
      directionalModels,
    });
  }

  return linesModel;
}
