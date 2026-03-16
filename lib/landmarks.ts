import { PoseLandmarker, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarker: PoseLandmarker | null = null;
let handLandmarker: HandLandmarker | null = null;

export async function initLandmarkers() {
  if (poseLandmarker && handLandmarker) return { poseLandmarker, handLandmarker };

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numPoses: 1
  });

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });

  return { poseLandmarker, handLandmarker };
}

export async function extractLandmarks(videoElement: HTMLVideoElement) {
  if (!poseLandmarker || !handLandmarker) {
    await initLandmarkers();
  }

  if (!poseLandmarker || !handLandmarker) return null;

  const startTimeMs = performance.now();
  
  const poseResults = poseLandmarker.detectForVideo(videoElement, startTimeMs);
  const handResults = handLandmarker.detectForVideo(videoElement, startTimeMs);

  return {
    pose: poseResults.landmarks,
    hands: handResults.landmarks,
    timestamp: startTimeMs
  };
}
