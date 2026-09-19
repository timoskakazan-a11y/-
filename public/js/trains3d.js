import * as THREE from 'three';
import { TRACK_Y } from './scene.js';

const CAR_LENGTH = 5.4;
const CAR_WIDTH = 2.6;
const CAR_HEIGHT = 2.3;
const CARS_PER_TRAIN = 5;
const GAP = 0.35;

// Создаёт "воксельный" вагон: корпус + окна-полосы + фары. Строится один раз, клонируется инстансингом по цвету линии.
function buildCarMesh(color) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(CAR_LENGTH, CAR_HEIGHT, CAR_WIDTH);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe7e7e2, roughness: 0.55, metalness: 0.25 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  group.add(body);

  const stripeGeo = new THREE.BoxGeometry(CAR_LENGTH * 0.98, CAR_HEIGHT * 0.28, CAR_WIDTH * 1.01);
  const stripeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.4, emissive: new THREE.Color(color), emissiveIntensity: 0.25 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = -0.15;
  group.add(stripe);

  const winGeo = new THREE.BoxGeometry(CAR_LENGTH * 0.92, CAR_HEIGHT * 0.32, CAR_WIDTH * 1.02);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x9fd6ff, emissive: 0x6fb8e8, emissiveIntensity: 0.55, roughness: 0.3 });
  const win = new THREE.Mesh(winGeo, winMat);
  win.position.y = 0.35;
  group.add(win);

  const headlightGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff6c8, emissiveIntensity: 2 });
  const hl1 = new THREE.Mesh(headlightGeo, headlightMat);
  hl1.position.set(CAR_LENGTH / 2 - 0.05, -0.6, CAR_WIDTH / 2 - 0.35);
  const hl2 = hl1.clone();
  hl2.position.z = -(CAR_WIDTH / 2 - 0.35);
  group.add(hl1, hl2);

  const tailGeo = headlightGeo;
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0xcc1111, emissiveIntensity: 1.4 });
  const tl1 = new THREE.Mesh(tailGeo, tailMat);
  tl1.position.set(-CAR_LENGTH / 2 + 0.05, -0.6, CAR_WIDTH / 2 - 0.35);
  const tl2 = tl1.clone();
  tl2.position.z = -(CAR_WIDTH / 2 - 0.35);
  group.add(tl1, tl2);

  group.userData.isFront = true; // фары/фонари всегда рисуются на обоих концах, работают в обе стороны
  return group;
}

export class TrainPool {
  constructor(scene) {
    this.scene = scene;
    this.byColor = new Map(); // color -> { group, active: [] }
    this.trainRoots = new Map(); // train.id -> Group (набор вагонов)
  }

  getOrCreateTrainRoot(train) {
    let root = this.trainRoots.get(train.id);
    if (!root) {
      root = new THREE.Group();
      for (let i = 0; i < CARS_PER_TRAIN; i++) {
        const car = buildCarMesh(train.color);
        car.position.x = -i * (CAR_LENGTH + GAP);
        root.add(car);
      }
      root.position.y = TRACK_Y + CAR_HEIGHT / 2 + 0.35;
      this.scene.add(root);
      this.trainRoots.set(train.id, root);
    }
    return root;
  }

  // Синхронизирует набор видимых поездов с активным списком (train state) на кадр
  sync(activeTrains) {
    const activeIds = new Set(activeTrains.map((t) => t.id));
    for (const [id, root] of this.trainRoots.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(root);
        root.traverse((o) => {
          if (o.geometry) o.geometry.dispose?.();
        });
        this.trainRoots.delete(id);
      }
    }

    for (const train of activeTrains) {
      const root = this.getOrCreateTrainRoot(train);
      const from = train.dirPositions[train.headingFrom];
      const to = train.dirPositions[train.headingTo];
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      root.position.x = train.x;
      root.position.z = train.z;
      root.rotation.y = Math.atan2(dz, dx);
      root.userData.speedFrac = train.speedFrac;
      root.userData.status = train.status;
      root.userData.trainRef = train;
    }
  }

  getRootById(id) {
    return this.trainRoots.get(id);
  }

  allRoots() {
    return this.trainRoots;
  }
}
