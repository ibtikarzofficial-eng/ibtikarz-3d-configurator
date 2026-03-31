import React from 'react'
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei'

export function ComplexRingModel(props) {
  const { nodes } = useGLTF('/complex_ring.glb')

  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          <group>

            {/* 1. THE BIG CENTER STONE (Onyx / Black Diamond) */}
            <mesh geometry={nodes.object_2_Vien_KC_Lon_0.geometry}>
              {/* We drop the glass shader and use a hyper-polished solid material */}
              <meshStandardMaterial
                color="#020202"      // Pitch black
                roughness={0}        // 0 roughness makes it a perfect mirror
                metalness={0.8}      // Gives it a heavy, stone-like reflection
                envMapIntensity={2}  // Bounces the white studio lights off the edges
              />
            </mesh>

            {/* 2. THE SMALL PAVÉ DIAMONDS */}
            <mesh geometry={nodes.Diamond_Round_Kim_cuong_0.geometry}>
              <MeshTransmissionMaterial
                backside={true}
                backsideThickness={1}
                thickness={0.5}
                chromaticAberration={1.5} // High fire for small diamonds
                anisotropy={0.5}
                clearcoat={1}
                envMapIntensity={4}
                ior={2.42}
                resolution={512} // Lower resolution to save memory!
                color="#ffffff"
                transmission={1}
              />
            </mesh>

            {/* 3. THE PLATINUM BAND */}
            {/* 3. THE PLATINUM BAND (Inside and Outside) */}
            <mesh geometry={nodes.object_4_Nhan_0.geometry}>
              <meshStandardMaterial
                color="#ffffff"
                metalness={1}
                roughness={0.05} // Dropped to 0.05 for a hyper-polished mirror finish
                envMapIntensity={2}
              />
            </mesh>

            <mesh geometry={nodes.object_4_Nhan_0_1.geometry}>
              <meshStandardMaterial
                color="#ffffff"
                metalness={1}
                roughness={0.05}
                envMapIntensity={2}
              />
            </mesh>

          </group>
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/complex_ring.glb')