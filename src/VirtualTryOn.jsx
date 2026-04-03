import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as faceapi from 'face-api.js';
import { Model as GlassesModel } from './Glasses';
import { Upload, Camera } from 'lucide-react';
import './VirtualTryOn.css';

// ─────────────────────────────────────────────────────────────────────────────
// CDN for face-api.js model weights (tiny detector + 68-pt landmarks)
// These models are small (< 1 MB combined) and load fast from jsdelivr.
// ─────────────────────────────────────────────────────────────────────────────
const MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Average several landmark points by index into a single {x, y, z:0} point */
function avgPts(pts, ...indices) {
    let sx = 0, sy = 0;
    for (const i of indices) { sx += pts[i].x; sy += pts[i].y; }
    return { x: sx / indices.length, y: sy / indices.length, z: 0 };
}

/**
 * face-api.js gives 68-point landmarks in PIXEL coordinates.
 * This normalises them to [0,1] then maps them to the sparse keys that
 * placeGlasses() expects (matching the same slots MediaPipe used).
 *
 * 68-pt layout (image coords, left = image left):
 *   0–16  jawline   17–21 left brow   22–26 right brow
 *   27–30 nose bridge  31–35 nose base
 *   36–41 left eye    42–47 right eye    48–67 mouth
 */
function buildLandmarkMap(positions, W, H) {
    const n = positions.map(p => ({ x: p.x / W, y: p.y / H, z: 0 }));
    return {
        168: n[27],                               // nose bridge (saddle point)
        33:  avgPts(n, 36, 37, 38, 39, 40, 41),  // left eye centre
        263: avgPts(n, 42, 43, 44, 45, 46, 47),  // right eye centre
        10:  avgPts(n, 19, 24),                   // forehead approx (brow peaks)
        152: n[8],                                // chin bottom
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — FACE-TRACKING LOGIC (inside the R3F Canvas)
// Uses face-api.js on the CPU → zero GPU conflict with Three.js/WebGL
// ─────────────────────────────────────────────────────────────────────────────
function FaceTracker({ videoRef, imageRef, glassesConfig, mode, imageSrc, onFaceStatus, retryKey }) {
    const { viewport } = useThree();
    const glassesRef   = useRef();
    const landmarksRef = useRef(null); // written async, read every frame
    const [isLoaded, setIsLoaded] = useState(false);

    // ── Load tiny-face-detector + 68-pt landmark model (CDN, ~900 KB total) ─
    useEffect(() => {
        let mounted = true;
        
        async function initFaceAPI() {
            try {
                // VERY IMPORTANT: Force TensorFlow.js (inside face-api) to use
                // the CPU backend. This absolutely guarantees it will never 
                // create a conflicting WebGL context and crash Three.js.
                await faceapi.tf.setBackend('cpu');
                await faceapi.tf.ready();
                
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
                ]);
                
                if (mounted) setIsLoaded(true);
            } catch (err) {
                console.error('[FaceTracker] Model load failed:', err);
            }
        }
        
        initFaceAPI();

        return () => { mounted = false; };
    }, []);

    // ── VIDEO: async detection loop (~12 fps) — runs entirely on CPU ────────
    useEffect(() => {
        if (!isLoaded || mode !== 'video') return;

        let stopped = false;
        landmarksRef.current = null;

        (async function detectLoop() {
            while (!stopped) {
                const video = videoRef.current;
                if (video && video.readyState >= 2) {
                    try {
                        const det = await faceapi
                            .detectSingleFace(
                                video,
                                new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
                            )
                            .withFaceLandmarks();

                        if (!stopped) {
                            landmarksRef.current = det
                                ? buildLandmarkMap(
                                    det.landmarks.positions,
                                    video.videoWidth,
                                    video.videoHeight
                                )
                                : null;
                        }
                    } catch { /* skip frame on transient error */ }
                }
                // ≈ 12 fps detection (visually smooth since 3D renders at 60 fps)
                await new Promise(r => setTimeout(r, 80));
            }
        })();

        return () => { stopped = true; landmarksRef.current = null; };
    }, [isLoaded, mode]);

    // ── IMAGE: single detection per uploaded image ───────────────────────────
    useEffect(() => {
        if (!isLoaded || mode !== 'image' || !imageSrc) return;

        landmarksRef.current = null;
        const img = imageRef.current;
        if (!img) return;

        const runDetect = () => {
            // Very aggressive threshold on retry
            const threshold = retryKey > 0 ? 0.15 : 0.3;
            
            faceapi
                .detectSingleFace(
                    img,
                    new faceapi.TinyFaceDetectorOptions({ scoreThreshold: threshold })
                )
                .withFaceLandmarks()
                .then(det => {
                    landmarksRef.current = det
                        ? buildLandmarkMap(
                            det.landmarks.positions,
                            img.naturalWidth,
                            img.naturalHeight
                        )
                        : null;
                })
                .catch(err => console.error('[FaceTracker] Image detect failed:', err));
        };

        // Image might already be decoded (browser cache) or still loading
        if (img.complete) { runDetect(); }
        else { img.addEventListener('load', runDetect, { once: true }); }
    }, [isLoaded, mode, imageSrc, retryKey]);

    // ── Every frame: read landmark result → drive 3D glasses group ──────────
    useFrame(() => {
        if (!glassesRef.current) return;
        if (!isLoaded) return; // don't call onFaceStatus until models are ready

        if (landmarksRef.current) {
            onFaceStatus?.(true);
            placeGlasses(landmarksRef.current, glassesRef.current, viewport, mode);
            glassesRef.current.visible = true;
        } else {
            onFaceStatus?.(false);
            glassesRef.current.visible = false;
        }
    });

    return (
        <group ref={glassesRef} visible={false}>
            <GlassesModel config={glassesConfig} />
        </group>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure function: normalised landmark map → Three.js position / scale / rotation
// All calibration knobs are constants here — easy to tune without touching logic.
// ─────────────────────────────────────────────────────────────────────────────
function placeGlasses(landmarks, group, viewport, mode) {
    const noseBridge = landmarks[168];
    const leftEye    = landmarks[33];
    const rightEye   = landmarks[263];
    const topFace    = landmarks[10];
    const bottomFace = landmarks[152];

    // ── Calibration ──────────────────────────────────────────────────────── ─
    const BASE_SCALE = 0.15;   // overall glasses size multiplier
    const OFFSET_X   = 0;      // horizontal nudge  (positive = right)
    const OFFSET_Y   = -0.15;  // vertical nudge    (negative = down)
    const OFFSET_Z   = 1.0;    // depth nudge       (higher = closer to camera)
    const FLIP_X     = Math.PI;// flip model upright (handles point backwards correctly)
    const FLIP_Y     = 0;
    const FLIP_Z     = 0;

    // CSS mirrors the video feed; we compensate the X math only in video mode
    const mirror = mode === 'video' ? -1 : 1;

    // ── Position ──────────────────────────────────────────────────────────────
    const x = (noseBridge.x - 0.5) * viewport.width;
    const y = -(noseBridge.y - 0.5) * viewport.height;
    const z = -(noseBridge.z ?? 0) * viewport.width;

    group.position.set(
        x * mirror + OFFSET_X,
        y + OFFSET_Y,
        z + OFFSET_Z,
    );

    // ── Scale (proportional to inter-eye distance) ─────────────────────────
    const dX    = rightEye.x - leftEye.x;
    const dY    = rightEye.y - leftEye.y;
    const eyeD  = Math.sqrt(dX * dX + dY * dY);
    group.scale.setScalar(eyeD * viewport.width * BASE_SCALE);

    // ── Rotation ───────────────────────────────────────────────────────────
    // Z-tilt always works (uses only x,y).
    // Y-yaw and X-pitch need Z depth. face-api.js has no depth → these are 0,
    // which is correct for a front-facing camera scenario.
    const angleZ = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const angleY = (leftEye.z && rightEye.z)
        ? Math.atan2(leftEye.z - rightEye.z, leftEye.x - rightEye.x)
        : 0;
    const angleX = (topFace.z && bottomFace.z)
        ? Math.atan2(topFace.z - bottomFace.z, topFace.y - bottomFace.y)
        : 0;

    group.rotation.set(
        -angleX + FLIP_X,
        -angleY * mirror + FLIP_Y,
        -angleZ * mirror + FLIP_Z,
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — UI WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
export default function VirtualTryOn({ config }) {
    const videoRef = useRef(null);
    const imageRef = useRef(null);

    const [mode, setMode]           = useState('video');
    const [imageSrc, setImageSrc]   = useState(null);
    const [faceVisible, setFaceVisible] = useState(false);
    const [mpLoaded, setMpLoaded]   = useState(false);   // true once models ready
    const [mediaSize, setMediaSize] = useState({ w: 4, h: 3 });
    const [retryKey, setRetryKey]   = useState(0);       // used to force recheck/reconnect

    // ── Start camera stream whenever in video mode ─────────────────────────
    useEffect(() => {
        if (mode !== 'video') return;
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Your browser does not support webcam access.");
            setMode('image');
            return;
        }

        let stream = null;
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user' } })
            .then(s => {
                stream = s;
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => {
                console.error('[VirtualTryOn] Camera access denied or not found:', err);
                alert("Camera access was denied or no webcam was found. Switching to Image Upload mode.");
                setMode('image');
            });

        return () => stream?.getTracks().forEach(t => t.stop());
    }, [mode, retryKey]);

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        setImageSrc(URL.createObjectURL(file));
        setFaceVisible(false);
        setMode('image');
        setRetryKey(0); // Reset retry aggressiveness on new image
    }

    function handleWebcamMode() {
        setFaceVisible(false);
        setMode('video');
        setRetryKey(k => k + 1); // Forces the webcam useEffect to fire again
    }

    return (
        <div className="vto-root">

            {/* ── Aspect-ratio lock: keeps canvas pixel-perfect over the media ── */}
            <div
                className="vto-aspect-box"
                style={{ aspectRatio: `${mediaSize.w} / ${mediaSize.h}` }}
            >
                {/* Background layer */}
                {mode === 'video' ? (
                    <video
                        id="vto-video"
                        ref={videoRef}
                        className="vto-video"
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={e =>
                            setMediaSize({ w: e.target.videoWidth, h: e.target.videoHeight })
                        }
                    />
                ) : (
                    <img
                        id="vto-image"
                        ref={imageRef}
                        className="vto-image"
                        src={imageSrc}
                        alt="Your uploaded photo"
                        crossOrigin="anonymous"
                        onLoad={e =>
                            setMediaSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })
                        }
                    />
                )}

                {/* Foreground: transparent Three.js canvas */}
                <Canvas
                    className="vto-canvas"
                    camera={{ position: [0, 0, 5], fov: 45 }}
                >
                    <ambientLight intensity={1} />
                    <directionalLight position={[0, 5, 5]} intensity={2} />
                    <Environment preset="city" />

                    <Suspense fallback={null}>
                        <FaceTracker
                            videoRef={videoRef}
                            imageRef={imageRef}
                            glassesConfig={config}
                            mode={mode}
                            imageSrc={imageSrc}
                            retryKey={retryKey}
                            onFaceStatus={detected => {
                                if (!mpLoaded) setMpLoaded(true); // first callback = models are ready
                                setFaceVisible(detected);
                            }}
                        />
                    </Suspense>
                </Canvas>

                {/* Loading badge — visible before face-api.js models finish loading */}
                {!mpLoaded && (
                    <div className="vto-status-badge" role="status" aria-live="polite">
                        <span className="vto-spinner" />
                        Loading face detection…
                    </div>
                )}

                {/* Hint badge — shown when models are ready but no face found */}
                {mpLoaded && !faceVisible && (
                    <div className="vto-no-face-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>
                            {mode === 'video'
                                ? 'Position your face in the frame'
                                : 'No face detected in image'}
                        </span>
                        {mode === 'image' && (
                            <button
                                onClick={() => setRetryKey(k => k + 1)}
                                style={{
                                    background: '#fff', color: '#000', border: 'none',
                                    padding: '4px 10px', borderRadius: '12px',
                                    fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                Recheck
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Bottom control bar ────────────────────────────────────────── */}
            <div className="vto-controls" role="toolbar" aria-label="Try-on controls">

                <button
                    id="vto-btn-webcam"
                    className={`vto-btn ${mode === 'video' ? 'vto-btn--active' : ''}`}
                    onClick={handleWebcamMode}
                    aria-pressed={mode === 'video'}
                >
                    <Camera size={15} />
                    Webcam
                </button>

                <label
                    id="vto-btn-upload"
                    className={`vto-upload-label ${mode === 'image' ? 'vto-btn--active' : ''}`}
                    aria-label="Upload a photo"
                >
                    <Upload size={15} />
                    Upload
                    <input
                        type="file"
                        accept="image/*"
                        className="vto-file-input"
                        onChange={handleImageUpload}
                    />
                </label>

            </div>
        </div>
    );
}