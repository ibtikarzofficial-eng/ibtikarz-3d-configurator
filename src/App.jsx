import React, { useState } from 'react';
import { Share2, ShoppingBag } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import { Model } from './Glasses';
import { RingModel } from './Ring';
import { ComplexRingModel } from './Complex_ring';
// Add Vignette and SMAA to your postprocessing import
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';

function HDRing() {
  return (
    <group scale={3} position={[0, -0.2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.08, 64, 128]} />
        <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.05} envMapIntensity={2} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <octahedronGeometry args={[0.18, 2]} />
        {/* We aren't using this placeholder anymore since you have the real models, but keeping it so your code doesn't break if you call it */}
      </mesh>
    </group>
  );
}

// --- THE MAIN APP UI ---
function App() {
  const [activeTab, setActiveTab] = useState('jewelry');
  const [activeColor, setActiveColor] = useState({ name: 'Matte Black', hex: '#111827' });

  // 1. FIXED: Added the missing colors array back!
  const colors = [
    { name: 'Matte Black', hex: '#111827' },
    { name: 'Titanium Silver', hex: '#9CA3AF' },
    { name: 'Tortoise Shell', hex: '#8B4513' }
  ];

  // 2. FIXED: Added the missing handleShare function!
  const handleShare = () => {
    const url = `${window.location.origin}?model=${activeTab}`;
    navigator.clipboard.writeText(url);
    alert('Your IbtikarZ link has been copied to your clipboard!');
  };

  const handleTabSwitch = (tab) => {
    if (tab === 'complex_jewelry') {
      const proceed = window.confirm(
        "VIP SHOWROOM WARNING:\n\nThis is a hyper-realistic, high-poly 3D asset with complex optical physics. It requires a dedicated GPU to render smoothly and may take a moment to load.\n\nDo you wish to proceed?"
      );
      if (!proceed) return;
    }
    setActiveTab(tab);
  };

  const productData = {
    glasses: {
      subtitle: 'IBTIKARZ PREMIUM SERIES',
      title: 'Apex Aviators',
      description: 'Ultra-lightweight polarized sunglasses designed for maximum durability. Customize your frame and lenses below to see them in real-time 3D.',
      price: '15,000',
      showColorPicker: true
    },
    jewelry: {
      subtitle: 'CLASSIC COLLECTION',
      title: 'The Imperial Solitaire',
      description: 'Flawless clarity. Crafted with a heavy 18k solid gold band and a mathematically perfect diamond cut to maximize light refraction.',
      price: '250,000',
      showColorPicker: false
    },
    complex_jewelry: {
      subtitle: 'BESPOKE SHOWROOM',
      title: 'Onyx & Platinum Pavé',
      description: 'A massive, light-absorbing Onyx centerpiece flanked by high-fire pavé diamonds. Hand-set in heavy, polished platinum. The ultimate statement piece.',
      price: '850,000',
      showColorPicker: false
    }
  };

  const activeProduct = productData[activeTab];

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col font-sans overflow-hidden">

      {/* THE PIVOT TOGGLE BAR */}
      <div className="w-full bg-white shadow-sm z-50 py-4 flex justify-center space-x-4 absolute top-0">
        <button
          onClick={() => handleTabSwitch('glasses')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${activeTab === 'glasses' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Apex Aviators
        </button>
        <button
          onClick={() => handleTabSwitch('jewelry')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${activeTab === 'jewelry' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Classic Solitaire
        </button>
        <button
          onClick={() => handleTabSwitch('complex_jewelry')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${activeTab === 'complex_jewelry' ? 'bg-black text-white' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}
        >
          Imperial Black Diamond (Ultra HD)
        </button>
      </div>

      <div className="flex flex-row h-full pt-16">

        {/* LEFT PANEL: The Ultra-HD Canvas */}
        <div className="w-1/2 h-full relative bg-[#E5E7EB] shadow-inner cursor-grab active:cursor-grabbing">
          <Canvas
            camera={{ position: [0, 1, 4], fov: 45 }}
            dpr={[1.5, 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <Environment preset="city" />
            <OrbitControls enablePan={false} enableZoom={true} minDistance={2} maxDistance={6} autoRotate={true} autoRotateSpeed={2} />

            {/* The Toggle Logic */}
            {activeTab === 'complex_jewelry' ? (
              <Center position={[0, -0.2, 0]}>
                <ComplexRingModel scale={10} rotation={[Math.PI / -2, 0, 0]} />
              </Center>
            ) : activeTab === 'jewelry' ? (
              <Center position={[0, -0.2, 0]}>
                <RingModel scale={0.1} />
              </Center>
            ) : (
              <Center position={[0, -0.3, 0]}>
                <Model customColor={activeColor.hex} scale={1.5} />
              </Center>
            )}

            <spotLight position={[-5, 5, -5]} intensity={1.5} color="#ffffff" />

            {/* 3. FIXED: The shadow array syntax is corrected */}
            <ContactShadows position={[0, -0.8, 0]} opacity={0.8} scale={5} blur={1} far={2} resolution={1024} />
          </Canvas>
        </div>

        {/* RIGHT PANEL: Dynamic UI */}
        <div className="w-1/2 h-full flex flex-col justify-center px-8 md:px-16 py-12 overflow-y-auto z-10 bg-white shadow-2xl mt-16">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                {activeProduct.subtitle}
              </p>
              <h1 className="text-4xl font-bold text-gray-900">
                {activeProduct.title}
              </h1>
            </div>
            <button onClick={handleShare} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
              <Share2 size={20} className="text-gray-700" />
            </button>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            {activeProduct.description}
          </p>

          <div className="mb-10">
            <p className="text-4xl font-light text-gray-900">
              Rs. {activeProduct.price}
            </p>
          </div>

          {activeProduct.showColorPicker && (
            <div className="mb-10">
              <p className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                Frame Color: <span className="text-gray-500 font-normal">{activeColor.name}</span>
              </p>
              <div className="flex space-x-3">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setActiveColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${activeColor.name === color.name ? 'border-black scale-110 shadow-md' : 'border-transparent hover:scale-105'
                      }`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={`Select ${color.name}`}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center space-x-3">
                <p className="text-xs font-medium text-gray-500 uppercase">Custom Color (+Rs. 10,000)</p>
                <input
                  type="color"
                  className="w-8 h-8 rounded cursor-pointer border-0"
                  onChange={(e) => {
                    setActiveColor({ name: 'Custom Build', hex: e.target.value });
                  }}
                />
              </div>
            </div>
          )}

          <button className="w-full bg-black text-white py-4 rounded-lg text-lg font-medium flex justify-center items-center space-x-2 hover:bg-gray-800 transition-colors shadow-xl">
            <ShoppingBag size={20} />
            <span>Secure Checkout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;