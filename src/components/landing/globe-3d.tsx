"use client";

import { useEffect, useRef } from "react";

/**
 * 3D 点阵地球 — Three.js + world-atlas 陆地数据
 * 粒子仅在陆地上显示，灰白色，斜上方俯视，Y 轴匀速自转
 */
export function Globe3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    // 动态导入浏览器-only模块（避免SSR问题）
    Promise.all([
      import("three"),
      import("topojson-client"),
      import("world-atlas/countries-110m.json"),
    ]).then(([THREE, topojson, topo]) => {
      if (disposed || !mount) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      // 场景
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      // 斜上方俯视
      camera.position.set(0, 6, 11);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      // 陆地数据
      const land = topojson.feature(
        topo as any,
        (topo as any).objects.countries
      ) as any;

      const R = 4;
      const positions: number[] = [];

      // 网格采样 + geoContains 判断陆地
      const step = 1.2;
      for (let lat = -90; lat <= 90; lat += step) {
        for (let lng = -180; lng <= 180; lng += step) {
          const onLand = isLand(land, lng, lat);
          if (!onLand) continue;
          const phi = (90 - lat) * (Math.PI / 180);
          const theta = (lng + 180) * (Math.PI / 180);
          const x = -R * Math.sin(phi) * Math.cos(theta);
          const z = R * Math.sin(phi) * Math.sin(theta);
          const y = R * Math.cos(phi);
          positions.push(x, y, z);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.035,
        color: 0xd8d8e0,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      });
      const globe = new THREE.Points(geo, mat);
      scene.add(globe);

      // 轨道外环
      const ringGeo = new THREE.RingGeometry(R * 1.35, R * 1.36, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x3a3a4a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.4;
      scene.add(ring);

      // 内层淡淡光晕
      const haloGeo = new THREE.RingGeometry(R * 1.0, R * 1.02, 128);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x1a1a2e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      scene.add(halo);

      // 动画组（地球 + 轨道同步旋转）
      const group = new THREE.Group();
      scene.add(group);
      group.add(globe);
      group.add(ring);
      group.add(halo);

      let rot = 0;
      function animate() {
        if (disposed) return;
        rot += 0.0008; // 极缓
        group.rotation.y = rot;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      }
      animate();

      function resize() {
        if (!mount) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", resize);

      cleanup = () => {
        window.removeEventListener("resize", resize);
        geo.dispose();
        mat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        haloGeo.dispose();
        haloMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}

// 判断经纬度是否在陆地（射线法 / d3 geoContains 近似）
function isLand(land: any, lng: number, lat: number): boolean {
  // 简化：用 bounding 判断 + 点在多边形内
  for (const feature of land.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      if (pointInPolygon([lng, lat], geom.coordinates[0])) return true;
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        if (pointInPolygon([lng, lat], poly[0])) return true;
      }
    }
  }
  return false;
}

function pointInPolygon(point: number[], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
