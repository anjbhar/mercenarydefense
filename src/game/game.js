import { THREE } from "./three.js";
import { SOLDIER_TYPES, setUnitOffsets } from "./constants.js";
import { disposeObject3D, lerpAngle } from "./utils.js";
import { SoundManager } from "./sound.js";
import {
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
} from "./models.js";
class Enemy {
  constructor(game, spawnPosition, stats) {
    this.game = game;
    this.health = stats.health;
    this.maxHealth = stats.health;
    this.speed = stats.speed;
    this.reward = stats.reward;
    this.radius = stats.radius;
    this.enemyType = stats.enemyType ?? "infantry";
    this.alive = true;
    this.attackRange = 28;
    this.attackDamage = 3.2;
    this.attackCooldown = THREE.MathUtils.randFloat(0.7, 1.3);
    this.attackProjectileSpeed = 34;
    this.attackProjectileRadius = 0.2;
    this.attackSplashRadius = 0;
    this.hasShotAtDefender = false;

    this.mesh =
      this.enemyType === "tank"
        ? createTankEnemyModel(stats.color)
        : createSoldierModel(stats.color, 0x2d2d2d, 0x4d2f2f);
    this.mesh.position.copy(spawnPosition);
    this.mesh.rotation.y = Math.PI;
    this.mesh.scale.setScalar(stats.scale);
    this.healthBarScaleComp = 1 / Math.max(0.0001, stats.scale || 1);
    this.turretPivot = this.enemyType === "tank" ? this.mesh.getObjectByName("tankTurretPivot") : null;

    if (this.enemyType === "tank") {
      this.attackRange = 34;
      this.attackDamage = 8.5;
      this.attackCooldown = THREE.MathUtils.randFloat(2.1, 2.9);
      this.attackProjectileSpeed = 22;
      this.attackProjectileRadius = 0.32;
      this.attackSplashRadius = 4.8;
    }

    this.healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.38),
      new THREE.MeshBasicMaterial({
        color: 0x341a1a,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.healthBarBg.position.set(0, 4.15, 0);
    this.healthBarBg.rotation.x = -Math.PI / 4;
    this.healthBarBg.scale.setScalar(this.healthBarScaleComp);
    this.healthBarBg.renderOrder = 120;
    this.healthBarBg.visible = false;
    this.mesh.add(this.healthBarBg);

    this.healthBar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.26),
      new THREE.MeshBasicMaterial({
        color: 0xff7f6f,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.healthBar.position.set(0, 4.15, 0.02);
    this.healthBar.rotation.x = -Math.PI / 4;
    this.healthBar.renderOrder = 121;
    this.healthBar.visible = false;
    this.mesh.add(this.healthBar);

    this.healthBarVisibleTimer = 0;

    this.game.scene.add(this.mesh);
    this.updateHealthBar();
  }

  update(delta) {
    if (!this.alive) {
      return;
    }

    if (this.healthBarVisibleTimer > 0) {
      this.healthBarVisibleTimer -= delta;
      if (this.healthBarVisibleTimer <= 0) {
        this.healthBarBg.visible = false;
        this.healthBar.visible = false;
      }
    }

    // Keep bars world-horizontal and uniform even when enemy rotates.
    this.healthBarBg.rotation.set(-Math.PI / 4, -this.mesh.rotation.y, 0);
    this.healthBar.rotation.set(-Math.PI / 4, -this.mesh.rotation.y, 0);

    const target = new THREE.Vector3(this.game.mapRightX, 0, this.mesh.position.z);
    const moveDir = new THREE.Vector3(
      target.x - this.mesh.position.x,
      0,
      target.z - this.mesh.position.z
    );

    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      this.mesh.position.addScaledVector(moveDir, this.speed * delta);
      // Tanks always keep hull aligned to movement; other enemies can retain shot-facing.
      if (this.enemyType === "tank" || !this.hasShotAtDefender) {
        this.mesh.rotation.y = Math.atan2(moveDir.z, -moveDir.x);
      }
    }

    this.attackCooldown -= delta;
    if (this.attackCooldown <= 0) {
      const defender = this.findNearestDefenderInRange();
      if (defender) {
        const toDefender = defender.mesh.position.clone().sub(this.mesh.position);
        toDefender.y = 0;
        if (toDefender.lengthSq() > 0.0001) {
          toDefender.normalize();
          const shotYaw = Math.atan2(toDefender.z, -toDefender.x);
          if (this.enemyType === "tank" && this.turretPivot) {
            // Rotate only the tank turret/gun, not the hull.
            this.turretPivot.rotation.y = shotYaw - this.mesh.rotation.y;
          } else {
            this.mesh.rotation.y = shotYaw;
            this.hasShotAtDefender = true;
          }
        }
        this.game.enemyProjectiles.push(new EnemyProjectile(this.game, this, defender, this.attackDamage, this.attackProjectileSpeed, this.attackProjectileRadius));
        this.attackCooldown =
          this.enemyType === "tank"
            ? THREE.MathUtils.randFloat(2.2, 3.2)
            : THREE.MathUtils.randFloat(0.95, 1.6);
      } else {
        this.attackCooldown =
          this.enemyType === "tank"
            ? THREE.MathUtils.randFloat(1.1, 1.7)
            : THREE.MathUtils.randFloat(0.45, 0.8);
      }
    }

    if (this.mesh.position.x >= this.game.mapRightX - 0.4) {
      this.game.enemyReachedBase(this);
    }
  }

  takeDamage(amount) {
    if (!this.alive) {
      return;
    }

    this.health -= amount;
    this.healthBarVisibleTimer = 1.5;
    this.healthBarBg.visible = true;
    this.healthBar.visible = true;
    this.updateHealthBar();
    this.game.spawnBloodSplat(this.mesh.position);
    this.game.sound.hit();

    if (this.health <= 0) {
      this.alive = false;
      this.game.addMoney(this.reward, this.mesh.position);
      this.game.sound.kill();
      this.game.removeEnemy(this);
    }
  }

  updateHealthBar() {
    const ratio = THREE.MathUtils.clamp(this.health / this.maxHealth, 0, 1);
    const s = this.healthBarScaleComp;
    this.healthBar.scale.set(ratio * s, s, s);
    this.healthBar.position.x = (1 - ratio) * 1.2 * s;
  }

  findNearestDefenderInRange() {
    let closest = null;
    let closestDist = Infinity;
    for (const soldier of this.game.soldiers) {
      const dist = this.mesh.position.distanceTo(soldier.mesh.position);
      if (dist <= this.attackRange && dist < closestDist) {
        closest = soldier;
        closestDist = dist;
      }
    }
    return closest;
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    disposeObject3D(this.mesh);
  }
}

class Soldier {
  constructor(game, type, position) {
    this.game = game;
    this.type = type;
    this.definition = SOLDIER_TYPES[type];
    this.stats = {
      range: this.game.mapWidth * this.definition.rangeRatio,
      coneAngle: this.definition.coneAngle,
      fireRate: this.definition.fireRate,
      damage: this.definition.damage,
      projectileSpeed: this.definition.projectileSpeed,
      projectileRadius: this.definition.projectileRadius,
      projectileColor: this.definition.projectileColor,
      splashRadius: this.definition.splashRadius ?? 0,
      arcHeight: this.definition.arcHeight ?? 0,
      rangeColor: this.definition.rangeColor,
      rangeShape: this.definition.rangeShape ?? "cone",
      color: this.definition.color,
    };
    this.displayName = this.definition.label;
    this.alive = true;
    this.specialUpgrades = {
      minigun: false,
      fiftycal: false,
      commando: false,
    };
    this.maxHealth = this.definition.health ?? 120;
    this.health = this.maxHealth;
    this.healthBarVisibleTimer = 0;

    this.cooldown = 0;
    this.burstShots = 1;
    this.burstInterval = 0;
    this.burstShotsRemaining = 0;
    this.burstTimer = 0;
    this.aimYaw = 0;
    this.fireYaw = 0;

    this.mesh =
      this.definition.model === "turret"
        ? createTurretModel(this.stats.color)
        : this.definition.model === "rifleman"
        ? createRiflemanModel(this.stats.color)
        : this.definition.model === "sniper"
        ? createSniperModel(this.stats.color)
        : this.definition.model === "grenadier"
        ? createGrenadierModel(this.stats.color)
        : createSoldierModel(this.stats.color, 0x2a2a2a);
    this.mesh.position.copy(position);
    this.mesh.rotation.y = this.aimYaw;

    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.userData.soldierRef = this;
      }
    });
    this.game.scene.add(this.mesh);

    this.healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.38),
      new THREE.MeshBasicMaterial({
        color: 0x153019,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.healthBarBg.position.set(0, 4.35, 0);
    this.healthBarBg.rotation.x = -Math.PI / 4;
    this.healthBarBg.renderOrder = 120;
    this.healthBarBg.visible = false;
    this.mesh.add(this.healthBarBg);

    this.healthBar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.26),
      new THREE.MeshBasicMaterial({
        color: 0x86ff98,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.healthBar.position.set(0, 4.35, 0.02);
    this.healthBar.rotation.x = -Math.PI / 4;
    this.healthBar.renderOrder = 121;
    this.healthBar.visible = false;
    this.mesh.add(this.healthBar);
    this.syncHealthBarTransform();
    this.updateHealthBar();

    this.createRangeCone();
    this.syncConeTransform();
  }

  replaceModel(newModel) {
    if (this.healthBarBg?.parent === this.mesh) {
      this.mesh.remove(this.healthBarBg);
    }
    if (this.healthBar?.parent === this.mesh) {
      this.mesh.remove(this.healthBar);
    }
    newModel.position.copy(this.mesh.position);
    newModel.rotation.y = this.aimYaw;
    newModel.traverse((child) => {
      if (child.isMesh) {
        child.userData.soldierRef = this;
      }
    });

    this.game.scene.add(newModel);
    this.game.scene.remove(this.mesh);
    disposeObject3D(this.mesh);
    this.mesh = newModel;
  }

  getUpgradeOptions() {
    const options = [];
    if (this.type === "rifleman" && !this.specialUpgrades.commando) {
      options.push({ id: "commando", label: "Commando", cost: 120 });
    }
    if (this.type === "machinegun" && !this.specialUpgrades.minigun) {
      options.push({ id: "minigun", label: "Advanced Sentry", cost: 165 });
    }
    if (this.type === "sniper" && !this.specialUpgrades.fiftycal) {
      options.push({ id: "fiftycal", label: ".50 Cal Sniper", cost: 140 });
    }
    return options;
  }

  applySpecialUpgrade(id) {
    if (id === "commando" && this.type === "rifleman" && !this.specialUpgrades.commando) {
      this.specialUpgrades.commando = true;
      this.displayName = "Commando";
      this.stats.damage *= 0.78;
      this.stats.fireRate *= 1.35;
      this.stats.projectileSpeed += 8;
      this.stats.projectileRadius = 0.32;
      this.stats.projectileColor = 0xffdf95;
      this.stats.range *= 1.08;
      this.burstShots = 3;
      this.burstInterval = 0.09;
      this.maxHealth *= 1.2;
      this.health = Math.min(this.maxHealth, this.health * 1.2);
      this.replaceModel(createRiflemanModel(0x4fae64, 0x1b1b1b, 0x2d4e33));
      this.rebindHealthBarToMesh();
      this.createRangeCone();
      this.syncConeTransform();
      return true;
    }

    if (id === "minigun" && this.type === "machinegun" && !this.specialUpgrades.minigun) {
      this.specialUpgrades.minigun = true;
      this.displayName = "Advanced Sentry";
      this.stats.fireRate *= 1.8;
      this.stats.damage *= 1.35;
      this.stats.range *= 1.08;
      this.stats.projectileSpeed += 18;
      this.stats.projectileRadius = 0.22;
      this.stats.projectileColor = 0xfff0a8;
      this.stats.coneAngle = 110;
      this.stats.rangeShape = "circle";
      this.stats.rangeColor = 0xf0cf68;
      this.maxHealth *= 1.3;
      this.health = Math.min(this.maxHealth, this.health * 1.3);
      this.replaceModel(createMinigunTurretModel(this.stats.color));
      this.rebindHealthBarToMesh();
      this.createRangeCone();
      this.syncConeTransform();
      return true;
    }

    if (id === "fiftycal" && this.type === "sniper" && !this.specialUpgrades.fiftycal) {
      this.specialUpgrades.fiftycal = true;
      this.displayName = ".50 Cal Sniper";
      this.stats.damage *= 2.2;
      this.stats.fireRate *= 0.75;
      this.stats.range *= 1.15;
      this.stats.projectileSpeed += 14;
      this.stats.projectileRadius = 0.42;
      this.stats.projectileColor = 0xffc7c7;
      this.stats.coneAngle = 360;
      this.stats.rangeColor = 0xc09aea;
      this.maxHealth *= 1.15;
      this.health = Math.min(this.maxHealth, this.health * 1.15);
      this.replaceModel(createFiftyCalSniperModel(this.stats.color));
      this.rebindHealthBarToMesh();
      this.createRangeCone();
      this.syncConeTransform();
      return true;
    }

    return false;
  }

  rebindHealthBarToMesh() {
    this.mesh.add(this.healthBarBg);
    this.mesh.add(this.healthBar);
    this.syncHealthBarTransform();
    this.updateHealthBar();
  }

  syncHealthBarTransform() {
    this.healthBarBg.position.set(0, 3.9, 0);
    this.healthBar.position.set(this.healthBar.position.x, 3.9, 0.02);
    this.healthBarBg.rotation.set(-Math.PI / 4, -this.mesh.rotation.y, 0);
    this.healthBar.rotation.set(-Math.PI / 4, -this.mesh.rotation.y, 0);
  }

  createRangeCone() {
    if (this.rangeCone) {
      this.game.scene.remove(this.rangeCone);
      this.rangeCone.geometry.dispose();
      this.rangeCone.material.dispose();
    }

    const geometry =
      this.stats.rangeShape === "circle"
        ? new THREE.CircleGeometry(this.stats.range, 96, 0, Math.PI * 2)
        : new THREE.CircleGeometry(
            this.stats.range,
            58,
            Math.PI - THREE.MathUtils.degToRad(this.stats.coneAngle) / 2,
            THREE.MathUtils.degToRad(this.stats.coneAngle)
          );

    this.rangeCone = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: this.stats.rangeColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.rangeCone.visible = false;
    this.game.scene.add(this.rangeCone);
  }

  getForwardVector() {
    return new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.fireYaw);
  }

  getRightVector() {
    return new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.aimYaw);
  }

  getMuzzleWorldPosition() {
    const pos = this.definition.muzzleLocal.clone();
    return this.mesh.localToWorld(pos);
  }

  getShellWorldPosition() {
    const pos = this.definition.shellLocal.clone();
    return this.mesh.localToWorld(pos);
  }

  syncConeTransform() {
    this.rangeCone.position.set(this.mesh.position.x, 0.05, this.mesh.position.z);
    const yaw = this.stats.rangeShape === "circle" ? 0 : this.fireYaw;
    this.rangeCone.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, yaw, 0));
  }

  findNearestEnemyByDistance(maxRange) {
    let closest = null;
    let closestDist = Infinity;

    for (const enemy of this.game.enemies) {
      if (!enemy.alive) {
        continue;
      }

      const dist = this.mesh.position.distanceTo(enemy.mesh.position);
      if (dist <= maxRange && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    }

    return closest;
  }

  findHighestHealthEnemyInRange(maxRange) {
    let target = null;
    let highestHealth = -Infinity;
    let tieDist = Infinity;

    for (const enemy of this.game.enemies) {
      if (!enemy.alive) {
        continue;
      }
      const dist = this.mesh.position.distanceTo(enemy.mesh.position);
      if (dist > maxRange) {
        continue;
      }
      if (enemy.health > highestHealth || (enemy.health === highestHealth && dist < tieDist)) {
        highestHealth = enemy.health;
        tieDist = dist;
        target = enemy;
      }
    }

    return target;
  }

  findNearestEnemyInCone() {
    if (this.type === "grenadier") {
      return this.findHighestHealthEnemyInRange(this.stats.range);
    }
    if (this.stats.rangeShape === "circle") {
      return this.findNearestEnemyByDistance(this.stats.range);
    }

    let closest = null;
    let closestDist = Infinity;

    const coneHalf = THREE.MathUtils.degToRad(this.stats.coneAngle / 2);
    const forward = this.getForwardVector();

    for (const enemy of this.game.enemies) {
      if (!enemy.alive) {
        continue;
      }

      const toEnemy = enemy.mesh.position.clone().sub(this.mesh.position);
      toEnemy.y = 0;
      const dist = toEnemy.length();

      if (dist <= this.stats.range && dist < closestDist) {
        const dir = toEnemy.normalize();
        const angle = forward.angleTo(dir);
        if (angle <= coneHalf) {
          closest = enemy;
          closestDist = dist;
        }
      }
    }

    return closest;
  }

  update(delta) {
    this.cooldown -= delta;
    this.burstTimer -= delta;
    this.syncHealthBarTransform();
    if (this.healthBarVisibleTimer > 0) {
      this.healthBarVisibleTimer -= delta;
      if (this.healthBarVisibleTimer <= 0) {
        this.healthBarBg.visible = false;
        this.healthBar.visible = false;
      }
    }

    const broadTarget =
      this.type === "grenadier"
        ? this.findHighestHealthEnemyInRange(this.stats.range)
        : this.findNearestEnemyByDistance(this.stats.range);
    if (broadTarget) {
      const toEnemy = broadTarget.mesh.position.clone().sub(this.mesh.position);
      toEnemy.y = 0;
      if (toEnemy.lengthSq() > 0.00001) {
        const desiredYaw = Math.atan2(toEnemy.z, -toEnemy.x);
        const turnSpeed = this.type === "machinegun" ? 10 : 6;
        this.aimYaw = lerpAngle(this.aimYaw, desiredYaw, Math.min(1, delta * turnSpeed));
        this.mesh.rotation.y = this.aimYaw;
      }
    }

    this.rangeCone.visible = this.game.selectedSoldier === this;
    this.syncConeTransform();

    const enemy = this.findNearestEnemyInCone();
    if (!enemy) {
      return;
    }

    if (this.burstShotsRemaining > 0) {
      if (this.burstTimer <= 0) {
        this.game.projectiles.push(new Projectile(this.game, this, enemy));
        this.game.spawnShotEffects(this);
        this.burstShotsRemaining -= 1;
        if (this.burstShotsRemaining > 0) {
          this.burstTimer = this.burstInterval;
        } else {
          this.cooldown = 1 / this.stats.fireRate;
        }
      }
      return;
    }

    if (this.cooldown > 0) {
      return;
    }

    this.game.projectiles.push(new Projectile(this.game, this, enemy));
    this.game.spawnShotEffects(this);
    if (this.burstShots > 1) {
      this.burstShotsRemaining = this.burstShots - 1;
      this.burstTimer = this.burstInterval;
    } else {
      this.cooldown = 1 / this.stats.fireRate;
    }
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.healthBarVisibleTimer = 2.2;
    this.healthBarBg.visible = true;
    this.healthBar.visible = true;
    this.updateHealthBar();
    this.game.updateSelectedSoldierHealthUI();
    this.game.sound.hit();
    if (this.health <= 0) {
      this.game.removeSoldier(this);
    }
  }

  updateHealthBar() {
    const ratio = THREE.MathUtils.clamp(this.health / this.maxHealth, 0, 1);
    this.healthBar.scale.x = ratio;
    this.healthBar.position.x = (1 - ratio) * 1.2;
    this.syncHealthBarTransform();
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    disposeObject3D(this.mesh);

    this.game.scene.remove(this.rangeCone);
    this.rangeCone.geometry.dispose();
    this.rangeCone.material.dispose();
  }
}

class Projectile {
  constructor(game, sourceSoldier, targetEnemy) {
    this.game = game;
    this.source = sourceSoldier;
    this.target = targetEnemy;
    this.damage = sourceSoldier.stats.damage;
    this.splashRadius = sourceSoldier.stats.splashRadius;
    this.arcHeight = sourceSoldier.stats.arcHeight;
    this.speed = sourceSoldier.stats.projectileSpeed;
    this.alive = true;
    this.life = 2.3;
    this.distanceTraveled = 0;
    this.maxTravelDistance = sourceSoldier.stats.range;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(sourceSoldier.stats.projectileRadius, 8, 8),
      new THREE.MeshBasicMaterial({ color: sourceSoldier.stats.projectileColor })
    );

    const startPos = sourceSoldier.getMuzzleWorldPosition();
    this.mesh.position.copy(startPos);
    this.startPos = startPos.clone();
    this.initialDistance = Math.max(0.001, startPos.distanceTo(targetEnemy.mesh.position));
    this.velocity = targetEnemy.mesh.position
      .clone()
      .sub(startPos)
      .normalize();
    this.game.scene.add(this.mesh);
  }

  update(delta) {
    if (!this.alive) {
      return;
    }

    this.life -= delta;
    if (this.life <= 0) {
      if (this.splashRadius > 0) {
        this.explodeAtCurrentPosition();
      } else {
        this.alive = false;
        this.dispose();
      }
      return;
    }

    const targetAlive = this.target?.alive;
    if (targetAlive) {
      const targetPos = this.target.mesh.position;
      const dir = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
      const distanceToTarget = dir.length();
      if (distanceToTarget > 0.001) {
        dir.normalize();
        this.velocity.copy(dir);
      }

      if (this.arcHeight > 0) {
        const remain = this.mesh.position.distanceTo(targetPos);
        const progress = THREE.MathUtils.clamp(1 - remain / this.initialDistance, 0, 1);
        const baseY = THREE.MathUtils.lerp(this.startPos.y, targetPos.y, progress);
        this.mesh.position.y = baseY + Math.sin(progress * Math.PI) * this.arcHeight;
      }
    }

    this.mesh.position.addScaledVector(this.velocity, this.speed * delta);
    this.distanceTraveled += this.speed * delta;

    if (this.splashRadius > 0 && this.distanceTraveled >= this.maxTravelDistance) {
      this.explodeAtCurrentPosition();
      return;
    }

    const hitEnemy = this.findHitEnemy();
    if (hitEnemy) {
      this.hit(hitEnemy);
    }
  }

  explodeAtCurrentPosition() {
    this.game.applySplashDamage(this.mesh.position.clone(), this.splashRadius, this.damage, null);
    this.game.effects.push(new ExplosionEffect(this.game, this.mesh.position.clone(), 0xffb57a, this.splashRadius));
    this.game.sound.explosion();
    this.alive = false;
    this.dispose();
  }

  findHitEnemy() {
    for (const enemy of this.game.enemies) {
      if (!enemy.alive) {
        continue;
      }
      if (this.mesh.position.distanceTo(enemy.mesh.position) <= enemy.radius + 0.55) {
        return enemy;
      }
    }
    return null;
  }

  hit(enemy) {
    if (!enemy?.alive) {
      return;
    }
    if (this.splashRadius > 0) {
      const impactPos = this.mesh.position.clone();
      this.game.applySplashDamage(impactPos, this.splashRadius, this.damage, enemy, this.source);
      this.game.effects.push(new ExplosionEffect(this.game, impactPos, 0xffb57a, this.splashRadius));
      this.game.sound.explosion();
    } else {
      enemy.takeDamage(this.game.computeDefenderDamageAgainstEnemy(this.damage, enemy, this.source));
    }
    this.alive = false;
    this.dispose();
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class EnemyProjectile {
  constructor(game, sourceEnemy, targetSoldier, damage, speed, radius) {
    this.game = game;
    this.source = sourceEnemy;
    this.target = targetSoldier;
    this.damage = damage;
    this.speed = speed;
    this.alive = true;
    this.life = sourceEnemy.enemyType === "tank" ? 2.6 : 1.8;
    this.splashRadius = sourceEnemy.attackSplashRadius ?? 0;
    this.distanceTraveled = 0;
    this.maxTravelDistance = sourceEnemy.attackRange ?? 28;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa7d })
    );

    this.mesh.position.copy(sourceEnemy.mesh.position).add(new THREE.Vector3(0, 1.95, 0));
    const initialTargetPos = targetSoldier.mesh.position.clone().add(new THREE.Vector3(0, 1.55, 0));
    this.velocity = initialTargetPos
      .sub(this.mesh.position)
      .normalize();
    this.game.scene.add(this.mesh);
  }

  update(delta) {
    if (!this.alive) {
      return;
    }

    this.life -= delta;
    if (this.life <= 0) {
      if (this.splashRadius > 0) {
        this.explodeAtCurrentPosition();
      } else {
        this.alive = false;
        this.dispose();
      }
      return;
    }

    const targetAlive = this.target && this.target.alive && this.game.soldiers.includes(this.target);
    if (targetAlive) {
      const targetPos = this.target.mesh.position.clone().add(new THREE.Vector3(0, 1.55, 0));
      const toTarget = targetPos.sub(this.mesh.position);
      if (toTarget.lengthSq() > 0.0001) {
        toTarget.normalize();
        this.velocity.copy(toTarget);
      }
    }

    this.mesh.position.addScaledVector(this.velocity, this.speed * delta);
    this.distanceTraveled += this.speed * delta;

    if (this.splashRadius > 0 && this.distanceTraveled >= this.maxTravelDistance) {
      this.explodeAtCurrentPosition();
      return;
    }

    const hitSoldier = this.findHitSoldier();
    if (hitSoldier) {
      this.hit(hitSoldier);
    }
  }

  explodeAtCurrentPosition() {
    const pos = this.mesh.position.clone();
    this.game.applyEnemySplashDamage(pos, this.splashRadius, this.damage, null);
    this.game.effects.push(new ExplosionEffect(this.game, pos, 0xff9f6d, this.splashRadius));
    this.game.sound.explosion();
    this.alive = false;
    this.dispose();
  }

  findHitSoldier() {
    for (const soldier of this.game.soldiers) {
      if (!soldier.alive) {
        continue;
      }
      const targetX = soldier.mesh.position.x;
      const targetY = soldier.mesh.position.y + 1.55;
      const targetZ = soldier.mesh.position.z;
      const dx = this.mesh.position.x - targetX;
      const dy = this.mesh.position.y - targetY;
      const dz = this.mesh.position.z - targetZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq <= 1.35 * 1.35) {
        return soldier;
      }
    }
    return null;
  }

  hit(soldier) {
    if (this.splashRadius > 0) {
      const pos = this.mesh.position.clone();
      this.game.applyEnemySplashDamage(pos, this.splashRadius, this.damage, soldier);
      this.game.effects.push(new ExplosionEffect(this.game, pos, 0xff9f6d, this.splashRadius));
      this.game.sound.explosion();
    } else if (soldier?.alive) {
      soldier.takeDamage(this.damage);
    }
    this.alive = false;
    this.dispose();
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class MuzzleFlashEffect {
  constructor(game, position, color, size) {
    this.game = game;
    this.life = 0.08;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      })
    );
    this.mesh.position.copy(position);
    this.game.scene.add(this.mesh);
  }

  update(delta) {
    this.life -= delta;
    this.mesh.material.opacity = Math.max(0, this.life * 11);
    this.mesh.scale.addScalar(delta * 10);

    if (this.life <= 0) {
      this.dispose();
      return false;
    }
    return true;
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class ShellEffect {
  constructor(game, position, rightVector) {
    this.game = game;
    this.life = 0.8;

    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8),
      new THREE.MeshLambertMaterial({ color: 0xcca35b })
    );
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.copy(position);

    this.velocity = rightVector
      .clone()
      .multiplyScalar(7 + Math.random() * 2)
      .add(new THREE.Vector3(0, 4.2 + Math.random() * 2, 0));

    this.spin = new THREE.Vector3(
      Math.random() * 7,
      Math.random() * 9,
      Math.random() * 8
    );

    this.game.scene.add(this.mesh);
  }

  update(delta) {
    this.life -= delta;
    this.velocity.y -= 14 * delta;
    this.mesh.position.addScaledVector(this.velocity, delta);

    this.mesh.rotation.x += this.spin.x * delta;
    this.mesh.rotation.y += this.spin.y * delta;
    this.mesh.rotation.z += this.spin.z * delta;

    if (this.mesh.position.y < 0.14) {
      this.mesh.position.y = 0.14;
      this.velocity.multiplyScalar(0.45);
      this.velocity.y = Math.abs(this.velocity.y) * 0.35;
      this.spin.multiplyScalar(0.72);
    }

    if (this.life <= 0) {
      this.dispose();
      return false;
    }

    return true;
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class BloodSplatEffect {
  constructor(game, position) {
    this.game = game;
    this.life = 0.5;
    this.drops = [];

    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      const size = THREE.MathUtils.randFloat(0.28, 0.65);
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(size, 12),
        new THREE.MeshBasicMaterial({
          color: 0x8f1b1b,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        position.x + THREE.MathUtils.randFloatSpread(1.2),
        0.08,
        position.z + THREE.MathUtils.randFloatSpread(1.2)
      );
      this.game.scene.add(mesh);
      this.drops.push(mesh);
    }
  }

  update(delta) {
    this.life -= delta;
    const alpha = Math.max(0, this.life * 0.9);

    for (const drop of this.drops) {
      drop.material.opacity = alpha;
    }

    if (this.life <= 0) {
      this.dispose();
      return false;
    }
    return true;
  }

  dispose() {
    for (const drop of this.drops) {
      this.game.scene.remove(drop);
      drop.geometry.dispose();
      drop.material.dispose();
    }
  }
}

class ExplosionEffect {
  constructor(game, position, color = 0xffb26a, radius = 4) {
    this.game = game;
    this.life = 0.35;

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.5, radius * 0.18), Math.max(0.8, radius * 0.55), 30),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(position.x, 0.12, position.z);
    this.game.scene.add(this.ring);
  }

  update(delta) {
    this.life -= delta;
    this.ring.scale.addScalar(delta * 7.5);
    this.ring.material.opacity = Math.max(0, this.life * 2.2);
    if (this.life <= 0) {
      this.dispose();
      return false;
    }
    return true;
  }

  dispose() {
    this.game.scene.remove(this.ring);
    this.ring.geometry.dispose();
    this.ring.material.dispose();
  }
}

class Landmine {
  constructor(game, position) {
    this.game = game;
    this.position = position.clone();
    this.triggerRadius = 3.4;
    this.explosionRadius = 6.2;
    this.damage = 95;
    this.armed = true;

    this.mesh = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.95, 0.3, 14),
      new THREE.MeshLambertMaterial({ color: 0x2c2c2c })
    );
    base.position.y = 0.15;
    this.mesh.add(base);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.18, 10),
      new THREE.MeshLambertMaterial({ color: 0xc13737 })
    );
    cap.position.y = 0.33;
    this.mesh.add(cap);

    this.mesh.position.copy(position);
    this.game.scene.add(this.mesh);
  }

  update() {
    if (!this.armed) {
      return false;
    }
    for (const enemy of this.game.enemies) {
      if (!enemy.alive) {
        continue;
      }
      if (enemy.mesh.position.distanceTo(this.position) <= this.triggerRadius) {
        this.explode();
        return false;
      }
    }
    return true;
  }

  explode() {
    this.armed = false;
    this.game.applySplashDamage(this.position, this.explosionRadius, this.damage, null);
    this.game.effects.push(new ExplosionEffect(this.game, this.position, 0xffa768, this.explosionRadius));
    this.game.sound.explosion();
    this.dispose();
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    disposeObject3D(this.mesh);
  }
}

class WaveManager {
  constructor(game) {
    this.game = game;
    this.finalWave = 15;
    this.wave = 0;
    this.pendingSpawns = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.8;
    this.active = false;
    this.waitingForStart = true;
    this.currentStats = null;
    this.tanksSpawnedThisWave = 0;
  }

  startWave() {
    if (this.game.gameOver || this.active || !this.waitingForStart) {
      return false;
    }
    if (this.wave >= this.finalWave) {
      this.game.setHint(`Final wave (${this.finalWave}) already completed.`);
      return false;
    }

    this.wave += 1;
    this.active = true;
    this.waitingForStart = false;

    const count = 7 + this.wave * 2;
    const health = 12 + this.wave * 4.5;
    const speed = 4.3 + this.wave * 0.38;
    const reward = 8 + Math.floor(this.wave * 1.4);

    this.currentStats = { health, speed, reward };
    this.pendingSpawns = count;
    this.spawnInterval = Math.max(0.22, 0.74 - this.wave * 0.04);
    this.spawnTimer = 0.2;
    this.tanksSpawnedThisWave = 0;

    this.game.updateWave(this.wave);
    this.game.sound.waveStart();
    this.game.setHint(`Wave ${this.wave} started: ${count} enemies incoming.`);
    return true;
  }

  update(delta) {
    if (this.game.gameOver || !this.active) {
      return;
    }

    this.spawnTimer -= delta;
    if (this.pendingSpawns > 0 && this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.pendingSpawns -= 1;
      this.spawnTimer = this.spawnInterval;
    }

    if (this.pendingSpawns <= 0 && this.game.enemies.length === 0) {
      this.active = false;
      const bonus = 15 + this.wave * 3;
      this.game.addMoney(bonus);
      if (this.wave >= this.finalWave) {
        this.waitingForStart = false;
        this.game.winGame();
      } else {
        this.waitingForStart = true;
        this.game.setHint(`Wave ${this.wave} cleared. +$${bonus}. Press Start Next Wave when ready.`);
      }
    }
  }

  spawnEnemy() {
    const zSpread = THREE.MathUtils.randFloatSpread(this.game.mapHeight - 10);
    const spawn = new THREE.Vector3(this.game.mapLeftX + 2, 0, zSpread);

    const heavyChance = this.wave >= 3 ? Math.min(0.42, 0.08 + this.wave * 0.025) : 0;
    const juggernautChance = this.wave >= 5 ? Math.min(0.22, 0.05 + (this.wave - 5) * 0.018) : 0;
    const tankChance = this.wave >= 10 ? Math.min(0.24, 0.06 + (this.wave - 10) * 0.02) : 0;
    const wave10TankCapReached = this.wave === 10 && this.tanksSpawnedThisWave >= 1;
    const mustSpawnWave10Tank = this.wave === 10 && this.tanksSpawnedThisWave === 0 && this.pendingSpawns <= 1;
    const tank = !wave10TankCapReached && (mustSpawnWave10Tank || Math.random() < tankChance);
    const juggernaut = Math.random() < juggernautChance;
    const heavy = !tank && !juggernaut && Math.random() < heavyChance;
    if (tank) {
      this.tanksSpawnedThisWave += 1;
    }

    const stats = {
      health: tank
        ? this.currentStats.health * 5.8
        : juggernaut
        ? this.currentStats.health * 3.3
        : heavy
        ? this.currentStats.health * 1.55
        : this.currentStats.health,
      speed: tank
        ? this.currentStats.speed * 0.52
        : juggernaut
        ? this.currentStats.speed * 0.62
        : heavy
        ? this.currentStats.speed * 0.8
        : this.currentStats.speed,
      reward: tank
        ? Math.floor(this.currentStats.reward * 4.8)
        : juggernaut
        ? Math.floor(this.currentStats.reward * 4.0)
        : heavy
        ? Math.floor(this.currentStats.reward * 2.1)
        : this.currentStats.reward,
      color: tank ? 0x161616 : juggernaut ? 0x101010 : heavy ? 0x9f3939 : 0xc95656,
      scale: tank ? 1.32 : juggernaut ? 1.52 : heavy ? 1.25 : 1,
      radius: tank ? 2.9 : juggernaut ? 2.25 : heavy ? 1.85 : 1.45,
      enemyType: tank ? "tank" : juggernaut ? "juggernaut" : heavy ? "heavy" : "infantry",
    };

    this.game.enemies.push(new Enemy(this.game, spawn, stats));
  }
}

class Game {
  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.hudHeight = 0;
    this.viewportLeft = 0;
    this.viewportTop = 0;
    this.viewportWidth = this.width;
    this.viewportHeight = this.height;

    this.money = 100;
    this.health = 20;
    this.gameOver = false;

    this.mapWidth = 136;
    this.mapHeight = 80;
    this.mapLeftX = -68;
    this.mapRightX = 68;
    this.mapTopZ = 40;
    this.mapBottomZ = -40;
    this.trenchMinX = 54;
    this.trenchMaxX = 68;
    this.trenchCenter = new THREE.Vector3(61, 0, 0);

    this.selectedType = null;
    this.selectedUtility = null;
    this.selectedSoldier = null;

    this.enemies = [];
    this.soldiers = [];
    this.landmines = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.effects = [];
    this.moneyPopups = [];

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.sound = new SoundManager();

    this.setupRenderer();
    this.setupScene();
    this.setupLights();
    this.setupWorld();
    this.setupUI();
    this.updateLayout();

    this.waveManager = new WaveManager(this);

    window.addEventListener("resize", () => this.onResize());
    this.renderer.domElement.addEventListener("pointerdown", (event) => this.onPointerDown(event));

    this.updateWave(0);
    this.updateHUD();
    this.setHint("Defend the BASE on the right side. Deploy defenders, then press Start Next Wave.");
    this.animate();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x4f6653, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.position = "fixed";
    this.renderer.domElement.style.left = "0px";
    this.renderer.domElement.style.top = "0px";
    this.renderer.domElement.style.zIndex = "0";
    document.body.appendChild(this.renderer.domElement);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x5a755f, 120, 230);

    const aspect = this.width / this.height;
    const frustumHeight = 85;

    this.camera = new THREE.OrthographicCamera(
      (-frustumHeight * aspect) / 2,
      (frustumHeight * aspect) / 2,
      frustumHeight / 2,
      -frustumHeight / 2,
      0.1,
      400
    );

    this.camera.position.set(0, 88, 18);
    this.camera.lookAt(0, 0, 0);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xddefff, 0x4f5b49, 0.66);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.62);
    dir.position.set(28, 45, 30);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -80;
    dir.shadow.camera.right = 80;
    dir.shadow.camera.top = 80;
    dir.shadow.camera.bottom = -80;
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0xfff2de, 0.2);
    fill.position.set(-20, 25, -16);
    this.scene.add(fill);
  }

  setupWorld() {
    const groundTexture = createGroundTexture();
    const visualWidth = this.mapWidth + 90;
    const visualHeight = this.mapHeight + 36;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(visualWidth, visualHeight),
      new THREE.MeshLambertMaterial({ color: 0x5f7f5c, map: groundTexture })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    // Right-side base zone marker so the defense objective is obvious.
    const baseZone = new THREE.Mesh(
      new THREE.PlaneGeometry(12.5, this.mapHeight + 10),
      new THREE.MeshLambertMaterial({
        color: 0x3f5a45,
        transparent: true,
        opacity: 0.9,
      })
    );
    baseZone.rotation.x = -Math.PI / 2;
    baseZone.position.set(this.mapRightX - 5.2, 0.07, 0);
    baseZone.receiveShadow = true;
    this.scene.add(baseZone);

    const baseWallGroup = new THREE.Group();
    for (let z = this.mapBottomZ + 4; z <= this.mapTopZ - 4; z += 6.6) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.25, 3.5),
        new THREE.MeshLambertMaterial({ color: 0x6b6253 })
      );
      block.position.set(this.mapRightX - 1.2, 0.62, z);
      block.castShadow = true;
      block.receiveShadow = true;
      baseWallGroup.add(block);
    }
    this.scene.add(baseWallGroup);

    for (let i = 0; i < 32; i += 1) {
      const rock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.8, 0.6, 7),
        new THREE.MeshLambertMaterial({ color: 0x5e665d })
      );
      rock.position.set(
        THREE.MathUtils.randFloat(this.mapLeftX + 6, this.mapRightX - 8),
        0.28,
        THREE.MathUtils.randFloat(this.mapBottomZ + 3, this.mapTopZ - 3)
      );
      if (rock.position.x > -8 && rock.position.x < 24 && Math.abs(rock.position.z) < 8) {
        i -= 1;
        continue;
      }
      rock.rotation.y = Math.random() * Math.PI;
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    for (let i = 0; i < 20; i += 1) {
      const crater = new THREE.Mesh(
        new THREE.CircleGeometry(THREE.MathUtils.randFloat(1.8, 3.3), 24),
        new THREE.MeshLambertMaterial({
          color: 0x4a4a40,
          transparent: true,
          opacity: 0.42,
        })
      );
      crater.rotation.x = -Math.PI / 2;
      crater.position.set(
        THREE.MathUtils.randFloat(this.mapLeftX + 7, this.mapRightX - 12),
        0.06,
        THREE.MathUtils.randFloat(this.mapBottomZ + 5, this.mapTopZ - 5)
      );
      if (crater.position.x > -10 && crater.position.x < 24 && Math.abs(crater.position.z) < 7) {
        i -= 1;
        continue;
      }
      this.scene.add(crater);
    }

    for (let i = 0; i < 65; i += 1) {
      const grass = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, THREE.MathUtils.randFloat(0.65, 1.15), 6),
        new THREE.MeshLambertMaterial({ color: 0x5d8658 })
      );
      grass.position.set(
        THREE.MathUtils.randFloat(this.mapLeftX + 4, this.mapRightX - 3),
        0.28,
        THREE.MathUtils.randFloat(this.mapBottomZ + 2, this.mapTopZ - 2)
      );
      if (grass.position.x > -8 && grass.position.x < 26 && Math.abs(grass.position.z) < 8) {
        i -= 1;
        continue;
      }
      grass.castShadow = true;
      grass.rotation.y = Math.random() * Math.PI;
      this.scene.add(grass);
    }
  }

  setupUI() {
    this.moneyEl = document.getElementById("money");
    this.healthEl = document.getElementById("health");
    this.waveEl = document.getElementById("wave");
    this.hintEl = document.getElementById("placementHint");
    this.gameOverEl = document.getElementById("gameOver");
    this.gameOverTitleEl = this.gameOverEl?.querySelector("h1") ?? null;
    this.gameOverMessageEl = this.gameOverEl?.querySelector("p") ?? null;
    this.moneyPopLayer = document.getElementById("moneyPopLayer");
    this.muteBtn = document.getElementById("muteBtn");
    this.upgradePanel = document.getElementById("upgradePanel");
    this.upgradeTitle = document.getElementById("upgradeTitle");
    this.upgradeHealth = document.getElementById("upgradeHealth");
    this.upgradeHealthBarTrack = document.getElementById("upgradeHealthBarTrack");
    this.upgradeHealthBarFill = document.getElementById("upgradeHealthBarFill");
    this.upgradeButtons = document.getElementById("upgradeButtons");
    this.landmineBtn = document.getElementById("landmineBtn");
    this.airStrikeBtn = document.getElementById("airStrikeBtn");
    this.baseMarkerEl = document.getElementById("baseMarker");

    this.soldierBuyButtons = [...document.querySelectorAll(".buy-btn[data-type]")];
    this.buyButtons = [...document.querySelectorAll(".buy-btn")];
    this.startWaveBtn = document.getElementById("startWaveBtn");

    this.soldierBuyButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.gameOver) {
          return;
        }

        const type = btn.dataset.type;
        const def = SOLDIER_TYPES[type];
        if (this.money < def.cost) {
          this.setHint(`Not enough money for ${def.label}.`);
          return;
        }

        this.selectedSoldier = null;
        this.selectedUtility = null;
        this.selectedType = type;
        this.buyButtons.forEach((b) => b.classList.toggle("selected", b === btn));
        this.landmineBtn?.classList.remove("selected");
        this.airStrikeBtn?.classList.remove("selected");
        this.setHint(`Placing ${def.label}. Click anywhere on the battlefield.`);
        this.sound.ensureContext();
        this.renderUpgradePanel();
      });
    });

    this.landmineBtn.addEventListener("click", () => {
      if (this.gameOver) {
        return;
      }
      if (this.money < 40) {
        this.setHint("Not enough money for landmines.");
        return;
      }
      this.selectedType = null;
      this.selectedSoldier = null;
      this.selectedUtility = "landmine";
      this.buyButtons.forEach((b) => b.classList.remove("selected"));
      this.landmineBtn.classList.add("selected");
      this.airStrikeBtn?.classList.remove("selected");
      this.setHint("Landmine selected. Click anywhere on the battlefield.");
      this.renderUpgradePanel();
      this.sound.ensureContext();
    });

    this.airStrikeBtn?.addEventListener("click", () => {
      if (this.gameOver) {
        return;
      }
      if (this.money < 140) {
        this.setHint("Not enough money for air strike.");
        return;
      }
      this.selectedType = null;
      this.selectedSoldier = null;
      this.selectedUtility = "airstrike";
      this.buyButtons.forEach((b) => b.classList.remove("selected"));
      this.airStrikeBtn.classList.add("selected");
      this.landmineBtn?.classList.remove("selected");
      this.setHint("Air Strike selected. Click anywhere on the battlefield.");
      this.renderUpgradePanel();
      this.sound.ensureContext();
    });

    this.startWaveBtn.addEventListener("click", () => {
      if (this.waveManager.startWave()) {
        this.buyButtons.forEach((b) => {
          if (b !== this.startWaveBtn) {
            b.classList.remove("selected");
          }
        });
        this.selectedType = null;
        this.selectedUtility = null;
        this.selectedSoldier = null;
        this.landmineBtn?.classList.remove("selected");
        this.airStrikeBtn?.classList.remove("selected");
        this.renderUpgradePanel();
      }
      this.updateHUD();
      this.sound.ensureContext();
    });

    this.muteBtn.addEventListener("click", () => {
      const next = !this.sound.muted;
      this.sound.setMuted(next);
      this.muteBtn.classList.toggle("muted", next);
      this.muteBtn.textContent = next ? "Sound Off" : "Sound On";
      if (!next) {
        this.sound.ensureContext();
        this.sound.warmup();
      }
    });

    const unlockAudio = () => {
      this.sound.ensureContext();
      this.sound.warmup();
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true, passive: true });

    const restartBtn = document.getElementById("restartBtn");
    restartBtn.addEventListener("click", () => window.location.reload());
  }

  setHint(text) {
    this.hintEl.textContent = text;
  }

  updateWave(value) {
    this.waveEl.textContent = value.toString();
  }

  addMoney(amount, worldPosition = null) {
    this.money += amount;
    if (worldPosition) {
      this.spawnMoneyPopup(amount, worldPosition);
    }
    this.updateHUD();
  }

  spendMoney(amount) {
    this.money -= amount;
    this.updateHUD();
  }

  damageBase(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.endGame();
    }
    this.updateHUD();
  }

  updateHUD() {
    this.moneyEl.textContent = Math.floor(this.money).toString();
    this.healthEl.textContent = Math.floor(this.health).toString();

    for (const btn of this.soldierBuyButtons || []) {
      const type = btn.dataset.type;
      btn.disabled = this.money < SOLDIER_TYPES[type].cost || this.gameOver;
    }
    if (this.landmineBtn) {
      this.landmineBtn.disabled = this.gameOver || this.money < 40;
    }
    if (this.airStrikeBtn) {
      this.airStrikeBtn.disabled = this.gameOver || this.money < 140;
    }

    const waveLabel = this.waveManager ? this.waveManager.wave + 1 : 1;
    if (this.waveManager?.active) {
      this.startWaveBtn.textContent = `Wave ${this.waveManager.wave} In Progress`;
      this.startWaveBtn.disabled = true;
    } else if (this.gameOver && this.waveManager && this.waveManager.wave >= this.waveManager.finalWave) {
      this.startWaveBtn.textContent = "All Waves Cleared";
      this.startWaveBtn.disabled = true;
    } else {
      this.startWaveBtn.textContent = `Start Wave ${waveLabel}`;
      this.startWaveBtn.disabled = this.gameOver;
    }
    this.refreshUpgradeAffordability();
  }

  updateLayout() {
    const uiRect = document.getElementById("ui")?.getBoundingClientRect();
    const fallbackWidth = Math.min(window.innerWidth * 0.96, 1200);

    this.viewportLeft = uiRect ? uiRect.left : (window.innerWidth - fallbackWidth) / 2;
    this.viewportWidth = uiRect ? uiRect.width : fallbackWidth;
    this.viewportTop = (uiRect ? uiRect.bottom : 76) + 8;

    const availableHeight = Math.max(220, window.innerHeight - this.viewportTop - 8);
    const idealHeight = Math.round(this.viewportWidth * 0.62);
    this.viewportHeight = Math.max(220, Math.min(availableHeight, idealHeight));

    this.width = this.viewportWidth;
    this.height = this.viewportHeight;
    this.hudHeight = this.viewportTop;

    this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    this.renderer.domElement.style.left = `${this.viewportLeft}px`;
    this.renderer.domElement.style.top = `${this.viewportTop}px`;

    if (this.baseMarkerEl) {
      this.baseMarkerEl.style.left = `${this.viewportLeft + this.viewportWidth - 132}px`;
      this.baseMarkerEl.style.top = `${this.viewportTop + this.viewportHeight * 0.5 - 20}px`;
    }

    const aspect = this.viewportWidth / this.viewportHeight;
    const frustumHeight = 85;
    this.camera.left = (-frustumHeight * aspect) / 2;
    this.camera.right = (frustumHeight * aspect) / 2;
    this.camera.top = frustumHeight / 2;
    this.camera.bottom = -frustumHeight / 2;
    this.camera.updateProjectionMatrix();
  }

  worldToScreen(worldPos) {
    const projected = worldPos.clone().project(this.camera);
    return {
      x: ((projected.x + 1) * 0.5) * this.viewportWidth + this.viewportLeft,
      y: ((1 - projected.y) * 0.5) * this.viewportHeight + this.viewportTop,
      visible: projected.z >= -1 && projected.z <= 1,
    };
  }

  spawnMoneyPopup(amount, worldPosition) {
    const pop = document.createElement("div");
    pop.className = "money-pop";
    pop.textContent = `+$${Math.floor(amount)}`;
    this.moneyPopLayer.appendChild(pop);

    this.moneyPopups.push({
      el: pop,
      world: worldPosition.clone().add(new THREE.Vector3(0, 3.8, 0)),
      age: 0,
      life: 0.9,
      drift: new THREE.Vector3(0, 2.2, 0),
    });
  }

  updateMoneyPopups(delta) {
    const kept = [];
    for (const pop of this.moneyPopups) {
      pop.age += delta;
      pop.world.addScaledVector(pop.drift, delta);
      const t = pop.age / pop.life;

      if (t >= 1) {
        pop.el.remove();
        continue;
      }

      const screen = this.worldToScreen(pop.world);
      if (!screen.visible) {
        pop.el.style.display = "none";
        kept.push(pop);
        continue;
      }

      pop.el.style.display = "block";
      pop.el.style.left = `${screen.x}px`;
      pop.el.style.top = `${screen.y - t * 16}px`;
      pop.el.style.opacity = `${1 - t}`;
      kept.push(pop);
    }

    this.moneyPopups = kept;
  }

  spawnShotEffects(soldier) {
    const muzzle = soldier.getMuzzleWorldPosition();
    const shell = soldier.getShellWorldPosition();
    const right = soldier.getRightVector();

    const flashColor = soldier.type === "machinegun" ? 0xffdd88 : 0xfff2c3;
    const flashSize = soldier.type === "machinegun" ? 0.17 : 0.24;

    this.effects.push(new MuzzleFlashEffect(this, muzzle, flashColor, flashSize));
    this.effects.push(new ShellEffect(this, shell, right));
    this.sound.shot(soldier);
  }

  spawnBloodSplat(position) {
    this.effects.push(new BloodSplatEffect(this, position));
  }

  computeDefenderDamageAgainstEnemy(baseDamage, enemy, sourceSoldier = null) {
    if (!sourceSoldier || !enemy) {
      return baseDamage;
    }
    if (enemy.enemyType === "tank" && sourceSoldier.type !== "grenadier") {
      return baseDamage * 0.35;
    }
    return baseDamage;
  }

  applySplashDamage(position, radius, damage, primaryTarget, sourceSoldier = null) {
    for (const enemy of [...this.enemies]) {
      if (!enemy.alive) {
        continue;
      }
      const dist = enemy.mesh.position.distanceTo(position);
      if (dist > radius) {
        continue;
      }
      const falloff = THREE.MathUtils.clamp(1 - dist / radius, 0.22, 1);
      const baseApplied = enemy === primaryTarget ? damage : damage * falloff;
      const applied = this.computeDefenderDamageAgainstEnemy(baseApplied, enemy, sourceSoldier);
      enemy.takeDamage(applied);
    }
  }

  applyEnemySplashDamage(position, radius, damage, primaryTarget = null) {
    for (const soldier of [...this.soldiers]) {
      if (!soldier.alive) {
        continue;
      }
      const dist = soldier.mesh.position.distanceTo(position);
      if (dist > radius) {
        continue;
      }
      const falloff = THREE.MathUtils.clamp(1 - dist / radius, 0.26, 1);
      const applied = soldier === primaryTarget ? damage : damage * falloff;
      soldier.takeDamage(applied);
    }
  }

  selectSoldier(soldier) {
    this.selectedSoldier = soldier;
    this.selectedType = null;
    this.buyButtons.forEach((b) => b.classList.remove("selected"));

    this.setHint(`${soldier.displayName} selected.`);
    this.renderUpgradePanel();
  }

  updateSelectedSoldierHealthUI() {
    if (!this.upgradeHealth || !this.upgradeHealthBarFill || !this.selectedSoldier) {
      return;
    }
    const hp = Math.max(0, this.selectedSoldier.health);
    const max = Math.max(1, this.selectedSoldier.maxHealth);
    const ratio = THREE.MathUtils.clamp(hp / max, 0, 1);
    this.upgradeHealth.textContent = `HP: ${Math.ceil(hp)} / ${Math.ceil(max)}`;
    this.upgradeHealthBarFill.style.width = `${ratio * 100}%`;
  }

  renderUpgradePanel() {
    if (
      !this.upgradePanel ||
      !this.upgradeTitle ||
      !this.upgradeHealth ||
      !this.upgradeHealthBarTrack ||
      !this.upgradeHealthBarFill ||
      !this.upgradeButtons
    ) {
      return;
    }

    if (!this.selectedSoldier || this.gameOver) {
      this.upgradePanel.classList.add("hidden");
      this.upgradeHealth.textContent = "";
      this.upgradeHealthBarFill.style.width = "0%";
      this.upgradeButtons.innerHTML = "";
      return;
    }

    const options = this.selectedSoldier.getUpgradeOptions();

    this.upgradePanel.classList.remove("hidden");
    this.upgradeTitle.textContent = this.selectedSoldier.displayName;
    this.updateSelectedSoldierHealthUI();
    this.upgradeButtons.innerHTML = "";

    for (const option of options) {
      const btn = document.createElement("button");
      btn.className = "upgrade-btn";
      btn.textContent = `${option.label} ($${option.cost})`;
      btn.dataset.cost = option.cost.toString();
      btn.disabled = this.money < option.cost;
      btn.addEventListener("click", () => {
        if (!this.selectedSoldier || this.money < option.cost) {
          return;
        }
        const upgraded = this.selectedSoldier.applySpecialUpgrade(option.id);
        if (!upgraded) {
          return;
        }
        this.spendMoney(option.cost);
        this.setHint(`${this.selectedSoldier.displayName} deployed.`);
        this.sound.ensureContext();
        this.sound.beep({ frequency: 580, sweepTo: 720, duration: 0.08, gain: 0.04, type: "triangle" });
        this.renderUpgradePanel();
      });
      this.upgradeButtons.appendChild(btn);
    }

    let sellValue = Math.floor(this.selectedSoldier.definition.cost * 0.75);
    if (this.selectedSoldier.specialUpgrades.commando) sellValue += Math.floor(120 * 0.75);
    if (this.selectedSoldier.specialUpgrades.minigun) sellValue += Math.floor(165 * 0.75);
    if (this.selectedSoldier.specialUpgrades.fiftycal) sellValue += Math.floor(140 * 0.75);
    const healthRatio = THREE.MathUtils.clamp(
      this.selectedSoldier.health / Math.max(1, this.selectedSoldier.maxHealth),
      0,
      1
    );
    sellValue = Math.max(0, Math.floor(sellValue * healthRatio));

    const sellBtn = document.createElement("button");
    sellBtn.className = "upgrade-btn sell-btn";
    sellBtn.textContent = `Sell ($${sellValue})`;
    sellBtn.style.backgroundColor = "#5c2a2a";
    sellBtn.addEventListener("click", () => {
      this.sellSelectedSoldier(sellValue);
    });
    this.upgradeButtons.appendChild(sellBtn);
  }

  sellSelectedSoldier(sellValue) {
    if (!this.selectedSoldier || this.gameOver) {
      return;
    }

    const soldier = this.selectedSoldier;
    this.addMoney(sellValue, soldier.mesh.position);
    this.setHint(`${soldier.displayName} sold for $${sellValue}.`);
    this.removeSoldier(soldier);
    
    this.sound.ensureContext();
    this.sound.beep({ frequency: 320, sweepTo: 220, duration: 0.1, gain: 0.05, type: "triangle" });
  }

  refreshUpgradeAffordability() {
    if (!this.upgradeButtons) {
      return;
    }
    for (const child of this.upgradeButtons.children) {
      const cost = Number(child.dataset.cost || 0);
      child.disabled = this.money < cost || this.gameOver;
    }
  }

  updateMouseFromPointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  getGroundPointFromPointer(event) {
    this.updateMouseFromPointer(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const groundHit = this.raycaster.intersectObject(this.ground)[0];
    if (!groundHit) {
      return null;
    }
    const position = groundHit.point.clone();
    position.y = 0;
    return position;
  }

  onPointerDown(event) {
    if (this.gameOver) {
      return;
    }
    this.sound.ensureContext();

    this.updateMouseFromPointer(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const clickableMeshes = [];
    for (const soldier of this.soldiers) {
      soldier.mesh.traverse((child) => {
        if (child.isMesh) {
          clickableMeshes.push(child);
        }
      });
    }

    const soldierHit = this.raycaster.intersectObjects(clickableMeshes, false)[0];
    if (soldierHit?.object?.userData?.soldierRef && !this.selectedUtility && !this.selectedType) {
      const hitSoldier = soldierHit.object.userData.soldierRef;
      this.selectSoldier(hitSoldier);
      return;
    }

    const position = this.getGroundPointFromPointer(event);
    if (!position) {
      return;
    }

    if (this.selectedUtility === "landmine") {
      if (!this.canPlaceLandmineAt(position)) {
        this.setHint("Landmines must be placed within the map boundaries.");
        return;
      }
      if (this.money < 40) {
        this.setHint("Not enough money.");
        return;
      }
      this.spendMoney(40);
      this.landmines.push(new Landmine(this, position));
      this.setHint("Landmine planted.");
      return;
    }

    if (this.selectedUtility === "airstrike") {
      if (!this.canCallAirStrikeAt(position)) {
        this.setHint("Air strike must be called within map boundaries.");
        return;
      }
      if (this.money < 140) {
        this.setHint("Not enough money.");
        return;
      }
      this.spendMoney(140);
      this.applySplashDamage(position, 8.6, 86, null);
      this.effects.push(new ExplosionEffect(this, position, 0xff9f6d, 8.6));
      this.sound.explosion();
      this.setHint("Air strike deployed.");
      return;
    }

    if (this.selectedSoldier && !this.selectedType) {
      this.selectedSoldier = null;
      this.renderUpgradePanel();
      this.setHint("Selection cleared.");
      return;
    }

    if (!this.selectedType) {
      return;
    }
    if (!this.canPlaceAt(position)) {
      this.setHint("Soldiers must be placed within map boundaries and not too close to each other.");
      return;
    }

    const def = SOLDIER_TYPES[this.selectedType];
    if (this.money < def.cost) {
      this.setHint("Not enough money.");
      return;
    }

    this.spendMoney(def.cost);
    const soldier = new Soldier(this, this.selectedType, position);
    this.soldiers.push(soldier);
    this.selectedType = null;
    this.buyButtons.forEach((b) => b.classList.remove("selected"));
    this.renderUpgradePanel();
    this.setHint(`${def.label} deployed.`);
    this.updateHUD();
  }

  canPlaceAt(position, ignoredSoldier = null) {
    const withinX = position.x >= this.mapLeftX + 1 && position.x <= this.mapRightX - 1;
    const withinZ = Math.abs(position.z) <= this.mapHeight / 2 - 1.5;

    if (!withinX || !withinZ) {
      return false;
    }

    for (const soldier of this.soldiers) {
      if (soldier === ignoredSoldier) {
        continue;
      }
      if (soldier.mesh.position.distanceTo(position) < 4.5) {
        return false;
      }
    }

    return true;
  }

  canPlaceLandmineAt(position) {
    const withinX = position.x >= this.mapLeftX + 3 && position.x <= this.mapRightX - 3;
    const withinZ = Math.abs(position.z) <= this.mapHeight / 2 - 2;
    if (!withinX || !withinZ) {
      return false;
    }
    for (const mine of this.landmines) {
      if (mine.position.distanceTo(position) < 4) {
        return false;
      }
    }
    return true;
  }

  canCallAirStrikeAt(position) {
    const withinX = position.x >= this.mapLeftX + 1 && position.x <= this.mapRightX - 1;
    const withinZ = Math.abs(position.z) <= this.mapHeight / 2 - 1;
    return withinX && withinZ;
  }

  enemyReachedBase(enemy) {
    this.removeEnemy(enemy);
    this.damageBase(1);
    if (!this.gameOver) {
      this.setHint("An enemy reached the base!");
    }
  }

  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) {
      this.enemies.splice(index, 1);
    }
    enemy.dispose();
  }

  removeSoldier(soldier) {
    const index = this.soldiers.indexOf(soldier);
    if (index >= 0) {
      this.soldiers.splice(index, 1);
    }
    if (this.selectedSoldier === soldier) {
      this.selectedSoldier = null;
      this.renderUpgradePanel();
    }
    soldier.alive = false;
    soldier.dispose();
  }

  endGame() {
    if (this.gameOver) {
      return;
    }
    this.gameOver = true;
    this.selectedType = null;
    this.selectedUtility = null;
    this.selectedSoldier = null;
    this.buyButtons.forEach((btn) => {
      btn.classList.remove("selected");
      btn.disabled = true;
    });
    this.landmineBtn?.classList.remove("selected");
    this.airStrikeBtn?.classList.remove("selected");
    this.setHint("The base has fallen.");
    if (this.gameOverTitleEl) {
      this.gameOverTitleEl.textContent = "Game Over";
    }
    if (this.gameOverMessageEl) {
      this.gameOverMessageEl.textContent = "Your base was overrun.";
    }
    this.renderUpgradePanel();
    this.gameOverEl.classList.remove("hidden");
  }

  winGame() {
    if (this.gameOver) {
      return;
    }
    this.gameOver = true;
    this.selectedType = null;
    this.selectedUtility = null;
    this.selectedSoldier = null;
    this.buyButtons.forEach((btn) => {
      btn.classList.remove("selected");
      btn.disabled = true;
    });
    this.landmineBtn?.classList.remove("selected");
    this.airStrikeBtn?.classList.remove("selected");
    this.setHint("All 15 waves cleared. You win!");
    if (this.gameOverTitleEl) {
      this.gameOverTitleEl.textContent = "Victory";
    }
    if (this.gameOverMessageEl) {
      this.gameOverMessageEl.textContent = "You held the line through all 15 waves.";
    }
    this.renderUpgradePanel();
    this.gameOverEl.classList.remove("hidden");
  }

  onResize() {
    this.updateLayout();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.gameOver) {
      this.waveManager.update(delta);

      for (const soldier of this.soldiers) {
        soldier.update(delta);
      }

      for (const enemy of [...this.enemies]) {
        enemy.update(delta);
      }

      for (const projectile of [...this.projectiles]) {
        projectile.update(delta);
      }
      for (const projectile of [...this.enemyProjectiles]) {
        projectile.update(delta);
      }

      const keptLandmines = [];
      for (const mine of this.landmines) {
        if (mine.update()) {
          keptLandmines.push(mine);
        }
      }
      this.landmines = keptLandmines;

      this.projectiles = this.projectiles.filter((p) => p.alive);
      this.enemyProjectiles = this.enemyProjectiles.filter((p) => p.alive);
      this.effects = this.effects.filter((effect) => effect.update(delta));
      this.updateHUD();
    }

    this.updateMoneyPopups(delta);

    this.renderer.render(this.scene, this.camera);
  }
}


export function bootstrap() {
  try {
    setUnitOffsets();
    new Game();
  } catch (error) {
    console.error(error);
  }
}
