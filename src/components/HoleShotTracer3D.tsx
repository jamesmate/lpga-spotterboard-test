import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { HoleInfo } from '../data/types';
import type { HoleExtras, SimShot } from '../utils/shotSim';
import { UNIT, bendOffset } from '../utils/shotSim';

// Natural course colours — kept close to real grass/sand/water tones rather
// than the app's purple/pink brand palette, since this is a physical scene.
const SCENE = {
  bg: '#101c15',
  fairway: '#3f6b4a',
  fairwayLight: '#5c8a63',
  rough: '#22321f',
  green: '#79a876',
  sand: '#d9c6a5',
  water: '#5e92ae',
  chalk: '#f2efe7',
  flag: '#c1443c',
};

export interface TracerPlayer {
  id: string;
  name: string;
  color: string;
}

interface HoleShotTracer3DProps {
  hole: HoleInfo;
  extras: HoleExtras;
  shots: SimShot[];
  players: TracerPlayer[];
  visiblePlayerIds: Set<string>;
  onSelectShot: (shot: SimShot & { playerName: string; playerColor: string }) => void;
}

function useOrbit(camera: THREE.PerspectiveCamera | null, target: THREE.Vector3, domEl: HTMLElement | null) {
  const state = useRef({ az: 0.65, pol: 1.05, radius: 46, dragging: false, lastX: 0, lastY: 0 });
  useEffect(() => {
    if (!domEl || !camera) return;
    const s = state.current;
    const applyCam = () => {
      const p = s.pol;
      const a = s.az;
      const r = s.radius;
      camera.position.set(
        target.x + r * Math.sin(p) * Math.sin(a),
        Math.max(2, r * Math.cos(p)),
        target.z + r * Math.sin(p) * Math.cos(a)
      );
      camera.lookAt(target);
    };
    applyCam();
    const onDown = (e: PointerEvent) => {
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
    };
    const onUp = () => {
      s.dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.az -= dx * 0.006;
      s.pol = Math.min(1.45, Math.max(0.25, s.pol - dy * 0.005));
      applyCam();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s.radius = Math.min(90, Math.max(14, s.radius + e.deltaY * 0.03));
      applyCam();
    };
    domEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      domEl.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      domEl.removeEventListener('wheel', onWheel);
    };
  }, [camera, target, domEl]);
}

/**
 * Orbiting 3D shot-tracer scene for a single hole — adapted from the
 * uploaded shot-analytics sandbox. Draws the fairway/green/tee/hazard for
 * the hole's real par/yardage/dogleg, plus each visible player's synthesized
 * tee-to-green shot path as a tube with a marker at each landing spot.
 * Clicking a marker reports the shot back via onSelectShot.
 */
export function HoleShotTracer3D({ hole, extras, shots, players, visiblePlayerIds, onSelectShot }: HoleShotTracer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupsRef = useRef<Record<string, THREE.Group>>({});
  const targetRef = useRef(new THREE.Vector3());
  const [domEl, setDomEl] = useState<HTMLElement | null>(null);

  const holeShots = useMemo(
    () => [...shots].sort((a, b) => a.shotNumber - b.shotNumber),
    [shots]
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE.bg);
    scene.fog = new THREE.Fog(SCENE.bg, 40, 120);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);
    setDomEl(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.0);
    sun.position.set(30, 45, 20);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6fa3c7, 0.3);
    rim.position.set(-30, 10, -20);
    scene.add(rim);

    const L = hole.yards * UNIT;
    const target = new THREE.Vector3(L / 2, 0, 0);
    targetRef.current = target;

    const roughGeo = new THREE.PlaneGeometry(L + 60, 70, 1, 1);
    const rough = new THREE.Mesh(roughGeo, new THREE.MeshStandardMaterial({ color: SCENE.rough, roughness: 1 }));
    rough.rotation.x = -Math.PI / 2;
    rough.position.set(L / 2, -0.05, 0);
    scene.add(rough);

    const segs = 24;
    const shape = new THREE.Shape();
    const widthAt = (frac: number) => 9 - 3 * Math.sin(frac * Math.PI);
    const top: THREE.Vector2[] = [];
    const bottom: THREE.Vector2[] = [];
    for (let i = 0; i <= segs; i++) {
      const frac = i / segs;
      const x = frac * L;
      const cz = bendOffset(extras.dogleg, frac);
      const w = widthAt(frac);
      top.push(new THREE.Vector2(x, cz + w));
      bottom.push(new THREE.Vector2(x, cz - w));
    }
    shape.moveTo(top[0].x, top[0].y);
    top.forEach((v) => shape.lineTo(v.x, v.y));
    for (let i = bottom.length - 1; i >= 0; i--) shape.lineTo(bottom[i].x, bottom[i].y);
    shape.closePath();
    const fairwayGeo = new THREE.ShapeGeometry(shape, 1);
    fairwayGeo.rotateX(-Math.PI / 2);
    const fairway = new THREE.Mesh(fairwayGeo, new THREE.MeshStandardMaterial({ color: SCENE.fairway, roughness: 0.9 }));
    fairway.position.y = 0.01;
    scene.add(fairway);

    for (let i = 0; i < segs; i += 2) {
      const frac = (i + 0.5) / segs;
      const x = frac * L;
      const cz = bendOffset(extras.dogleg, frac);
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(L / segs, widthAt(frac) * 2),
        new THREE.MeshStandardMaterial({ color: SCENE.fairwayLight, transparent: true, opacity: 0.18 })
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.012, cz);
      scene.add(stripe);
    }

    const pinZ = bendOffset(extras.dogleg, 1);
    const green = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: SCENE.green, roughness: 0.8 }));
    green.rotation.x = -Math.PI / 2;
    green.position.set(L, 0.02, pinZ);
    scene.add(green);

    const tee = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 4), new THREE.MeshStandardMaterial({ color: SCENE.fairwayLight }));
    tee.position.set(0.5, 0.05, 0);
    scene.add(tee);

    if (extras.hazard === 'bunker') {
      const bunker = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshStandardMaterial({ color: SCENE.sand, roughness: 1 }));
      bunker.rotation.x = -Math.PI / 2;
      bunker.position.set(L - 6, 0.015, pinZ + 6);
      scene.add(bunker);
    }
    if (extras.hazard === 'water') {
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 16),
        new THREE.MeshStandardMaterial({ color: SCENE.water, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.85 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(L - (hole.par === 3 ? L * 0.45 : 10), 0.015, pinZ - 9);
      scene.add(water);
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), new THREE.MeshStandardMaterial({ color: '#e8e4da' }));
    pole.position.set(L, 1.6, pinZ);
    scene.add(pole);
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 3), new THREE.MeshStandardMaterial({ color: SCENE.flag }));
    flag.rotation.z = Math.PI / 2;
    flag.position.set(L + 0.5, 2.9, pinZ);
    scene.add(flag);

    const groups: Record<string, THREE.Group> = {};
    const clickable: THREE.Object3D[] = [];
    players.forEach((p) => {
      const g = new THREE.Group();
      const pShots = holeShots.filter((s) => s.playerId === p.id);
      let prevEnd = new THREE.Vector3(0, 0, 0);
      pShots.forEach((s) => {
        const start = prevEnd.clone();
        const end = new THREE.Vector3(s.endX, 0, s.endZ);
        const mid = start.clone().lerp(end, 0.5);
        mid.y = 2.4 + s.carry * 0.045;
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 24, 0.13, 6, false),
          new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.35, roughness: 0.4 })
        );
        g.add(tube);
        const markerSize = s.isLast ? 0.42 : 0.3;
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(markerSize, 16, 16),
          new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.5 })
        );
        marker.position.copy(end);
        marker.userData = { shot: s, player: p };
        g.add(marker);
        clickable.push(marker);
        prevEnd = end;
      });
      if (pShots.length) {
        const last = pShots[pShots.length - 1];
        const puttStart = new THREE.Vector3(last.endX, 0.05, last.endZ);
        const puttEnd = new THREE.Vector3(L, 0.05, pinZ);
        const puttGeo = new THREE.BufferGeometry().setFromPoints([puttStart, puttEnd]);
        const puttLine = new THREE.Line(
          puttGeo,
          new THREE.LineDashedMaterial({ color: p.color, dashSize: 0.4, gapSize: 0.3, transparent: true, opacity: 0.55 })
        );
        puttLine.computeLineDistances();
        g.add(puttLine);
      }
      scene.add(g);
      groups[p.id] = g;
    });
    groupsRef.current = groups;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickable);
      if (hits.length) {
        const { shot, player } = hits[0].object.userData as { shot: SimShot; player: TracerPlayer };
        onSelectShot({ ...shot, playerName: player.name, playerColor: player.color });
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole.number]);

  useOrbit(cameraRef.current, targetRef.current, domEl);

  useEffect(() => {
    Object.entries(groupsRef.current).forEach(([id, g]) => {
      g.visible = visiblePlayerIds.has(id);
    });
  }, [visiblePlayerIds]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />;
}
