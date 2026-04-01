import React, { useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Model({ config, ...props }) {
  const { nodes } = useGLTF('/glasses-transformed.glb');

  const frontGeometry = nodes?.Object_10?.geometry;
  const armsGeometry = nodes?.Object_13?.geometry;
  const lensGeometry = nodes?.Object_16?.geometry;

  const frameMatRef = useRef();
  const armsMatRef = useRef();
  const lensMatRef = useRef();

  // Setup Target Colors
  const targetFrameColor = useMemo(() => new THREE.Color(config.frameColor.hex), [config.frameColor.hex]);
  const targetLensColor = useMemo(() => new THREE.Color(config.lensType.color), [config.lensType.color]);
  const targetArmsColor = useMemo(() => {
    return new THREE.Color(config.handleDesign.type === 'solid' ? config.frameColor.hex : config.handleDesign.hex);
  }, [config.handleDesign, config.frameColor]);

  // THE MAGIC: Animate Color, Roughness, AND Transmission simultaneously
  useFrame((state, delta) => {
    const speed = delta * 8;

    if (frameMatRef.current) {
      frameMatRef.current.color.lerp(targetFrameColor, speed);
      frameMatRef.current.roughness = THREE.MathUtils.lerp(frameMatRef.current.roughness, config.frameColor.roughness, speed);
      frameMatRef.current.metalness = THREE.MathUtils.lerp(frameMatRef.current.metalness, config.frameColor.metalness, speed);
      frameMatRef.current.transmission = THREE.MathUtils.lerp(frameMatRef.current.transmission, config.frameColor.transmission, speed);
    }

    if (lensMatRef.current) {
      lensMatRef.current.color.lerp(targetLensColor, speed);
      lensMatRef.current.transmission = THREE.MathUtils.lerp(lensMatRef.current.transmission, config.lensType.transmission, speed);
      lensMatRef.current.metalness = THREE.MathUtils.lerp(lensMatRef.current.metalness, config.lensType.metalness, speed);
    }

    if (armsMatRef.current) {
      armsMatRef.current.color.lerp(targetArmsColor, speed);
    }
  });

  if (!frontGeometry || !lensGeometry) return null;

  const isFrosted = config.handleDesign.type === 'frosted';
  const isMetallic = config.handleDesign.type === 'metallic';
  const isSolid = config.handleDesign.type === 'solid';

  return (
    <group {...props}>
      {/* Front Frame - Upgraded to Physical Material to support Clear Acetate */}
      <mesh geometry={frontGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={frameMatRef}
          color={config.frameColor.hex}
          roughness={config.frameColor.roughness}
          metalness={config.frameColor.metalness}
          transmission={config.frameColor.transmission}
          clearcoat={config.frameColor.transmission > 0 ? 1 : 0} // Add shine if it's clear
          thickness={0.2}
          ior={1.5}
        />
      </mesh>

      {/* Arms / Handles */}
      {armsGeometry && (
        <mesh geometry={armsGeometry} castShadow receiveShadow>
          {isSolid && (
            <meshPhysicalMaterial
              ref={armsMatRef}
              color={config.frameColor.hex}
              roughness={config.frameColor.roughness}
              metalness={config.frameColor.metalness}
              transmission={config.frameColor.transmission}
            />
          )}
          {isMetallic && (
            <meshStandardMaterial
              ref={armsMatRef}
              color={config.handleDesign.hex}
              roughness={0.2}
              metalness={1}
            />
          )}
          {isFrosted && (
            <meshPhysicalMaterial
              ref={armsMatRef}
              color={config.handleDesign.hex}
              roughness={0.6}
              transmission={0.9}
              metalness={0}
              ior={1.4}
              thickness={0.5}
            />
          )}
        </mesh>
      )}

      {/* Lenses */}
      <mesh geometry={lensGeometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={lensMatRef}
          color={config.lensType.color}
          transmission={config.lensType.transmission}
          metalness={config.lensType.metalness}
          roughness={config.lensType.roughness}
          ior={config.lensType.ior}
          thickness={0.05}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
}