const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 20);
camera.lookAt(scene.position);
const listener = new THREE.AudioListener();
camera.add(listener);
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

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#game-canvas") });
renderer.setSize(window.innerWidth, window.innerHeight);

let frames = 0;
let score = 0;
const scoreElement = document.getElementById("score");
const infoText = document.getElementById('info-text');
const keyState = {};
const touchState = {
  left: false,
  right: false,
  up: false,
  down: false
};

document.addEventListener("keydown", (e) => keyState[e.key] = true);
document.addEventListener("keyup", (e) => keyState[e.key] = false);
const computeTouch = (touchX, touchY, state) => {
  if (touchX < window.innerWidth / 2) {
    touchState.left = state;
  } else {
    touchState.right = state;
  }
  if (touchY < window.innerHeight / 2) {
    touchState.up = state;
  } else {
    touchState.down = state;
  }
}
document.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touches = e.touches;
  for (let i = 0; i < touches.length; i++) {
    computeTouch(touches[i].clientX, touches[i].clientY, true);
  }
}, {passive: false});

document.addEventListener('touchend', (e) => {
  e.preventDefault();
  const touches = e.touches;
  for (let i = 0; i < touches.length; i++) {
    computeTouch(touches[i].clientX, touches[i].clientY, false);
  }
}, {passive: false});

// Create the spaceship model and add it to the scene
const spaceshipGeometry = new THREE.BufferGeometry();
spaceshipGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
  0, 1, 0,
  -0.5, -0.5, 0,
  0.5, -0.5, 0
]), 3));
spaceshipGeometry.setIndex([0, 1, 2]);
spaceshipGeometry.computeVertexNormals();
const spaceshipMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const spaceship = new THREE.Mesh(spaceshipGeometry, spaceshipMaterial);
spaceship.position.z = -5;
scene.add(spaceship);
const spaceshipSpeed = 0.025;
const spaceshipMaxSpeed = 0.1; // Set the maximum speed to 0.1
const spaceshipVelocity = new THREE.Vector3();

const thrusterGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
const thrusterMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
thruster.position.set(0, -1, 0);
spaceship.add(thruster);

let asteroidInterval = 500;
const asteroidLargeSize = 5;
const asteroidMediumSize = 3.5;
const asteroidSmallSize = 1;
const asteroidSpeed = 0.015;
const asteroids = [];
const createAsteroid = (size, x, y, z, velocity) => {
  const asteroidGeometry = new THREE.SphereGeometry(size, 5, 5);
  const asteroidEdges = new THREE.EdgesGeometry(asteroidGeometry);
  const asteroidMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const asteroid = new THREE.LineSegments(asteroidEdges, asteroidMaterial);

  let point;
  if (!x || !y || !z) {
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
    const frustumSize = 50;
    point = new THREE.Vector3();
    do {
      point.set(
        Math.random() * frustumSize * (Math.random() > 0.5 ? 1 : -1),
        Math.random() * frustumSize * (Math.random() > 0.5 ? 1 : -1),
        0
      );
    } while (frustum.containsPoint(point));
    point.x -= size * 2;
    point.y -= size * 2;
  } else {
    point = new THREE.Vector3(x, y, z);
  }
  asteroid.position.copy(point);
  asteroid.position.z = spaceship.position.z;
  asteroid.size = size;

  if (velocity) {
    asteroid.velocity = velocity;
  } else {
    const direction = new THREE.Vector3();
    direction.subVectors(spaceship.position, asteroid.position).normalize();
    asteroid.velocity = direction.multiplyScalar(asteroidSpeed).setZ(0); // Set the z-component of the velocity to 0  
  }
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
        const radiusFloor = Math.floor(asteroidRadius);
        if (asteroid.size === asteroidSmallSize) {
          score += 1;
        } if (asteroid.size === asteroidMediumSize) {
          createAsteroid(asteroidSmallSize, asteroid.position.x + 1, asteroid.position.y + 1, asteroid.position.z, asteroid.velocity);
          createAsteroid(asteroidSmallSize, asteroid.position.x - 1, asteroid.position.y - 1, asteroid.position.z, asteroid.velocity);
        } else if (asteroid.size === asteroidLargeSize) {
          createAsteroid(asteroidMediumSize, asteroid.position.x + 1, asteroid.position.y + 1, asteroid.position.z, asteroid.velocity);
          createAsteroid(asteroidMediumSize, asteroid.position.x - 1, asteroid.position.y - 1, asteroid.position.z, asteroid.velocity);
        }
        console.log(radiusFloor, asteroidLargeSize)
      }
    });
  });
}

const rotationSpeed = 0.025;
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
    bullet.velocity = new THREE.Vector3(
      Math.sin(-spaceship.rotation.z),
      Math.cos(-spaceship.rotation.z),
      0
    ).multiplyScalar(bulletSpeed);
    fireSound.play();
    scene.add(bullet);
    bullets.push(bullet);
  }

  if (keyState["ArrowUp"] || keyState["w"] || touchState.up) {
    spaceshipVelocity.x += spaceshipSpeed * Math.sin(-spaceship.rotation.z);
    spaceshipVelocity.y += spaceshipSpeed * Math.cos(-spaceship.rotation.z);
    if (!thrustSound.isPlaying) thrustSound.play();
    thrustSound.setLoop(true);
    spaceship.add(thruster);
  } else {
    thrustSound.setLoop(false);
    spaceship.remove(thruster);
  }

  if (keyState["ArrowDown"] || keyState["s"] || touchState.down) {
    spaceshipVelocity.multiplyScalar(0.95);
  }

  if (keyState["ArrowLeft"] || keyState["a"] || touchState.left) {
    spaceship.rotation.z += rotationSpeed;
  }

  if (keyState["ArrowRight"] || keyState["d"] || touchState.right) {
    spaceship.rotation.z -= rotationSpeed;
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
  asteroidInterval = 500;
}

const updateScore = () => {
  scoreElement.innerHTML = score;
}

setInterval(() => asteroidInterval = Math.floor(asteroidInterval * 0.95), 5000);
// Render the scene and update the game state every frame
const animate = () => {
  requestAnimationFrame(animate);
  if (!document.hasFocus()) {
    infoText.innerHTML = 'Game paused';
    return;
  } else {
    infoText.innerHTML = '';
  }
  if (frames % asteroidInterval === 0) {
    const random = Math.random();
    console.log(random)
    if (random > 0.7) {
      createAsteroid(asteroidLargeSize);
    } else if (random > 0.3) {
      createAsteroid(asteroidMediumSize);
    } else if (random > 0) {
      createAsteroid(asteroidSmallSize);
    }
  }
  handleKeyboardInput();
  updatePositions();
  checkCollisions();
  updateScore();
  renderer.render(scene, camera);
  ++frames;
}
animate();