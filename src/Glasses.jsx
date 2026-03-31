import React from 'react'
import { useGLTF } from '@react-three/drei'

export function Model(props) {
  const { nodes, materials } = useGLTF('/glasses.glb')

  return (
    // We pass down {...props} so we can control scale and position from App.jsx
    <group {...props} dispose={null}>
      {/* 1. The Front Frame */}
      <mesh
        geometry={nodes.Object_10.geometry}
        material={materials.Frame}
        material-color={props.customColor}
      />

      {/* 2. The Arms / Handles */}
      <mesh
        geometry={nodes.Object_13.geometry}
        material={materials.Frame}
        material-color={props.customColor}
      />

      {/* 3. The Lenses (Custom React Glass Shader) */}
      <mesh geometry={nodes.Object_16.geometry}>
        <meshPhysicalMaterial
          color="#000000"       // A dark sunglass tint
          transmission={0.9}    // 90% see-through glass
          opacity={1}           // Keep opacity 1 when using transmission
          metalness={0}         // Not metal
          roughness={0.05}      // Super smooth, highly reflective
          ior={1.5}             // Index of Refraction (1.5 is real glass)
          thickness={0.5}       // Gives the glass a heavy, premium thickness
        />
      </mesh>
    </group>
  )
}

useGLTF.preload('/glasses.glb')