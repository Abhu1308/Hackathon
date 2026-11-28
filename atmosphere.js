
import * as THREE from 'three';

// POWERQUEST — NIGHT OPERATIONS
// Cinematic atmosphere + animated electricity network.
// All effects are visual and do not alter gameplay.

export function addIndustrialAtmosphere(scene) {
  scene.background = new THREE.Color(0x0b111b);
  scene.fog = new THREE.FogExp2(0x0b111b, 0.003);

  // NIGHT LIGHTING
  const hemisphere = new THREE.HemisphereLight(
    0x6686ac, 0x17212b, 0.22
  );
  scene.add(hemisphere);

  const moonlight = new THREE.DirectionalLight(
    0x7397c7, 0.35
  );
  moonlight.position.set(-25, 45, 30);
  scene.add(moonlight);

  const blueFill = new THREE.DirectionalLight(
    0x41638d, 0.10
  );
  blueFill.position.set(30, 20, -25);
  scene.add(blueFill);

  // STREETLIGHTS
  const bulbs = new THREE.Group();
  scene.add(bulbs);

  const bulbGeometry = new THREE.SphereGeometry(0.12, 8, 6);
  const bulbMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc77d
  });

  const lights = [];

  for (const x of [-23, 23]) {
    for (const z of [-18, -6, 6, 18, 30]) {
      const bulb = new THREE.Mesh(
        bulbGeometry, bulbMaterial
      );
      bulb.position.set(x, 4.6, z);
      bulbs.add(bulb);

      const light = new THREE.PointLight(
        0xffb66c, 1.5, 10, 2
      );
      light.position.copy(bulb.position);
      scene.add(light);
      lights.push(light);
    }
  }

  // POWER STATION GLOW
  const stationGlow = new THREE.PointLight(
    0xff8c48, 3, 14, 2
  );
  stationGlow.position.set(15, 6.5, 24);
  scene.add(stationGlow);

  // ELECTRICITY NETWORK
  const networkMaterial = new THREE.MeshBasicMaterial({
    color: 0x00c8e8,
    transparent: true,
    opacity: 0.30,
    depthWrite: false,
    toneMapped: false
  });

  const segments = [
    [[-21, -18], [-21, 30]],
    [[21, -18], [21, 30]],
    [[-21, -18], [21, -18]],
    [[-21, 30], [21, 30]]
  ];

  const pulsePaths = [];
  const pulses = [];

  const pulseGeometry = new THREE.SphereGeometry(
    0.14, 8, 6
  );

  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: 0x7afaff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false
  });

  for (const [[x1, z1], [x2, z2]] of segments) {
    const a = new THREE.Vector3(x1, 0.025, z1);
    const b = new THREE.Vector3(x2, 0.025, z2);

    const dir = b.clone().sub(a);
    const length = dir.length();


    pulsePaths.push({ a, b });

    // Three moving electricity pulses per segment
  }

  // ANIMATION LOOP
  // Called by the existing main.js animation function.
  return {
    update(time) {
      // Streetlight flickering
      lights.forEach((light, i) => {
        light.intensity =
          1.5 + 0.08 * Math.sin(time * 0.75 + i);
      });

      // Industrial station glow
      stationGlow.intensity =
        3 + 0.3 * Math.sin(time * 0.8);

      // Network breathing effect
      networkMaterial.opacity =
        0.26 + 0.07 * Math.sin(time * 1.2);
    }
  };
}
