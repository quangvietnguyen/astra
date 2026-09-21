import * as React from 'react';
import { useFrame } from '@react-three/fiber/native';
import { THREE } from 'expo-three';

// 3D Orbit trajectory helper: sweeps gracefully from behind the Moon (z < 0) to front (z > 0)
function getOrbitPosition(theta, cx, cy, cz, R, alpha, beta) {
  const cosU = Math.cos(theta);
  const sinU = Math.sin(theta);
  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);

  const x = cx + R * (cosU * cosB - sinU * sinA * sinB);
  const y = cy + R * (sinU * cosA);
  const z = cz + R * (cosU * sinB + sinU * sinA * cosB);
  return { x, y, z };
}

/**
 * Volumetric 3D Model of NASA's Lunar Reconnaissance Orbiter (LRO).
 * Maintains a stable 3D presentation angle toward the viewer with a gentle roll,
 * ensuring all faces (bus, solar array, dish, instruments) remain distinctly 3D
 * at every point in the orbit without ever turning into a flat 2D silhouette.
 */
export default function LunarOrbiter({
  center = [0, 0.65, 0],
  orbitRadius = 2.53,
  orbitSpeed = 0.35,
  showOrbitTrail = true,
  sunLightPosition = [10, 2, 7],
  orbiterScale = 1.0,
  scale = 1.0,
}) {
  const orbiterRef = React.useRef();
  const solarGimbalRef = React.useRef();
  const dishGimbalRef = React.useRef();
  const beaconRef = React.useRef();

  const effectiveScale = orbiterScale !== 1.0 ? orbiterScale : scale;

  const [cx, cy, cz] = center;
  const alpha = 55 * (Math.PI / 180); // Inclination pitch
  const beta = 42 * (Math.PI / 180);  // Azimuth tilt ensuring strong Z swing behind-to-front

  // Generate continuous 3D orbit trajectory line points from behind to front
  const orbitPoints = React.useMemo(() => {
    const points = [];
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const { x, y, z } = getOrbitPosition(theta, cx, cy, cz, orbitRadius, alpha, beta);
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, [cx, cy, cz, orbitRadius, alpha, beta]);

  const orbitGeometry = React.useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(orbitPoints);
  }, [orbitPoints]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * orbitSpeed;

    if (orbiterRef.current) {
      // Calculate current 3D position along the orbit
      const { x, y, z } = getOrbitPosition(t, cx, cy, cz, orbitRadius, alpha, beta);
      orbiterRef.current.position.set(x, y, z);

      // Maintain a stable, rich 3D isometric perspective angle toward camera
      // with a gentle cute roll oscillation (prevents edge-on 2D collapse)
      const basePitch = 0.38;
      const baseYaw = 0.52;
      const roll = Math.sin(t * 1.2) * 0.16; // gentle cute roll
      const pitchWobble = Math.cos(t * 0.8) * 0.05;

      orbiterRef.current.rotation.set(basePitch + pitchWobble, baseYaw, roll);
    }

    // Gentle solar panel orientation adjustment in 3D
    if (solarGimbalRef.current) {
      solarGimbalRef.current.rotation.x = Math.sin(t * 0.6) * 0.2;
    }

    // High gain dish tracking
    if (dishGimbalRef.current) {
      dishGimbalRef.current.rotation.z = Math.sin(t * 0.4) * 0.12;
    }

    // Pulsing telemetry status beacon
    if (beaconRef.current) {
      const pulse = (Math.sin(clock.getElapsedTime() * 5) + 1) / 2;
      beaconRef.current.intensity = 0.6 + pulse * 2.2;
    }
  });

  return (
    <group>
      {/* Visual Orbit Trajectory Path (swings from behind to front) */}
      {showOrbitTrail && (
        <line geometry={orbitGeometry}>
          <lineBasicMaterial
            color="#00d2d3"
            transparent
            opacity={0.32}
          />
        </line>
      )}

      {/* Cute, Compact Volumetric 3D NASA LRO Spacecraft (1/3 size, scales with moon) */}
      <group
        ref={orbiterRef}
        scale={[0.016 * effectiveScale, 0.016 * effectiveScale, 0.016 * effectiveScale]}
      >
        {/* 1. Main Avionics Bus: Solid 8-sided faceted prism with gold MLI blanket */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 1.0, 8]} />
          <meshPhongMaterial
            color="#f1c40f"
            specular="#fff6cc"
            shininess={95}
            emissive="#735100"
          />
        </mesh>

        {/* Multi-layer corner thermal radiator plates (thick 3D bevels) */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.15, 0.92, 1.15]} />
          <meshPhongMaterial
            color="#e67e22"
            specular="#f39c12"
            shininess={70}
            emissive="#5e2d00"
          />
        </mesh>

        {/* Top Equipment Deck Plate */}
        <mesh position={[0, 0.54, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.08, 8]} />
          <meshPhongMaterial color="#2d3436" shininess={40} />
        </mesh>

        {/* Bottom Science Instrument Deck Plate */}
        <mesh position={[0, -0.54, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.08, 8]} />
          <meshPhongMaterial color="#2d3436" shininess={40} />
        </mesh>

        {/* Pressurant Tanks on Top Deck (Volumetric 3D spheres) */}
        <mesh position={[0.26, 0.68, 0.2]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshPhongMaterial color="#dcdde1" specular="#ffffff" shininess={100} />
        </mesh>
        <mesh position={[-0.26, 0.68, -0.2]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshPhongMaterial color="#dcdde1" specular="#ffffff" shininess={100} />
        </mesh>

        {/* 2. Heavy Volumetric Solar Array (+X Wing) with solid 3D depth */}
        <group position={[0.65, 0, 0]}>
          {/* Main Solar Wing Boom Arm */}
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.5, 12]} />
            <meshPhongMaterial color="#718093" specular="#ced6e0" shininess={80} />
          </mesh>

          {/* Articulated Solar Panel Gimbal */}
          <group ref={solarGimbalRef} position={[0.5, 0, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.22, 0.22, 0.22]} />
              <meshPhongMaterial color="#2f3640" shininess={50} />
            </mesh>

            {/* Thick Volumetric Solar Panel Frame */}
            <mesh position={[1.1, 0, 0]}>
              <boxGeometry args={[1.7, 0.95, 0.16]} />
              <meshPhongMaterial
                color="#0984e3"
                specular="#74b9ff"
                shininess={90}
                emissive="#063e8a"
              />
            </mesh>

            {/* Gold Thermal Backing Plate on Rear */}
            <mesh position={[1.1, 0, -0.09]}>
              <boxGeometry args={[1.65, 0.9, 0.02]} />
              <meshPhongMaterial color="#e67e22" shininess={70} />
            </mesh>

            {/* Solid Edge Reinforcing Rails */}
            <mesh position={[1.1, 0.49, 0]}>
              <boxGeometry args={[1.72, 0.05, 0.18]} />
              <meshPhongMaterial color="#dcdde1" shininess={80} />
            </mesh>
            <mesh position={[1.1, -0.49, 0]}>
              <boxGeometry args={[1.72, 0.05, 0.18]} />
              <meshPhongMaterial color="#dcdde1" shininess={80} />
            </mesh>
            <mesh position={[1.96, 0, 0]}>
              <boxGeometry args={[0.05, 0.95, 0.18]} />
              <meshPhongMaterial color="#dcdde1" shininess={80} />
            </mesh>
          </group>
        </group>

        {/* 3. Volumetric High-Gain Parabolic Dish Antenna (-X Starboard) */}
        <group position={[-0.65, 0.1, 0]}>
          <mesh position={[-0.3, 0.15, 0]} rotation={[0, 0, -0.6]}>
            <cylinderGeometry args={[0.06, 0.06, 0.65, 12]} />
            <meshPhongMaterial color="#718093" shininess={60} />
          </mesh>

          <group ref={dishGimbalRef} position={[-0.6, 0.4, 0]} rotation={[0.4, -0.6, 0]}>
            <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.18, 12]} />
              <meshPhongMaterial color="#2d3436" shininess={60} />
            </mesh>

            {/* Parabolic Dish Shell with Deep Curvature */}
            <mesh>
              <sphereGeometry args={[0.48, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
              <meshPhongMaterial
                color="#ffffff"
                specular="#f5f6fa"
                shininess={70}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Thick 3D Outer Rim Torus */}
            <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.44, 0.04, 10, 24]} />
              <meshPhongMaterial color="#f1c40f" specular="#ffeaa7" shininess={90} />
            </mesh>

            {/* Sub-Reflector Tripod Feed Horn */}
            <mesh position={[0, 0.28, 0]}>
              <cylinderGeometry args={[0.03, 0.05, 0.32, 8]} />
              <meshPhongMaterial color="#e67e22" shininess={80} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <sphereGeometry args={[0.07, 10, 10]} />
              <meshPhongMaterial color="#f1c40f" specular="#ffffff" shininess={100} />
            </mesh>
          </group>
        </group>

        {/* 4. Science Instrument Deck */}
        {/* LROC Narrow Angle Cameras 1 & 2 */}
        <group position={[0.22, -0.65, 0.18]}>
          <mesh>
            <cylinderGeometry args={[0.13, 0.13, 0.36, 16]} />
            <meshPhongMaterial color="#1e272e" specular="#57606f" shininess={90} />
          </mesh>
          <mesh position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
            <meshPhongMaterial color="#dcdde1" shininess={90} />
          </mesh>
          <mesh position={[0, -0.21, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.02, 16]} />
            <meshPhongMaterial color="#00d2d3" emissive="#00d2d3" emissiveIntensity={0.6} />
          </mesh>
        </group>

        <group position={[-0.22, -0.65, 0.18]}>
          <mesh>
            <cylinderGeometry args={[0.13, 0.13, 0.36, 16]} />
            <meshPhongMaterial color="#1e272e" specular="#57606f" shininess={90} />
          </mesh>
          <mesh position={[0, -0.19, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
            <meshPhongMaterial color="#dcdde1" shininess={90} />
          </mesh>
          <mesh position={[0, -0.21, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.02, 16]} />
            <meshPhongMaterial color="#00d2d3" emissive="#00d2d3" emissiveIntensity={0.6} />
          </mesh>
        </group>

        {/* LOLA Altimeter */}
        <group position={[0, -0.65, -0.2]}>
          <mesh>
            <boxGeometry args={[0.26, 0.3, 0.26]} />
            <meshPhongMaterial color="#341f97" specular="#5f27cd" shininess={80} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 12]} />
            <meshPhongMaterial color="#10ac84" emissive="#10ac84" emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* 5. Four Corner RCS Thruster Pods */}
        {[
          [0.6, 0.35, 0.45, 0.4, 0, 0.4],
          [-0.6, 0.35, 0.45, 0.4, 0, -0.4],
          [0.6, 0.35, -0.45, -0.4, 0, 0.4],
          [-0.6, 0.35, -0.45, -0.4, 0, -0.4],
        ].map(([px, py, pz, rx, ry, rz], idx) => (
          <group key={idx} position={[px, py, pz]} rotation={[rx, ry, rz]}>
            <mesh>
              <boxGeometry args={[0.14, 0.14, 0.14]} />
              <meshPhongMaterial color="#718093" shininess={70} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <coneGeometry args={[0.05, 0.12, 8]} />
              <meshPhongMaterial color="#dcdde1" specular="#ffffff" shininess={90} />
            </mesh>
          </group>
        ))}

        {/* 6. Communication Mast & Pulsing Status Beacon */}
        <group position={[0, 0.65, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
            <meshPhongMaterial color="#dfe6e9" shininess={80} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color="#55efc4" />
          </mesh>
          <pointLight
            ref={beaconRef}
            position={[0, 0.42, 0]}
            color="#55efc4"
            distance={2}
            intensity={1.5}
          />
        </group>
      </group>
    </group>
  );
}
