import * as THREE from 'three';

export const TRACK_Y = -0.7;
const STATION_Y = -0.55;

// ---------- Процедурные текстуры (создаются один раз, переиспользуются) ----------

function makePlatformTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b9b2a1';
  ctx.fillRect(0, 0, size, size);

  const tile = 32;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      const shade = 178 + Math.floor(Math.sin(x * 12.9898 + y * 78.233) * 12);
      ctx.fillStyle = `rgb(${shade},${shade - 5},${shade - 16})`;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  // ржавые пятна
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 28; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const r = 4 + Math.random() * 14;
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, r);
    grad.addColorStop(0, '#7a4a2a');
    grad.addColorStop(1, 'rgba(122,74,42,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(rx - r, ry - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;

  // трещины
  ctx.strokeStyle = 'rgba(20,18,16,0.6)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 5 + Math.floor(Math.random() * 5);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function makeSignTexture(text, accentColor) {
  const w = 256;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#12162a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = '#eef2ff';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let label = text.toUpperCase();
  if (label.length > 16) label = label.slice(0, 15) + '…';
  ctx.fillText(label, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

let cachedPlatformTexture = null;
function getPlatformTexture() {
  if (!cachedPlatformTexture) cachedPlatformTexture = makePlatformTexture();
  return cachedPlatformTexture;
}

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------- Тоннели ----------

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

  const railGeo = new THREE.TubeGeometry(curve, Math.max(64, positions.length * 8), 0.35, 6, false);
  const railMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.8,
    roughness: 0.4,
  });
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
  if (opts.map) matParams.map = opts.map;
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

function buildBench(rustColor) {
  const group = new THREE.Group();
  const seat = pixelBox(1.6, 0.12, 0.55, 0x6b4636, { roughness: 0.85 });
  seat.position.y = 0.45;
  group.add(seat);
  const back = pixelBox(1.6, 0.55, 0.1, 0x6b4636, { roughness: 0.85 });
  back.position.set(0, 0.72, -0.22);
  group.add(back);
  for (const sx of [-0.65, 0.65]) {
    const leg = pixelBox(0.1, 0.45, 0.5, rustColor, { roughness: 0.6, metalness: 0.4 });
    leg.position.set(sx, 0.22, 0);
    group.add(leg);
  }
  return group;
}

function buildRailing(length, rustColor) {
  const group = new THREE.Group();
  const postCount = Math.max(3, Math.round(length / 2.2));
  for (let i = 0; i < postCount; i++) {
    const t = postCount === 1 ? 0 : i / (postCount - 1) - 0.5;
    const post = pixelBox(0.1, 0.9, 0.1, rustColor, { roughness: 0.55, metalness: 0.5 });
    post.position.set(t * length, 0.45, 0);
    group.add(post);
  }
  const rail = pixelBox(length, 0.08, 0.08, rustColor, { roughness: 0.55, metalness: 0.5 });
  rail.position.y = 0.85;
  group.add(rail);
  const railLow = rail.clone();
  railLow.position.y = 0.45;
  group.add(railLow);
  return group;
}

// Строит станцию: платформа с деталями (перрон, скамейка, ограждение, вывеска, неон) + вестибюль на поверхности
function buildStation(pos, color, name, isInterchange, heading = 0) {
  const group = new THREE.Group();
  group.position.set(pos.x, 0, pos.z);
  group.rotation.y = heading; // ось X группы совмещена с направлением путей

  const seed = hashName(name);
  const rustShade = 0x8a5a3a;

  const platformW = isInterchange ? 6.4 : 4.8;
  const platformD = isInterchange ? platformW * 0.62 : platformW * 0.58;

  const platform = pixelBox(platformW, 0.6, platformD, 0xffffff, { roughness: 0.95, map: getPlatformTexture() });
  platform.position.y = STATION_Y;
  group.add(platform);

  const edge = pixelBox(platformW + 0.6, 0.15, platformD + 0.6, new THREE.Color(color), {
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.55,
  });
  edge.position.y = STATION_Y - 0.35;
  group.add(edge);

  // ограждение по дальнему от путей краю (за пределами полосы движения поезда)
  const trackClearanceZ = platformD / 2 + 0.35;
  const railing = buildRailing(platformW * 0.85, rustShade);
  railing.position.set(0, STATION_Y + 0.3, trackClearanceZ);
  group.add(railing);

  // скамейка - на самом краю платформы, у ограждения
  const bench = buildBench(rustShade);
  bench.position.set((seed % 100) / 100 - 0.5, STATION_Y + 0.3, trackClearanceZ - 0.55);
  bench.rotation.y = Math.PI;
  group.add(bench);

  // Вестибюль на поверхности - смещён за платформу, не перекрывает пути
  const kioskColor = isInterchange ? 0xb5482f : 0x8a8f99;
  const kioskH = isInterchange ? 2.6 : 1.9;
  const kioskW = isInterchange ? 3.2 : 2.3;
  const buildingZ = platformD / 2 + kioskW / 2 + 1.1;

  const kiosk = pixelBox(kioskW, kioskH, kioskW, kioskColor);
  kiosk.position.set(0, kioskH / 2, buildingZ);
  group.add(kiosk);

  const roof = pixelBox(kioskW + 0.4, 0.35, kioskW + 0.4, new THREE.Color(color));
  roof.position.set(0, kioskH + 0.2, buildingZ);
  group.add(roof);

  // неоновая полоса под козырьком (голубой/бирюзовый холодный акцент, как на референсе)
  const neon = pixelBox(kioskW * 0.85, 0.08, 0.08, 0x8fe8ff, { emissive: 0x8fe8ff, emissiveIntensity: 2.2 });
  neon.position.set(0, kioskH + 0.02, buildingZ - kioskW / 2 + 0.05);
  group.add(neon);

  // вывеска с названием станции
  const signTex = makeSignTexture(name, color);
  const signGeo = new THREE.PlaneGeometry(2.6, 0.65);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.6, roughness: 0.6 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, kioskH + 0.9, buildingZ - kioskW / 2 - 0.02);
  group.add(sign);

  // Светящаяся буква "М"
  const beacon = pixelBox(0.5, 0.9, 0.5, 0xff2222, { emissive: 0xff2222, emissiveIntensity: 1.2 });
  beacon.position.set(0, kioskH + 1.5, buildingZ);
  group.add(beacon);

  group.userData = { name, isInterchange, platformD, platformW };
  return group;
}

function buildGroundAndSky(scene) {
  const groundGeo = new THREE.PlaneGeometry(700, 700, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x241f36,
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

  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  const rand = mulberry32(1337);
  const colors = [0x342f48, 0x3a3350, 0x2c2740, 0x4a3542, 0x362f52];
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
      if (distFromCenter < 40) continue;
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
  const stationGroups = new Map();
  const lineGroups = [];

  buildGroundAndSky(scene);

  for (const line of linesModel) {
    const tunnel = buildTunnel(line.positions, line.color, line.isCircle);
    scene.add(tunnel);
    lineGroups.push(tunnel);

    line.stations.forEach((name, idx) => {
      if (stationGroups.has(name)) return;
      const isInterchange = interchangeNames.has(name);
      const positions = line.positions;
      const prev = positions[Math.max(0, idx - 1)];
      const next = positions[Math.min(positions.length - 1, idx + 1)];
      const heading = Math.atan2(-(next.z - prev.z), next.x - prev.x);
      const group = buildStation(positions[idx], line.color, name, isInterchange, heading);
      scene.add(group);
      stationGroups.set(name, group);
    });
  }

  // Ночной фиолетово-синий туман для атмосферы (как на референсе)
  scene.fog = new THREE.FogExp2(0x0d0a1c, 0.0016);

  return { stationGroups, lineGroups };
}

export function setupLights(scene) {
  const hemi = new THREE.HemisphereLight(0x6f7fc9, 0x1a1022, 0.75);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xb9c6ff, 0.9);
  moon.position.set(140, 160, -90);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -350;
  moon.shadow.camera.right = 350;
  moon.shadow.camera.top = 350;
  moon.shadow.camera.bottom = -350;
  moon.shadow.camera.far = 700;
  scene.add(moon);

  const ambient = new THREE.AmbientLight(0x2a2440, 0.5);
  scene.add(ambient);

  // тёплый контровой свет для ржавых металлических поверхностей
  const warm = new THREE.PointLight(0xffb066, 0.4, 60);
  warm.position.set(0, 30, 0);
  scene.add(warm);

  return { sun: moon, hemi, ambient };
}
