import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = { "image/jpeg": "image/jpeg", "image/jpg": "image/jpeg", "image/pjpeg": "image/jpeg", "image/png": "image/png", "application/pdf": "application/pdf" };
const BY_EXTENSION = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };

// Same rule as the Spring Boot upload: JPG / JPEG / PNG / PDF, at most 5 MB. Returns the normalised MIME type or an error.
export function checkDocumentFile(file) {
  if (!file) return { error: "Please choose a file." };
  const ext = (file.name || "").split(".").pop().toLowerCase();
  const byExt = BY_EXTENSION[ext];
  const byType = ACCEPTED[(file.type || "").toLowerCase()];
  const type = byType || (!file.type ? byExt : undefined);
  if (!type || (file.name?.includes(".") && byExt !== type)) return { error: "Only JPG, JPEG, PNG or PDF files are accepted." };
  if (file.size > MAX_BYTES) return { error: "Each document must be 5 MB or smaller." };
  if (file.size === 0) return { error: "This file is empty. Please choose another one." };
  return { type };
}

const readAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });

const toJpeg = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

export default function DocumentCapture({ label, value, onChange, required = false }) {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [captured, setCaptured] = useState(null); // photo waiting for "Use photo" / "Retake"
  const [cameras, setCameras] = useState([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [facingMode, setFacingMode] = useState("environment");
  const [error, setError] = useState("");

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  const stopCamera = () => {
    stopTracks();
    setCameraOpen(false);
    setCaptured(null);
  };
  useEffect(() => () => stopTracks(), []);
  // attach the live stream whenever the video element is (re)shown
  useEffect(() => {
    if (cameraOpen && !captured && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen, captured]);

  const acceptFile = async (file) => {
    setError("");
    if (!file) return;
    const { type, error: problem } = checkDocumentFile(file);
    if (problem) {
      if (fileRef.current) fileRef.current.value = "";
      return setError(problem);
    }
    try {
      onChange({ name: file.name, type, size: file.size, data: await readAsDataUrl(file) });
    } catch {
      setError("Could not read this file. Please try again.");
    }
  };

  const startCamera = async (choice) => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) return setError("Camera access requires a supported browser and HTTPS or localhost.");
    setStarting(true);
    try {
      stopTracks();
      const video = choice?.deviceId ? { deviceId: { exact: choice.deviceId } } : { facingMode: { ideal: choice?.facingMode || "environment" } };
      const stream = await navigator.mediaDevices.getUserMedia({ video: { ...video, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream; // also covers switching while the panel is open
      setCaptured(null);
      setCameraOpen(true);
      // device labels are only available after permission is granted
      const all = (await navigator.mediaDevices.enumerateDevices?.()) || [];
      const videos = all.filter((d) => d.kind === "videoinput");
      setCameras(videos);
      const activeId = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
      const at = videos.findIndex((d) => d.deviceId === activeId);
      if (at >= 0) setCameraIndex(at);
    } catch (e) {
      stopTracks();
      setCameraOpen(false);
      setError(
        e?.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access in your browser settings, or upload a file instead."
        : e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "No camera is available on this device. Please upload a file instead."
        : e?.name === "NotReadableError" ? "The camera is being used by another application. Close it and try again."
        : "Could not start the camera. Please try again or upload a file instead."
      );
    } finally {
      setStarting(false);
    }
  };
  const openCamera = () => startCamera({ facingMode: "environment" });
  const switchCamera = () => {
    if (cameras.length > 1) {
      const next = (cameraIndex + 1) % cameras.length;
      setCameraIndex(next);
      return startCamera({ deviceId: cameras[next].deviceId });
    }
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    return startCamera({ facingMode: next });
  };

  const capture = async () => {
    setError("");
    const video = videoRef.current;
    if (!video?.videoWidth) return setError("Camera is still starting. Please try again.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    let blob = null;
    for (const quality of [0.85, 0.7, 0.55]) {
      blob = await toJpeg(canvas, quality);
      if (blob && blob.size <= MAX_BYTES) break;
    }
    if (!blob) return setError("Could not capture the photo. Please try again.");
    if (blob.size > MAX_BYTES) return setError("Captured image is larger than 5 MB. Move closer and capture again.");
    setCaptured({ data: await readAsDataUrl(blob), size: blob.size });
  };
  const retake = () => setCaptured(null);
  const usePhoto = () => {
    if (!captured) return;
    onChange({ name: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-camera.jpg`, type: "image/jpeg", size: captured.size, data: captured.data });
    stopCamera();
  };

  return <div className="field document-capture-field">
    <span>{label}{required ? " *" : ""}</span>
    <div className="document-capture-actions">
      <button type="button" className="delivery-secondary-btn" onClick={() => fileRef.current?.click()}>{value ? "Replace from device" : "Upload from device"}</button>
      <button type="button" className="delivery-secondary-btn" onClick={openCamera} disabled={starting}>{starting && !cameraOpen ? "Starting camera…" : "Use live camera"}</button>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" hidden onChange={(e) => acceptFile(e.target.files?.[0])} />
    </div>
    <small className="delivery-helper">JPG, JPEG, PNG or PDF · Maximum 5 MB per document.</small>
    {value && <div className="document-capture-preview"><span>✓ {value.name}{value.size ? ` · ${(value.size / 1024 / 1024).toFixed(2)} MB` : ""}</span><button type="button" onClick={() => { onChange(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button>{value.type.startsWith("image/") && <img src={value.data} alt={`${label} preview`} />}</div>}
    {cameraOpen && <div className="delivery-camera-panel">
      {captured
        ? <img src={captured.data} alt={`Captured ${label.toLowerCase()}`} />
        : <video ref={videoRef} autoPlay playsInline muted />}
      <div>
        {captured ? <>
          <button type="button" className="delivery-secondary-btn" onClick={usePhoto}>Use photo</button>
          <button type="button" className="delivery-secondary-btn" onClick={retake}>Retake</button>
        </> : <>
          <button type="button" className="delivery-secondary-btn" onClick={capture} disabled={starting}>Capture photo</button>
          <button type="button" className="delivery-secondary-btn" onClick={switchCamera} disabled={starting}>{starting ? "Switching…" : "Switch camera"}</button>
        </>}
        <button type="button" className="delivery-secondary-btn" onClick={stopCamera}>Cancel</button>
      </div>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
