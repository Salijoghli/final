const app = document.querySelector("#app");
const button = document.createElement("button");
button.textContent = "Toggle Landmarks";
let drawLandmarks = false;

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
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
    ]);
    console.log("Recording");
    startVideo();
  } catch (err) {
    console.error("Failed to load models:", err);
  }
};

const handleFaceRecognition = async (detection, canvas) => {
  const labeledFaceDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
  const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

  const box = detection.detection.box;
  const drawBox = new faceapi.draw.DrawBox(box, {
    label: bestMatch.toString(),
  });
  drawBox.draw(canvas);
};

const faceDetectionLoop = async (canvas, displaySize) => {
  const detections = await faceapi
    .detectAllFaces(video)
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
    handleFaceRecognition(detection, canvas);
  });
};

const loadLabeledImages = async () => {
  const labels = ["guga"];
  const labeledFaceDescriptors = [];

  for (const label of labels) {
    const descriptions = [];
    for (let i = 1; i <= 4; i++) {
      const img = await faceapi.fetchImage(
        `https://raw.githubusercontent.com/Salijoghli/final/main/images//${label}/${label} (${i}).jpg`
      );
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();
      descriptions.push(detections.descriptor);
    }
    labeledFaceDescriptors.push(
      new faceapi.LabeledFaceDescriptors(label, descriptions)
    );
  }

  return labeledFaceDescriptors;
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

await loadModels();

video.addEventListener("play", handleFaceDetection);
