import * as React from 'react';
import { TextureLoader, THREE } from 'expo-three';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import moonImg from '../../assets/moon.jpeg';
import LunarOrbiter from './LunarOrbiter';

const BASE_MOON_RADIUS = 2.05;

// Slow, majestic continuous rotation (1 full revolution every ~377 seconds / ~6.3 minutes)
// Gives a graceful, visible celestial rotation while remaining calm and serene
export const SLOW_ROTATION_DIVISOR = 60;
export const LUNAR_ROTATION_PER_DAY_RAD = (2 * Math.PI) / 27.321661;

function MoonCore({ radius, dayOffset = 0, isMoonEclipse = false, isMidAutumn = false }) {
  const ref = React.useRef();
  const map = useLoader(TextureLoader, moonImg);
  useFrame(({ clock }) => {
    if (ref.current) {
      // Slow continuous rotation + astronomical day offset step
      ref.current.rotation.y = -(
        clock.getElapsedTime() / SLOW_ROTATION_DIVISOR +
        dayOffset * LUNAR_ROTATION_PER_DAY_RAD
      );
    }
  });

  const materialProps = React.useMemo(() => {
    if (isMoonEclipse) {
      return {
        color: '#c23616',
        roughness: 0.70,
        metalness: 0.04,
        emissive: '#5c0606',
        emissiveIntensity: 0.55,
      };
    }
    if (isMidAutumn) {
      return {
        color: '#fff2cc',
        roughness: 0.55,
        metalness: 0.02,
        emissive: '#d48806',
        emissiveIntensity: 0.35,
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

  return (
    <mesh ref={ref} visible castShadow position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 64, 32]} />
      {/* Physically realistic lunar regolith: adapts color & bloom dynamically for Eclipse and Mid-Autumn */}
      <meshStandardMaterial
        map={map}
        {...materialProps}
      />
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

  const sunDir = React.useMemo(() => {
    const [sx, sy, sz] = sunPos;
    const v = new THREE.Vector3(sx, sy, sz);
    if (v.lengthSq() > 0.001) v.normalize();
    return v;
  }, [sunPos]);

  const targetGlowHex = isMoonEclipse
    ? '#ff3b30'
    : isMidAutumn
    ? '#ffd32a'
    : '#d8ebff';

  const uniforms = React.useMemo(
    () => ({
      uSunDirView: { value: new THREE.Vector3(1, 0, 0) },
      uGlowColor: { value: new THREE.Color(targetGlowHex) },
    }),
    []
  );

  React.useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uGlowColor.value.set(targetGlowHex);
    }
  }, [targetGlowHex]);

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

function MoonFallback({ radius, dayOffset = 0, isMoonEclipse = false, isMidAutumn = false }) {
  const ref = React.useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = -(
        clock.getElapsedTime() / SLOW_ROTATION_DIVISOR +
        dayOffset * LUNAR_ROTATION_PER_DAY_RAD
      );
    }
  });
  const fallbackColor = isMoonEclipse ? '#c23616' : isMidAutumn ? '#ffeaa7' : '#94a3b8';
  return (
    <mesh ref={ref} visible position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshStandardMaterial color={fallbackColor} roughness={0.7} />
    </mesh>
  );
}

function MoonEclipse({ radius, opacity = 0.45, dayOffset = 0 }) {
  const ref = React.useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = -(
        clock.getElapsedTime() / SLOW_ROTATION_DIVISOR +
        dayOffset * LUNAR_ROTATION_PER_DAY_RAD
      );
    }
  });
  return (
    <mesh visible ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[radius + 0.02, 64, 32]} />
      <meshPhongMaterial
        color="#e74c3c"
        emissive="#78110b"
        specular="#ff7675"
        shininess={15}
        transparent={true}
        opacity={opacity}
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
      <MoonCore radius={radius} dayOffset={dayOffset} isMoonEclipse={isMoonEclipse} isMidAutumn={isMidAutumn} />
      <SeamlessSunlitGlow radius={radius} sunPos={sunPos} isMoonEclipse={isMoonEclipse} isMidAutumn={isMidAutumn} />
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

function MoonFallbackSystem({ radius, targetY, dayOffset = 0, isMoonEclipse = false, isMidAutumn = false }) {
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
      <MoonFallback radius={radius} dayOffset={dayOffset} isMoonEclipse={isMoonEclipse} isMidAutumn={isMidAutumn} />
    </group>
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
  dayOffset = 0,
}) {
  const targetY = hasHUD ? 0.70 : 0.0;
  const [lx, ly, lz] = lightPosition;
  const sunPos = [lx, ly + targetY, lz];

  const currentRadius = BASE_MOON_RADIUS * moonScale;
  const currentOrbitRadius = currentRadius + 0.32 * moonScale;

  // Dynamic light colors and intensities based on astronomical event
  const dirLightColor = isMoonEclipse ? '#ff4d4d' : isMidAutumn ? '#fff6cc' : '#ffffff';
  const dirLightIntensity = isMoonEclipse ? 4.8 : isMidAutumn ? 9.5 : 6.5;

  const pointLightColor = isMoonEclipse ? '#d63031' : isMidAutumn ? '#ffeaa7' : '#fff8eb';
  const pointLightIntensity = isMoonEclipse ? 4.0 : isMidAutumn ? 8.2 : 5.5;

  const specularColor = isMoonEclipse ? '#ff7675' : isMidAutumn ? '#fffae6' : '#eaf3ff';
  const specularIntensity = isMoonEclipse ? 2.0 : isMidAutumn ? 4.2 : 2.8;

  const ambientColor = isMoonEclipse ? '#300a0a' : isMidAutumn ? '#1c1c28' : '#121b28';
  const ambientIntensity = isMoonEclipse ? 0.35 : isMidAutumn ? 0.32 : 0.22;

  return (
    <Canvas camera={{ position: [0, 0, 11], fov: 38, far: 10000 }}>
      {/* 1. Ultra-brilliant direct solar beam from exact astronomical vector */}
      <directionalLight position={sunPos} intensity={dirLightIntensity} color={dirLightColor} />
      <pointLight position={sunPos} intensity={pointLightIntensity} decay={0} color={pointLightColor} />

      {/* 2. Direct solar specular & sub-solar core illumination */}
      <pointLight
        position={[sunPos[0] * 0.55, sunPos[1] * 0.55, Math.max(sunPos[2] * 0.55, 3.0)]}
        intensity={specularIntensity}
        decay={0}
        color={specularColor}
      />

      {/* 3. Cosmic Earthshine & ambient light */}
      <ambientLight color={ambientColor} intensity={ambientIntensity} />

      <React.Suspense
        fallback={
          <MoonFallbackSystem
            radius={currentRadius}
            targetY={targetY}
            dayOffset={dayOffset}
            isMoonEclipse={isMoonEclipse}
            isMidAutumn={isMidAutumn}
          />
        }
      >
        <MoonSystem
          radius={currentRadius}
          isMoonEclipse={isMoonEclipse}
          isMidAutumn={isMidAutumn}
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
