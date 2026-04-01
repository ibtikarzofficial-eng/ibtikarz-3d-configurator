import React, { useRef } from 'react';
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei'; // <-- ADD THIS IMPORT
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ComplexRingModel({ config, ...props }) {
  // Now this will work
  const { nodes } = useGLTF('/complex_ring-transformed.glb');

  const diamondNode = nodes?.['Diamond_Round_Kim_cuong_0'];
  const blackNode = nodes?.['object_2_Vien_KC_Lon_0'];
  const silverNode1 = nodes?.['object_4_Nhan_0'];
  const silverNode2 = nodes?.['object_4_Nhan_0_1'];

  const stoneRef = useRef();

  // THE FIX: Dropped targetZ from 120 to 15 so it just hovers elegantly
  useFrame((state, delta) => {
    if (stoneRef.current) {
      const targetZ = config.isExploded ? 15 : 0;
      stoneRef.current.position.z = THREE.MathUtils.lerp(stoneRef.current.position.z, targetZ, delta * 5);
    }
  });

  // THE LIGHTING FIX: Dim the environment map reflections when we switch to darker moods
  const envIntensity = config.environment.id === 'studio' ? 2.5 : (config.environment.id === 'sunset' ? 0.5 : 0.1);

  if (!diamondNode || !blackNode) return null;

  return (
    <group {...props}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={0.01}>

        <group ref={stoneRef}>
          <mesh geometry={blackNode.geometry} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#050505"
              metalness={0}
              roughness={0}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={envIntensity}
            />
          </mesh>
        </group>

        <mesh geometry={diamondNode.geometry} castShadow>
          <meshPhysicalMaterial
            color="#ebf5ff"
            transmission={1}
            thickness={0}
            roughness={0}
            metalness={0}
            ior={2.42}
            envMapIntensity={envIntensity}
            clearcoat={1}
          />
        </mesh>

        {silverNode1 && (
          <mesh geometry={silverNode1.geometry} castShadow receiveShadow>
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.08} envMapIntensity={envIntensity} />
          </mesh>
        )}
        {silverNode2 && (
          <mesh geometry={silverNode2.geometry} castShadow receiveShadow>
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.08} envMapIntensity={envIntensity} />
          </mesh>
        )}
      </group>
    </group>
  );
}