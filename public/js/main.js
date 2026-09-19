import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LINES } from './metroLines.js';
import { buildRawGeometry, snapInterchanges } from './geo.js';
import { buildLineSchedules } from './schedule.js';
import { computeActiveTrains } from './trainState.js';
import { buildWorld, setupLights } from './scene.js';
import { TrainPool } from './trains3d.js';
import { UI } from './ui.js';

const PIXEL_DIVISOR = 3.2; // ниже -> крупнее "пиксели"

async function bootstrap() {
  const loadingFill = document.getElementById('loading-fill');
  const loadingTitle = document.querySelector('#loading .loading-title');
  const setBoot = (frac, label) => {
    if (loadingFill) loadingFill.style.width = `${Math.round(frac * 100)}%`;
    if (loadingTitle && label) loadingTitle.textContent = label;
  };

  setBoot(0.05, 'Построение геометрии линий…');

  const rawPositions = buildRawGeometry();
  const { positions, interchangeNames } = snapInterchanges(rawPositions);
  setBoot(0.25, 'Генерация расписания…');

  const linesModel = buildLineSchedules(positions);

  // карта: имя станции -> список линий (для инфопанели пересадок)
  const stationToLines = new Map();
  for (const line of linesModel) {
    line.stations.forEach((name) => {
      if (!stationToLines.has(name)) stationToLines.set(name, []);
      stationToLines.get(name).push(line);
    });
  }

  const ui = new UI({
    linesModel,
    onSpeedChange: (s) => (state.speedMultiplier = s),
    onLineToggle: (hiddenSet) => applyLineVisibility(hiddenSet),
    onStopFollow: () => stopFollow(),
  });
  setBoot(0.4, 'Строим тоннели и станции…');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);

  const { stationGroups, lineGroups } = buildWorld(scene, linesModel, interchangeNames);
  setupLights(scene);
  ui.setLoadingProgress(0.65, 'Расставляем поезда…');

  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const DEFAULT_CAM_POS = new THREE.Vector3(0, 150, 190);
  const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.copy(DEFAULT_CAM_POS);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI * 0.49; // почти горизонтальный вид для платформенной камеры
  controls.minPolarAngle = 0.15;
  controls.minDistance = 4;
  controls.maxDistance = 750;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  const trainPool = new TrainPool(scene);
  window.__metroDebug = { scene, camera, controls, trainPool, linesModel };

  const state = window.__metroState = {
    speedMultiplier: 1,
    simSeconds: 5 * 3600 + 30 * 60,
    lastFrameTime: performance.now(),
    followTrainId: null,
    watchStationInfo: null,
    autoFollow: false,
    flight: null,
    hiddenLines: new Set(),
  };

  function applyLineVisibility(hiddenSet) {
    state.hiddenLines = hiddenSet;
    lineGroups.forEach((group, idx) => {
      group.visible = !hiddenSet.has(LINES[idx].id);
    });
  }

  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const lowW = Math.max(160, Math.round(w / PIXEL_DIVISOR));
    const lowH = Math.max(120, Math.round(h / PIXEL_DIVISOR));
    renderer.setSize(lowW, lowH, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  ui.setLoadingProgress(0.85, 'Запуск симуляции…');

  // --- Raycasting для клика по станции / поезду ---
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function findLineModelById(id) {
    return linesModel.find((l) => l.id === id);
  }

  renderer.domElement.addEventListener('pointerdown', (ev) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // проверяем поезда
    const trainRoots = [...trainPool.allRoots().values()];
    const trainHits = raycaster.intersectObjects(trainRoots, true);
    if (trainHits.length) {
      let obj = trainHits[0].object;
      while (obj.parent && !obj.userData.trainRef) obj = obj.parent;
      const train = obj.userData.trainRef;
      if (train) {
        const lm = findLineModelById(train.lineId);
        ui.showTrainInfo(train, lm);
        followTrain(train.id);
        return;
      }
    }

    // проверяем станции
    const stationObjs = [...stationGroups.values()];
    const stHits = raycaster.intersectObjects(stationObjs, true);
    if (stHits.length) {
      let obj = stHits[0].object;
      while (obj.parent && !obj.userData.name) obj = obj.parent;
      const name = obj.userData.name;
      if (name) {
        const owners = stationToLines.get(name) || [];
        const lm = owners[0];
        const stationIndex = lm.stations.indexOf(name);
        ui.showStationInfo(lm, stationIndex, name, state.simSeconds, owners, () =>
          watchStation(name, lm, stationIndex)
        );
      }
    }
  });

  function followTrain(id, label) {
    state.followTrainId = id;
    state.watchStationInfo = null;
    state.autoFollow = false;
    ui.setFollowing(label || `поезд ${id.split('-')[0]}`);
  }

  // Статичный кинематографический вид с платформы вдоль пути (используется, пока поезд не в кадре)
  function flyToPlatform(stationInfo) {
    const { pos, dx, dz } = stationInfo;
    const camHeight = 6.5;
    const backAlong = 11;
    const camPos = new THREE.Vector3(pos.x - dx * backAlong, camHeight, pos.z - dz * backAlong);
    const lookTarget = new THREE.Vector3(pos.x + dx * 26, 1.3, pos.z + dz * 26);
    state.flight = { camPos, targetPos: lookTarget };
  }

  // Наблюдение за станцией: статичный вид платформы, который переключается на слежение
  // за поездом, когда тот подходит к этой станции - так видно, как поезд прибывает и тормозит.
  function watchStation(name, lineModel, stationIndex) {
    const group = stationGroups.get(name);
    if (!group) return;
    const positions = lineModel.positions;
    const prev = positions[Math.max(0, stationIndex - 1)];
    const next = positions[Math.min(positions.length - 1, stationIndex + 1)];
    let dx = next.x - prev.x;
    let dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const pos = group.position;
    const stationInfo = { name, lineId: lineModel.id, stationIndex, pos: { x: pos.x, z: pos.z }, dx, dz };
    state.watchStationInfo = stationInfo;
    state.followTrainId = null;
    flyToPlatform(stationInfo);
    ui.setFollowing(`платформа: ${name}`);
  }

  function stopFollow() {
    state.followTrainId = null;
    state.watchStationInfo = null;
    state.flight = { camPos: DEFAULT_CAM_POS.clone(), targetPos: DEFAULT_TARGET.clone() };
    ui.setFollowing(null);
  }

  ui.setLoadingProgress(1, 'Готово');

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min(0.25, (now - state.lastFrameTime) / 1000);
    state.lastFrameTime = now;
    state.simSeconds += dt * state.speedMultiplier;

    const activeTrains = computeActiveTrains(state.simSeconds, linesModel);
    const visibleTrains = activeTrains.filter((t) => !state.hiddenLines.has(t.lineId));
    trainPool.sync(visibleTrains);

    const applyFlightLerp = () => {
      if (!state.flight) return;
      camera.position.lerp(state.flight.camPos, 0.1);
      controls.target.lerp(state.flight.targetPos, 0.1);
      if (camera.position.distanceTo(state.flight.camPos) < 0.5) state.flight = null;
    };

    if (state.followTrainId) {
      const root = trainPool.getRootById(state.followTrainId);
      const followedTrain = visibleTrains.find((t) => t.id === state.followTrainId);
      if (root && followedTrain) {
        // низкая близкая камера сбоку от поезда - видно, как он идёт и тормозит
        const from = followedTrain.dirPositions[followedTrain.headingFrom];
        const to = followedTrain.dirPositions[followedTrain.headingTo];
        let dx = to.x - from.x;
        let dz = to.z - from.z;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len;
        dz /= len;
        const perpX = -dz;
        const perpZ = dx;
        const targetPos = new THREE.Vector3(root.position.x, 1.2, root.position.z);
        controls.target.lerp(targetPos, 0.15);
        const desired = new THREE.Vector3(
          root.position.x + perpX * 7 - dx * 3,
          5.5,
          root.position.z + perpZ * 7 - dz * 3
        );
        camera.position.lerp(desired, 0.08);
      } else if (state.autoFollow && state.watchStationInfo) {
        // поезд ушёл дальше по линии - возвращаемся к статичному виду платформы
        const info = state.watchStationInfo;
        state.followTrainId = null;
        state.autoFollow = false;
        flyToPlatform(info);
        ui.setFollowing(`платформа: ${info.name}`);
      } else {
        stopFollow();
      }
    } else if (state.watchStationInfo) {
      // ищем поезд этой линии рядом со станцией - когда появится, переключаемся на слежение за ним
      const info = state.watchStationInfo;
      const candidate = visibleTrains.find(
        (t) => t.lineId === info.lineId && Math.hypot(t.x - info.pos.x, t.z - info.pos.z) < 24
      );
      if (candidate) {
        state.followTrainId = candidate.id;
        state.autoFollow = true;
        ui.setFollowing(`платформа: ${info.name} — поезд прибывает`);
      } else {
        applyFlightLerp();
      }
    } else {
      applyFlightLerp();
    }

    controls.update();
    ui.updateClock(state.simSeconds);
    ui.updateTrainCount(visibleTrains.length);
    renderer.render(scene, camera);
  }
  animate();
}

bootstrap();
