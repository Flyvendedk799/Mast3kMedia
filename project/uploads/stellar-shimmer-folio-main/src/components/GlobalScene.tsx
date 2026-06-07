import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Global full-page animated scene.
 * Single signature ribbon with richer motion, breathing camera, and a few drifting shards.
 * Tuned to be present but never obscure content.
 */

/* ───── Flowing ribbon — animated curve with live morph ───── */
const Ribbon = ({ scrollRef, mouseRef }: { scrollRef: React.MutableRefObject<number>; mouseRef: React.MutableRefObject<{ x: number; y: number }> }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geomRef = useRef<THREE.TubeGeometry | null>(null);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const basePointsRef = useRef<THREE.Vector3[]>([]);

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segs = 200;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = (t - 0.5) * 18;
      const y = Math.sin(t * Math.PI * 4) * 1.6 + Math.sin(t * Math.PI * 7) * 0.5;
      const z = Math.cos(t * Math.PI * 3) * 2.4;
      points.push(new THREE.Vector3(x, y, z));
    }
    basePointsRef.current = points.map((p) => p.clone());
    const curve = new THREE.CatmullRomCurve3(points);
    curveRef.current = curve;
    const geo = new THREE.TubeGeometry(curve, 400, 0.07, 14, false);
    geomRef.current = geo;
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uColorA: { value: new THREE.Color('#6366F1') },
      uColorB: { value: new THREE.Color('#F59E0B') },
      uColorC: { value: new THREE.Color('#8B5CF6') },
    }),
    []
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
    uniforms.uScroll.value += (scrollRef.current - uniforms.uScroll.value) * 0.05;

    // Live deform the curve so the ribbon flows
    const t = uniforms.uTime.value;
    const base = basePointsRef.current;
    const curve = curveRef.current;
    if (curve && base.length) {
      for (let i = 0; i < base.length; i++) {
        const p = base[i];
        const k = i / (base.length - 1);
        curve.points[i].set(
          p.x,
          p.y + Math.sin(t * 0.9 + k * 8) * 0.35 + mouseRef.current.y * 0.4,
          p.z + Math.cos(t * 0.7 + k * 6) * 0.35 + mouseRef.current.x * 0.4
        );
      }
      // Rebuild tube geometry positions
      const newGeo = new THREE.TubeGeometry(curve, 400, 0.07, 14, false);
      if (geomRef.current && meshRef.current) {
        geomRef.current.attributes.position.array.set(
          (newGeo.attributes.position.array as Float32Array)
        );
        geomRef.current.attributes.position.needsUpdate = true;
        geomRef.current.attributes.normal.array.set(
          (newGeo.attributes.normal.array as Float32Array)
        );
        geomRef.current.attributes.normal.needsUpdate = true;
        newGeo.dispose();
      }
    }

    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(t * 0.15) * 0.12;
      meshRef.current.rotation.y = scrollRef.current * Math.PI * 0.7 + Math.sin(t * 0.2) * 0.2;
      meshRef.current.position.y = -scrollRef.current * 4;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform float uScroll;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          void main() {
            float pulse = 0.5 + 0.5 * sin(vUv.x * 32.0 - uTime * 1.8);
            float flow  = 0.5 + 0.5 * sin(vUv.x * 6.0 + uTime * 0.6 + uScroll * 3.0);
            vec3 mid = mix(uColorA, uColorC, flow);
            vec3 col = mix(mid, uColorB, clamp(vUv.x + uScroll * 0.4, 0.0, 1.0));
            float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
            float alpha = (0.6 + pulse * 0.35) * edge * 0.9;
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  );
};

/* ───── Drifting crystalline shards ───── */
const Shard = ({ position, scale, hue }: { position: [number, number, number]; scale: number; hue: 'primary' | 'accent' }) => {
  const ref = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.14 + seed;
    ref.current.rotation.y = t * 0.22 + seed;
    ref.current.position.y = position[1] + Math.sin(t * 0.6 + seed) * 0.5;
  });

  return (
    <Float speed={1.0} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref} position={position} scale={scale}>
        <octahedronGeometry args={[1, 0]} />
        <MeshDistortMaterial
          color={hue === 'primary' ? '#6366F1' : '#F59E0B'}
          metalness={0.9}
          roughness={0.2}
          distort={0.2}
          speed={1.3}
          emissive={hue === 'primary' ? '#1e1b4b' : '#451a03'}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
    </Float>
  );
};

const Shards = () => {
  const shards = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const radius = 4 + Math.random() * 3.5;
        return {
          id: i,
          position: [
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 8,
            Math.sin(angle) * radius - 2,
          ] as [number, number, number],
          scale: 0.18 + Math.random() * 0.35,
          hue: (i % 3 === 0 ? 'accent' : 'primary') as 'primary' | 'accent',
        };
      }),
    []
  );

  return (
    <>
      {shards.map((s) => (
        <Shard key={s.id} position={s.position} scale={s.scale} hue={s.hue} />
      ))}
    </>
  );
};

/* ───── Sparse particle field ───── */
const StarDust = ({ count = 350 }: { count?: number }) => {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.022} color="#ffffff" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
};

/* ───── Camera rig with scroll + mouse parallax + breathing ───── */
const Rig = ({ scrollRef, mouseRef }: { scrollRef: React.MutableRefObject<number>; mouseRef: React.MutableRefObject<{ x: number; y: number }> }) => {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const tx = mouseRef.current.x * 0.8;
    const ty = mouseRef.current.y * 0.5 - scrollRef.current * 2;
    camera.position.x += (tx - camera.position.x) * 0.05;
    camera.position.y += (ty - camera.position.y) * 0.05;
    camera.position.z = 7 + scrollRef.current * 1.5 + Math.sin(t * 0.4) * 0.15;
    camera.lookAt(target.current);
  });

  return null;
};

const MouseTracker = ({ mouseRef }: { mouseRef: React.MutableRefObject<{ x: number; y: number }> }) => {
  const { mouse } = useThree();
  useFrame(() => {
    mouseRef.current.x += (mouse.x - mouseRef.current.x) * 0.08;
    mouseRef.current.y += (mouse.y - mouseRef.current.y) * 0.08;
  });
  return null;
};

const GlobalScene = () => {
  const scrollRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (reduced) return null;

  return (
    <div aria-hidden className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.85 }}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 7], fov: 55 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.9} color="#6366F1" />
          <directionalLight position={[-5, -3, -2]} intensity={0.5} color="#F59E0B" />
          <MouseTracker mouseRef={mouseRef} />
          <Ribbon scrollRef={scrollRef} mouseRef={mouseRef} />
          <Shards />
          <StarDust />
          <Rig scrollRef={scrollRef} mouseRef={mouseRef} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GlobalScene;
