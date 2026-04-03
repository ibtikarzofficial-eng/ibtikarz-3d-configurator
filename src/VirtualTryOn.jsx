import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Upload, Camera, AlertCircle } from 'lucide-react';
import { Model as GlassesModel } from './Glasses';

// ============================================================================
// 🛠️ IbtikarZ MASTER CALIBRATION
// Tweak these numbers to fit your specific .glb model.
// ============================================================================
const CALIBRATION = {
    // 1. SIZE
    scaleMultiplier: 0.15, // Change to 0.08 if too big, 0.25 if too small

    // 2. POSITION (Move the glasses around your face)
    offsetX: 0,
    offsetY: -0.15, // Negative moves glasses down your nose
    offsetZ: 1.5,   // Pushes glasses forward so handles don't clip into your cheeks

    // 3. ROTATION (Math.PI = 180 degrees, Math.PI/2 = 90 degrees)
    flipX: Math.PI, // Flips the handles forward/backward
    flipY: 0,
    flipZ: 0
};
// ============================================================================

// ----------------------------------------------------------------------------
// FACE TRACKER (The AI Engine)
// ----------------------------------------------------------------------------
let monotonicTimestamp = 0; // Strictly increasing timestamp prevents MediaPipe crashes

function FaceTracker({ videoRef, imageRef, glassesConfig, mode, onStatusChange }) {
    const { viewport } = useThree();
    const glassesRef = useRef();
    const landmarkerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    // Boot MediaPipe
    useEffect(() => {
        let active = true;
        async function loadAI() {
            try {
                const fileset = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await FaceLandmarker.createFromOptions(fileset, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "CPU" // CPU prevents WebGL memory exhaustion
                    },
                    outputFaceBlendshapes: false,
                    runningMode: "VIDEO", // We lock it to VIDEO to prevent state-switching crashes
                    numFaces: 1
                });

                if (!active) {
                    landmarker.close();
                    return;
                }

                landmarkerRef.current = landmarker;
                setIsReady(true);
            } catch (err) {
                console.error("[IbtikarZ System] AI Boot Failure:", err);
            }
        }
        loadAI();
        return () => {
            active = false;
            if (landmarkerRef.current) landmarkerRef.current.close();
        };
    }, []);

    // The Render Loop
    useFrame(() => {
        if (!isReady || !landmarkerRef.current || !glassesRef.current) return;

        let landmarks = null;
        monotonicTimestamp += 16; // Fake video time prevents timestamp collision crashes

        try {
            // WEBCAM MODE
            if (mode === 'video' && videoRef.current && videoRef.current.readyState >= 2) {
                const results = landmarkerRef.current.detectForVideo(videoRef.current, monotonicTimestamp);
                if (results.faceLandmarks?.length > 0) landmarks = results.faceLandmarks[0];
            }
            // IMAGE MODE (We trick the AI into scanning the image as a single video frame)
            else if (mode === 'image' && imageRef.current && imageRef.current.complete) {
                const results = landmarkerRef.current.detectForVideo(imageRef.current, monotonicTimestamp);
                if (results.faceLandmarks?.length > 0) landmarks = results.faceLandmarks[0];
            }
        } catch (err) {
            console.error("[IbtikarZ System] Tracking frame dropped:", err);
        }

        onStatusChange(!!landmarks);

        // Apply Math to Model
        if (landmarks) {
            const noseBridge = landmarks[168];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const topFace = landmarks[10];
            const bottomFace = landmarks[152];

            // CSS flips the webcam horizontally, so we must invert our math
            const mirror = mode === 'video' ? -1 : 1;

            // Coordinate Mapping
            const x = (noseBridge.x - 0.5) * viewport.width;
            const y = -(noseBridge.y - 0.5) * viewport.height;
            const z = -noseBridge.z * viewport.width;

            glassesRef.current.position.set(
                (x * mirror) + CALIBRATION.offsetX,
                y + CALIBRATION.offsetY,
                z + CALIBRATION.offsetZ
            );

            // Dynamic Scaling
            const dx = rightEye.x - leftEye.x;
            const dy = rightEye.y - leftEye.y;
            const eyeDistance = Math.sqrt(dx * dx + dy * dy);

            const finalScale = eyeDistance * viewport.width * CALIBRATION.scaleMultiplier;
            glassesRef.current.scale.set(finalScale, finalScale, finalScale);

            // 3D Rotation Math
            const angleZ = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
            const angleY = Math.atan2(leftEye.z - rightEye.z, leftEye.x - rightEye.x);
            const angleX = Math.atan2(topFace.z - bottomFace.z, topFace.y - bottomFace.y);

            glassesRef.current.rotation.set(
                -angleX + CALIBRATION.flipX,
                (-angleY * mirror) + CALIBRATION.flipY,
                (-angleZ * mirror) + CALIBRATION.flipZ
            );

            glassesRef.current.visible = true;
        } else {
            glassesRef.current.visible = false;
        }
    });

    return (
        <group ref={glassesRef} visible={false}>
            <GlassesModel config={glassesConfig} />
        </group>
    );
}

// ----------------------------------------------------------------------------
// MAIN UI COMPONENT (The Chassis)
// ----------------------------------------------------------------------------
export default function VirtualTryOn({ config }) {
    const videoRef = useRef(null);
    const imageRef = useRef(null);
    const [mode, setMode] = useState('video');
    const [imageSrc, setImageSrc] = useState(null);
    const [aspectRatio, setAspectRatio] = useState('3/4'); // Default fallback
    const [isTracking, setIsTracking] = useState(false);

    // Hardware Manager
    useEffect(() => {
        let stream = null;

        if (mode === 'video' && navigator.mediaDevices?.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
                .then((s) => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(() => alert("Camera blocked or unavailable. Switch to Image Upload."));
        }

        // Hardware cleanup is mandatory to prevent ghost webcams
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [mode]);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageSrc(URL.createObjectURL(file));
            setMode('image');
        }
    };

    return (
        <div style={{
            width: '100%', height: '100%', backgroundColor: '#0f1115',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', borderRadius: '12px'
        }}>

            {/* THE ASPECT RATIO LOCK:
              This guarantees the 3D Canvas exactly overlays the video pixels.
              No resizing bugs. No floating glasses.
            */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxHeight: '100%',
                aspectRatio: aspectRatio,
                backgroundColor: '#000'
            }}>

                {/* Media Layer */}
                {mode === 'video' ? (
                    <video
                        ref={videoRef}
                        autoPlay playsInline muted
                        onLoadedMetadata={(e) => setAspectRatio(`${e.target.videoWidth}/${e.target.videoHeight}`)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                    />
                ) : (
                    <img
                        ref={imageRef}
                        src={imageSrc}
                        alt="User"
                        onLoad={(e) => setAspectRatio(`${e.target.naturalWidth}/${e.target.naturalHeight}`)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                )}

                {/* 3D Render Layer */}
                <Canvas
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    camera={{ position: [0, 0, 5], fov: 45 }}
                >
                    <ambientLight intensity={1.5} />
                    <directionalLight position={[0, 5, 5]} intensity={2} />
                    <Environment preset="city" />

                    <Suspense fallback={null}>
                        <FaceTracker
                            videoRef={videoRef}
                            imageRef={imageRef}
                            glassesConfig={config}
                            mode={mode}
                            onStatusChange={setIsTracking}
                        />
                    </Suspense>
                </Canvas>

                {/* Face Detection Warning */}
                {!isTracking && mode === 'image' && imageSrc && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'rgba(220, 38, 38, 0.9)', color: '#fff', padding: '12px 24px',
                        borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
                    }}>
                        <AlertCircle size={20} /> No face detected. Try a clearer photo.
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div style={{
                position: 'absolute', bottom: '24px', display: 'flex', gap: '12px',
                background: 'rgba(0, 0, 0, 0.7)', padding: '8px', borderRadius: '30px',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button
                    onClick={() => setMode('video')}
                    style={{
                        padding: '10px 20px', borderRadius: '24px', border: 'none',
                        background: mode === 'video' ? '#fff' : 'transparent',
                        color: mode === 'video' ? '#000' : '#fff',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s'
                    }}
                >
                    <Camera size={16} /> Webcam
                </button>

                <label style={{
                    padding: '10px 20px', borderRadius: '24px', border: 'none',
                    background: mode === 'image' ? '#fff' : 'transparent',
                    color: mode === 'image' ? '#000' : '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s'
                }}>
                    <Upload size={16} /> Upload Photo
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleUpload} style={{ display: 'none' }} />
                </label>
            </div>
        </div>
    );
}