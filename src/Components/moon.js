import * as React from 'react';
import { TextureLoader, THREE } from 'expo-three';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import moonImg from '../../assets/moon.jpeg';
import LunarOrbiter from './LunarOrbiter';

const BASE_MOON_RADIUS = 2.05;

// Exact astronomical sidereal rotation period of the Moon:
// 27.321661 days (27 days, 7 hours, 43 minutes, 11.5 seconds) = 2,360,591.5 seconds.
// Angular velocity: 2 * PI / 2,360,591.5 = 2.661699e-6 rad/second (~13.176 deg/day)
export const LUNAR_SIDEREAL_PERIOD_DAYS = 27.321661;
export const LUNAR_SIDEREAL_PERIOD_SECONDS = LUNAR_SIDEREAL_PERIOD_DAYS * 86400;
export const LUNAR_ROTATION_SPEED_RAD_PER_SEC = (2 * Math.PI) / LUNAR_SIDEREAL_PERIOD_SECONDS;
export const LUNAR_ROTATION_PER_DAY_RAD = (2 * Math.PI) / LUNAR_SIDEREAL_PERIOD_DAYS;

function MoonCore({ radius, dayOffset = 0 }) {
  const ref = React.useRef();
  const map = useLoader(TextureLoader, moonImg);
  useFrame(({ clock }) => {
    if (ref.current) {
      // Rotate at the exact physical astronomical speed of the Moon
      ref.current.rotation.y = -(
        dayOffset * LUNAR_ROTATION_PER_DAY_RAD +
        clock.getElapsedTime() * LUNAR_ROTATION_SPEED_RAD_PER_SEC
      );
    }
  });
  return (
    <mesh ref={ref} visible castShadow position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 64, 32]} />
      {/* Physically realistic lunar regolith: high dynamic contrast that blooms under direct sunlight */}
      <meshStandardMaterial
        map={map}
        roughness={0.62}
        metalness={0.02}
        emissive="#060911"
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

/**
 * SeamlessSunlitGlow:
 * Single continuous mathematical shader that eliminates all discrete steps, concentric rings,
 * and hard-edged layer artifacts. Produces an authentic, silky-smooth optical solar halo.
 */
function SeamlessSunlitGlow({ radius, sunPos }) {
  const matRef = React.useRef();

  const sunDir = React.useMemo(() => {
    const [sx, sy, sz] = sunPos;
    const v = new THREE.Vector3(sx, sy, sz);
    if (v.lengthSq() > 0.001) v.normalize();
    return v;
  }, [sunPos]);

  const uniforms = React.useMemo(
    () => ({
      uSunDirView: { value: new THREE.Vector3(1, 0, 0) },
      uGlowColor: { value: new THREE.Color('#d8ebff') },
    }),
    []
  );

  useFrame(({ camera }) => {
    if (matRef.current) {
      // Continuously update Sun direction in camera/view space
      matRef.current.uniforms.uSunDirView.value
        .copy(sunDir)
        .transformDirection(camera.matrixWorldInverse);
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[radius * 1.18, 64, 32]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            // In BackSide, -normal points radially outward into space
            vNormal = normalize(normalMatrix * -normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewDir = -mvPos.xyz;
            gl_Position = projectionMatrix * mvPos;
          }
        `}
        fragmentShader={`
          precision mediump float;
          uniform vec3 uSunDirView;
          uniform vec3 uGlowColor;
          varying vec3 vNormal;
          varying vec3 vViewDir;

          void main() {
            vec3 viewDir = normalize(vViewDir);
            // On BackSide, dot(viewDir, vNormal) is highest at the inner rim
            // and smoothly decreases to 0.0 at the outer silhouette edge.
            float rim = clamp(dot(viewDir, vNormal), 0.0, 1.0);
            // Continuous smooth exponential decay (zero steps, zero layers)
            float falloff = pow(rim, 3.2);

            // Directional sun term: glow is intense on the sunlit limb and zero on dark side
            float sunDot = dot(vNormal, uSunDirView);
            float sunFactor = smoothstep(-0.25, 0.45, sunDot);

            float alpha = falloff * sunFactor * 0.65;
            gl_FragColor = vec4(uGlowColor, alpha);
          }
        `}
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function MoonFallback({ radius, dayOffset = 0 }) {
  const ref = React.useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = -(
        dayOffset * LUNAR_ROTATION_PER_DAY_RAD +
        clock.getElapsedTime() * LUNAR_ROTATION_SPEED_RAD_PER_SEC
      );
    }
  });
  return (
    <mesh ref={ref} visible position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.7} />
    </mesh>
  );
}

function MoonEclipse({ radius, opacity = 0.4, dayOffset = 0 }) {
  const ref = React.useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = -(
        dayOffset * LUNAR_ROTATION_PER_DAY_RAD +
        clock.getElapsedTime() * LUNAR_ROTATION_SPEED_RAD_PER_SEC
      );
    }
  });
  return (
    <mesh visible ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[radius + 0.015, 64, 32]} />
      <meshPhongMaterial color="red" transparent={true} opacity={opacity} />
    </mesh>
  );
}

function MoonSystem({
  radius,
  isMoonEclipse,
  eclipseDarkness,
  showOrbiter,
  sunPos,
  currentOrbitRadius,
  moonScale,
  targetY,
  dayOffset = 0,
}) {
  const systemRef = React.useRef();

  useFrame((_, delta) => {
    if (systemRef.current) {
      const dt = Math.min(delta, 0.1);
      systemRef.current.position.y = THREE.MathUtils.damp
        ? THREE.MathUtils.damp(systemRef.current.position.y, targetY, 4.8, dt)
        : systemRef.current.position.y + (targetY - systemRef.current.position.y) * (1 - Math.exp(-4.8 * dt));
    }
  });

  return (
    <group ref={systemRef} position={[0, targetY, 0]}>
      <MoonCore radius={radius} dayOffset={dayOffset} />
      <SeamlessSunlitGlow radius={radius} sunPos={sunPos} />
      {isMoonEclipse && <MoonEclipse radius={radius} opacity={eclipseDarkness} dayOffset={dayOffset} />}
      {showOrbiter && (
        <LunarOrbiter
          center={[0, 0, 0]}
          orbitRadius={currentOrbitRadius}
          orbitSpeed={0.35}
          showOrbitTrail={true}
          sunLightPosition={sunPos}
          orbiterScale={moonScale}
        />
      )}
    </group>
  );
}

function MoonFallbackSystem({ radius, targetY, dayOffset = 0 }) {
  const systemRef = React.useRef();
  useFrame((_, delta) => {
    if (systemRef.current) {
      const dt = Math.min(delta, 0.1);
      systemRef.current.position.y = THREE.MathUtils.damp
        ? THREE.MathUtils.damp(systemRef.current.position.y, targetY, 4.8, dt)
        : systemRef.current.position.y + (targetY - systemRef.current.position.y) * (1 - Math.exp(-4.8 * dt));
    }
  });
  return (
    <group ref={systemRef} position={[0, targetY, 0]}>
      <MoonFallback radius={radius} dayOffset={dayOffset} />
    </group>
  );
}

export default function Moon({
  lightPosition = [10, 0, 10],
  moonScale = 1.0,
  isMoonEclipse = false,
  eclipseDarkness = 0.4,
  showOrbiter = true,
  hasHUD = true,
  dayOffset = 0,
}) {
  const targetY = hasHUD ? 0.70 : 0.0;
  const [lx, ly, lz] = lightPosition;
  const sunPos = [lx, ly + targetY, lz];

  const currentRadius = BASE_MOON_RADIUS * moonScale;
  const currentOrbitRadius = currentRadius + 0.32 * moonScale;

  return (
    <Canvas camera={{ position: [0, 0, 11], fov: 38, far: 10000 }}>
      {/* 1. Ultra-brilliant direct solar beam from exact astronomical vector */}
      <directionalLight position={sunPos} intensity={6.5} color="#ffffff" />
      <pointLight position={sunPos} intensity={5.5} decay={0} color="#fff8eb" />

      {/* 2. Direct solar specular & sub-solar core illumination */}
      <pointLight
        position={[sunPos[0] * 0.55, sunPos[1] * 0.55, Math.max(sunPos[2] * 0.55, 3.0)]}
        intensity={2.8}
        decay={0}
        color="#eaf3ff"
      />

      {/* 3. Subtle cosmic Earthshine for unlit craters */}
      <ambientLight color="#121b28" intensity={0.22} />

      <React.Suspense fallback={<MoonFallbackSystem radius={currentRadius} targetY={targetY} dayOffset={dayOffset} />}>
        <MoonSystem
          radius={currentRadius}
          isMoonEclipse={isMoonEclipse}
          eclipseDarkness={eclipseDarkness}
          showOrbiter={showOrbiter}
          sunPos={sunPos}
          currentOrbitRadius={currentOrbitRadius}
          moonScale={moonScale}
          targetY={targetY}
          dayOffset={dayOffset}
        />
      </React.Suspense>
    </Canvas>
  );
}
