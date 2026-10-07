import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useQuery } from '@tanstack/react-query';
import { spacesService } from '../../services/spaces.service';
import { Button } from '../../components/ui/button';
import { Building2, Layers3, MapPin, Rotate3d } from 'lucide-react';

type Room = { id: string; name: string; capacity: number; position: [number, number, number]; size: [number, number, number] };

const rooms: Room[] = [
  { id: 'aula-01', name: 'Aula 01', capacity: 50, position: [-3.2, 0.55, -1.5], size: [2.4, 1, 1.7] },
  { id: 'aula-02', name: 'Aula 02', capacity: 47, position: [0, 0.55, -1.5], size: [2.4, 1, 1.7] },
  { id: 'aula-03', name: 'Aula 03', capacity: 50, position: [3.2, 0.55, -1.5], size: [2.4, 1, 1.7] },
  { id: 'aula-04', name: 'Aula 04', capacity: 26, position: [-3.2, 0.55, 1.2], size: [2.4, 1, 1.7] },
  { id: 'aula-05', name: 'Aula 05', capacity: 30, position: [0, 0.55, 1.2], size: [2.4, 1, 1.7] },
  { id: 'aula-06', name: 'Aula 06', capacity: 26, position: [3.2, 0.55, 1.2], size: [2.4, 1, 1.7] },
];

const VisualRoom: React.FC<{ room: Room; selected: boolean; onSelect: () => void; floor: number }> = ({ room, selected, onSelect, floor }) => (
  <group position={[room.position[0], room.position[1] + (floor - 1) * 2.1, room.position[2]]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={room.size} />
      <meshStandardMaterial color={selected ? '#c59b27' : '#8d9aaa'} roughness={0.82} metalness={0.05} />
    </mesh>
    <mesh position={[0, 0.53, 0]}>
      <boxGeometry args={[room.size[0] * 0.78, 0.035, room.size[2] * 0.78]} />
      <meshStandardMaterial color="#d8c29a" roughness={0.9} />
    </mesh>
    <Text position={[0, 0.8, 0]} fontSize={0.18} color="#172235" anchorX="center" anchorY="middle">{room.name}</Text>
    <Text position={[0, 0.62, 0]} fontSize={0.11} color="#344054" anchorX="center" anchorY="middle">Aforo {room.capacity}</Text>
  </group>
);

export const PublicInfrastructurePage: React.FC = () => {
  const [floor, setFloor] = useState(1);
  const [selectedId, setSelectedId] = useState('aula-01');
  const { data: spaces = [] } = useQuery({ queryKey: ['public-spaces'], queryFn: () => spacesService.getSpaces(), staleTime: 60_000 });
  const selected = useMemo(() => rooms.find((room) => room.id === selectedId) || rooms[0], [selectedId]);
  const registeredSpace = spaces.find((space: any) => space.name?.toLowerCase() === selected.name.toLowerCase());

  return (
    <div className="min-h-[calc(100vh-110px)] bg-[#f7f2e7] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a66d35]">Escuela de Postgrado UNAP</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#091E3A] sm:text-5xl">Infraestructura académica</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Explora la distribución referencial de aulas y espacios de la Escuela de Postgrado.</p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[#eadfc8] bg-white px-3 py-2 text-xs text-slate-600"><Rotate3d className="h-4 w-4 text-[#a66d35]" /> Arrastra para rotar · rueda para acercar</div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative h-[560px] overflow-hidden rounded-xl border border-[#d9c9aa] bg-[#101722] shadow-lg">
            <Canvas shadows camera={{ position: [8, 7, 9], fov: 38 }}>
              <color attach="background" args={['#101722']} />
              <ambientLight intensity={1.2} />
              <directionalLight position={[5, 8, 5]} intensity={2.4} castShadow />
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[13, 10]} /><meshStandardMaterial color="#242c38" roughness={0.95} /></mesh>
              <mesh position={[0, 1.1 + (floor - 1) * 2.1, 0]} castShadow><boxGeometry args={[10.5, 0.18, 6.5]} /><meshStandardMaterial color="#394554" roughness={0.85} /></mesh>
              {rooms.map((room) => <VisualRoom key={room.id} room={room} floor={floor} selected={room.id === selectedId} onSelect={() => setSelectedId(room.id)} />)}
              <Text position={[0, 0.2 + (floor - 1) * 2.1, 3.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#c59b27" anchorX="center">ESCUELA DE POSTGRADO UNAP</Text>
              <OrbitControls enablePan={false} minDistance={7} maxDistance={16} maxPolarAngle={1.45} target={[0, 0.8 + (floor - 1) * 2.1, 0]} />
            </Canvas>
            <div className="absolute left-4 top-4 rounded-md border border-white/15 bg-black/35 px-3 py-2 text-xs text-slate-200 backdrop-blur">Modelo referencial · Piso {floor}</div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-[#eadfc8] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><Building2 className="h-4 w-4 text-[#091E3A]" /><h2 className="text-sm font-semibold text-[#091E3A]">Navegación del edificio</h2></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[1, 2].map((value) => <Button key={value} type="button" variant={floor === value ? 'default' : 'outline'} onClick={() => setFloor(value)} className="rounded-md">Piso {value}</Button>)}
              </div>
              <p className="mt-3 text-xs text-slate-500">Selecciona un aula dentro del modelo para consultar sus datos.</p>
            </div>
            <div className="rounded-xl border border-[#eadfc8] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><MapPin className="h-4 w-4 text-[#a66d35]" /> Ambiente seleccionado</div>
              <h2 className="mt-3 text-2xl font-semibold text-[#091E3A]">{selected.name}</h2>
              <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 text-sm">
                <div className="grid grid-cols-[110px_1fr]"><span className="bg-slate-50 px-3 py-2 text-xs text-slate-500">Capacidad</span><span className="px-3 py-2 font-medium">{registeredSpace?.capacity || selected.capacity} personas</span></div>
                <div className="grid grid-cols-[110px_1fr]"><span className="bg-slate-50 px-3 py-2 text-xs text-slate-500">Estado</span><span className="px-3 py-2 font-medium text-emerald-700">Disponible para consulta</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-[#eadfc8] bg-[#fffaf0] p-5 text-xs text-slate-600"><div className="flex items-center gap-2 font-semibold text-[#091E3A]"><Layers3 className="h-4 w-4" /> Próxima integración</div><p className="mt-2 leading-relaxed">Esta vista queda preparada para reemplazar el modelo referencial por la geometría convertida del archivo DWG.</p></div>
          </aside>
        </div>
      </div>
    </div>
  );
};
