// 3D Perovskite Structure Visualization using Three.js

function initPerovskite3D(container) {
  if (!window.THREE) {
    console.warn("Three.js not loaded, skipping 3D visualization");
    return;
  }

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f3fb);

  const width = container.clientWidth;
  const height = 300;
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 4;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Materials
  const pbMaterial = new THREE.MeshPhongMaterial({ color: 0xf97316, shininess: 100 });
  const halMaterial = new THREE.MeshPhongMaterial({ color: 0x06b6d4, shininess: 80 });
  const aMaterial = new THREE.MeshPhongMaterial({ color: 0x7c3aed, shininess: 60, wireframe: false });

  // Lighting
  const light1 = new THREE.DirectionalLight(0xffffff, 0.9);
  light1.position.set(5, 5, 5);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
  light2.position.set(-5, -5, 3);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Central Pb ion
  const pbGeom = new THREE.SphereGeometry(0.35, 32, 32);
  const pbSphere = new THREE.Mesh(pbGeom, pbMaterial);
  pbSphere.position.set(0, 0, 0);
  scene.add(pbSphere);

  // X anion positions (octahedral) - relative to Pb center
  const xPositions = [
    [0, 1.2, 0],     // top
    [0, -1.2, 0],    // bottom
    [1.2, 0, 0],     // right
    [-1.2, 0, 0],    // left
    [0, 0, 1.2],     // front
    [0, 0, -1.2]     // back
  ];

  const xSpheres = [];
  xPositions.forEach((pos) => {
    const xGeom = new THREE.SphereGeometry(0.28, 32, 32);
    const xSphere = new THREE.Mesh(xGeom, halMaterial);
    xSphere.position.set(pos[0], pos[1], pos[2]);
    scene.add(xSphere);
    xSpheres.push(xSphere);

    // Bond from Pb to X
    const bondGeom = new THREE.BufferGeometry();
    bondGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, pos[0], pos[1], pos[2]]),
        3
      )
    );
    const bondMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 });
    const bond = new THREE.Line(bondGeom, bondMat);
    scene.add(bond);
  });

  // A cation positions (cube corners)
  const aPositions = [
    [1.5, 1.5, 1.5],
    [-1.5, 1.5, 1.5],
    [1.5, -1.5, 1.5],
    [-1.5, -1.5, 1.5],
    [1.5, 1.5, -1.5],
    [-1.5, 1.5, -1.5],
    [1.5, -1.5, -1.5],
    [-1.5, -1.5, -1.5]
  ];

  aPositions.forEach((pos) => {
    const aGeom = new THREE.SphereGeometry(0.25, 32, 32);
    const aMesh = new THREE.Mesh(aGeom, aMaterial);
    aMesh.position.set(pos[0], pos[1], pos[2]);
    aMesh.userData.opacity = 0.7;
    scene.add(aMesh);
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Rotate the entire structure
    scene.rotation.x += 0.003;
    scene.rotation.y += 0.005;

    renderer.render(scene, camera);
  }

  // Handle window resize
  function onWindowResize() {
    const newWidth = container.clientWidth;
    camera.aspect = newWidth / height;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, height);
  }

  window.addEventListener('resize', onWindowResize);

  animate();

  return renderer;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Will be called from app.js when setup page renders
});
