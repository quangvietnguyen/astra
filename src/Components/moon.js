import * as React from 'react';
import { TextureLoader, THREE } from 'expo-three';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import moonConfig from '../data/moonConfig.json';
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

function MoonCore({ radius, dayOffset = 0, appearance = moonConfig.appearance.regular }) {
  const ref = React.useRef();
  const materialRef = React.useRef();
  const initialized = React.useRef(false);
  const map = useLoader(TextureLoader, moonImg);
  useSmoothLunarRotation(ref, dayOffset);

  const materialProps = appearance;

  const targetColor = React.useMemo(() => new THREE.Color(materialProps.moonColor), [materialProps.moonColor]);
  const targetEmissive = React.useMemo(() => new THREE.Color(materialProps.moonEmissive), [materialProps.moonEmissive]);
  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const amount = initialized.current ? blend(delta, PHASE_SPEED) : 1;
    material.color.lerp(targetColor, amount);
    material.emissive.lerp(targetEmissive, amount);
    material.roughness = THREE.MathUtils.lerp(material.roughness, materialProps.moonRoughness, amount);
    material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, materialProps.moonEmissiveIntensity, amount);
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
function SeamlessSunlitGlow({ radius, sunPos, appearance = moonConfig.appearance.regular }) {
  const matRef = React.useRef();
  const currentSunDir = React.useRef(new THREE.Vector3());
  const initialized = React.useRef(false);

  const sunDir = React.useMemo(() => {
    const [sx, sy, sz] = sunPos;
    const v = new THREE.Vector3(sx, sy, sz);
    if (v.lengthSq() > 0.001) v.normalize();
    return v;
  }, [sunPos]);

  const targetGlowHex = appearance.glowColor;

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

function MoonFallback({ radius, dayOffset = 0, appearance = moonConfig.appearance.regular }) {
  const ref = React.useRef();
  useSmoothLunarRotation(ref, dayOffset);
  return (
    <mesh ref={ref} visible position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshStandardMaterial color={appearance.moonColor} roughness={appearance.moonRoughness} />
    </mesh>
  );
}

function MoonEclipse({ radius, appearance, dayOffset = 0 }) {
  const ref = React.useRef();
  const materialRef = React.useRef();
  const initialized = React.useRef(false);
  const regular = moonConfig.appearance.regular;
  const overlayColor = React.useMemo(() => new THREE.Color(appearance.eclipseOverlayColor || regular.eclipseOverlayColor), [appearance, regular.eclipseOverlayColor]);
  const overlayEmissive = React.useMemo(() => new THREE.Color(appearance.eclipseOverlayEmissive || regular.eclipseOverlayEmissive), [appearance, regular.eclipseOverlayEmissive]);
  const overlaySpecular = React.useMemo(() => new THREE.Color(appearance.eclipseOverlaySpecular || regular.eclipseOverlaySpecular), [appearance, regular.eclipseOverlaySpecular]);
  const targetOpacity = appearance.eclipseOverlayOpacity || 0;
  useSmoothLunarRotation(ref, dayOffset);
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    const amount = initialized.current ? blend(delta, PHASE_SPEED) : 1;
    materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, targetOpacity, amount);
    materialRef.current.color.lerp(overlayColor, amount);
    materialRef.current.emissive.lerp(overlayEmissive, amount);
    materialRef.current.specular.lerp(overlaySpecular, amount);
    materialRef.current.shininess = THREE.MathUtils.lerp(materialRef.current.shininess, appearance.eclipseOverlayShininess || regular.eclipseOverlayShininess, amount);
    initialized.current = true;
  });
  return (
    <mesh visible ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[radius + 0.02, 64, 32]} />
      <meshPhongMaterial
        ref={materialRef}
        transparent={true}
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

function MoonSystem({
  radius,
  appearance,
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
      <MoonCore radius={radius} dayOffset={dayOffset} appearance={appearance} />
      <SeamlessSunlitGlow radius={radius} sunPos={sunPos} appearance={appearance} />
      <MoonEclipse radius={radius} appearance={appearance} dayOffset={dayOffset} />
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

function MoonFallbackSystem({ radius, moonScale, targetY, dayOffset = 0, appearance }) {
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
      <MoonFallback radius={radius} dayOffset={dayOffset} appearance={appearance} />
    </group>
  );
}

function SmoothMoonLighting({ sunPos, appearance }) {
  const directionalRef = React.useRef();
  const pointRef = React.useRef();
  const specularRef = React.useRef();
  const ambientRef = React.useRef();
  const initialized = React.useRef(false);
  const sunTarget = React.useMemo(() => new THREE.Vector3(...sunPos), [sunPos[0], sunPos[1], sunPos[2]]);
  const specularTarget = React.useMemo(() => new THREE.Vector3(sunPos[0] * 0.55, sunPos[1] * 0.55, Math.max(sunPos[2] * 0.55, 3)), [sunPos[0], sunPos[1], sunPos[2]]);
  const colors = React.useMemo(() => [appearance.directionalLightColor, appearance.pointLightColor, appearance.specularColor, appearance.ambientColor].map((color) => new THREE.Color(color)), [appearance]);

  useFrame((_, delta) => {
    if (!directionalRef.current || !pointRef.current || !specularRef.current || !ambientRef.current) return;
    const amount = initialized.current ? blend(delta, PHASE_SPEED) : 1;
    directionalRef.current.position.lerp(sunTarget, amount);
    pointRef.current.position.lerp(sunTarget, amount);
    specularRef.current.position.lerp(specularTarget, amount);
    blendLight(directionalRef.current, appearance.directionalLightIntensity, colors[0], amount);
    blendLight(pointRef.current, appearance.pointLightIntensity, colors[1], amount);
    blendLight(specularRef.current, appearance.specularIntensity, colors[2], amount);
    blendLight(ambientRef.current, appearance.ambientIntensity, colors[3], amount);
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
  eclipseEvent = null,
  showOrbiter = true,
  hasHUD = true,
  hudCenterY = 0.70,
  dayOffset = 0,
}) {
  const targetY = hasHUD ? hudCenterY : 0.0;
  const [lx, ly, lz] = lightPosition;
  const sunPos = [lx, ly + targetY, lz];
  const eventType = eclipseEvent?.type || (isMoonEclipse ? 'total' : null);
  const appearance = eventType
    ? moonConfig.appearance.eclipse[eventType] || moonConfig.appearance.eclipse.total
    : isMidAutumn ? moonConfig.appearance.midAutumn : moonConfig.appearance.regular;

  return (
    <Canvas camera={{ position: [0, 0, 11], fov: 38, far: 10000 }}>
      <SmoothMoonLighting sunPos={sunPos} appearance={appearance} />

      <React.Suspense
        fallback={
          <MoonFallbackSystem
            radius={BASE_MOON_RADIUS}
            moonScale={moonScale}
            targetY={targetY}
            dayOffset={dayOffset}
            appearance={appearance}
          />
        }
      >
        <MoonSystem
          radius={BASE_MOON_RADIUS}
          appearance={appearance}
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
