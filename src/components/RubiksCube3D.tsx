import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { sfx } from '../utils/audio.ts';
import {
  RotateCw,
  RotateCcw,
  Compass,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Hand,
  Orbit,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface RubiksCube3DProps {
  cubeState: string; // 54 char string
  onMove: (move: string) => void;
  interactive?: boolean;
  size?: 'normal' | 'hero' | 'compact';
}

const COLOR_MAP: Record<string, number> = {
  U: 0xfafafa, // Bright Competition White
  D: 0xfacc15, // Competition Yellow
  F: 0x16a34a, // Vibrant Green
  B: 0x2563eb, // Royal Blue
  L: 0xea580c, // Flame Orange
  R: 0xdc2626, // Crimson Red
};

const PLASTIC_BODY_COLOR = 0x121214; // Premium Carbon Matte Plastic Body

export const RubiksCube3D: React.FC<RubiksCube3DProps> = ({
  cubeState,
  onMove,
  interactive = true,
  size = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'slice' | 'orbit'>('slice');

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const cubiesRef = useRef<THREE.Mesh[]>([]);
  const isAnimatingRef = useRef(false);

  // Orbit viewpoint rotation
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'orbit' | 'slice' | null>(null);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cubeRotationRef = useRef({ x: 0.45, y: -0.65 });
  const targetRotationRef = useRef({ x: 0.45, y: -0.65 });
  const targetZoomRef = useRef(7.4);
  const touchDistanceRef = useRef<number | null>(null);

  // Raycasting for direct physical touch on cube slices
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    intersectedCubie: THREE.Mesh | null;
    normal: THREE.Vector3 | null;
    cubieGridPos: { x: number; y: number; z: number };
  } | null>(null);

  // Setup the 27 physical cubies with realistic beveled plastic bodies & inset stickers
  const setupCubeMeshes = useCallback(() => {
    if (!sceneRef.current) return;

    if (cubeGroupRef.current) {
      sceneRef.current.remove(cubeGroupRef.current);
    }

    const group = new THREE.Group();
    cubeGroupRef.current = group;
    sceneRef.current.add(group);
    cubiesRef.current = [];

    // Base cubie geometry with slightly separated seam gap for realistic Rubik's mechanics
    const cubieGeom = new THREE.BoxGeometry(0.93, 0.93, 0.93);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // 6 Materials: R(+X), L(-X), U(+Y), D(-Y), F(+Z), B(-Z)
          const materials = [
            new THREE.MeshStandardMaterial({ color: PLASTIC_BODY_COLOR, roughness: 0.3, metalness: 0.08 }), // +X
            new THREE.MeshStandardMaterial({ color: PLASTIC_BODY_COLOR, roughness: 0.3, metalness: 0.08 }), // -X
            new THREE.MeshStandardMaterial({ color: PLASTIC_BODY_COLOR, roughness: 0.3, metalness: 0.08 }), // +Y
            new THREE.MeshStandardMaterial({ color: PLASTIC_BODY_COLOR, roughness: 0.3, metalness: 0.08 }), // -Y
            new THREE.MeshStandardMaterial({ color: PLASTIC_BODY_COLOR, roughness: 0.3, metalness: 0.08 }), // +Z
            new THREE.MeshStandardMaterial({ color: PLASTIC_BODY_COLOR, roughness: 0.3, metalness: 0.08 }), // -Z
          ];

          const mesh = new THREE.Mesh(cubieGeom, materials);
          mesh.position.set(x, y, z);
          mesh.userData = {
            gridPos: { x, y, z },
          };
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          group.add(mesh);
          cubiesRef.current.push(mesh);
        }
      }
    }
  }, []);

  // Update sticker colors based on 54-char Rubik's state string
  const updateStickerColors = useCallback((stateString: string) => {
    if (stateString.length !== 54 || cubiesRef.current.length !== 27) return;

    for (const mesh of cubiesRef.current) {
      const pos = mesh.userData.gridPos as { x: number; y: number; z: number };
      const mats = mesh.material as THREE.MeshStandardMaterial[];

      // +X (R face) -> x === 1
      if (pos.x === 1) {
        const row = 1 - pos.y;
        const col = 1 - pos.z;
        const idx = 9 + row * 3 + col;
        mats[0].color.setHex(COLOR_MAP[stateString[idx]] || PLASTIC_BODY_COLOR);
        mats[0].roughness = 0.2;
      } else {
        mats[0].color.setHex(PLASTIC_BODY_COLOR);
      }

      // -X (L face) -> x === -1
      if (pos.x === -1) {
        const row = 1 - pos.y;
        const col = pos.z + 1;
        const idx = 36 + row * 3 + col;
        mats[1].color.setHex(COLOR_MAP[stateString[idx]] || PLASTIC_BODY_COLOR);
        mats[1].roughness = 0.2;
      } else {
        mats[1].color.setHex(PLASTIC_BODY_COLOR);
      }

      // +Y (U face) -> y === 1
      if (pos.y === 1) {
        const row = 1 - pos.z;
        const col = pos.x + 1;
        const idx = 0 + row * 3 + col;
        mats[2].color.setHex(COLOR_MAP[stateString[idx]] || PLASTIC_BODY_COLOR);
        mats[2].roughness = 0.2;
      } else {
        mats[2].color.setHex(PLASTIC_BODY_COLOR);
      }

      // -Y (D face) -> y === -1
      if (pos.y === -1) {
        const row = pos.z + 1;
        const col = pos.x + 1;
        const idx = 27 + row * 3 + col;
        mats[3].color.setHex(COLOR_MAP[stateString[idx]] || PLASTIC_BODY_COLOR);
        mats[3].roughness = 0.2;
      } else {
        mats[3].color.setHex(PLASTIC_BODY_COLOR);
      }

      // +Z (F face) -> z === 1
      if (pos.z === 1) {
        const row = 1 - pos.y;
        const col = pos.x + 1;
        const idx = 18 + row * 3 + col;
        mats[4].color.setHex(COLOR_MAP[stateString[idx]] || PLASTIC_BODY_COLOR);
        mats[4].roughness = 0.2;
      } else {
        mats[4].color.setHex(PLASTIC_BODY_COLOR);
      }

      // -Z (B face) -> z === -1
      if (pos.z === -1) {
        const row = 1 - pos.y;
        const col = 1 - pos.x;
        const idx = 45 + row * 3 + col;
        mats[5].color.setHex(COLOR_MAP[stateString[idx]] || PLASTIC_BODY_COLOR);
        mats[5].roughness = 0.2;
      } else {
        mats[5].color.setHex(PLASTIC_BODY_COLOR);
      }
    }
  }, []);

  // PHYSICAL 3D SLICE ROTATION ANIMATION (Physical Mechanical Turn in Three.js)
  const executePhysicalSliceTurn = useCallback(
    (move: string, callback?: () => void) => {
      if (isAnimatingRef.current || !cubeGroupRef.current) return;

      const base = move[0];
      const isPrime = move.includes("'");
      const isDouble = move.includes('2');
      const multiplier = isDouble ? 2 : 1;

      // Determine rotation axis, layer filter, and physical rotation angle
      let axis: 'x' | 'y' | 'z' = 'y';
      let angle = 0;
      let filterFn: (pos: { x: number; y: number; z: number }) => boolean;

      switch (base) {
        case 'U':
          axis = 'y';
          angle = (isPrime ? 1 : -1) * (Math.PI / 2) * multiplier;
          filterFn = p => p.y === 1;
          break;
        case 'D':
          axis = 'y';
          angle = (isPrime ? -1 : 1) * (Math.PI / 2) * multiplier;
          filterFn = p => p.y === -1;
          break;
        case 'R':
          axis = 'x';
          angle = (isPrime ? 1 : -1) * (Math.PI / 2) * multiplier;
          filterFn = p => p.x === 1;
          break;
        case 'L':
          axis = 'x';
          angle = (isPrime ? -1 : 1) * (Math.PI / 2) * multiplier;
          filterFn = p => p.x === -1;
          break;
        case 'F':
          axis = 'z';
          angle = (isPrime ? 1 : -1) * (Math.PI / 2) * multiplier;
          filterFn = p => p.z === 1;
          break;
        case 'B':
          axis = 'z';
          angle = (isPrime ? -1 : 1) * (Math.PI / 2) * multiplier;
          filterFn = p => p.z === -1;
          break;
        default:
          return;
      }

      isAnimatingRef.current = true;
      setIsAnimating(true);
      sfx.playTurn();

      // Find the 9 cubies in this slice
      const targetCubies = cubiesRef.current.filter(c => filterFn(c.userData.gridPos));

      // Create pivot group at origin
      const pivot = new THREE.Group();
      cubeGroupRef.current.add(pivot);

      // Reparent cubies to pivot group
      targetCubies.forEach(c => {
        pivot.attach(c);
      });

      // Animate rotation smoothly over ~160ms with cubic easing
      const startTime = performance.now();
      const duration = 160;

      const animateStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease out cubic: 1 - (1 - t)^3
        const eased = 1 - Math.pow(1 - progress, 3);

        pivot.rotation[axis] = angle * eased;

        if (progress < 1) {
          requestAnimationFrame(animateStep);
        } else {
          // Snap exact final rotation
          pivot.rotation[axis] = angle;
          pivot.updateMatrixWorld(true);

          // Reparent cubies back to cube group & update their local grid positions
          targetCubies.forEach(c => {
            cubeGroupRef.current!.attach(c);
            // Round positions to exact integers {-1, 0, 1}
            const rx = Math.round(c.position.x);
            const ry = Math.round(c.position.y);
            const rz = Math.round(c.position.z);
            c.position.set(rx, ry, rz);
            c.userData.gridPos = { x: rx, y: ry, z: rz };
          });

          cubeGroupRef.current!.remove(pivot);

          isAnimatingRef.current = false;
          setIsAnimating(false);

          onMove(move);
          if (callback) callback();
        }
      };

      requestAnimationFrame(animateStep);
    },
    [onMove]
  );

  // Initialize Three.js Scene, Camera, Lighting & Contact Shadow
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Realistic Multi-Point Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(7, 10, 8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
    fillLight.position.set(-8, -4, -6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.2);
    rimLight.position.set(0, 8, -6);
    scene.add(rimLight);

    // Subtle dark contact shadow disc beneath the cube for physical grounding
    const shadowGeo = new THREE.PlaneGeometry(5, 5);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -2.3;
    scene.add(shadowMesh);

    setupCubeMeshes();
    updateStickerColors(cubeState);

    // Animation & Smooth Viewport Orbit Loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      if (cubeGroupRef.current) {
        // Smooth viewpoint damping
        cubeRotationRef.current.x += (targetRotationRef.current.x - cubeRotationRef.current.x) * 0.14;
        cubeRotationRef.current.y += (targetRotationRef.current.y - cubeRotationRef.current.y) * 0.14;

        cubeGroupRef.current.rotation.x = cubeRotationRef.current.x;
        cubeGroupRef.current.rotation.y = cubeRotationRef.current.y;

        // Auto gentle idle rotation if hero preview
        if (!interactive) {
          targetRotationRef.current.y += 0.005;
        }
      }

      // Smooth camera zoom interpolation
      if (cameraRef.current) {
        cameraRef.current.position.z += (targetZoomRef.current - cameraRef.current.position.z) * 0.16;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [setupCubeMeshes, interactive]);

  // Sync sticker colors on cubeState prop changes
  useEffect(() => {
    updateStickerColors(cubeState);
  }, [cubeState, updateStickerColors]);

  // DIRECT PHYSICAL DRAGGING ON THE CUBE (Drag Face to Rotate Layer, or Drag Void to Orbit)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

    if (!rendererRef.current || !cameraRef.current || !cubeGroupRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(cubiesRef.current);

    // If user clicked directly on a cubie face and mode is 'slice' (or secondary button is not pressed)
    if (intersects.length > 0 && interactionMode === 'slice' && e.button === 0) {
      dragModeRef.current = 'slice';
      const hit = intersects[0];
      const normal = hit.face?.normal ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
      const cubieMesh = hit.object as THREE.Mesh;
      const gridPos = (cubieMesh.userData.gridPos as { x: number; y: number; z: number }) || { x: 0, y: 0, z: 0 };

      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        intersectedCubie: cubieMesh,
        normal,
        cubieGridPos: { ...gridPos },
      };
    } else {
      // Clicked on background or in orbit mode -> rotate entire cube perspective
      dragModeRef.current = 'orbit';
      dragStartRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    if (dragModeRef.current === 'orbit') {
      // Orbit whole cube
      targetRotationRef.current.y += deltaX * 0.01;
      targetRotationRef.current.x += deltaY * 0.01;
      targetRotationRef.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotationRef.current.x));
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    } else if (dragModeRef.current === 'slice' && dragStartRef.current && interactive && !isAnimatingRef.current) {
      // Calculate drag vector from initial click point
      const totalDx = e.clientX - dragStartRef.current.clientX;
      const totalDy = e.clientY - dragStartRef.current.clientY;
      const dist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

      // Direct swipe threshold: once user drags 24px across the face, physically rotate that layer!
      if (dist >= 24) {
        const { cubieGridPos, normal } = dragStartRef.current;
        let detectedMove: string | null = null;

        // Front face (+Z)
        if (normal && normal.z > 0.5) {
          if (Math.abs(totalDx) > Math.abs(totalDy)) {
            // Horizontal swipe
            if (cubieGridPos.y === 1) detectedMove = totalDx > 0 ? "U'" : 'U';
            else if (cubieGridPos.y === -1) detectedMove = totalDx > 0 ? 'D' : "D'";
          } else {
            // Vertical swipe
            if (cubieGridPos.x === 1) detectedMove = totalDy > 0 ? "R'" : 'R';
            else if (cubieGridPos.x === -1) detectedMove = totalDy > 0 ? 'L' : "L'";
          }
        }
        // Right face (+X)
        else if (normal && normal.x > 0.5) {
          if (Math.abs(totalDx) > Math.abs(totalDy)) {
            // Horizontal swipe along Z
            if (cubieGridPos.y === 1) detectedMove = totalDx > 0 ? "U'" : 'U';
            else if (cubieGridPos.y === -1) detectedMove = totalDx > 0 ? 'D' : "D'";
          } else {
            // Vertical swipe
            if (cubieGridPos.z === 1) detectedMove = totalDy > 0 ? "F'" : 'F';
            else if (cubieGridPos.z === -1) detectedMove = totalDy > 0 ? 'B' : "B'";
          }
        }
        // Top face (+Y)
        else if (normal && normal.y > 0.5) {
          if (Math.abs(totalDx) > Math.abs(totalDy)) {
            if (cubieGridPos.z === -1) detectedMove = totalDx > 0 ? 'B' : "B'";
            else if (cubieGridPos.z === 1) detectedMove = totalDx > 0 ? "F'" : 'F';
          } else {
            if (cubieGridPos.x === 1) detectedMove = totalDy > 0 ? "R'" : 'R';
            else if (cubieGridPos.x === -1) detectedMove = totalDy > 0 ? 'L' : "L'";
          }
        }
        // Fallback generic swipe
        else {
          if (Math.abs(totalDx) > Math.abs(totalDy)) {
            detectedMove = totalDx > 0 ? "U'" : 'U';
          } else {
            detectedMove = totalDy > 0 ? "R'" : 'R';
          }
        }

        if (detectedMove) {
          executePhysicalSliceTurn(detectedMove);
          // Terminate this drag gesture so it doesn't repeatedly fire
          dragStartRef.current = null;
          isDraggingRef.current = false;
        }
      }
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragModeRef.current = null;
    dragStartRef.current = null;
  };

  // Whole-cube orientation turns (Holding the cube in hands and rotating it 90 degrees)
  const rotateCubeWhole = (direction: 'left' | 'right' | 'up' | 'down') => {
    const step = Math.PI / 2;
    switch (direction) {
      case 'left':
        targetRotationRef.current.y -= step;
        break;
      case 'right':
        targetRotationRef.current.y += step;
        break;
      case 'up':
        targetRotationRef.current.x = Math.max(-Math.PI / 2.2, targetRotationRef.current.x - step * 0.6);
        break;
      case 'down':
        targetRotationRef.current.x = Math.min(Math.PI / 2.2, targetRotationRef.current.x + step * 0.6);
        break;
    }
    sfx.playTurn();
  };

  const handleZoomIn = () => {
    targetZoomRef.current = Math.max(4.2, targetZoomRef.current - 0.85);
  };

  const handleZoomOut = () => {
    targetZoomRef.current = Math.min(12.0, targetZoomRef.current + 0.85);
  };

  const handleWheel = (e: React.WheelEvent) => {
    targetZoomRef.current = Math.max(4.2, Math.min(12.0, targetZoomRef.current + e.deltaY * 0.005));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const diff = touchDistanceRef.current - dist;
      targetZoomRef.current = Math.max(4.2, Math.min(12.0, targetZoomRef.current + diff * 0.015));
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  const resetCamera = () => {
    targetRotationRef.current = { x: 0.45, y: -0.65 };
    targetZoomRef.current = 7.4;
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sfx.enabled = next;
  };

  // Keyboard shortcut listener (U, D, L, R, F, B and Shift+key)
  useEffect(() => {
    if (!interactive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      const validFaces = ['U', 'D', 'L', 'R', 'F', 'B'];
      if (validFaces.includes(key)) {
        e.preventDefault();
        const move = e.shiftKey ? `${key}'` : key;
        executePhysicalSliceTurn(move);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, executePhysicalSliceTurn]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* 3D Canvas Viewport */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900/95 via-slate-950 to-black border border-slate-800 shadow-2xl flex items-center justify-center select-none canvas-touch-none ${
          size === 'hero' ? 'h-[360px] sm:h-[430px]' : size === 'compact' ? 'h-[270px]' : 'h-[340px] sm:h-[410px]'
        }`}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Top HUD Controls */}
        {interactive && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {/* Gesture Mode Selector */}
            <div className="flex items-center gap-1 p-1 bg-black/70 backdrop-blur-md rounded-xl border border-slate-700/60 pointer-events-auto">
              <button
                type="button"
                onClick={() => setInteractionMode('slice')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  interactionMode === 'slice'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tocar nas faces para rodar as camadas físicas"
              >
                <Hand className="w-3.5 h-3.5" />
                Girar Camadas
              </button>
              <button
                type="button"
                onClick={() => setInteractionMode('orbit')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  interactionMode === 'orbit'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Rodar perspetiva do cubo em 360°"
              >
                <Orbit className="w-3.5 h-3.5" />
                Rodar Câmara
              </button>
            </div>

            {/* Utility Buttons: Zoom In, Zoom Out, Reset, Audio */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Aumentar Zoom (+)"
                className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 backdrop-blur-md text-slate-300 hover:text-amber-400 border border-slate-700/60 transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Reduzir Zoom (-)"
                className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 backdrop-blur-md text-slate-300 hover:text-amber-400 border border-slate-700/60 transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={resetCamera}
                title="Repor Perspetiva Inicial e Zoom"
                className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              >
                <Compass className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Efeitos Sonoros'}
                className="p-2 rounded-xl bg-black/60 hover:bg-slate-800 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
        )}

        {/* Quick Hand Reorientation Controls (Holding and rotating the cube in hands) */}
        {interactive && (
          <div className="absolute right-3 bottom-12 flex flex-col gap-1 pointer-events-auto bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => rotateCubeWhole('up')}
                title="Girar cubo para cima"
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => rotateCubeWhole('left')}
                title="Girar cubo para a esquerda"
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[9px] font-mono font-bold text-amber-400/80 px-1">CUBO</span>
              <button
                type="button"
                onClick={() => rotateCubeWhole('right')}
                title="Girar cubo para a direita"
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => rotateCubeWhole('down')}
                title="Girar cubo para baixo"
                className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mechanical Face Rotation Buttons Strip (Fast Speedcubing Buttons) */}
      {interactive && (
        <div className="mt-4 w-full flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Painel Mecânico de Camadas
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              [Shift + Tecla = Anti-Horário]
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {/* Face U (Topo - Branco) */}
            <div className="flex flex-col gap-1 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 inline-block shadow-sm" />
                  Topo (U)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn('U')}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Topo Horário (U)"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" /> U
                </button>
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn("U'")}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Topo Anti-Horário (U')"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> U'
                </button>
              </div>
            </div>

            {/* Face D (Base - Amarelo) */}
            <div className="flex flex-col gap-1 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-yellow-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block shadow-sm" />
                  Base (D)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn('D')}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Base Horário (D)"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" /> D
                </button>
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn("D'")}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Base Anti-Horário (D')"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> D'
                </button>
              </div>
            </div>

            {/* Face F (Frente - Verde) */}
            <div className="flex flex-col gap-1 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
                  Frente (F)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn('F')}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Frente Horário (F)"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" /> F
                </button>
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn("F'")}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Frente Anti-Horário (F')"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> F'
                </button>
              </div>
            </div>

            {/* Face B (Trás - Azul) */}
            <div className="flex flex-col gap-1 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm" />
                  Trás (B)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn('B')}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Trás Horário (B)"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" /> B
                </button>
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn("B'")}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Trás Anti-Horário (B')"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> B'
                </button>
              </div>
            </div>

            {/* Face L (Esquerda - Laranja) */}
            <div className="flex flex-col gap-1 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-orange-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-sm" />
                  Esq. (L)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn('L')}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Esquerda Horário (L)"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" /> L
                </button>
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn("L'")}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Esquerda Anti-Horário (L')"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> L'
                </button>
              </div>
            </div>

            {/* Face R (Direita - Vermelho) */}
            <div className="flex flex-col gap-1 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-red-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm" />
                  Dir. (R)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn('R')}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Direita Horário (R)"
                >
                  <RotateCw className="w-3 h-3 text-amber-400" /> R
                </button>
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => executePhysicalSliceTurn("R'")}
                  className="py-1 px-1 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Girar Direita Anti-Horário (R')"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" /> R'
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
