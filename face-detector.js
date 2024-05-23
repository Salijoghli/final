const buttonTogglePause = document.getElementById("togglePause");
const video = document.getElementById("video");
const app = document.getElementById("app");
const loadingDiv = document.getElementById("loading");
let isPaused = false;
let loading = true;
const state = {
  drawLandmarks: false,
  drawExpressions: false,
  drawAgeGender: false,
};

const buttons = [
  { id: "toggleLandmarks", state: "drawLandmarks" },
  { id: "toggleExpressions", state: "drawExpressions" },
  { id: "toggleAgeGender", state: "drawAgeGender" },
];

const toggleButtons = (state) => {
  buttons.forEach((button) => {
    document.getElementById(button.id).disabled = state;
  });
};

buttons.forEach((button) => {
  const element = document.getElementById(button.id);
  element.addEventListener("click", () => {
    state[button.state] = !state[button.state];
  });
});

buttonTogglePause.addEventListener("click", () => {
  isPaused = !isPaused;
  if (isPaused) {
    video.pause();
    buttonTogglePause.textContent = "Resume";
    toggleButtons(true);
  } else {
    video.play();
    buttonTogglePause.textContent = "Pause";
    toggleButtons(false);
  }
});

const startVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = stream;
    app.style.display = "block";
    loading = false;
  } catch (err) {
    console.error("Error accessing camera:", err);
  }
};

const loadModels = async () => {
  try {
    loadingDiv.style.display = "block";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
      faceapi.nets.ageGenderNet.loadFromUri("./models"),
      faceapi.nets.faceExpressionNet.loadFromUri("./models"),
    ]);
    console.log("Recording");
    startVideo();
  } catch (err) {
    console.error("Failed to load models:", err);
  } finally {
    loadingDiv.style.display = "none";
  }
};

const faceDetectionLoop = async (canvas, displaySize) => {
  if (isPaused) return;
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions()
    .withAgeAndGender();
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  faceapi.draw.drawDetections(canvas, resizedDetections);
  state.drawLandmarks &&
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
  state.drawExpressions &&
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
  state.drawAgeGender &&
    resizedDetections.forEach((detection) => {
      const box = detection.detection.box;
      let textVerticalPosition = box.y + box.height - 10;
      const ageGenderText =
        Math.round(detection.age) + " year old " + detection.gender;
      canvas.getContext("2d").font = "16px Arial";
      canvas.getContext("2d").fillStyle = "white";
      canvas
        .getContext("2d")
        .fillText(ageGenderText, box.x + 3, textVerticalPosition);
    });
};

const handleFaceDetection = () => {
  const canvas = faceapi.createCanvasFromMedia(video, {
    willReadFrequently: true,
  });
  document.getElementById("app").insertAdjacentElement("afterend", canvas);
  const appRect = document.getElementById("app").getBoundingClientRect();
  const canvasTop = appRect.bottom + 10;
  canvas.style.position = "absolute";
  canvas.style.top = canvasTop + "px";
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  const animate = () => {
    requestAnimationFrame(animate);
    faceDetectionLoop(canvas, displaySize);
  };
  animate();
};

loadModels();

video.addEventListener("play", handleFaceDetection);
