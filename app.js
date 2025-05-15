const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const particleCanvas = document.getElementById('particleCanvas');
const pctx = particleCanvas.getContext('2d');

const gestureEmoji = document.getElementById('gestureEmoji');
const gestureText = document.getElementById('gestureText');
const gestureStats = document.getElementById('gestureStats');
const gestureConfidenceSpan = document.getElementById('gestureConfidence');
const toggleCamBtn = document.getElementById('toggleCamBtn');

let videoStream = null;
let cameraOn = true;
let lastGesture = "";
let lastGestureTime = 0;

const gestureCounts = {
  "👍 Thumbs Up": 0,
  "✌️ Peace Sign": 0,
  "✋ Open Hand": 0,
  "🤟 Rock Sign": 0,
  "👌 OK Sign": 0,
  "✍️ Writing Gesture": 0,
  "Unknown gesture": 0,
  "No hand detected": 0,
  "Camera Off": 0,
};

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

async function setupCamera() {
  videoStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 }
  });
  video.srcObject = videoStream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}

async function main() {
  await setupCamera();
  video.play();
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  particleCanvas.width = canvas.width;
  particleCanvas.height = canvas.height;

  async function detect() {
    if (cameraOn) {
      await hands.send({ image: video });
    }
    requestAnimationFrame(detect);
  }

  detect();
  animateParticles();
}

function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    setGesture("No hand detected", "🤚", 0);
    return;
  }

  for (let i = 0; i < results.multiHandLandmarks.length; i++) {
    const landmarks = results.multiHandLandmarks[i];
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 2 });

    const handedness = results.multiHandedness[i];
    const confidence = handedness ? handedness.score : 0;

    const gesture = detectGesture(landmarks);
    setGesture(gesture.text, gesture.emoji, confidence);
  }
}

function setGesture(text, emoji, confidence = 0) {
  const now = Date.now();

  if (text !== lastGesture || now - lastGestureTime > 1500) {
    lastGesture = text;
    lastGestureTime = now;

    gestureText.textContent = text;
    animateEmoji(emoji);
    gestureEmoji.textContent = emoji;

    gestureConfidenceSpan.textContent = `${(confidence * 100).toFixed(1)}%`;

    if (gestureCounts[text] !== undefined) {
      gestureCounts[text]++;
    } else {
      gestureCounts["Unknown gesture"]++;
    }
    updateStats();

    updateBackgroundAndParticles(text);
  }
}

function updateStats() {
  gestureStats.innerHTML =
    `Confidence: <span id="gestureConfidence">${gestureConfidenceSpan.textContent}</span><br/>` +
    `👍: ${gestureCounts["👍 Thumbs Up"]} | ` +
    `✌️: ${gestureCounts["✌️ Peace Sign"]} | ` +
    `✋: ${gestureCounts["✋ Open Hand"]} | ` +
    `🤟: ${gestureCounts["🤟 Rock Sign"]} | ` +
    `👌: ${gestureCounts["👌 OK Sign"]} | ` +
    `✍️: ${gestureCounts["✍️ Writing Gesture"]} | ` +
    `Unknown: ${gestureCounts["Unknown gesture"]}`;
}

function animateEmoji(emoji) {
  gestureEmoji.style.transform = 'scale(1.2)';
  gestureEmoji.style.filter = 'drop-shadow(0 0 10px #00ff00)';
  setTimeout(() => {
    gestureEmoji.style.transform = 'scale(1)';
    gestureEmoji.style.filter = 'none';
  }, 300);
}

function updateBackgroundAndParticles(gesture) {
  switch (gesture) {
    case "👍 Thumbs Up":
      document.body.style.backgroundColor = "#003300";
      break;
    case "✌️ Peace Sign":
      document.body.style.backgroundColor = "#003366";
      break;
    case "✋ Open Hand":
      document.body.style.backgroundColor = "#330000";
      break;
    case "🤟 Rock Sign":
      document.body.style.backgroundColor = "#330033";
      break;
    case "👌 OK Sign":
      document.body.style.backgroundColor = "#003333";
      break;
    case "✍️ Writing Gesture":
      document.body.style.backgroundColor = "#333300";
      break;
    case "No hand detected":
    case "Unknown gesture":
    default:
      document.body.style.backgroundColor = "var(--bg-color)";
      break;
  }
}

function detectGesture(landmarks) {
  const fingerIsExtended = (tip, pip) => landmarks[tip].y < landmarks[pip].y;

  const thumbIsOpen = landmarks[4].x < landmarks[3].x; // simple check for thumb (right hand)
  const indexOpen = fingerIsExtended(8, 6);
  const middleOpen = fingerIsExtended(12, 10);
  const ringOpen = fingerIsExtended(16, 14);
  const pinkyOpen = fingerIsExtended(20, 18);

  const distance = (a, b) => {
    const dx = landmarks[a].x - landmarks[b].x;
    const dy = landmarks[a].y - landmarks[b].y;
    return Math.sqrt(dx*dx + dy*dy);
  };

  if (thumbIsOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    return { text: "👍 Thumbs Up", emoji: "👍" };
  }

  if (!thumbIsOpen && indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
    return { text: "✌️ Peace Sign", emoji: "✌️" };
  }

  if (thumbIsOpen && indexOpen && middleOpen && ringOpen && pinkyOpen) {
    return { text: "✋ Open Hand", emoji: "✋" };
  }

  if (thumbIsOpen && indexOpen && !middleOpen && !ringOpen && pinkyOpen) {
    return { text: "🤟 Rock Sign", emoji: "🤟" };
  }

  if (distance(4, 8) < 0.05 && middleOpen && ringOpen && pinkyOpen) {
    return { text: "👌 OK Sign", emoji: "👌" };
  }

  if (!thumbIsOpen && indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    return { text: "✍️ Writing Gesture", emoji: "✍️" };
  }

  return { text: "Unknown gesture", emoji: "❓" };
}

toggleCamBtn.addEventListener('click', () => {
  if (cameraOn) {
    videoStream.getTracks().forEach(track => track.stop());
    cameraOn = false;
    toggleCamBtn.textContent = "Turn Camera On";
    setGesture("Camera Off", "📷❌", 0);
  } else {
    setupCamera().then(() => {
      cameraOn = true;
      toggleCamBtn.textContent = "Turn Camera Off";
      lastGesture = "";
    });
  }
});

const particles = [];
const maxParticles = 100;

function animateParticles() {
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

  if (lastGesture !== "Camera Off") {
    if (lastGesture !== "No hand detected" && Math.random() < 0.2 && particles.length < maxParticles) {
      particles.push({
        x: Math.random() * particleCanvas.width,
        y: particleCanvas.height + 10,
        size: Math.random() * 4 + 1,
        speedY: Math.random() * 1.5 + 0.5,
        opacity: 1
      });
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.y -= p.speedY;
    p.opacity -= 0.02;
    if (p.opacity <= 0) particles.splice(i, 1);
    else {
      pctx.fillStyle = `rgba(0, 255, 0, ${p.opacity})`;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      pctx.fill();
    }
  }

  requestAnimationFrame(animateParticles);
}

main();
