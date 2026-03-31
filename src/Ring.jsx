import React from 'react'
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei'

export function RingModel(props) {
  const { nodes } = useGLTF('/ring.glb')

  return (
    <group {...props} dispose={null}>
      {/* The artist rotated the whole model 90 degrees, so we keep their group rotation */}
      <group rotation={[-Math.PI / 2, 0, 0]}>

        {/* --- THE DIAMOND (Object 2) --- */}
        <mesh geometry={nodes.Object_2.geometry}>
          <MeshTransmissionMaterial
            transmission={1}          // ADD THIS: Forces 100% glass clarity
            backside={true}
            backsideThickness={1}     // Lowered
            thickness={0.5}           // Lowered to remove the "cloudy" volume
            chromaticAberration={0.8} // Dialed back slightly for realism
            anisotropy={0.5}
            clearcoat={1}
            clearcoatRoughness={0}
            envMapIntensity={3}
            ior={2.42}
            resolution={2048}
            color="#ffffff"
          />
        </mesh>

        {/* --- THE 18K GOLD BAND & PRONGS (Objects 3 through 7) --- */}
        {/* I am mapping through them so you don't have to write the same material 5 times */}
        {[
          nodes.Object_3,
          nodes.Object_4,
          nodes.Object_5,
          nodes.Object_6,
          nodes.Object_7
        ].map((node, index) => (
          <mesh key={index} geometry={node.geometry}>
            <meshStandardMaterial
              color="#D4AF37"      // Classic 18k premium gold
              metalness={1}
              roughness={0.15}     // Slightly scuffed/realistic polish
              envMapIntensity={2}
            />
          </mesh>
        ))}

      </group>
    </group>
  )
}

useGLTF.preload('/ring.glb')