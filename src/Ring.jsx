import React, { useRef, useMemo } from 'react';
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function RingModel({ config, ...props }) {
  const { nodes } = useGLTF('/ring-transformed.glb');

  // Safe node filtering
  const goldNodes = useMemo(() => [
    nodes?.Object_3,
    nodes?.Object_4,
    nodes?.Object_5,
    nodes?.Object_6,
    nodes?.Object_7
  ].filter(Boolean), [nodes]);

  const metalMatRef = useRef();
  const gemMatRef = useRef();

  // Target colors for smooth transition
  const targetMetalColor = useMemo(() => new THREE.Color(config.metal.hex), [config.metal.hex]);
  const targetGemColor = useMemo(() => new THREE.Color(config.gem.color), [config.gem.color]);

  // THE MAGIC: Smoothly transition metal and gem properties
  useFrame((state, delta) => {
    const speed = delta * 6;

    if (metalMatRef.current) {
      metalMatRef.current.color.lerp(targetMetalColor, speed);
      metalMatRef.current.roughness = THREE.MathUtils.lerp(metalMatRef.current.roughness, config.metal.roughness, speed);
    }

    if (gemMatRef.current) {
      gemMatRef.current.color.lerp(targetGemColor, speed);
      // Notice: We cannot easily lerp transmission on Drei's custom transmission material dynamically without complex shader updates, 
      // but color and basic properties will lerp beautifully.
    }
  });

  if (!nodes?.Object_2) {
    console.warn('RingModel: Missing diamond geometry');
    return null;
  }

  return (
    <group {...props}>
      <group rotation={[-Math.PI / 2, 0, 0]}>

        {/* THE GEMSTONE */}
        <mesh geometry={nodes.Object_2.geometry} castShadow receiveShadow>
          {/* If it's Onyx (0 transmission), use a standard physical material for pure gloss. Otherwise use glass transmission */}
          {config.gem.transmission === 0 ? (
            <meshPhysicalMaterial
              ref={gemMatRef}
              color={config.gem.color}
              metalness={0}
              roughness={0}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={3}
            />
          ) : (
            <MeshTransmissionMaterial
              ref={gemMatRef}
              transmission={config.gem.transmission}
              backside
              backsideThickness={0.8}
              thickness={0.3}
              chromaticAberration={config.gem.chromaticAberration}
              anisotropy={0.4}
              clearcoat={1}
              clearcoatRoughness={0}
              envMapIntensity={4}
              ior={config.gem.ior}
              resolution={512} // Kept low for performance
              color={config.gem.color}
            />
          )}
        </mesh>

        {/* THE METAL BAND & PRONGS */}
        {goldNodes.map((node, index) => (
          <mesh key={`gold-${index}`} geometry={node.geometry} castShadow receiveShadow>
            <meshStandardMaterial
              ref={index === 0 ? metalMatRef : undefined} // Only need one ref, materials are cloned/shared if optimized, but here we lerp one and the rest follow if they share the material.
              // To be perfectly safe across all sub-meshes, we pass the raw config values, but the ref animation will handle the first one.
              // For a truly bulletproof approach, we apply the config directly:
              color={config.metal.hex}
              metalness={config.metal.metalness}
              roughness={config.metal.roughness}
              envMapIntensity={2.5}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

useGLTF.preload('/ring-transformed.glb');