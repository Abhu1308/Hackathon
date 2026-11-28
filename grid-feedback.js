
import * as THREE from 'three';

// POWERQUEST — GRID EMERGENCY FEEDBACK
// Decorative effects only. Does not modify game data.

export function createGridFeedback(scene, buildings) {
  const group = new THREE.Group();
  scene.add(group);

  const station = buildings.find(b => b.id === 'power');

  const stationPosition = new THREE.Vector3(
    station?.x ?? 15,
    0,
    station?.z ?? 24
  );

  // RED EMERGENCY WARNING RING
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3030,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  const warningRing = new THREE.Mesh(
    new THREE.RingGeometry(2.5, 2.65, 64),
    ringMaterial
  );

  warningRing.rotation.x = -Math.PI / 2;
  warningRing.position.set(
    stationPosition.x,
    0.19,
    stationPosition.z
  );

  warningRing.visible = false;
  group.add(warningRing);

  // EMERGENCY BEACON
  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3030,
    transparent: true,
    opacity: 0.9,
    toneMapped: false
  });

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 12),
    beaconMaterial
  );

  beacon.position.set(
    stationPosition.x,
    10,
    stationPosition.z
  );

  beacon.visible = false;
  group.add(beacon);

  // RED LIGHT AROUND THE STATION
  const emergencyLight = new THREE.PointLight(
    0xff3030,
    0,
    14,
    2
  );

  emergencyLight.position.set(
    stationPosition.x,
    6,
    stationPosition.z
  );

  group.add(emergencyLight);

  // SELECTED BUILDING HIGHLIGHT
  const selectionMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(3.9, 4.05, 64),
    selectionMaterial
  );

  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.22;
  selectionRing.visible = false;
  group.add(selectionRing);

  return {
    update(time, allocated, capacity, selectedBuilding) {
      const overloaded = allocated > capacity;

      // EMERGENCY EFFECTS
      warningRing.visible = overloaded;
      beacon.visible = overloaded;

      if (overloaded) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 5);

        warningRing.scale.setScalar(
          1 + pulse * 0.35
        );

        ringMaterial.opacity =
          0.35 + pulse * 0.5;

        beacon.scale.setScalar(
          0.8 + pulse * 0.5
        );

        beaconMaterial.opacity =
          0.5 + pulse * 0.5;

        emergencyLight.intensity =
          1.5 + pulse * 3;
      } else {
        emergencyLight.intensity = 0;
      }

      // BUILDING SELECTION
      if (selectedBuilding) {
        selectionRing.visible = true;

        selectionRing.position.x = selectedBuilding.x;
        selectionRing.position.z = selectedBuilding.z;

        const selectedPulse =
          0.5 + 0.5 * Math.sin(time * 2.5);

        selectionMaterial.opacity =
          0.4 + selectedPulse * 0.4;

        selectionRing.scale.setScalar(
          1 + selectedPulse * 0.05
        );
      } else {
        selectionRing.visible = false;
      }
    }
  };
}
