import React, { useState, useCallback, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useProgress, OrbitControls, Environment, ContactShadows, Center, Html, useGLTF } from '@react-three/drei';
import { Share2, ShoppingBag, Check, ScanFace } from 'lucide-react';
import './App.css';

// --- YOUR EXTERNAL ARCHITECTURE ---
import { Model as GlassesModel } from './Glasses';
import { RingModel } from './Ring';
import { ComplexRingModel } from './Complex_ring';
import { DEFAULT_GLASSES_STATE, DEFAULT_RING_STATE, DEFAULT_COMPLEX_STATE } from './productData';
import ComplexConfigurator from './ComplexConfigurator';
import RingConfigurator from './RingConfigurator';
import GlassesConfigurator from './GlassesConfigurator';
import VirtualTryOn from './VirtualTryOn'; // <-- NEW IMPORT

// ----------------------------------------------------------------------------
// STATIC DATA
// ----------------------------------------------------------------------------
const PRODUCT_DATA = {
  glasses: { subtitle: 'Premium Series', title: 'Apex Aviators', description: 'Ultra-lightweight polarized sunglasses. Fully customizable.', price: '15,000', modelScale: 1.5, minDistance: 2, maxDistance: 6 },
  jewelry: { subtitle: 'Classic Collection', title: 'The Imperial Solitaire', description: 'Flawless clarity. 18k solid gold band.', price: '250,000', modelScale: 0.1, minDistance: 2, maxDistance: 6 },
  complex_jewelry: { subtitle: 'Bespoke Showroom', title: 'Onyx & Platinum Pavé', description: 'Massive Onyx centerpiece with pavé diamonds.', price: '850,000', modelScale: 10, modelRotation: [Math.PI / -2, 0, 0], minDistance: 3, maxDistance: 10 }
};

// ----------------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------------
function CanvasLoader() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="loader-wrapper" role="status" aria-live="polite">
      <div className="loader-bar-bg">
        <div className="loader-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="loader-text">Loading {progress.toFixed(0)}%</p>
    </div>
  );
}

function SmartOrbitControls({ autoRotate = true, ...props }) {
  const controlsRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useFrame((state, delta) => {
    if (controlsRef.current && autoRotate && !isInteracting) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.update(delta);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      autoRotate={false}
      autoRotateSpeed={1.5}
      onStart={() => setIsInteracting(true)}
      onEnd={() => setIsInteracting(false)}
      onContextMenu={(e) => e.preventDefault()}
      {...props}
    />
  );
}

// THE ROUTER: Passes the correct config down to the right 3D model
function ModelSelector({ activeTab, glassesConfig, ringConfig, complexConfig, productData }) {
  const activeProduct = productData[activeTab];
  const commonProps = { scale: activeProduct.modelScale };

  switch (activeTab) {
    case 'complex_jewelry':
      return <ComplexRingModel key="complex" config={complexConfig} {...commonProps} rotation={activeProduct.modelRotation} />;
    case 'jewelry':
      return <RingModel key="jewelry" config={ringConfig} {...commonProps} />;
    case 'glasses':
    default:
      return <GlassesModel key="glasses" config={glassesConfig} {...commonProps} />;
  }
}

// ----------------------------------------------------------------------------
// MAIN APP COMPONENT
// ----------------------------------------------------------------------------
export default function App() {
  // Application State
  const [activeTab, setActiveTab] = useState('glasses');
  const [mountModel, setMountModel] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isARMode, setIsARMode] = useState(false); // <-- AR STATE ADDED

  // Product Configurator State
  const [glassesConfig, setGlassesConfig] = useState(DEFAULT_GLASSES_STATE);
  const [ringConfig, setRingConfig] = useState(DEFAULT_RING_STATE);
  const [complexConfig, setComplexConfig] = useState(DEFAULT_COMPLEX_STATE);

  // WebGL Context Management
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  // Toast / Share Management
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const activeProduct = PRODUCT_DATA[activeTab];

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const handleShare = useCallback(async () => {
    const shareData = { title: 'Check out this product', text: 'Amazing 3D product viewer', url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('Shared successfully!');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Failed to share', 'error');
    }
  }, []);

  const handleTabSwitch = useCallback((tab) => {
    if (tab === activeTab) return;
    if (navigator.vibrate) navigator.vibrate(10);

    setMountModel(false);
    setIsARMode(false); // Reset AR mode when switching tabs

    // Clear caches for seamless memory transitions
    useGLTF.clear('/glasses-transformed.glb');
    useGLTF.clear('/ring-transformed.glb');
    useGLTF.clear('/complex_ring-transformed.glb');

    setActiveTab(tab);

    setTimeout(() => {
      setMountModel(true);
    }, 300);

  }, [activeTab]);

  const handleCheckout = useCallback(() => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    }, 1500);
  }, []);

  const handleContextLoss = useCallback((event) => {
    event.preventDefault();
    console.error('CRITICAL: WebGL context lost. GPU out of memory.');
    setContextLost(true);
  }, []);

  const recoverContext = useCallback(() => {
    setContextLost(false);
    setCanvasKey(prev => prev + 1);
  }, []);

  return (
    <div className={`app-wrapper ${isARMode && activeTab === 'glasses' ? 'ar-mode' : ''}`}>
      <div className={`toast ${toast.type} ${toast.visible ? 'visible' : ''}`}>
        {toast.type === 'success' && <Check size={16} />}
        <span>{toast.message}</span>
      </div>

      {/* 3D Canvas / AR Layer */}
      <div className="canvas-container" style={{ position: 'relative' }}>
        
        {/* AR Tracker OVERLAY */}
        {isARMode && activeTab === 'glasses' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50 }}>
            <VirtualTryOn config={glassesConfig} />
          </div>
        )}

        {/* Main 3D Viewer - NEVER unmount this to prevent WebGL Context Leaks, 
            instead we pause its render loop and hide it structurally */}
        <div style={{
          width: '100%', 
          height: '100%',
          opacity: (isARMode && activeTab === 'glasses') ? 0 : 1,
          pointerEvents: (isARMode && activeTab === 'glasses') ? 'none' : 'auto'
        }}>
          <Canvas
            frameloop={(isARMode && activeTab === 'glasses') ? 'demand' : 'always'}
            key={canvasKey}
            camera={{ position: [0, 1, 4], fov: 45, near: 0.1, far: 100 }}
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              powerPreference: "high-performance",
              toneMappingExposure: 1.2,
              preserveDrawingBuffer: false
            }}
            onCreated={({ gl }) => {
              const canvas = gl.domElement;
              canvas.addEventListener('webglcontextlost', handleContextLoss, false);
              return () => canvas.removeEventListener('webglcontextlost', handleContextLoss);
            }}
          >
            <Suspense fallback={<Html fullscreen><CanvasLoader /></Html>}>
              {contextLost ? (
                <Html center>
                  <div className="crash-overlay">
                    <p>Viewer crashed due to high memory usage.</p>
                    <button onClick={recoverContext}>Reload 3D Viewer</button>
                  </div>
                </Html>
              ) : (
                <>
                  <Environment preset="city" background={false} />
                  <ambientLight
                    color={activeTab === 'complex_jewelry' ? complexConfig.environment.ambientColor : '#ffffff'}
                    intensity={activeTab === 'complex_jewelry' ? complexConfig.environment.ambientInt : 0.5}
                  />
                  <spotLight
                    position={[5, 10, 5]}
                    penumbra={1}
                    angle={0.3}
                    castShadow
                    color={activeTab === 'complex_jewelry' ? complexConfig.environment.spotColor : '#ffffff'}
                    intensity={activeTab === 'complex_jewelry' ? complexConfig.environment.spotInt : 2}
                  />
                  <pointLight position={[-5, -5, -5]} intensity={0.5} color="#0066ff" />

                  <SmartOrbitControls minDistance={activeProduct.minDistance} maxDistance={activeProduct.maxDistance} />

                  <Center position={[0, -0.2, 0]}>
                    {mountModel && (
                      <ModelSelector
                        activeTab={activeTab}
                        glassesConfig={glassesConfig}
                        ringConfig={ringConfig}
                        complexConfig={complexConfig}
                        productData={PRODUCT_DATA}
                      />
                    )}
                  </Center>

                  <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={10} blur={2} far={2} frames={1} />
                </>
              )}
            </Suspense>
          </Canvas>
        </div>
      </div>

      {/* UI Navigation Layer */}
      <nav className="nav-pill" role="tablist">
        {['glasses', 'jewelry', 'complex_jewelry'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'glasses' ? 'Aviators' : tab === 'jewelry' ? 'Solitaire' : 'Onyx Pavé'}
          </button>
        ))}
      </nav>

      {/* UI Product Card Layer */}
      <article className="product-card">
        <div className="product-card-content">
          <div className="header-row">
            <div>
              <p className="subtitle">{activeProduct.subtitle}</p>
              <h1 className="title">{activeProduct.title}</h1>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {/* AR TOGGLE BUTTON */}
              {activeTab === 'glasses' && (
                <button
                  onClick={() => setIsARMode(!isARMode)}
                  className="share-btn"
                  aria-label="Virtual Try-On"
                  style={{
                    background: isARMode ? '#ff3b30' : '#f0f0f0',
                    color: isARMode ? '#fff' : '#000'
                  }}
                >
                  <ScanFace size={18} />
                </button>
              )}

              <button onClick={handleShare} className="share-btn" aria-label="Share">
                <Share2 size={18} />
              </button>
            </div>
          </div>

          <p className="description">{activeProduct.description}</p>
          <p className="price">Rs. {activeProduct.price}</p>

          {/* DYNAMIC UI INJECTION */}
          {activeTab === 'glasses' && (
            <GlassesConfigurator config={glassesConfig} setConfig={setGlassesConfig} />
          )}

          {activeTab === 'jewelry' && (
            <RingConfigurator config={ringConfig} setConfig={setRingConfig} />
          )}

          {activeTab === 'complex_jewelry' && (
            <ComplexConfigurator config={complexConfig} setConfig={setComplexConfig} />
          )}

          <button className="checkout-btn" onClick={handleCheckout} disabled={isCheckingOut} style={{ marginTop: activeTab === 'glasses' ? '24px' : 'auto' }}>
            {isCheckingOut ? 'Processing...' : <><ShoppingBag size={18} /><span>Secure Checkout</span></>}
          </button>
        </div>
      </article>
    </div>
  );
}