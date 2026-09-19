import * as THREE from 'three';
import { LINES } from './metroLines.js';

export const TRACK_Y = -0.7;
const STATION_Y = -0.55;

function lineCurvePoints(dirPositionsLikeArray) {
  return dirPositionsLikeArray.map((p) => new THREE.Vector3(p.x, TRACK_Y, p.z));
}

// Строит тоннель (труба) вдоль пути линии
function buildTunnel(positions, color, isCircle) {
  const pts = positions.map((p) => new THREE.Vector3(p.x, TRACK_Y, p.z));
  if (isCircle) pts.push(pts[0].clone());
  const curve = new THREE.CatmullRomCurve3(pts, isCircle, 'catmullrom', 0.1);
  const geo = new THREE.TubeGeometry(curve, Math.max(64, positions.length * 8), 1.5, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x30343c,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.BackSide,
  });
  const tunnel = new THREE.Mesh(geo, mat);
  tunnel.receiveShadow = false;
  tunnel.renderOrder = 0;

  // рельсовый жёлоб поверх тоннеля - тонкая полоса цвета линии, видимая сверху
  const railGeo = new THREE.TubeGeometry(curve, Math.max(64, positions.length * 8), 0.35, 6, false);
  const railMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.8, roughness: 0.4 });
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.y = 0.05;

  const group = new THREE.Group();
  group.add(tunnel);
  group.add(rail);
  return group;
}

function pixelBox(w, h, d, color, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const matParams = { color, roughness: opts.roughness ?? 0.8, metalness: opts.metalness ?? 0.05 };
  if (opts.emissive !== undefined) {
    matParams.emissive = new THREE.Color(opts.emissive);
    matParams.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  const mat = new THREE.MeshStandardMaterial(matParams);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Строит станцию: платформа под землёй + стилизованный вестибюль на поверхности
function buildStation(pos, color, name, isInterchange) {
  const group = new THREE.Group();
  group.position.set(pos.x, 0, pos.z);

  const platformSize = isInterchange ? 6.2 : 4.4;
  const platform = pixelBox(platformSize, 0.6, platformSize * 0.7, 0xd8d3c4, { roughness: 0.9 });
  platform.position.y = STATION_Y;
  group.add(platform);

  const edge = pixelBox(platformSize + 0.6, 0.15, platformSize * 0.7 + 0.6, new THREE.Color(color), { emissive: new THREE.Color(color), emissiveIntensity: 0.5 });
  edge.position.y = STATION_Y - 0.35;
  group.add(edge);

  // Вестибюль на поверхности - пиксельный "домик"
  const kioskColor = isInterchange ? 0xb5482f : 0x8a8f99;
  const kiosk = pixelBox(isInterchange ? 3.2 : 2.1, isInterchange ? 2.6 : 1.7, isInterchange ? 3.2 : 2.1, kioskColor);
  kiosk.position.y = (isInterchange ? 2.6 : 1.7) / 2;
  group.add(kiosk);

  const roof = pixelBox(isInterchange ? 3.6 : 2.4, 0.35, isInterchange ? 3.6 : 2.4, new THREE.Color(color));
  roof.position.y = (isInterchange ? 2.6 : 1.7) + 0.2;
  group.add(roof);

  // Светящаяся буква "М"
  const beacon = pixelBox(0.5, 0.9, 0.5, 0xff2222, { emissive: 0xff2222, emissiveIntensity: 1.2 });
  beacon.position.y = (isInterchange ? 2.6 : 1.7) + 0.9;
  group.add(beacon);

  group.userData = { name, isInterchange };
  return group;
}

function buildGroundAndSky(scene) {
  const groundGeo = new THREE.PlaneGeometry(700, 700, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x24382c,
    roughness: 1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  ground.renderOrder = 1;
  scene.add(ground);

  // Стилизованные кварталы города (низкополигональные блоки, случайно разбросанные, кроме центра)
  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  const rand = mulberry32(1337);
  const colors = [0x3a4048, 0x454b52, 0x30353c, 0x4a4038, 0x3c3f52];
  const count = 1100;
  const dummy = new THREE.Object3D();
  for (const color of colors) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    const inst = new THREE.InstancedMesh(buildingGeo, mat, Math.ceil(count / colors.length));
    let placed = 0;
    for (let i = 0; i < inst.count; i++) {
      const x = (rand() - 0.5) * 650;
      const z = (rand() - 0.5) * 650;
      const distFromCenter = Math.hypot(x, z);
      if (distFromCenter < 40) continue; // не строим прямо в центре / на путях
      const h = 2.5 + rand() * (distFromCenter > 250 ? 5 : 14);
      const w = 3 + rand() * 4;
      dummy.position.set(x, h / 2, z);
      dummy.scale.set(w, h, w);
      dummy.rotation.y = rand() * Math.PI;
      dummy.updateMatrix();
      inst.setMatrixAt(placed++, dummy.matrix);
    }
    inst.count = placed;
    inst.castShadow = true;
    inst.receiveShadow = true;
    scene.add(inst);
  }
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildWorld(scene, linesModel, interchangeNames) {
  const stationGroups = new Map(); // name -> THREE.Group (первое вхождение, используется для рендера один раз)
  const lineGroups = [];

  buildGroundAndSky(scene);

  for (const line of linesModel) {
    const tunnel = buildTunnel(line.positions, line.color, line.isCircle);
    scene.add(tunnel);
    lineGroups.push(tunnel);

    line.stations.forEach((name, idx) => {
      if (stationGroups.has(name)) return;
      const isInterchange = interchangeNames.has(name);
      const group = buildStation(line.positions[idx], line.color, name, isInterchange);
      scene.add(group);
      stationGroups.set(name, group);
    });
  }

  // Мягкий ночной туман для глубины
  scene.fog = new THREE.FogExp2(0x0a0d14, 0.0016);

  return { stationGroups, lineGroups };
}

export function setupLights(scene) {
  const hemi = new THREE.HemisphereLight(0x8fa8c9, 0x1a1410, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d9, 1.3);
  sun.position.set(140, 160, -90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -350;
  sun.shadow.camera.right = 350;
  sun.shadow.camera.top = 350;
  sun.shadow.camera.bottom = -350;
  sun.shadow.camera.far = 700;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0x404055, 0.4);
  scene.add(ambient);

  return { sun, hemi, ambient };
}
