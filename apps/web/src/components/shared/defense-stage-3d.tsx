import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { DefenseWithRelations } from '../../types';

type StageProps = { defense: DefenseWithRelations; compact?: boolean };

const PersonLabel: React.FC<{ position: [number, number, number]; name: string; role: string }> = ({ position, name, role }) => (
  <group position={position}>
    <mesh position={[0, 0.48, 0]} castShadow>
      <sphereGeometry args={[0.2, 8, 6]} />
      <meshStandardMaterial color="#d8d2c7" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.05, 0]} castShadow>
      <boxGeometry args={[0.42, 0.65, 0.32]} />
      <meshStandardMaterial color="#526071" roughness={0.82} />
    </mesh>
    <Text position={[0, 1.05, 0]} fontSize={0.12} maxWidth={1.2} color="#f2efe8" anchorX="center" anchorY="middle" textAlign="center">
      {name}
    </Text>
    <Text position={[0, 0.88, 0]} fontSize={0.075} maxWidth={1.2} color="#a8b2bf" anchorX="center" anchorY="middle" textAlign="center">
      {role}
    </Text>
  </group>
);

const StageScene: React.FC<StageProps> = ({ defense }) => {
  const student = defense.participants?.find((participant) => participant.participant_type === 'STUDENT');
  const jurors = defense.participants?.filter((participant) => participant.participant_type === 'JUROR').slice(0, 3) ?? [];
  const personName = (participant: any) => participant?.person ? `${participant.person.first_name} ${participant.person.last_name}` : 'No asignado';

  return (
    <>
      <color attach="background" args={['#0b1118']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 5]} intensity={2.2} color="#e7dfcd" castShadow />
      <pointLight position={[0, 3.5, 1]} intensity={8} distance={8} color="#b89b62" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#171d25" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.2, -2.8]} receiveShadow>
        <boxGeometry args={[11, 4.5, 0.18]} />
        <meshStandardMaterial color="#10161f" roughness={0.9} />
      </mesh>
      {Array.from({ length: 15 }).map((_, index) => (
        <mesh key={`slat-${index}`} position={[-3.5 + index * 0.5, 2.05, -2.67]} castShadow>
          <boxGeometry args={[0.12, 3.15, 0.08]} />
          <meshStandardMaterial color={index % 2 ? '#3c3027' : '#594432'} roughness={0.8} />
        </mesh>
      ))}

      <mesh position={[0, 0.18, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 0.35, 3]} />
        <meshStandardMaterial color="#2b3036" roughness={0.8} />
      </mesh>
      {[-1.55, -0.9, -0.25].map((z, index) => (
        <mesh key={`front-step-${index}`} position={[0, 0.08 - index * 0.1, z + 0.9]} castShadow receiveShadow>
          <boxGeometry args={[6.9 - index * 0.35, 0.16, 0.38]} />
          <meshStandardMaterial color="#222a34" roughness={0.84} />
        </mesh>
      ))}
      <mesh position={[0, 0.28, -1.32]}>
        <boxGeometry args={[6.1, 0.035, 0.06]} />
        <meshStandardMaterial color="#c59a54" emissive="#8d642b" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.42, -1.05]} castShadow>
        <boxGeometry args={[4.7, 0.18, 0.55]} />
        <meshStandardMaterial color="#6f5842" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.84, -1.38]} castShadow>
        <boxGeometry args={[4.35, 0.72, 0.5]} />
        <meshStandardMaterial color="#30241e" roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.22, -1.38]} castShadow>
        <boxGeometry args={[4.55, 0.12, 0.62]} />
        <meshStandardMaterial color="#76583d" roughness={0.76} />
      </mesh>
      <mesh position={[0, 1.92, -2.58]} castShadow>
        <boxGeometry args={[4.6, 2.1, 0.08]} />
        <meshStandardMaterial color="#202a35" roughness={0.7} metalness={0.12} />
      </mesh>
      <Text position={[0, 2.28, -2.52]} rotation={[0, 0, 0]} fontSize={0.18} maxWidth={3.8} color="#f1eee6" anchorX="center" anchorY="middle" textAlign="center">
        {defense.title || 'Sustentación de tesis'}
      </Text>
      <Text position={[0, 1.72, -2.52]} fontSize={0.11} color="#b89b62" anchorX="center" anchorY="middle">
        AGENDA DE SUSTENTACIONES · EPG UNAP
      </Text>

      {/* Bandera y vegetación lateral, como en el auditorio de referencia */}
      <mesh position={[-3.42, 1.22, -1.72]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 2.2, 8]} />
        <meshStandardMaterial color="#b6a98c" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh position={[-3.1, 1.65, -1.72]} rotation={[0, 0.08, 0]} castShadow>
        <planeGeometry args={[0.72, 1.05]} />
        <meshStandardMaterial color="#b9232f" side={2} roughness={0.82} />
      </mesh>
      <mesh position={[-3.42, 0.2, -1.72]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.12, 8]} />
        <meshStandardMaterial color="#171b20" roughness={0.7} metalness={0.3} />
      </mesh>
      {[-2.75, 2.75].map((x) => (
        <group key={`plant-${x}`} position={[x, 0.46, -2.15]}>
          <mesh castShadow><boxGeometry args={[0.46, 0.62, 0.46]} /><meshStandardMaterial color="#20252a" roughness={0.9} /></mesh>
          {[-0.2, 0, 0.2].map((offset) => (
            <mesh key={offset} position={[offset, 0.65 + Math.abs(offset) * 0.4, 0]} rotation={[0, offset * 2, offset * 1.2]} castShadow>
              <coneGeometry args={[0.16, 0.9, 5]} />
              <meshStandardMaterial color={offset === 0 ? '#587b44' : '#3d6338'} roughness={0.92} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh position={[0, 0.92, -0.75]} castShadow>
        <boxGeometry args={[1.65, 0.85, 0.62]} />
        <meshStandardMaterial color="#594936" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.38, -0.75]} castShadow>
        <boxGeometry args={[1.78, 0.08, 0.7]} />
        <meshStandardMaterial color="#8b6d48" roughness={0.7} />
      </mesh>
      <PersonLabel position={[2.25, 1.35, -0.38]} name={personName(student)} role="Sustentante" />

      {jurors.map((juror, index) => (
        <PersonLabel key={juror.id || index} position={[-2 + index * 2, 0.42, -1.42]} name={personName(juror)} role="Jurado" />
      ))}

      <mesh position={[-2.3, 0.78, -0.35]} castShadow>
        <boxGeometry args={[1.7, 0.68, 0.72]} />
        <meshStandardMaterial color="#30241e" roughness={0.86} />
      </mesh>
      <mesh position={[-2.3, 1.16, -0.35]} castShadow>
        <boxGeometry args={[1.85, 0.1, 0.82]} />
        <meshStandardMaterial color="#76583d" roughness={0.76} />
      </mesh>
      <PersonLabel position={[-2.3, 1.27, 0.04]} name={personName(defense.participants?.find((participant) => participant.participant_type === 'ADVISOR'))} role="Asesor" />

      <mesh position={[2.25, 0.62, -0.92]} castShadow>
        <boxGeometry args={[0.82, 1.05, 0.58]} />
        <meshStandardMaterial color="#4a3526" roughness={0.84} />
      </mesh>
      <mesh position={[2.25, 1.18, -0.92]} castShadow>
        <boxGeometry args={[0.96, 0.1, 0.7]} />
        <meshStandardMaterial color="#896546" roughness={0.75} />
      </mesh>
      <Text position={[2.25, 1.24, -0.54]} rotation={[0, 0, 0]} fontSize={0.08} color="#c8b18b" anchorX="center" anchorY="middle">
        EPG UNAP
      </Text>

      {Array.from({ length: 4 }).map((_, row) => Array.from({ length: 7 }).map((__, column) => (
        <group key={`seat-${row}-${column}`} position={[-3.6 + column * 1.2, 0.28 - row * 0.04, 1.25 + row * 0.72]}>
          <mesh castShadow><boxGeometry args={[0.65, 0.28, 0.48]} /><meshStandardMaterial color="#202a37" roughness={0.86} /></mesh>
          <mesh position={[0, 0.42, 0.18]} castShadow><boxGeometry args={[0.65, 0.72, 0.12]} /><meshStandardMaterial color="#273443" roughness={0.9} /></mesh>
        </group>
      )))}
    </>
  );
};

export const DefenseStage3D: React.FC<StageProps> = ({ defense, compact = false }) => (
  <div className={`relative overflow-hidden rounded-sm border border-slate-700 bg-[#0b1118] ${compact ? 'h-[270px]' : 'h-[390px] sm:h-[450px]'}`}>
    <Canvas shadows camera={{ position: [6.7, 4.8, 7.2], fov: 34 }} dpr={[1, 1.5]}>
      <StageScene defense={defense} compact={compact} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={11} minPolarAngle={0.7} maxPolarAngle={1.35} target={[0, 1, -0.4]} />
    </Canvas>
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-sm border border-white/10 bg-black/45 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-slate-300 backdrop-blur-sm">
      Previsualización del estrado · arrastra para explorar
    </div>
  </div>
);
