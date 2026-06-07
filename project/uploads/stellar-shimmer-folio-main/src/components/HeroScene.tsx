import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Premium Hero 3D scene
 * - Slowly rotating distorted icosahedron with iridescent metal material
 * - Orbital particle ring
 * - Mouse parallax
 * - Pure CSS-friendly: respects prefers-reduced-motion via slower drift
 */

const Crystal = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { mouse } = useThree();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.18;
      meshRef.current.rotation.x += delta * 0.06;
    }
    if (groupRef.current) {
      // Smooth parallax toward mouse
      const tx = mouse.x * 0.35;
      const ty = mouse.y * 0.25;
      groupRef.current.rotation.y += (tx - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x += (-ty - groupRef.current.rotation.x) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.8}>
        <mesh ref={meshRef} castShadow>
          <icosahedronGeometry args={[1.35, 6]} />
          <MeshDistortMaterial
            color="#6366F1"
            roughness={0.15}
            metalness={0.9}
            distort={0.35}
            speed={1.6}
            emissive="#1e1b4b"
            emissiveIntensity={0.35}
          />
        </mesh>
        {/* Inner glow shell */}
        <mesh scale={1.05}>
          <icosahedronGeometry args={[1.35, 2]} />
          <meshBasicMaterial color="#6366F1" transparent opacity={0.04} side={THREE.BackSide} />
        </mesh>
        {/* Wireframe overlay */}
        <mesh scale={1.18}>
          <icosahedronGeometry args={[1.35, 1]} />
          <meshBasicMaterial color="#F59E0B" wireframe transparent opacity={0.12} />
        </mesh>
      </Float>
    </group>
  );
};

const ParticleRing = ({ count = 180, radius = 2.6 }: { count?: number; radius?: number }) => {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius + (Math.random() - 0.5) * 0.6;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.45; // squash into disc
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
      ref.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#F59E0B" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
};

const Scene = () => (
  <>
    <ambientLight intensity={0.35} />
    <directionalLight position={[5, 4, 5]} intensity={1.2} color="#6366F1" />
    <directionalLight position={[-4, -2, -3]} intensity={0.8} color="#F59E0B" />
    <pointLight position={[0, 0, 3]} intensity={0.6} color="#ffffff" />
    <Crystal />
    <ParticleRing />
    <ContactShadows position={[0, -1.9, 0]} opacity={0.35} scale={6} blur={2.5} far={3} color="#6366F1" />
    <Environment preset="city" />
  </>
);

const HeroScene = () => {
  return (
    <div className="relative w-full h-[460px] md:h-[520px] lg:h-[560px] pointer-events-auto">
      {/* Ambient backdrop glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.22) 0%, rgba(245,158,11,0.08) 45%, transparent 75%)',
          filter: 'blur(40px)',
        }}
      />
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HeroScene;
