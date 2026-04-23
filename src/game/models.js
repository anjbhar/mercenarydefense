import { THREE } from "./three.js";

function createGroundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#5f7f5c";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1100; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const radius = Math.random() * 2 + 0.4;
    const tone = 88 + Math.floor(Math.random() * 48);
    ctx.fillStyle = `rgba(${tone - 20}, ${tone + 30}, ${tone - 25}, 0.34)`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  return texture;
}

function createPathTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#8c7b62";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 380; i += 1) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const shade = 110 + Math.floor(Math.random() * 46);
    ctx.fillStyle = `rgba(${shade}, ${shade - 12}, ${shade - 30}, 0.35)`;
    ctx.fillRect(x, y, Math.random() * 4 + 1, Math.random() * 3 + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 1.8);
  return texture;
}

function createSoldierModel(color, rifleColor = 0x1f1f1f, accent = 0x3f5144, addWeapon = true) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.2, 1.2),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.set(0, 1.1, 0);
  group.add(body);

  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.4, 1.25),
    new THREE.MeshLambertMaterial({ color: 0x38453c })
  );
  vest.position.set(-0.1, 1.35, 0);
  group.add(vest);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0xe0c2a6 })
  );
  head.position.set(0, 2.55, 0);
  group.add(head);

  const helmet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.56, 0.38, 12),
    new THREE.MeshLambertMaterial({ color: accent })
  );
  helmet.position.set(0, 2.84, 0);
  group.add(helmet);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.4, 1),
    new THREE.MeshLambertMaterial({ color: 0x445348 })
  );
  legs.position.set(0, 0.2, 0);
  group.add(legs);

  const shoulderPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.5, 1.25),
    new THREE.MeshLambertMaterial({ color: accent })
  );
  shoulderPad.position.set(0.86, 1.85, 0);
  group.add(shoulderPad);

  if (addWeapon) {
    const rifle = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.24, 0.24),
      new THREE.MeshLambertMaterial({ color: rifleColor })
    );
    rifle.position.set(-1.1, 1.55, 0);
    group.add(rifle);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.1, 10),
      new THREE.MeshLambertMaterial({ color: 0x171717 })
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(-1.95, 1.55, 0);
    group.add(barrel);
  }

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function createRiflemanModel(color, rifleColor = 0x222222, accent = 0x3f5144) {
  const group = createSoldierModel(color, rifleColor, accent, false);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.2, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x38453c })
  );
  backpack.position.set(0.6, 1.3, 0);
  group.add(backpack);

  const goggles = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.15, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  goggles.position.set(-0.15, 2.9, 0);
  group.add(goggles);

  const m16Group = new THREE.Group();
  
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.35, 0.15),
    new THREE.MeshLambertMaterial({ color: rifleColor })
  );
  receiver.position.set(-1.0, 1.55, 0);
  m16Group.add(receiver);

  const carryHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.15, 0.08),
    new THREE.MeshLambertMaterial({ color: rifleColor })
  );
  carryHandle.position.set(-1.0, 1.80, 0);
  m16Group.add(carryHandle);

  const mag = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.45, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  mag.position.set(-1.15, 1.25, 0);
  mag.rotation.z = -0.15;
  m16Group.add(mag);

  const handguard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  handguard.rotation.z = Math.PI / 2;
  handguard.position.set(-1.8, 1.55, 0);
  m16Group.add(handguard);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: 0x171717 })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(-2.5, 1.55, 0);
  m16Group.add(barrel);

  const frontSight = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.25, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x171717 })
  );
  frontSight.position.set(-2.6, 1.68, 0);
  m16Group.add(frontSight);

  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.25, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  stock.position.set(-0.3, 1.5, 0);
  m16Group.add(stock);

  m16Group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  group.add(m16Group);
  return group;
}

function createTurretModel(color, accent = 0x303848) {
  const group = new THREE.Group();

  const legGeo = new THREE.BoxGeometry(1.6, 0.15, 0.2);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

  const leg1 = new THREE.Mesh(legGeo, legMat);
  leg1.position.set(-0.8, 0.1, 0);
  group.add(leg1);

  const leg2 = new THREE.Mesh(legGeo, legMat);
  leg2.rotation.y = Math.PI / 3;
  leg2.position.set(0.4, 0.1, 0.7);
  group.add(leg2);

  const leg3 = new THREE.Mesh(legGeo, legMat);
  leg3.rotation.y = -Math.PI / 3;
  leg3.position.set(0.4, 0.1, -0.7);
  group.add(leg3);

  const mount = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  mount.position.y = 0.6;
  group.add(mount);

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.2, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x414f43 })
  );
  housing.position.set(0, 1.8, 0);
  group.add(housing);

  const sensor = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  sensor.position.set(-0.5, 2.0, 0.8);
  group.add(sensor);
  
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8),
    new THREE.MeshLambertMaterial({ color: 0xdd2222 })
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.set(-0.9, 2.0, 0.8);
  group.add(lens);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 2.0, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(-1.8, 1.8, 0);
  group.add(barrel);

  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12),
    new THREE.MeshLambertMaterial({ color: 0x050505 })
  );
  muzzle.rotation.z = Math.PI / 2;
  muzzle.position.set(-2.95, 1.8, 0);
  group.add(muzzle);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function createMinigunTurretModel(color, accent = 0x2f3644) {
  const group = createTurretModel(color, accent);

  const extra1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2.0, 10),
    new THREE.MeshLambertMaterial({ color: 0x171717 })
  );
  extra1.rotation.z = Math.PI / 2;
  extra1.position.set(-1.8, 1.95, 0.15);
  group.add(extra1);

  const extra2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2.0, 10),
    new THREE.MeshLambertMaterial({ color: 0x171717 })
  );
  extra2.rotation.z = Math.PI / 2;
  extra2.position.set(-1.8, 1.65, -0.15);
  group.add(extra2);

  return group;
}

function createSniperModel(color, rifleColor = 0x1f1f1f, accent = 0x223026) {
  const group = createSoldierModel(color, rifleColor, accent, false);

  const cloak = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.0, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x4a5c48 })
  );
  cloak.position.set(0.1, 1.1, 0);
  group.add(cloak);

  const rifleGroup = new THREE.Group();

  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.28, 0.16),
    new THREE.MeshLambertMaterial({ color: rifleColor })
  );
  receiver.position.set(-1.0, 1.55, 0);
  rifleGroup.add(receiver);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x171717 })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(-2.4, 1.55, 0);
  rifleGroup.add(barrel);

  const scope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  scope.rotation.z = Math.PI / 2;
  scope.position.set(-1.2, 1.75, 0);
  rifleGroup.add(scope);

  rifleGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  group.add(rifleGroup);
  return group;
}

function createGrenadierModel(color, accent = 0x39573e) {
  const group = createSoldierModel(color, 0x1a1a1a, accent, false);

  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 1.9, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
  );
  tube.rotation.z = Math.PI / 2;
  tube.position.set(-1.95, 1.7, 0);
  group.add(tube);

  const tubeRear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.3, 10),
    new THREE.MeshLambertMaterial({ color: 0x141414 })
  );
  tubeRear.rotation.z = Math.PI / 2;
  tubeRear.position.set(-1.02, 1.7, 0);
  group.add(tubeRear);

  const tubeFront = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.18, 0.26, 10),
    new THREE.MeshLambertMaterial({ color: 0x0f0f0f })
  );
  tubeFront.rotation.z = Math.PI / 2;
  tubeFront.position.set(-2.9, 1.7, 0);
  group.add(tubeFront);

  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.08, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x54462f })
  );
  strap.rotation.z = -0.45;
  strap.position.set(-1.5, 1.97, 0);
  group.add(strap);

  const pouch = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x475845 })
  );
  pouch.position.set(0.66, 1.35, 0.42);
  group.add(pouch);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function createFiftyCalSniperModel(color) {
  const group = createSoldierModel(color, 0x121212, 0x515b48, false);

  const cloak = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.0, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x4a5c48 })
  );
  cloak.position.set(0.1, 1.1, 0);
  group.add(cloak);

  const barrettGroup = new THREE.Group();

  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.38, 0.22),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  receiver.position.set(-0.8, 1.55, 0);
  barrettGroup.add(receiver);

  const topRail = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.08, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x111 })
  );
  topRail.position.set(-1.0, 1.76, 0);
  barrettGroup.add(topRail);

  const mag = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.6, 0.16),
    new THREE.MeshLambertMaterial({ color: 0x141414 })
  );
  mag.position.set(-1.1, 1.2, 0);
  mag.rotation.z = -0.1;
  barrettGroup.add(mag);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(-2.4, 1.55, 0);
  barrettGroup.add(barrel);

  const brake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.12, 0.4, 4),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  brake.rotation.z = -Math.PI / 2;
  brake.position.set(-3.4, 1.55, 0);
  barrettGroup.add(brake);

  const scope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10),
    new THREE.MeshLambertMaterial({ color: 0x050505 })
  );
  scope.rotation.z = Math.PI / 2;
  scope.position.set(-1.0, 1.9, 0);
  barrettGroup.add(scope);

  const mount1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.15, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x111 })
  );
  mount1.position.set(-0.8, 1.8, 0);
  barrettGroup.add(mount1);
  
  const mount2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.15, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x111 })
  );
  mount2.position.set(-1.2, 1.8, 0);
  barrettGroup.add(mount2);

  const bipod = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.1, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x111 })
  );
  bipod.position.set(-1.8, 1.35, 0);
  barrettGroup.add(bipod);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.2, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x111 })
  );
  handle.position.set(-1.6, 1.8, 0.1);
  barrettGroup.add(handle);

  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.35, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x181818 })
  );
  stock.position.set(-0.2, 1.55, 0);
  barrettGroup.add(stock);

  barrettGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  group.add(barrettGroup);
  return group;
}

function createTankEnemyModel(color = 0x2a2a2a) {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 1.2, 2.8),
    new THREE.MeshLambertMaterial({ color })
  );
  hull.position.set(0, 1.0, 0);
  group.add(hull);

  const turretPivot = new THREE.Group();
  turretPivot.name = "tankTurretPivot";
  turretPivot.position.set(-0.25, 1.85, 0);
  group.add(turretPivot);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.0, 2.1),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  top.position.set(0, 0, 0);
  turretPivot.add(top);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 2.8, 10),
    new THREE.MeshLambertMaterial({ color: 0x0d0d0d })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(-2.1, 0.05, 0);
  turretPivot.add(barrel);

  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.22, 0.3, 10),
    new THREE.MeshLambertMaterial({ color: 0x050505 })
  );
  muzzle.rotation.z = Math.PI / 2;
  muzzle.position.set(-3.55, 0.05, 0);
  turretPivot.add(muzzle);

  const treadGeo = new THREE.BoxGeometry(4.8, 0.75, 0.55);
  const treadMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const treadL = new THREE.Mesh(treadGeo, treadMat);
  treadL.position.set(0, 0.45, 1.2);
  group.add(treadL);
  const treadR = new THREE.Mesh(treadGeo, treadMat);
  treadR.position.set(0, 0.45, -1.2);
  group.add(treadR);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}


export {
  createGroundTexture,
  createPathTexture,
  createSoldierModel,
  createRiflemanModel,
  createTurretModel,
  createMinigunTurretModel,
  createSniperModel,
  createGrenadierModel,
  createFiftyCalSniperModel,
  createTankEnemyModel,
};

