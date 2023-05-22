// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 20); // Set the camera position to (0, 0, 10)
camera.lookAt(scene.position); // Point the camera at the center of the scene
const listener = new THREE.AudioListener();
camera.add(listener);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#game-canvas") });
renderer.setSize(window.innerWidth, window.innerHeight);

// Create the spaceship model and add it to the scene
const spaceshipGeometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
  0, 1, 0,
  -0.5, -0.5, 0,
  0.5, -0.5, 0
]);
spaceshipGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
spaceshipGeometry.setIndex([0, 1, 2]);
spaceshipGeometry.computeVertexNormals();
const spaceshipMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const spaceship = new THREE.Mesh(spaceshipGeometry, spaceshipMaterial);
spaceship.position.z = -5; // Move the spaceship away from the center of the scene
scene.add(spaceship);
const spaceshipSpeed = 0.025;
const spaceshipVelocity = new THREE.Vector3();

// const asteroidGeometry = new THREE.SphereGeometry(1, 32, 32);
// const asteroidMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
// const asteroid1 = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
// const asteroid2 = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
// scene.add(asteroid1);
// scene.add(asteroid2);
// const asteroidSpeed = 0.005;
// const asteroid1Velocity = new THREE.Vector3(0, 0, asteroidSpeed);
// const asteroid2Velocity = new THREE.Vector3(0, 0, -asteroidSpeed);

const bullets = []

const updatePositions = () => {
  bullets.forEach(bullet => bullet.position.add(bullet.velocity));
  spaceship.position.add(spaceshipVelocity);

  // Restrict the spaceship to the x and y axes
  spaceship.position.z = -5;

  // Wrap the spaceship around the camera frustum if it goes off the edge
  const frustum = new THREE.Frustum();
  const cameraViewProjectionMatrix = new THREE.Matrix4();
  camera.updateMatrixWorld(); // Make sure the camera matrix is updated
  cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
  if (!frustum.containsPoint(spaceship.position)) {
    spaceship.position.x *= -1;
    spaceship.position.y *= -1;
  }

  // Add friction force to slow down the spaceship
  spaceshipVelocity.multiplyScalar(0.95);

  // asteroid1.position.add(asteroid1Velocity);
  // asteroid2.position.add(asteroid2Velocity);
}

// Implement collision detection between the spaceship and asteroids
const checkCollisions = () => {
  // const distance1 = spaceship.position.distanceTo(asteroid1.position);
  // const distance2 = spaceship.position.distanceTo(asteroid2.position);
  // if (distance1 < 1 || distance2 < 1) {
  //   // Game over logic goes here
  // }
}

// Add sound effects and music to the game using Three.js's audio capabilities
const fireSound = new THREE.Audio(listener);
const thrustSound = new THREE.Audio(listener);
const bangSmallSound = new THREE.Audio(listener);
const bangMediumSound = new THREE.Audio(listener);
const bangLargeSound = new THREE.Audio(listener);
const beat1Sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load("sounds/bangSmall.wav", (buffer) => bangSmallSound.setBuffer(buffer));
audioLoader.load("sounds/bangMedium.wav", (buffer) => bangMediumSound.setBuffer(buffer));
audioLoader.load("sounds/bangLarge.wav", (buffer) => bangLargeSound.setBuffer(buffer));
audioLoader.load("sounds/beat1.wav", (buffer) => beat1Sound.setBuffer(buffer));
audioLoader.load("sounds/fire.wav", (buffer) => fireSound.setBuffer(buffer));
audioLoader.load("sounds/thrust.wav", (buffer) => thrustSound.setBuffer(buffer));

const keyState = {};
// implement onkeydown
document.addEventListener("keydown", (e) => keyState[e.key] = true);
document.addEventListener("keyup", (e) => keyState[e.key] = false);

const bulletSpeed = 0.5
let lastShot = 0;
const handleKeyboardInput = () => {
  const shoot = () => {
    if (frames - lastShot < 60) return;
    lastShot = frames;
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(spaceship.position);
    bullet.quaternion.copy(spaceship.quaternion);
    bullet.velocity = new THREE.Vector3(Math.sin(-spaceship.rotation.z), Math.cos(-spaceship.rotation.z), 0).multiplyScalar(bulletSpeed);

    fireSound.play();
    scene.add(bullet);
    bullets.push(bullet);
  }
  
  if (keyState[" "]) {
    shoot();
  }

  if (keyState["ArrowUp"]) {
    // move the spaceship in the direction it's facing
    spaceshipVelocity.x += spaceshipSpeed * Math.sin(-spaceship.rotation.z);
    spaceshipVelocity.y += spaceshipSpeed * Math.cos(-spaceship.rotation.z);
    if (!thrustSound.isPlaying) thrustSound.play();
    thrustSound.setLoop( true );
  } else {
    thrustSound.setLoop( false );
  }
  
  if (keyState["ArrowDown"]) {
    spaceshipVelocity.y = -spaceshipSpeed;
  }

  if (keyState["ArrowLeft"]) {
    spaceship.rotation.z += 0.05;
  } else if (keyState["ArrowRight"]) {
    spaceship.rotation.z -= 0.05;
  }
}

let frames = 0;
// Render the scene and update the game state every frame
const animate = () => {
  requestAnimationFrame(animate);
  handleKeyboardInput();
  updatePositions();
  checkCollisions();
  renderer.render(scene, camera);
  ++frames;
}
animate();