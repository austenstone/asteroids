// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 20); // Set the camera position to (0, 0, 10)
camera.lookAt(scene.position); // Point the camera at the center of the scene
const listener = new THREE.AudioListener();
camera.add(listener);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#game-canvas") });
renderer.setSize(window.innerWidth, window.innerHeight);

// create score
let score = 0;
const scoreElement = document.getElementById("score");

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
spaceship.position.z = -5;
scene.add(spaceship);
const spaceshipSpeed = 0.025;
const spaceshipMaxSpeed = 0.1; // Set the maximum speed to 0.1
const spaceshipVelocity = new THREE.Vector3();

const asteroidInterval = 500;
const asteroidSize = 5;
const asteroidSpeed = 0.015;
const asteroids = [];
const createAsteroid = () => {
  const asteroidGeometry = new THREE.SphereGeometry(asteroidSize, 5, 5);
  const asteroidMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);

  // Generate a random point outside the camera frustum
  const frustum = new THREE.Frustum();
  const cameraViewProjectionMatrix = new THREE.Matrix4();
  cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
  const frustumSize = 50;
  const point = new THREE.Vector3();
  do {
    point.set(
      Math.random() * frustumSize * (Math.random() > 0.5 ? 1 : -1),
      Math.random() * frustumSize * (Math.random() > 0.5 ? 1 : -1),
      0
    );
    console.log(point);
  } while (frustum.containsPoint(point));
  point.x -= asteroidSize * 2;
  point.y -= asteroidSize * 2;

  asteroid.position.copy(point);
  asteroid.position.z = spaceship.position.z;

  // Set the asteroid's velocity to be a vector pointing towards the spaceship
  const direction = new THREE.Vector3();
  direction.subVectors(spaceship.position, asteroid.position).normalize();
  asteroid.velocity = direction.multiplyScalar(asteroidSpeed).setZ(0); // Set the z-component of the velocity to 0

  scene.add(asteroid);
  asteroids.push(asteroid);
}

const bullets = []

const updatePositions = () => {
  bullets.forEach(bullet => bullet.position.add(bullet.velocity));
  spaceship.position.add(spaceshipVelocity);

  if (spaceshipVelocity.length() > spaceshipMaxSpeed) {
    spaceshipVelocity.normalize().multiplyScalar(spaceshipMaxSpeed);
  }
  // Wrap the spaceship around the camera frustum if it goes off the edge
  const frustum = new THREE.Frustum();
  const cameraViewProjectionMatrix = new THREE.Matrix4();
  cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
  if (!frustum.containsPoint(spaceship.position)) {
    spaceship.position.x *= -1;
    spaceship.position.y *= -1;
  }

  asteroids.forEach(asteroid => asteroid.position.add(asteroid.velocity));
}

// Implement collision detection between the spaceship and asteroids
const checkCollisions = () => {
  asteroids.forEach(asteroid => {
    const asteroidGeometry = asteroid.geometry;
    asteroidGeometry.computeBoundingSphere();
    if (!asteroidGeometry.boundingSphere.radius) return;
    const asteroidRadius = asteroidGeometry.boundingSphere.radius;
    const distance = asteroid.position.distanceTo(spaceship.position);
    
    const spaceshipGeometry = spaceship.geometry;
    spaceshipGeometry.computeBoundingSphere();
    if (distance < asteroidRadius + spaceshipGeometry.boundingSphere.radius) {
      beat1Sound.play();
      scene.remove(asteroid);
      gameOver();
    }
  });
  // if (distance1 < 1 || distance2 < 1) {
  //   // Game over logic goes here
  // }
  asteroids.forEach(asteroid => {
    const asteroidGeometry = asteroid.geometry;
    asteroidGeometry.computeBoundingSphere();
    const asteroidRadius = asteroidGeometry.boundingSphere.radius;
    bullets.forEach(bullet => {
      const bulletGeometry = bullet.geometry;
      bulletGeometry.computeBoundingSphere();
      const bulletRadius = bulletGeometry.boundingSphere.radius;
      const distance = bullet.position.distanceTo(asteroid.position);
      if (distance < asteroidRadius + bulletRadius) {     
        beat1Sound.play();
        scene.remove(asteroid);
        scene.remove(bullet);
        asteroids.splice(asteroids.indexOf(asteroid), 1);
        bullets.splice(bullets.indexOf(bullet), 1);
        score += 1;
        console.log('score!', score)
      }
    });
  });
}

const keyState = {};
// implement onkeydown
document.addEventListener("keydown", (e) => keyState[e.key] = true);
document.addEventListener("keyup", (e) => keyState[e.key] = false);

const bulletSpeed = 0.5
let lastShot = 0;
const handleKeyboardInput = () => {  
  if (keyState[" "] && frames - lastShot > 60) {
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

  if (keyState["ArrowUp"]) {
    spaceshipVelocity.x += spaceshipSpeed * Math.sin(-spaceship.rotation.z);
    spaceshipVelocity.y += spaceshipSpeed * Math.cos(-spaceship.rotation.z);
    if (!thrustSound.isPlaying) thrustSound.play();
    thrustSound.setLoop( true );
  } else {
    thrustSound.setLoop( false );
  }
  
  if (keyState["ArrowDown"]) {
    spaceshipVelocity.multiplyScalar(0.95);
  }

  if (keyState["ArrowLeft"]) {
    spaceship.rotation.z += 0.05;
  } else if (keyState["ArrowRight"]) {
    spaceship.rotation.z -= 0.05;
  }
}

const gameOver = () => {
  asteroids.forEach(asteroid => scene.remove(asteroid));
  asteroids.length = 0;
  bullets.forEach(bullet => scene.remove(bullet));
  bullets.length = 0;
  score = 0;
  updateScore();
  spaceship.position.set(0, 0, 0);
  spaceshipVelocity.set(0, 0, 0);
  spaceship.rotation.set(0, 0, 0);
  alert('Game over!');
}

const updateScore = () => {
  scoreElement.innerHTML = score;
}

let frames = 0;

const infoText = document.getElementById('info-text');
// Render the scene and update the game state every frame
const animate = () => {
  requestAnimationFrame(animate);
  if (!document.hasFocus()) {
    infoText.innerHTML = 'Game paused';
    return;
  } else {
    infoText.innerHTML = '';
  }
  if (frames % asteroidInterval === 0) createAsteroid();
  handleKeyboardInput();
  updatePositions();
  checkCollisions();
  updateScore();
  renderer.render(scene, camera);
  ++frames;
}
animate();