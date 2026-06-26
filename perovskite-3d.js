// 3D Perovskite Structure Visualization using Three.js
// Based on standard ABX3 perovskite cubic structure

function initPerovskite3D(container) {
  if (!window.THREE) {
    console.warn("Three.js not loaded, skipping 3D visualization");
    return;
  }

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f3fb);

  const width = container.clientWidth;
  const height = 320;
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;

  // Add legend
  const legendDiv = document.createElement('div');
  legendDiv.style.position = 'absolute';
  legendDiv.style.bottom = '10px';
  legendDiv.style.left = '10px';
  legendDiv.style.fontSize = '12px';
  legendDiv.style.fontWeight = 'bold';
  legendDiv.style.color = '#333';
  legendDiv.style.backgroundColor = 'rgba(255,255,255,0.9)';
  legendDiv.style.padding = '8px 12px';
  legendDiv.style.borderRadius = '6px';
  legendDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  legendDiv.innerHTML = `
    <div style="display: flex; gap: 12px; align-items: center;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 12px; height: 12px; background: #4ab8e3; border-radius: 50%;"></div>
        <span>A</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 12px; height: 12px; background: #8b0000; border-radius: 50%;"></div>
        <span>X</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 12px; height: 12px; background: #d0d0d0; border: 1px solid #999; border-radius: 50%;"></div>
        <span>B (Pb)</span>
      </div>
    </div>
  `;

  const canvasContainer = document.createElement('div');
  canvasContainer.style.position = 'relative';
  canvasContainer.style.width = '100%';
  canvasContainer.style.height = height + 'px';
  canvasContainer.appendChild(renderer.domElement);
  canvasContainer.appendChild(legendDiv);
  container.appendChild(canvasContainer);

  // Materials
  const aMaterial = new THREE.MeshPhongMaterial({
    color: 0x4ab8e3,  // Cyan - A cations
    shininess: 100,
    emissive: 0x2a8ab8
  });

  const xMaterial = new THREE.MeshPhongMaterial({
    color: 0x8b0000,  // Dark red - X anions
    shininess: 90,
    emissive: 0x600000
  });

  const bMaterial = new THREE.MeshPhongMaterial({
    color: 0xd0d0d0,  // Light gray - B cation (Pb)
    shininess: 120,
    emissive: 0xa0a0a0
  });

  // Lighting
  const light1 = new THREE.DirectionalLight(0xffffff, 1.0);
  light1.position.set(10, 10, 10);
  light1.castShadow = true;
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 0.6);
  light2.position.set(-8, -8, 5);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Create unit cell cube outline (thin white lines)
  const cubeSize = 2.0;
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize));
  const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 1, transparent: true, opacity: 0.4 }));
  scene.add(wireframe);

  // Central B cation (Pb) - LARGER
  const bGeom = new THREE.SphereGeometry(0.40, 32, 32);
  const bSphere = new THREE.Mesh(bGeom, bMaterial);
  bSphere.position.set(0, 0, 0);
  bSphere.castShadow = true;
  scene.add(bSphere);

  // X anion positions (face centers of cube) - 6 anions in octahedral arrangement
  const xPositions = [
    [1.0, 0, 0],      // right
    [-1.0, 0, 0],     // left
    [0, 1.0, 0],      // top
    [0, -1.0, 0],     // bottom
    [0, 0, 1.0],      // front
    [0, 0, -1.0]      // back
  ];

  xPositions.forEach((pos) => {
    const xGeom = new THREE.SphereGeometry(0.32, 32, 32);
    const xSphere = new THREE.Mesh(xGeom, xMaterial);
    xSphere.position.set(pos[0], pos[1], pos[2]);
    xSphere.castShadow = true;
    scene.add(xSphere);

    // Bond from B to X
    const bondGeom = new THREE.BufferGeometry();
    bondGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, pos[0], pos[1], pos[2]]),
        3
      )
    );
    const bondMat = new THREE.LineBasicMaterial({ color: 0xb0b0b0, linewidth: 2 });
    const bond = new THREE.Line(bondGeom, bondMat);
    scene.add(bond);
  });

  // A cation positions (cube corners) - 8 cations
  const aPositions = [
    [1.0, 1.0, 1.0],
    [-1.0, 1.0, 1.0],
    [1.0, -1.0, 1.0],
    [-1.0, -1.0, 1.0],
    [1.0, 1.0, -1.0],
    [-1.0, 1.0, -1.0],
    [1.0, -1.0, -1.0],
    [-1.0, -1.0, -1.0]
  ];

  aPositions.forEach((pos) => {
    const aGeom = new THREE.SphereGeometry(0.28, 32, 32);
    const aMesh = new THREE.Mesh(aGeom, aMaterial);
    aMesh.position.set(pos[0], pos[1], pos[2]);
    aMesh.castShadow = true;
    scene.add(aMesh);
  });

  // Animation loop with smooth rotation
  function animate() {
    requestAnimationFrame(animate);

    // Smooth continuous rotation
    scene.rotation.x += 0.002;
    scene.rotation.y += 0.003;

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
