const app = document.querySelector("#app");
const button = document.createElement("button");
button.textContent = "Toggle Landmarks";
let drawLandmarks = true;

button.addEventListener("click", () => {
  drawLandmarks = !drawLandmarks;
});

const video = document.createElement("video");
video.setAttribute("autoplay", "");
video.setAttribute("muted", "");
video.width = 720;
video.height = 560;

app.appendChild(button);
app.appendChild(video);

const startVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    console.error("Error accessing camera:", err);
  }
};

const loadModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
      faceapi.nets.faceExpressionNet.loadFromUri("./models"),
      faceapi.nets.ageGenderNet.loadFromUri("./models"),
    ]);
    console.log("Recording");
    startVideo();
  } catch (err) {
    console.error("Failed to load models:", err);
  }
};

const faceDetectionLoop = async (canvas, displaySize) => {
  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptors()
    .withAgeAndGender();
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  faceapi.draw.drawDetections(canvas, resizedDetections);
  drawLandmarks && faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
  faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
  resizedDetections.forEach((detection) => {
    const box = detection.detection.box;
    const drawBox = new faceapi.draw.DrawBox(box, {
      label: Math.round(detection.age) + " year old " + detection.gender,
    });
    drawBox.draw(canvas);
  });
};

const handleFaceDetection = () => {
  const canvas = faceapi.createCanvasFromMedia(video, {
    willReadFrequently: true,
  });
  document.body.append(canvas);
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

// const image = await faceapi.fetchImage("/images/guga/guga.jpg");

// // displaying the fetched image content
// const myImg = document.getElementById("myImg");
// myImg.src = image.src;
