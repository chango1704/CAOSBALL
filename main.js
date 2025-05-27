import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Escena, cámara y renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 5); // Posición relativa detrás de la bola

// Añadir la cámara a un Group que usaremos como "holder"
const cameraHolder = new THREE.Group();
cameraHolder.add(camera);
scene.add(cameraHolder);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local');
document.body.appendChild(VRButton.createButton(renderer));

// Luz
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(0, 10, 10);
scene.add(pointLight);

// Bola del jugador
const playerColor = 0x0000ff;
const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: playerColor });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0, -2, 0);
scene.add(ball);
const initialY = ball.position.y;

// Mostrar distancia
const distanceDisplay = document.createElement('div');
distanceDisplay.style.position = 'fixed';
distanceDisplay.style.top = '11px';
distanceDisplay.style.left = '10px';
distanceDisplay.style.color = 'white';
distanceDisplay.style.fontSize = '20px';
distanceDisplay.style.fontFamily = 'Arial';
distanceDisplay.style.zIndex = '10';
document.body.appendChild(distanceDisplay);

// Obstáculos
let obstacles = [];
let maxObstacleY = 14;
const obstacleColors = [0xff0000, 0x00ff00, 0xffff00];
const obstacleSpacing = 4;
const obstacleCountPerBatch = 3;

function createObstacleAtY(y) {
  const speed = 0.02 + Math.random() * 0.03;
  const types = ['horizontalBounce', 'circular', 'rotating', 'zigzag'];
  const type = types[Math.floor(Math.random() * types.length)];
  const color = obstacleColors[Math.floor(Math.random() * obstacleColors.length)];
  let geometry, xStart;

  if (type === 'rotating') {
    const cornerX = 4;
    xStart = Math.random() < 0.5 ? -cornerX : cornerX;
    geometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 20);
  } else {
    xStart = Math.random() * 8 - 4;
    geometry = new THREE.BoxGeometry(type === 'zigzag' ? 1.2 : 1.5, 0.5, 0.5);
  }

  const material = new THREE.MeshStandardMaterial({ color });
  const obstacle = new THREE.Mesh(geometry, material);
  obstacle.position.set(xStart, y, 0);
  obstacle.userData = { speed, color, type, xStart, yStart: y, angle: 0 };
  scene.add(obstacle);
  obstacles.push(obstacle);
}

function createInitialObstacles() {
  for (let i = 0; i < 5; i++) {
    let y = i * obstacleSpacing + 2;
    createObstacleAtY(y);
  }
  maxObstacleY = 5 * obstacleSpacing + 2;
}
createInitialObstacles();

function createDecorations() {
  const decoMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const cylinderSpacing = 4;
  const cylinderHeight = 0.8;
  const columnXOffset = 5.5;

  for (let i = -20; i <= 500; i += cylinderSpacing) {
    const left = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, cylinderHeight, 12), decoMaterial);
    left.position.set(-columnXOffset, i, 0);
    scene.add(left);

    const right = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, cylinderHeight, 12), decoMaterial);
    right.position.set(columnXOffset, i, 0);
    scene.add(right);
  }

  for (let i = 0; i < 1000; i++) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const x = (Math.random() - 0.4) * 100;
    const y = (Math.random() - 0.4) * 800;
    const z = (Math.random() - 0.4) * 100;
    star.position.set(x, y, z);
    scene.add(star);
  }
}
createDecorations();

function generateNewObstaclesAboveBall() {
  while (ball.position.y + 10 > maxObstacleY) {
    for (let i = 0; i < obstacleCountPerBatch; i++) {
      createObstacleAtY(maxObstacleY + i * obstacleSpacing);
    }
    maxObstacleY += obstacleCountPerBatch * obstacleSpacing;
  }
}

function removeObstaclesBelow(yLimit) {
  obstacles = obstacles.filter(obs => {
    if (obs.position.y < yLimit) {
      scene.remove(obs);
      return false;
    }
    return true;
  });
}

let velocityY = 0;
const gravity = -0.01;
let started = false;
let gameOver = false;
let startTime = 0;
let elapsedTime = 0;

const music = new Audio('cancionxd.mp3');
music.loop = true;
music.volume = 0.5;

// Game Over UI
const gameOverContainer = document.createElement('div');
gameOverContainer.style.position = 'fixed';
gameOverContainer.style.top = '50%';
gameOverContainer.style.left = '50%';
gameOverContainer.style.transform = 'translate(-50%, -50%)';
gameOverContainer.style.zIndex = '100';
gameOverContainer.style.textAlign = 'center';
gameOverContainer.style.color = 'white';
gameOverContainer.style.fontFamily = 'Arial, sans-serif';
gameOverContainer.style.display = 'none';

const gameOverImg = document.createElement('img');
gameOverImg.src = 'gameover.jpg';
gameOverImg.style.width = '300px';
gameOverImg.style.display = 'block';
gameOverImg.style.margin = '0 auto';

const timeText = document.createElement('p');
timeText.style.fontSize = '24px';
timeText.style.marginTop = '20px';

gameOverContainer.appendChild(gameOverImg);
gameOverContainer.appendChild(timeText);
document.body.appendChild(gameOverContainer);

function showGameOver() {
  gameOver = true;
  started = false;
  elapsedTime = performance.now() - startTime;
  const seconds = (elapsedTime / 1000).toFixed(2);
  const distance = (ball.position.y - initialY).toFixed(2);
  timeText.innerHTML = `Duraste jugando: ${seconds} segundos<br>Distancia recorrida: ${distance} unidades`;
  gameOverContainer.style.display = 'block';
  music.pause();
  music.currentTime = 0;
}

function resetGame() {
  ball.position.set(0, -2, 0);
  velocityY = 0;
  cameraHolder.position.set(0, 0, 0);
  obstacles.forEach(obs => scene.remove(obs));
  obstacles = [];
  createInitialObstacles();
  gameOverContainer.style.display = 'none';
  gameOver = false;
  started = false;
  elapsedTime = 0;
  music.pause();
  music.currentTime = 0;
}

function startGame() {
  if (!started && !gameOver) {
    started = true;
    velocityY = 0.2;
    startTime = performance.now();
    music.play().catch(() => {});
  } else if (started && !gameOver) {
    velocityY = 0.2;
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    if (gameOver) {
      resetGame();
      startGame();
    } else {
      startGame();
    }
  }
});
document.addEventListener('click', startGame);

function checkCollisions() {
  const ballBox = new THREE.Box3().setFromObject(ball);
  for (const obs of obstacles) {
    const obsBox = new THREE.Box3().setFromObject(obs);
    if (ballBox.intersectsBox(obsBox)) {
      if (obs.userData.color !== playerColor) {
        showGameOver();
        break;
      }
    }
  }
}

// ⬇ ANIMATE con cámara detrás
function animate() {
  if (started && !gameOver) {
    velocityY += gravity;
    ball.position.y += velocityY;

    if (ball.position.y < -6) {
      showGameOver();
    }

    const currentDistance = (ball.position.y - initialY).toFixed(2);
    distanceDisplay.textContent = `Distancia: ${currentDistance} unidades`;

    checkCollisions();
    generateNewObstaclesAboveBall();

    obstacles.forEach(obs => {
      switch (obs.userData.type) {
        case 'horizontalBounce':
          obs.position.x += obs.userData.speed;
          if (obs.position.x > 5 || obs.position.x < -5) obs.userData.speed *= -1;
          break;
        case 'circular':
          obs.userData.angle += obs.userData.speed;
          obs.position.x = obs.userData.xStart + Math.cos(obs.userData.angle) * 3;
          obs.position.y = obs.userData.yStart;
          break;
        case 'rotating':
          obs.rotation.z += obs.userData.speed;
          break;
        case 'zigzag':
          obs.userData.angle += obs.userData.speed;
          obs.position.x = obs.userData.xStart + Math.sin(obs.userData.angle) * 2;
          obs.position.y = obs.userData.yStart + Math.abs(Math.sin(obs.userData.angle * 0.5)) * 1;
          break;
      }
    });

    removeObstaclesBelow(ball.position.y - 10);

    // 💡 Actualizar posición del "cameraHolder" detrás de la bola
    cameraHolder.position.set(ball.position.x, ball.position.y + 1, ball.position.z + 5);
  }

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// OrbitControls opcional para desarrollo fuera de VR
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
