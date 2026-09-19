import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LINES } from './metroLines.js';
import { buildRawGeometry, snapInterchanges } from './geo.js';
import { buildLineSchedules } from './schedule.js';
import { computeActiveTrains } from './trainState.js';
import { buildWorld, setupLights } from './scene.js';
import { TrainPool } from './trains3d.js';
import { UI } from './ui.js';

const PIXEL_DIVISOR = 4.2; // ниже -> крупнее "пиксели"

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

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 190, 160);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minPolarAngle = 0.15;
  controls.minDistance = 25;
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
        ui.showStationInfo(lm, stationIndex, name, state.simSeconds, owners);
      }
    }
  });

  function followTrain(id) {
    state.followTrainId = id;
    ui.setFollowing(`поезд ${id.split('-')[0]}`);
  }
  function stopFollow() {
    state.followTrainId = null;
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

    if (state.followTrainId) {
      const root = trainPool.getRootById(state.followTrainId);
      if (root) {
        const targetPos = new THREE.Vector3(root.position.x, root.position.y, root.position.z);
        controls.target.lerp(targetPos, 0.12);
        const desired = targetPos.clone().add(new THREE.Vector3(0, 70, 70));
        camera.position.lerp(desired, 0.06);
      } else {
        stopFollow();
      }
    }

    controls.update();
    ui.updateClock(state.simSeconds);
    ui.updateTrainCount(visibleTrains.length);
    renderer.render(scene, camera);
  }
  animate();
}

bootstrap();
