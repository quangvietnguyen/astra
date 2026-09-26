import * as React from 'react';
import { TextureLoader, THREE } from 'expo-three';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import moonImg from '../../assets/moon.jpeg';
import LunarOrbiter from './LunarOrbiter';

const BASE_MOON_RADIUS = 2.05;
const MOTION_SPEED = 9;
const PHASE_SPEED = 7;

const blend = (delta, speed) => 1 - Math.exp(-speed * Math.min(delta, 0.1));
const blendLight = (light, intensity, color, amount) => {
  light.intensity = THREE.MathUtils.lerp(light.intensity, intensity, amount);
  light.color.lerp(color, amount);
};

function useSmoothLunarRotation(ref, dayOffset) {
  const initialized = React.useRef(false);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const target = -(clock.getElapsedTime() / SLOW_ROTATION_DIVISOR + dayOffset * LUNAR_ROTATION_PER_DAY_RAD);
    if (!initialized.current) {
      ref.current.rotation.y = target;
      initialized.current = true;
      return;
    }
    // Use the shortest angular path when the ruler crosses several dates at once.
    const difference = Math.atan2(Math.sin(target - ref.current.rotation.y), Math.cos(target - ref.current.rotation.y));
    ref.current.rotation.y += difference * blend(delta, PHASE_SPEED);
  });
}

// Slow, majestic continuous rotation (1 full revolution every ~377 seconds / ~6.3 minutes)
// Gives a graceful, visible celestial rotation while remaining calm and serene
export const SLOW_ROTATION_DIVISOR = 60;
export const LUNAR_ROTATION_PER_DAY_RAD = (2 * Math.PI) / 27.321661;

function MoonCore({ radius, dayOffset = 0, isMoonEclipse = false, isMidAutumn = false }) {
  const ref = React.useRef();
  const materialRef = React.useRef();
  const initialized = React.useRef(false);
  const map = useLoader(TextureLoader, moonImg);
  useSmoothLunarRotation(ref, dayOffset);

  const materialProps = React.useMemo(() => {
    if (isMoonEclipse) {
      return {
        color: '#96482e', // Authentic astronomical copper-rust regolith (Danjon L=3)
        roughness: 0.72,
        metalness: 0.02,
        emissive: '#260e07', // Deep coppery mahogany umbral core
        emissiveIntensity: 0.22,
      };
    }
    if (isMidAutumn) {
      return {
        color: '#fffdf7', // Slightly warmer than usual (radiant warm ivory/pearl, not yellow)
        roughness: 0.48, // Silkier surface for heightened reflectivity & brilliance
        metalness: 0.02,
        emissive: '#241f17', // Gentle warm luminance, avoiding dark mustard
        emissiveIntensity: 0.16,
      };
    }
    return {
      color: '#ffffff',
      roughness: 0.62,
      metalness: 0.02,
      emissive: '#060911',
      emissiveIntensity: 0.12,
    };
  }, [isMoonEclipse, isMidAutumn]);

  const targetColor = React.useMemo(() => new THREE.Color(materialProps.color), [materialProps.color]);
  const targetEmissive = React.useMemo(() => new THREE.Color(materialProps.emissive), [materialProps.emissive]);
  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const amount = initialized.current ? blend(delta, PHASE_SPEED) : 1;
    material.color.lerp(targetColor, amount);
    material.emissive.lerp(targetEmissive, amount);
    material.roughness = THREE.MathUtils.lerp(material.roughness, materialProps.roughness, amount);
    material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, materialProps.emissiveIntensity, amount);
    initialized.current = true;
  });

  return (
    <mesh ref={ref} visible castShadow position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 64, 32]} />
      {/* Physically realistic lunar regolith: adapts color & bloom dynamically for Eclipse and Mid-Autumn */}
      <meshStandardMaterial ref={materialRef} map={map} metalness={0.02} />
    </mesh>
  );
}

/**
 * SeamlessSunlitGlow:
 * Single continuous mathematical shader that eliminates all discrete steps, concentric rings,
 * and hard-edged layer artifacts. Produces an authentic, silky-smooth optical solar halo.
 */
function SeamlessSunlitGlow({ radius, sunPos, isMoonEclipse = false, isMidAutumn = false }) {
  const matRef = React.useRef();
  const currentSunDir = React.useRef(new THREE.Vector3());
  const initialized = React.useRef(false);

  const sunDir = React.useMemo(() => {
    const [sx, sy, sz] = sunPos;
    const v = new THREE.Vector3(sx, sy, sz);
    if (v.lengthSq() > 0.001) v.normalize();
    return v;
  }, [sunPos]);

  const targetGlowHex = isMoonEclipse
    ? '#c86438' // Warm copper-amber limb glow (Rayleigh scattering)
    : isMidAutumn
    ? '#fff6e2' // Luminous warm champagne/pearl halo (brighter, delicately warm)
    : '#d8ebff';

  const uniforms = React.useMemo(
    () => ({
      uSunDirView: { value: new THREE.Vector3(1, 0, 0) },
      uGlowColor: { value: new THREE.Color(targetGlowHex) },
    }),
    []
  );
  const targetGlowColor = React.useMemo(() => new THREE.Color(targetGlowHex), [targetGlowHex]);

  useFrame(({ camera }, delta) => {
    if (matRef.current) {
      const amount = initialized.current ? blend(delta, PHASE_SPEED) : 1;
      currentSunDir.current.lerp(sunDir, amount).normalize();
      // Continuously update Sun direction in camera/view space
      matRef.current.uniforms.uSunDirView.value
        .copy(currentSunDir.current)
        .transformDirection(camera.matrixWorldInverse);
      matRef.current.uniforms.uGlowColor.value.lerp(targetGlowColor, amount);
      initialized.current = true;
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

function MoonFallback({ radius, dayOffset = 0, isMoonEclipse = false, isMidAutumn = false }) {
  const ref = React.useRef();
  useSmoothLunarRotation(ref, dayOffset);
  const fallbackColor = isMoonEclipse ? '#96482e' : isMidAutumn ? '#fffdf7' : '#94a3b8';
  return (
    <mesh ref={ref} visible position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshStandardMaterial color={fallbackColor} roughness={isMidAutumn ? 0.48 : 0.7} />
    </mesh>
  );
}

function MoonEclipse({ radius, opacity = 0.35, dayOffset = 0 }) {
  const ref = React.useRef();
  const materialRef = React.useRef();
  const initialized = React.useRef(false);
  useSmoothLunarRotation(ref, dayOffset);
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, opacity, initialized.current ? blend(delta, PHASE_SPEED) : 1);
    initialized.current = true;
  });
  return (
    <mesh visible ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[radius + 0.02, 64, 32]} />
      <meshPhongMaterial
        ref={materialRef}
        color="#a24e2c" // Natural coppery terracotta umbra
        emissive="#240e07" // Deep earthy shadow
        specular="#c9774f" // Soft copper highlight
        shininess={12}
        transparent={true}
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

function MoonSystem({
  radius,
  isMoonEclipse,
  isMidAutumn,
  eclipseDarkness,
  showOrbiter,
  sunPos,
  moonScale,
  targetY,
  dayOffset = 0,
}) {
  const systemRef = React.useRef();
  const initialPosition = React.useRef([0, targetY, 0]);
  const initialScale = React.useRef(moonScale);

  useFrame((_, delta) => {
    if (systemRef.current) {
      const amount = blend(delta, MOTION_SPEED);
      systemRef.current.position.y = THREE.MathUtils.lerp(systemRef.current.position.y, targetY, amount);
      systemRef.current.scale.setScalar(THREE.MathUtils.lerp(systemRef.current.scale.x, moonScale, amount));
    }
  });

  return (
    <group ref={systemRef} position={initialPosition.current} scale={initialScale.current}>
      <MoonCore radius={radius} dayOffset={dayOffset} isMoonEclipse={isMoonEclipse} isMidAutumn={isMidAutumn} />
      <SeamlessSunlitGlow radius={radius} sunPos={sunPos} isMoonEclipse={isMoonEclipse} isMidAutumn={isMidAutumn} />
      <MoonEclipse radius={radius} opacity={isMoonEclipse ? eclipseDarkness : 0} dayOffset={dayOffset} />
      {showOrbiter && (
        <LunarOrbiter
          center={[0, 0, 0]}
          orbitRadius={BASE_MOON_RADIUS + 0.32}
          orbitSpeed={0.35}
          showOrbitTrail={true}
          sunLightPosition={sunPos}
          orbiterScale={1}
        />
      )}
    </group>
  );
}

function MoonFallbackSystem({ radius, moonScale, targetY, dayOffset = 0, isMoonEclipse = false, isMidAutumn = false }) {
  const systemRef = React.useRef();
  const initialPosition = React.useRef([0, targetY, 0]);
  const initialScale = React.useRef(moonScale);
  useFrame((_, delta) => {
    if (systemRef.current) {
      const amount = blend(delta, MOTION_SPEED);
      systemRef.current.position.y = THREE.MathUtils.lerp(systemRef.current.position.y, targetY, amount);
      systemRef.current.scale.setScalar(THREE.MathUtils.lerp(systemRef.current.scale.x, moonScale, amount));
    }
  });
  return (
    <group ref={systemRef} position={initialPosition.current} scale={initialScale.current}>
      <MoonFallback radius={radius} dayOffset={dayOffset} isMoonEclipse={isMoonEclipse} isMidAutumn={isMidAutumn} />
    </group>
  );
}

function SmoothMoonLighting({ sunPos, dirLightColor, dirLightIntensity, pointLightColor, pointLightIntensity, specularColor, specularIntensity, ambientColor, ambientIntensity }) {
  const directionalRef = React.useRef();
  const pointRef = React.useRef();
  const specularRef = React.useRef();
  const ambientRef = React.useRef();
  const initialized = React.useRef(false);
  const sunTarget = React.useMemo(() => new THREE.Vector3(...sunPos), [sunPos[0], sunPos[1], sunPos[2]]);
  const specularTarget = React.useMemo(() => new THREE.Vector3(sunPos[0] * 0.55, sunPos[1] * 0.55, Math.max(sunPos[2] * 0.55, 3)), [sunPos[0], sunPos[1], sunPos[2]]);
  const colors = React.useMemo(() => [dirLightColor, pointLightColor, specularColor, ambientColor].map((color) => new THREE.Color(color)), [dirLightColor, pointLightColor, specularColor, ambientColor]);

  useFrame((_, delta) => {
    if (!directionalRef.current || !pointRef.current || !specularRef.current || !ambientRef.current) return;
    const amount = initialized.current ? blend(delta, PHASE_SPEED) : 1;
    directionalRef.current.position.lerp(sunTarget, amount);
    pointRef.current.position.lerp(sunTarget, amount);
    specularRef.current.position.lerp(specularTarget, amount);
    blendLight(directionalRef.current, dirLightIntensity, colors[0], amount);
    blendLight(pointRef.current, pointLightIntensity, colors[1], amount);
    blendLight(specularRef.current, specularIntensity, colors[2], amount);
    blendLight(ambientRef.current, ambientIntensity, colors[3], amount);
    initialized.current = true;
  });

  return (
    <>
      <directionalLight ref={directionalRef} />
      <pointLight ref={pointRef} decay={0} />
      <pointLight ref={specularRef} decay={0} />
      <ambientLight ref={ambientRef} />
    </>
  );
}

export default function Moon({
  lightPosition = [10, 0, 10],
  moonScale = 1.0,
  isMoonEclipse = false,
  isMidAutumn = false,
  eclipseDarkness = 0.45,
  showOrbiter = true,
  hasHUD = true,
  hudCenterY = 0.70,
  dayOffset = 0,
}) {
  const targetY = hasHUD ? hudCenterY : 0.0;
  const [lx, ly, lz] = lightPosition;
  const sunPos = [lx, ly + targetY, lz];

  // Dynamic light colors and intensities based on astronomical event
  const dirLightColor = isMoonEclipse
    ? '#bf633b' // Filtered warm copper sunlight passing through Earth's atmosphere
    : isMidAutumn
    ? '#fffdf5' // Ultra-bright, crisp warm white (subtly warm, brilliant)
    : '#ffffff';
  const dirLightIntensity = isMoonEclipse ? 4.0 : isMidAutumn ? 11.2 : 6.5;

  const pointLightColor = isMoonEclipse
    ? '#9c4524' // Deep coppery amber
    : isMidAutumn
    ? '#fffaf0' // Radiant ivory-white
    : '#fff8eb';
  const pointLightIntensity = isMoonEclipse ? 3.2 : isMidAutumn ? 9.5 : 5.5;

  const specularColor = isMoonEclipse
    ? '#c9774f' // Copper-peach specular glint
    : isMidAutumn
    ? '#ffffff' // Brilliant diamond specular glint
    : '#eaf3ff';
  const specularIntensity = isMoonEclipse ? 1.6 : isMidAutumn ? 5.2 : 2.8;

  const ambientColor = isMoonEclipse
    ? '#170e0a' // Deep coppery-gray cosmic shadow
    : isMidAutumn
    ? '#1e1c26' // Rich celestial ambient
    : '#121b28';
  const ambientIntensity = isMoonEclipse ? 0.20 : isMidAutumn ? 0.40 : 0.22;

  return (
    <Canvas camera={{ position: [0, 0, 11], fov: 38, far: 10000 }}>
      <SmoothMoonLighting sunPos={sunPos} dirLightColor={dirLightColor} dirLightIntensity={dirLightIntensity} pointLightColor={pointLightColor} pointLightIntensity={pointLightIntensity} specularColor={specularColor} specularIntensity={specularIntensity} ambientColor={ambientColor} ambientIntensity={ambientIntensity} />

      <React.Suspense
        fallback={
          <MoonFallbackSystem
            radius={BASE_MOON_RADIUS}
            moonScale={moonScale}
            targetY={targetY}
            dayOffset={dayOffset}
            isMoonEclipse={isMoonEclipse}
            isMidAutumn={isMidAutumn}
          />
        }
      >
        <MoonSystem
          radius={BASE_MOON_RADIUS}
          isMoonEclipse={isMoonEclipse}
          isMidAutumn={isMidAutumn}
          eclipseDarkness={eclipseDarkness}
          showOrbiter={showOrbiter}
          sunPos={sunPos}
          moonScale={moonScale}
          targetY={targetY}
          dayOffset={dayOffset}
        />
      </React.Suspense>
    </Canvas>
  );
}
