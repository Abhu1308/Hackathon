
import * as THREE from 'three';

// POWERQUEST — ROAD-ALIGNED ELECTRICITY NETWORK
// Visual effects only. Existing gameplay remains unchanged.

export function createNetworkEffects(scene, buildings) {
  const network = new THREE.Group();
  scene.add(network);

  const station = buildings.find(b => b.id === 'power');

  if (!station) {
    console.warn('PowerQuest: Power station not found.');
    return { update() {} };
  }

  const COLORS = {
    full: new THREE.Color(0x00c8e8),
    partial: new THREE.Color(0xf5b942),
    off: new THREE.Color(0xef4444)
  };

  const ROAD_ROWS = [-18, -6, 6, 18, 30];
  const ROAD_COLUMNS = [-21, 21];
  const CABLE_HEIGHT = 0.16;

  const connections = [];

  function nearest(value, choices) {
    return choices.reduce((best, candidate) =>
      Math.abs(candidate - value) < Math.abs(best - value)
        ? candidate
        : best
    );
  }

  function point(x, z) {
    return new THREE.Vector3(x, CABLE_HEIGHT, z);
  }

  // Route along a vertical road, then a horizontal road,
  // before making the final connection to a building.
  function createRoute(building) {
    const roadX = nearest(building.x, ROAD_COLUMNS);
    const roadZ = nearest(building.z, ROAD_ROWS);

    const points = [
      point(station.x, station.z),
      point(roadX, station.z),
      point(roadX, roadZ),
      point(building.x, roadZ),
      point(building.x, building.z)
    ];

    // Remove consecutive duplicate points.
    return points.filter((p, i) =>
      i === 0 || p.distanceToSquared(points[i - 1]) > 0.0001
    );
  }

  const pulseGeometry = new THREE.SphereGeometry(
    0.13, 10, 8
  );

  const glowGeometry = new THREE.SphereGeometry(
    0.32, 12, 8
  );

  for (const building of buildings) {
    if (building.id === 'power') continue;

    const route = createRoute(building);

    const curve = new THREE.CatmullRomCurve3(
      route,
      false,
      'centripetal',
      0.5
    );

    // Use a polyline rather than the smoothed curve for cables,
    // keeping them aligned to street corners.
    const geometry = new THREE.BufferGeometry()
      .setFromPoints(route);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: COLORS.off,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });

    const line = new THREE.Line(
      geometry,
      lineMaterial
    );

    network.add(line);

    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.full,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false
    });

    const pulse = new THREE.Mesh(
      pulseGeometry,
      pulseMaterial
    );

    pulse.visible = false;
    network.add(pulse);

    // Soft ground-level glow around the destination.
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.full,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      toneMapped: false
    });

    const glow = new THREE.Mesh(
      glowGeometry,
      glowMaterial
    );

    glow.position.set(
      building.x,
      0.25,
      building.z
    );

    glow.visible = false;
    network.add(glow);

    // Segment lengths for constant-speed movement.
    const lengths = [];
    let totalLength = 0;

    for (let i = 1; i < route.length; i++) {
      const length = route[i - 1].distanceTo(route[i]);
      lengths.push(length);
      totalLength += length;
    }

    connections.push({
      building,
      route,
      lengths,
      totalLength,
      line,
      pulse,
      glow,
      phase: connections.length * 0.173
    });
  }

  function getStatus(building) {
    if (!building.connected || building.allocated <= 0) {
      return 'off';
    }

    if (building.allocated >= building.demand) {
      return 'full';
    }

    return 'partial';
  }

  function positionOnRoute(connection, progress) {
    const { route, lengths, totalLength } = connection;

    if (totalLength <= 0) {
      return route[0].clone();
    }

    let distance = progress * totalLength;

    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i]) {
        const fraction = lengths[i] > 0
          ? distance / lengths[i]
          : 0;

        return new THREE.Vector3().lerpVectors(
          route[i],
          route[i + 1],
          fraction
        );
      }

      distance -= lengths[i];
    }

    return route[route.length - 1].clone();
  }

  return {
    update(time) {
      for (const connection of connections) {
        const {
          building,
          line,
          pulse,
          glow,
          phase
        } = connection;

        const status = getStatus(building);
        const color = COLORS[status];

        line.material.color.copy(color);
        pulse.material.color.copy(color);
        glow.material.color.copy(color);

        if (status === 'off') {
          line.material.opacity = 0.16;
          pulse.visible = false;
          glow.visible = false;
          continue;
        }

        const ratio = Math.min(
          1,
          building.allocated / Math.max(1, building.demand)
        );

        line.material.opacity =
          status === 'full'
            ? 0.75
            : 0.35 + ratio * 0.3;

        pulse.visible = true;
        glow.visible = true;

        // Pulse speed changes with electricity status.
        const speed =
          status === 'full' ? 0.22 : 0.12;

        const progress =
          (time * speed + phase) % 1;

        pulse.position.copy(
          positionOnRoute(connection, progress)
        );

        // Pulse intensity
        const pulseSize =
          0.75 + 0.25 * Math.sin(progress * Math.PI);

        pulse.scale.setScalar(pulseSize);

        pulse.material.opacity =
          0.55 + 0.35 * Math.sin(progress * Math.PI);

        // Powered-building glow
        const glowSize =
          1 + 0.18 * Math.sin(time * 2 + phase * 6);

        glow.scale.setScalar(glowSize);

        glow.material.opacity =
          (status === 'full' ? 0.16 : 0.09) *
          (0.85 + 0.15 * Math.sin(time * 2 + phase));
      }
    }
  };
}
