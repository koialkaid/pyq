"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type SceneProps = {
  running: boolean;
};

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    float waveA = sin(position.x * 0.42 + uTime * 0.52) * 0.085;
    float waveB = sin(position.y * 0.31 - uTime * 0.38 + position.x * 0.17) * 0.055;
    float waveC = sin((position.x - position.y) * 0.18 + uTime * 0.26) * 0.035;
    vWave = waveA + waveB + waveC;
    displaced.z += vWave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float ring(vec2 uv, vec2 center, float phase) {
    float distanceToCenter = length((uv - center) * vec2(1.0, 1.34));
    float radius = phase * 0.16;
    float edge = smoothstep(0.009, 0.0, abs(distanceToCenter - radius));
    return edge * (1.0 - phase) * step(distanceToCenter, 0.22);
  }

  void main() {
    float slowNoise = snoise(vUv * 5.4 + vec2(uTime * 0.025, -uTime * 0.018));
    float fineNoise = snoise(vUv * 18.0 + vec2(-uTime * 0.055, uTime * 0.028));
    float lineNoise = smoothstep(0.48, 0.7, abs(fineNoise));
    float depth = smoothstep(0.0, 1.0, vUv.y);

    vec3 deepColor = vec3(0.055, 0.19, 0.205);
    vec3 shallowColor = vec3(0.25, 0.47, 0.455);
    vec3 mistColor = vec3(0.67, 0.76, 0.72);
    vec3 color = mix(deepColor, shallowColor, depth * 0.7 + slowNoise * 0.09);
    color = mix(color, mistColor, lineNoise * 0.12 + max(vWave, 0.0) * 0.4);

    float phaseA = fract(uTime * 0.19);
    float phaseB = fract(uTime * 0.15 + 0.42);
    float ripples = ring(vUv, vec2(0.24, 0.36), phaseA)
      + ring(vUv, vec2(0.72, 0.62), phaseB)
      + ring(vUv, vec2(0.54, 0.23), fract(phaseA + 0.58));
    color += ripples * vec3(0.22, 0.28, 0.26);

    float edgeFade = smoothstep(0.0, 0.09, vUv.x) * smoothstep(0.0, 0.09, 1.0 - vUv.x);
    gl_FragColor = vec4(color, (0.7 + slowNoise * 0.04) * edgeFade);
  }
`;

const bedFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * 14.0;
    float bandsA = sin(uv.x + sin(uv.y * 0.8 + uTime * 0.34));
    float bandsB = sin(uv.y * 1.15 - uTime * 0.27 + sin(uv.x * 0.6));
    float caustic = smoothstep(1.25, 1.72, bandsA + bandsB);
    vec3 base = mix(vec3(0.055, 0.16, 0.155), vec3(0.19, 0.32, 0.285), vUv.y * 0.55);
    gl_FragColor = vec4(base + caustic * vec3(0.055, 0.082, 0.068), 1.0);
  }
`;

const rainVertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aTip;
  attribute float aSpeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float cycle = mod(position.y + uTime * aSpeed, 12.0);
    p.y = 8.2 - cycle - aTip * 0.7;
    p.x -= cycle * 0.08 + aTip * 0.08;
    vAlpha = 0.18 + aSpeed * 0.035;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const rainFragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(0.82, 0.9, 0.88, vAlpha);
  }
`;

const koiVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    float tailMask = pow(1.0 - uv.y, 2.2);
    p.x += sin(uTime * 5.2 + uPhase + uv.y * 5.6) * 0.18 * tailMask;
    p.y += cos(uTime * 2.1 + uPhase) * 0.018;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const koiFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uTexture, vUv);
    if (color.a < 0.025) discard;
    color.rgb = mix(color.rgb, vec3(0.12, 0.31, 0.3), 0.12);
    color.a *= 0.82;
    gl_FragColor = color;
  }
`;

function WaterSurface() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.12} renderOrder={4}>
      <planeGeometry args={[30, 22, 128, 96]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PondBed() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.92}>
      <planeGeometry args={[31, 23]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={"varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"}
        fragmentShader={bedFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
      />
    </mesh>
  );
}

function RainField() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const count = 340;
    const positions = new Float32Array(count * 2 * 3);
    const tips = new Float32Array(count * 2);
    const speeds = new Float32Array(count * 2);

    for (let index = 0; index < count; index += 1) {
      const seed = Math.sin((index + 1) * 91.345) * 43758.5453;
      const normalized = seed - Math.floor(seed);
      const seedB = Math.sin((index + 7) * 41.173) * 15731.743;
      const normalizedB = seedB - Math.floor(seedB);
      const x = (normalized - 0.5) * 30;
      const y = normalizedB * 12;
      const z = ((index * 0.61803398875) % 1 - 0.5) * 22;
      const speed = 2.5 + ((index * 0.371) % 1) * 2.2;

      for (let tip = 0; tip < 2; tip += 1) {
        const offset = (index * 2 + tip) * 3;
        positions[offset] = x;
        positions[offset + 1] = y;
        positions[offset + 2] = z;
        tips[index * 2 + tip] = tip;
        speeds[index * 2 + tip] = speed;
      }
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("aTip", new THREE.BufferAttribute(tips, 1));
    buffer.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    return buffer;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <lineSegments geometry={geometry} renderOrder={8}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={rainVertexShader}
        fragmentShader={rainFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

const ripplePositions: Array<[number, number, number, number]> = [
  [-5.8, 0.18, -2.8, 0.1], [3.9, 0.18, 2.1, 0.8], [-1.4, 0.18, 3.6, 1.4],
  [6.2, 0.18, -1.2, 2.1], [-7.1, 0.18, 3.9, 2.8], [1.2, 0.18, -4.2, 3.5],
  [7.8, 0.18, 4.2, 4.1], [-3.6, 0.18, 1.2, 4.8], [0.2, 0.18, 0.2, 5.5],
];

function SurfaceRipples() {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    refs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const phase = ((time + ripplePositions[index][3]) % 6.2) / 6.2;
      const scale = 0.12 + phase * 1.85;
      mesh.scale.set(scale, scale, scale);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.sin(phase * Math.PI) * 0.105;
    });
  });

  return ripplePositions.map(([x, y, z], index) => (
    <mesh
      key={`${x}-${z}`}
      ref={(mesh) => { refs.current[index] = mesh; }}
      position={[x, y, z]}
      rotation-x={-Math.PI / 2}
      renderOrder={6}
    >
      <ringGeometry args={[0.3, 0.325, 64]} />
      <meshBasicMaterial color="#d7e5df" transparent opacity={0} depthWrite={false} />
    </mesh>
  ));
}

type KoiProps = {
  offset: number;
  radiusX: number;
  radiusZ: number;
  speed: number;
  scale: number;
  color: string;
  patch: string;
  depth: number;
  centerX: number;
  centerZ: number;
};

function createKoiTexture(baseColor: string, patchColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.shadowColor = "rgba(7, 24, 22, 0.32)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 10;

  context.globalAlpha = 0.7;
  context.fillStyle = baseColor;
  context.beginPath();
  context.moveTo(160, 500);
  context.bezierCurveTo(106, 526, 58, 584, 70, 618);
  context.bezierCurveTo(116, 604, 145, 572, 160, 538);
  context.bezierCurveTo(176, 572, 204, 604, 250, 618);
  context.bezierCurveTo(261, 584, 214, 526, 160, 500);
  context.fill();

  context.globalAlpha = 0.54;
  context.beginPath();
  context.moveTo(112, 244);
  context.bezierCurveTo(48, 252, 35, 318, 52, 347);
  context.bezierCurveTo(82, 326, 103, 296, 126, 267);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(208, 244);
  context.bezierCurveTo(272, 252, 285, 318, 268, 347);
  context.bezierCurveTo(238, 326, 217, 296, 194, 267);
  context.closePath();
  context.fill();

  context.globalAlpha = 1;
  const bodyGradient = context.createLinearGradient(80, 70, 235, 505);
  bodyGradient.addColorStop(0, "#fff9ed");
  bodyGradient.addColorStop(0.18, baseColor);
  bodyGradient.addColorStop(0.78, baseColor);
  bodyGradient.addColorStop(1, "rgba(210, 216, 202, 0.9)");
  context.fillStyle = bodyGradient;
  context.beginPath();
  context.moveTo(160, 48);
  context.bezierCurveTo(97, 47, 74, 112, 76, 212);
  context.bezierCurveTo(78, 326, 110, 438, 142, 508);
  context.bezierCurveTo(151, 527, 169, 527, 178, 508);
  context.bezierCurveTo(210, 438, 242, 326, 244, 212);
  context.bezierCurveTo(246, 112, 223, 47, 160, 48);
  context.closePath();
  context.fill();
  context.restore();

  context.save();
  context.globalAlpha = 0.92;
  context.fillStyle = patchColor;
  context.beginPath();
  context.ellipse(137, 126, 48, 62, -0.32, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(190, 279, 57, 78, 0.28, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(127, 411, 39, 57, -0.25, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.14;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 10;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(122, 92);
  context.bezierCurveTo(93, 205, 109, 361, 144, 464);
  context.stroke();

  context.globalAlpha = 1;
  context.fillStyle = "#101a18";
  context.beginPath();
  context.arc(112, 91, 6, 0, Math.PI * 2);
  context.arc(208, 91, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.82)";
  context.beginPath();
  context.arc(110, 89, 1.8, 0, Math.PI * 2);
  context.arc(206, 89, 1.8, 0, Math.PI * 2);
  context.fill();
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function Koi({ offset, radiusX, radiusZ, speed, scale, color, patch, depth, centerX, centerZ }: KoiProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useMemo(() => createKoiTexture(color, patch), [color, patch]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const angle = time * speed + offset;
    const nextAngle = angle + 0.015;
    const x = centerX + Math.cos(angle) * radiusX + Math.sin(angle * 0.63 + offset) * 0.45;
    const z = centerZ + Math.sin(angle) * radiusZ + Math.cos(angle * 0.47) * 0.3;
    const nextX = centerX + Math.cos(nextAngle) * radiusX + Math.sin(nextAngle * 0.63 + offset) * 0.45;
    const nextZ = centerZ + Math.sin(nextAngle) * radiusZ + Math.cos(nextAngle * 0.47) * 0.3;

    if (groupRef.current) {
      groupRef.current.position.set(x, depth + Math.sin(angle * 2.0) * 0.035, z);
      groupRef.current.rotation.y = Math.atan2(nextX - x, nextZ - z) + Math.PI;
      groupRef.current.rotation.z = Math.sin(angle * 1.7) * 0.035;
    }
    if (materialRef.current) materialRef.current.uniforms.uTime.value = time;
  });

  return (
    <group ref={groupRef} scale={scale} renderOrder={2}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry args={[1.65, 3.25, 18, 42]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={koiVertexShader}
          fragmentShader={koiFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uPhase: { value: offset },
            uTexture: { value: texture },
          }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function PondEdges() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const stones = useMemo(() => {
    const result: Array<{ position: [number, number, number]; scale: [number, number, number]; rotation: number }> = [];
    for (let index = 0; index < 34; index += 1) {
      const horizontal = index < 18;
      const lane = horizontal ? index : index - 18;
      const side = index % 2 === 0 ? -1 : 1;
      const position: [number, number, number] = horizontal
        ? [-13.2 + lane * 1.55, -0.08, side * 8.35]
        : [side * 12.4, -0.08, -7.1 + lane * 0.95];
      const variation = 0.62 + ((index * 0.37) % 1) * 0.28;
      result.push({
        position,
        scale: [variation * 1.2, variation * 0.58, variation],
        rotation: (index * 1.713) % Math.PI,
      });
    }
    return result;
  }, []);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();
    stones.forEach((stone, index) => {
      position.set(...stone.position);
      scale.set(...stone.scale);
      euler.set(0.08 * Math.sin(index), stone.rotation, 0.05 * Math.cos(index));
      quaternion.setFromEuler(euler);
      matrix.compose(position, quaternion, scale);
      ref.current?.setMatrixAt(index, matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [stones]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, stones.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#4c5c55" roughness={0.28} metalness={0.04} />
    </instancedMesh>
  );
}

function PondScene({ running }: SceneProps) {
  return (
    <>
      <color attach="background" args={[running ? "#718b86" : "#7f918c"]} />
      <fog attach="fog" args={["#6f817d", 9, 24]} />
      <ambientLight intensity={1.15} color="#d8e1dd" />
      <directionalLight position={[4, 9, 3]} intensity={2.1} color="#e7ece7" castShadow />
      <directionalLight position={[-7, 4, -5]} intensity={0.5} color="#789a92" />
      <PondBed />
      <Koi offset={0.3} radiusX={2.0} radiusZ={1.7} speed={0.12} scale={0.72} color="#f1e8d7" patch="#c44c31" depth={-0.42} centerX={-3.5} centerZ={-1.1} />
      <Koi offset={2.1} radiusX={1.7} radiusZ={1.8} speed={-0.1} scale={0.58} color="#e8ded0" patch="#2a3230" depth={-0.52} centerX={2.0} centerZ={-0.6} />
      <Koi offset={4.1} radiusX={2.5} radiusZ={1.6} speed={0.08} scale={0.52} color="#d9b64c" patch="#f0e7cf" depth={-0.58} centerX={-0.5} centerZ={-2.1} />
      <Koi offset={5.5} radiusX={1.5} radiusZ={1.3} speed={-0.16} scale={0.44} color="#f0e6d9" patch="#d36a3d" depth={-0.33} centerX={0} centerZ={0.2} />
      <WaterSurface />
      <SurfaceRipples />
      <PondEdges />
      <RainField />
    </>
  );
}

export default function RainGardenScene({ running }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 8, 8.8], rotation: [-0.78, 0, 0], fov: 42, near: 0.1, far: 80 }}
      dpr={[1, 1.65]}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
      }}
      aria-label="雨中的锦鲤水庭"
      data-rain-garden-canvas
    >
      <PondScene running={running} />
    </Canvas>
  );
}
