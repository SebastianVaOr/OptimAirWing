import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { buildWingMesh } from '../domains/wing/viewer3d';
import { LegacyWingPayload } from '../core/types';
import { RotateCw, Compass, Grid3x3 } from 'lucide-react';
import { store } from '../core/store';

interface ThreeViewerProps {
  params: LegacyWingPayload;
}

// FIX (5): Uso de selectedVehicle sincronizado con el store, que a su vez mapea TargetSector a VehicleCategory vía mapSectorToVehicleCategory
export const ThreeViewer: React.FC<ThreeViewerProps> = ({ params }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const wingGroupRef = useRef<THREE.Group | null>(null);

  const [autoRotate, setAutoRotate] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(store.getState().selectedVehicle);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(s => setSelectedVehicle(s.selectedVehicle));
    return () => unsub();
  }, []);

  const isHydrofoil = selectedVehicle === 'hydrofoil_nautical';
  const isF1 = selectedVehicle === 'f1_motorsport';

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.Fog(0x05070c, 20, 40);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(8, 6, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.5;
    controlsRef.current = controls;

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambient);

    const hemisphere = new THREE.HemisphereLight(0x22d3ee, 0x05070c, 0.6);
    scene.add(hemisphere);

    const dirLight = new THREE.DirectionalLight(0x22d3ee, 2.0);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
    backLight.position.set(-5, 2, -5);
    scene.add(backLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(0, -3, 5);
    scene.add(fillLight);

    // Grid Helper
    const gridColor = isHydrofoil ? 0x0284c7 : isF1 ? 0xd97706 : 0x16202f;
    const grid = new THREE.GridHelper(24, 24, gridColor, 0x0e1624);
    grid.position.y = -2;
    scene.add(grid);

    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    // Post-processing: Bloom
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.3, 0.2, 0.1);
    composer.addPass(bloomPass);
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    // Streamline particles (wind tunnel effect)
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 12;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      particleVel[i] = 0.01 + Math.random() * 0.03;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.04,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Wing Group
    const wingGroup = new THREE.Group();
    scene.add(wingGroup);
    wingGroupRef.current = wingGroup;

    // Build Initial Wing Mesh
    const mesh = buildWingMesh(params, store.getState().selectedVehicle);
    wingGroup.add(mesh);

    // Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Animate streamlines
      const pos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += particleVel[i] * 0.5;
        if (pos[i * 3] > 6) pos[i * 3] = -6;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      composer.render();
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      composer.dispose();
      renderer.dispose();
    };
  }, [selectedVehicle]);

  // Update wing mesh when params or vehicle category change
  useEffect(() => {
    if (!wingGroupRef.current) return;
    const wingGroup = wingGroupRef.current;
    while (wingGroup.children.length > 0) {
      const child = wingGroup.children[0];
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).geometry.dispose();
      }
      wingGroup.remove(child);
    }
    const newMesh = buildWingMesh(params, selectedVehicle);
    wingGroup.add(newMesh);
  }, [params, selectedVehicle]);

  // Wireframe toggle
  useEffect(() => {
    if (!wingGroupRef.current) return;
    wingGroupRef.current.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => { if ('wireframe' in m) (m as THREE.Material & { wireframe: boolean }).wireframe = showWireframe; });
        } else if ('wireframe' in mesh.material) {
          (mesh.material as THREE.Material & { wireframe: boolean }).wireframe = showWireframe;
        }
      }
    });
  }, [showWireframe]);

  // Update auto rotate setting
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(8, 6, 12);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full bg-[#05070c] overflow-hidden select-none">
      <div ref={containerRef} className="w-full h-full" />

      {/* Viewport Top Controls Overlay & Category Domain Switcher */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#0e1624]/90 text-[#8ea3bd] border-[#16202f] hover:text-white'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>Giro 3D</span>
          </button>

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer ${
              showWireframe
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#0e1624]/90 text-[#8ea3bd] border-[#16202f] hover:text-white'
            }`}
            title="Toggle Wireframe"
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            <span>Malla</span>
          </button>
          <button
            onClick={resetCamera}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#0e1624]/90 text-[#8ea3bd] border border-[#16202f] hover:text-white transition cursor-pointer"
            title="Reset Vista (R)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Centrar (R)</span>
          </button>
        </div>

        {/* Dedicated Domain Vehicle Tabs */}
        <div className="flex items-center gap-1 bg-[#0e1624]/95 p-1 rounded-xl border border-[#16202f] text-xs font-bold pointer-events-auto shadow-lg">
          <button
            onClick={() => store.setVehicleCategory('aircraft')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              selectedVehicle === 'aircraft' ? 'bg-cyan-500 text-[#05070c] font-black shadow-sm' : 'text-[#8ea3bd] hover:text-white'
            }`}
          >
            <span>✈️ Aviación</span>
          </button>
          <button
            onClick={() => store.setVehicleCategory('f1_motorsport')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              selectedVehicle === 'f1_motorsport' ? 'bg-amber-500 text-[#05070c] font-black shadow-sm' : 'text-[#8ea3bd] hover:text-white'
            }`}
          >
            <span>🏎️ F1 Motorsport</span>
          </button>
          <button
            onClick={() => store.setVehicleCategory('hydrofoil_nautical')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              selectedVehicle === 'hydrofoil_nautical' ? 'bg-sky-500 text-[#05070c] font-black shadow-sm' : 'text-[#8ea3bd] hover:text-white'
            }`}
          >
            <span>🛥️ Hydrofoil Náutico</span>
          </button>
        </div>
      </div>

      {/* 3D Coordinates & Dimensions HUD (Top Right) */}
      <div className="absolute top-14 right-3 hidden sm:flex flex-col items-end gap-1 text-[11px] font-mono bg-[#0e1624]/80 backdrop-blur-sm p-2.5 rounded-lg border border-[#16202f] text-[#8ea3bd]">
        <div className="flex items-center gap-2">
          <span className="text-red-400 font-bold">Envergadura (b):</span>
          <span className="text-white font-bold">{params.b.toFixed(2)} m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">Ángulo α:</span>
          <span className="text-white font-bold">{params.alpha_deg}°</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold">Cuerdas (Cr / Ct):</span>
          <span className="text-white font-bold">{params.Cr.toFixed(2)} m / {params.Ct.toFixed(2)} m</span>
        </div>
        {selectedVehicle === 'f1_motorsport' && (
          <div className="flex items-center gap-2 text-amber-400 text-[10px] pt-1 border-t border-[#16202f]">
            <span>Configuración multi-elemento (Mainplane + DRS Flap)</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 right-3 text-[10px] text-[#5b6f8c] font-mono bg-[#0e1624]/80 px-2 py-0.5 rounded border border-[#16202f]">
        OptimAirWing 3D • Renderizado de Geometría
      </div>
    </div>
  );
};
