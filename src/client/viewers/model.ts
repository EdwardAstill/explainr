import type * as THREE from "three";

export async function initModelViewers(): Promise<void> {
  const viewers = document.querySelectorAll<HTMLElement>(".model-viewer");
  if (viewers.length === 0) return;

  // Lazy-load Three.js only when needed — Bun splits this into a separate chunk.
  const THREE = await import("three");
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

  for (const viewer of viewers) {
    await initOne(viewer, THREE, STLLoader, GLTFLoader, OrbitControls);
  }
}

async function initOne(
  viewer: HTMLElement,
  THREE: typeof import("three"),
  STLLoader: any,
  GLTFLoader: any,
  OrbitControls: any,
): Promise<void> {
  const src = viewer.dataset.src!;
  const format = viewer.dataset.format as "stl" | "glb" | "gltf";
  const controls = viewer.dataset.controls !== "false";
  const canvas = viewer.querySelector<HTMLCanvasElement>(".model-canvas")!;
  const errorEl = viewer.querySelector<HTMLElement>(".model-error")!;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(
    getComputedStyle(document.documentElement).getPropertyValue("--bg-primary").trim() || "#1a1a2e"
  );

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.01, 10000);
  camera.position.set(0, 0, 5);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 2, 3);
  scene.add(ambientLight, dirLight);

  const orbitControls = controls ? new OrbitControls(camera, canvas) : null;

  function animate(): void {
    requestAnimationFrame(animate);
    orbitControls?.update();
    renderer.render(scene, camera);
  }

  function fitCamera(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const dist = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.5;
    camera.position.copy(center).add(new THREE.Vector3(0, 0, dist));
    camera.lookAt(center);
    if (orbitControls) orbitControls.target.copy(center);
  }

  new ResizeObserver(() => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(canvas);

  try {
    if (format === "stl") {
      const loader = new STLLoader();
      const geometry = await new Promise<any>((res, rej) => loader.load(src, res, undefined, rej));
      const material = new THREE.MeshPhongMaterial({ color: 0x6688cc, specular: 0x444444, shininess: 30 });
      const mesh = new THREE.Mesh(geometry, material);
      geometry.computeVertexNormals();
      scene.add(mesh);
      fitCamera(mesh);
    } else {
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((res, rej) => loader.load(src, res, undefined, rej));
      scene.add(gltf.scene);
      fitCamera(gltf.scene);
    }
  } catch (err: any) {
    errorEl.textContent = `Failed to load model: ${err?.message ?? String(err)}`;
    errorEl.hidden = false;
    return;
  }

  animate();
}

// Guard against Node/Bun test environments that have no DOM
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => { initModelViewers(); });
  document.addEventListener("readrun:remount", () => { initModelViewers(); });
}
