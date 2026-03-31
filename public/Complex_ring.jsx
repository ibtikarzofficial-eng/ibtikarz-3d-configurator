import React from 'react';
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei';

export function ComplexRingModel(props) {
  // Pointing to your new compressed file!
  const { nodes } = useGLTF('/complex_ring-transformed.glb');

  // Ensure these node names match what gltfjsx outputted. 
  // Sometimes --transform renames nodes slightly. Check your terminal output!
  const diamondNode = nodes?.['Diamond_Round_Kim_cuong_0'];
  const blackNode = nodes?.['object_2_Vien_KC_Lon_0'];
  const silverNode1 = nodes?.['object_4_Nhan_0'];
  const silverNode2 = nodes?.['object_4_Nhan_0_1'];

  if (!diamondNode || !blackNode) {
    console.warn('ComplexRingModel: Missing required geometry. Check node names in the transformed GLB.');
    return null;
  }

  return (
    <group {...props}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={0.01}>

        {/* THE ONYX STONE: Fixed to look like a polished gem, not a black void */}
        <mesh geometry={blackNode.geometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            color="#050505"      // Very dark grey/black
            metalness={0}        // Gems are NOT metal (Dielectric)
            roughness={0}        // Perfectly smooth
            clearcoat={1}        // High gloss polish
            clearcoatRoughness={0.1}
            envMapIntensity={3}  // Let it catch the city environment reflections
          />
        </mesh>

        {/* THE PAVE DIAMONDS */}
        <mesh geometry={diamondNode.geometry} castShadow>
          <MeshTransmissionMaterial
            backside
            backsideThickness={0.4}
            thickness={0.15}
            chromaticAberration={0.8} // Increased slightly for more rainbow "fire" in the diamonds
            anisotropy={0.8}
            clearcoat={1}
            clearcoatRoughness={0}
            envMapIntensity={6}
            ior={2.42} // Exact Index of Refraction for Diamond
            resolution={512}
            color="#ffffff"
            transmission={0.98}
          />
        </mesh>

        {/* PLATINUM / SILVER BAND */}
        {silverNode1 && (
          <mesh geometry={silverNode1.geometry} castShadow receiveShadow>
            <meshStandardMaterial
              color="#ffffff"
              metalness={1}
              roughness={0.08} // Slightly rougher so it looks like real metal, not a mirror
              envMapIntensity={2.5}
            />
          </mesh>
        )}
        {silverNode2 && (
          <mesh geometry={silverNode2.geometry} castShadow receiveShadow>
            <meshStandardMaterial
              color="#ffffff"
              metalness={1}
              roughness={0.08}
              envMapIntensity={2.5}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}