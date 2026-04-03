import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Model as GlassesModel } from './Glasses';
import { Upload, Camera } from 'lucide-react';
import './VirtualTryOn.css';

// ─────────────────────────────────────────────────────────────────────────────
// FACE TRACKER (Powered by Google MediaPipe Tasks-Vision on CPU)
// ─────────────────────────────────────────────────────────────────────────────
function FaceTracker({ videoRef, imageRef, glassesConfig, mode, imageSrc, onFaceStatus, retryKey }) {
    const { viewport } = useThree();
    const glassesRef   = useRef();
    const landmarkerRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const landmarksDataRef = useRef(null); 

    const [isLoaded, setIsLoaded] = useState(false);

    // 1. Boot up MediaPipe (Strictly locked to CPU to avoid WebGL memory crashes)
    useEffect(() => {
        let mounted = true;
        async function loadMp() {
            try {
                // Explicitly targeting the exact installed version. @latest causes CDN 404s for subdirectories.
                const fileset = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
                );
                landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
                    baseOptions: {
                        // Official Google float16 face mesh model
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "CPU" // CRITICAL: This is what saves the GPU from crashing!
                    },
                    runningMode: "VIDEO", 
                    numFaces: 1,
                    minFaceDetectionConfidence: 0.1, // Ultra-sensitive
                    minFacePresenceConfidence: 0.1,
                    minTrackingConfidence: 0.1
                });
                if (mounted) setIsLoaded(true);
            } catch (err) {
                console.error("[FaceTracker] MediaPipe init failed:", err);
            }
        }
        loadMp();
        return () => { mounted = false; };
    }, []);

    // 2. VIDEO DETECTION FRAME LOOP (Synchronized to Three.js Frame)
    useFrame(() => {
        if (!isLoaded || !landmarkerRef.current || !glassesRef.current) return;

        if (mode === 'video') {
            const video = videoRef.current;
            if (video && video.readyState >= 2) {
                const time = video.currentTime;
                // Only process if the video actually moved forward a frame
                if (time !== lastVideoTimeRef.current) {
                    lastVideoTimeRef.current = time;
                    try {
                        const results = landmarkerRef.current.detectForVideo(video, performance.now());
                        
                        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                            landmarksDataRef.current = results.faceLandmarks[0];
                            onFaceStatus?.(true);
                        } else {
                            landmarksDataRef.current = null;
                            onFaceStatus?.(false);
                        }
                    } catch (err) { 
                        // Silent catch so temporary tracking loss doesn't crash the loop
                    }
                }
            }
        }

        // Apply math to 3D model
        if (landmarksDataRef.current) {
            placeGlasses(landmarksDataRef.current, glassesRef.current, viewport, mode);
            glassesRef.current.visible = true;
        } else {
            glassesRef.current.visible = false;
        }
    });

    // 3. IMAGE UPLOAD DETECTION LOGIC
    useEffect(() => {
        if (!isLoaded || mode !== 'image' || !imageSrc || !landmarkerRef.current) return;
        
        const img = imageRef.current;
        if (!img) return;

        const runImageDetect = async () => {
            try {
                // MediaPipe throws an error if we feed an Image into VIDEO mode.
                await landmarkerRef.current.setOptions({ runningMode: "IMAGE" });
                
                const results = landmarkerRef.current.detect(img);
                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    landmarksDataRef.current = results.faceLandmarks[0];
                    onFaceStatus?.(true);
                } else {
                    landmarksDataRef.current = null;
                    onFaceStatus?.(false);
                }
                
                // Immediately revert back to VIDEO mode to prevent state lock
                await landmarkerRef.current.setOptions({ runningMode: "VIDEO" });
            } catch (err) {
                console.error("[FaceTracker] Image detection failed", err);
            }
        };

        if (img.complete) runImageDetect();
        else img.addEventListener('load', runImageDetect, { once: true });

    }, [isLoaded, mode, imageSrc, retryKey]);

    return (
        <group ref={glassesRef} visible={false}>
            <GlassesModel config={glassesConfig} />
            {/* Added a subtle blue indicator sphere directly behind the glasses exactly as requested */}
            <mesh position={[0, 0, -1]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
            </mesh>
        </group>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATH: Landmarker -> 3D Space coordinate mapper
// ─────────────────────────────────────────────────────────────────────────────
function placeGlasses(landmarks, group, viewport, mode) {
    // Core MediaPipe Landmark Indices
    const noseBridge = landmarks[168];
    const leftEye    = landmarks[33]; 
    const rightEye   = landmarks[263];

    // TUNING CONSTANTS
    const BASE_SCALE = 0.28;   
    const OFFSET_X   = 0;      
    const OFFSET_Y   = 0.12;   
    const OFFSET_Z   = 1.0;    

    // CSS automatically mirrors the HTML video tag. We must undo that flip mathematically.
    const mirror = mode === 'video' ? -1 : 1;

    // Transform normalized [0, 1] device-coordinates to Three.js Viewport units
    const x = (noseBridge.x - 0.5) * viewport.width;
    const y = -(noseBridge.y - 0.5) * viewport.height;
    
    // Scale depth drastically down since it can cause jitter on z-buffering
    const z = -(noseBridge.z || 0) * viewport.width * 0.5;

    group.position.set(x * mirror + OFFSET_X, y + OFFSET_Y, z + OFFSET_Z);

    // Depth-aware scaling based on inter-pupillary distance
    const dX = rightEye.x - leftEye.x;
    const dY = rightEye.y - leftEye.y;
    const eyeD = Math.sqrt(dX * dX + dY * dY);
    group.scale.setScalar(eyeD * viewport.width * BASE_SCALE);

    // Robust Z-tilt logic. Removed Pitch/Yaw as it induces jitter on webcams.
    const angleZ = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    group.rotation.set(0, 0, -angleZ * mirror);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI WRAPPER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VirtualTryOn({ config }) {
    const videoRef = useRef(null);
    const imageRef = useRef(null);

    const [mode, setMode]           = useState('video');
    const [imageSrc, setImageSrc]   = useState(null);
    const [faceVisible, setFaceVisible] = useState(false);
    const [mpLoaded, setMpLoaded]   = useState(false);   
    const [mediaSize, setMediaSize] = useState({ w: 4, h: 3 });
    const [retryKey, setRetryKey]   = useState(0);       

    // Hardware camera stream initialization hook
    useEffect(() => {
        if (mode !== 'video') return;
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Your browser does not support webcam access.");
            setMode('image');
            return;
        }

        let stream = null;
        
        // Match the camera physical format to the UI window strictly to avoid UI messes
        const targetAR = window.innerWidth / window.innerHeight;

        navigator.mediaDevices
            .getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    aspectRatio: targetAR
                } 
            })
            .then(s => {
                stream = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.error("[Play Error]", e));
                }
            })
            .catch(err => {
                console.error('[VirtualTryOn] Hardware access denied:', err);
                alert("Camera access was denied. Switching to Image Upload mode.");
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
        setRetryKey(0); 
    }

    function handleWebcamMode() {
        setFaceVisible(false);
        setMode('video');
        setRetryKey(k => k + 1); 
    }

    return (
        <div className="vto-root" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
                className="vto-aspect-box"
                style={{ 
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden'
                }}
            >
                {mode === 'video' ? (
                    <video
                        id="vto-video"
                        ref={videoRef}
                        className="vto-video"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={e => setMediaSize({ w: e.target.videoWidth, h: e.target.videoHeight })}
                    />
                ) : (
                    <img
                        id="vto-image"
                        ref={imageRef}
                        className="vto-image"
                        src={imageSrc}
                        alt="Your uploaded photo"
                        crossOrigin="anonymous"
                        onLoad={e => setMediaSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                    />
                )}

                <Canvas className="vto-canvas" camera={{ position: [0, 0, 5], fov: 45 }}>
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
                                if (!mpLoaded) setMpLoaded(true); 
                                setFaceVisible(detected);
                            }}
                        />
                    </Suspense>
                </Canvas>

                {!mpLoaded && (
                    <div className="vto-status-badge" role="status" aria-live="polite">
                        <span className="vto-spinner" />
                        Downloading AI Matrix...
                    </div>
                )}

                {mpLoaded && faceVisible && (
                    <div className="vto-face-detected-badge" role="status" aria-live="polite">
                        <div className="vto-blue-circle" aria-hidden="true" />
                        Face Locked
                    </div>
                )}

                {mpLoaded && !faceVisible && (
                    <div className="vto-no-face-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{mode === 'video' ? 'Bring your face into view' : 'Could not locate a face'}</span>
                        {mode === 'image' && (
                            <button
                                onClick={() => setRetryKey(k => k + 1)}
                                style={{
                                    background: '#fff', color: '#000', border: 'none',
                                    padding: '4px 10px', borderRadius: '12px',
                                    fontSize: '11px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                Re-Scan
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="vto-controls" role="toolbar">
                <button
                    className={`vto-btn ${mode === 'video' ? 'vto-btn--active' : ''}`}
                    onClick={handleWebcamMode}
                >
                    <Camera size={15} /> Webcam
                </button>

                <label className={`vto-upload-label ${mode === 'image' ? 'vto-btn--active' : ''}`}>
                    <Upload size={15} /> Upload
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