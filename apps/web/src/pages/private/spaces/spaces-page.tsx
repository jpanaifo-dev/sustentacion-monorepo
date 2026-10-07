import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spacesService } from '../../../services/spaces.service';
import { facilitiesService } from '../../../services/facilities.service';
import { mediaService } from '../../../services/media.service';
import { PageHeader } from '../../../components/shared/page-header';
import { ConfirmModal } from '../../../components/shared/confirm-modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Space, SpaceType } from '../../../types';
import { Plus, DoorOpen, Users, FileEdit, Power, Image as ImageIcon, Upload, Trash2, Search } from 'lucide-react';

export const SpacesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [selectedSpaceForImages, setSelectedSpaceForImages] = useState<Space | null>(null);
  const [deletingSpace, setDeletingSpace] = useState<Space | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('ALL');

  const [formData, setFormData] = useState({
    facility_id: '',
    name: '',
    type: 'CLASSROOM' as SpaceType,
    capacity: 30,
    floor: 'Piso 1',
    location_reference: '',
    description: '',
  });

  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: () => spacesService.getSpaces(),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => facilitiesService.getFacilities(),
  });

  const filteredSpaces = spaces.filter((space) => {
    const query = search.trim().toLowerCase();
    if (selectedFacilityId !== 'ALL' && space.facility_id !== selectedFacilityId) return false;
    if (!query) return true;
    return [space.name, space.type, space.floor, space.location_reference, space.description, space.facility?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const { data: spaceMedia = [] } = useQuery({
    queryKey: ['media', 'space', selectedSpaceForImages?.id],
    queryFn: () => (selectedSpaceForImages ? mediaService.getMediaByEntity('space', selectedSpaceForImages.id) : []),
    enabled: !!selectedSpaceForImages,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingSpace) {
        return spacesService.updateSpace(editingSpace.id, formData);
      }
      return spacesService.createSpace({ ...formData, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      setModalOpen(false);
      setEditingSpace(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (s: Space) => spacesService.toggleActive(s.id, s.is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (space: Space) => spacesService.deleteSpace(space.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['spaces'] }); setDeletingSpace(null); },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      mediaService.uploadMedia({ entity_type: 'space', entity_id: selectedSpaceForImages!.id, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'space', selectedSpaceForImages?.id] });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => mediaService.deleteMedia(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'space', selectedSpaceForImages?.id] });
    },
  });

  const handleOpen = (s?: Space) => {
    if (s) {
      setEditingSpace(s);
      setFormData({
        facility_id: s.facility_id,
        name: s.name,
        type: s.type,
        capacity: s.capacity || 30,
        floor: s.floor || '',
        location_reference: s.location_reference || '',
        description: s.description || '',
      });
    } else {
      setEditingSpace(null);
      setFormData({
        facility_id: facilities[0]?.id || '',
        name: '',
        type: 'CLASSROOM',
        capacity: 30,
        floor: 'Piso 1',
        location_reference: '',
        description: '',
      });
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espacios Físicos de Sustentación"
        description="Aulas, salas de grados, auditorios y aforo de la EPG - UNAP"
      >
        <Button variant="default" className="gap-2" onClick={() => handleOpen()}>
          <Plus className="h-4 w-4" />
          <span>Nuevo Espacio</span>
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por espacio, sede, tipo o piso..." className="bg-white pl-9" />
        </div>
        <select value={selectedFacilityId} onChange={(event) => setSelectedFacilityId(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 sm:w-72">
          <option value="ALL">Todas las sedes</option>
          {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando espacios...</div>
        ) : (
          <Table paginate pageSize={10} emptyMessage="No hay espacios para mostrar">
            <TableHeader>
              <TableRow>
                <TableHead>Espacio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sede / Piso</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSpaces.map((space) => (
                <TableRow key={space.id}>
                  <TableCell>
                    <div className="font-bold text-slate-900 text-sm">{space.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{space.description}</div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100">{space.type}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div className="font-medium text-slate-900">{space.facility?.name}</div>
                    <div className="text-[11px] text-slate-500">{space.floor || 'Planta baja'} {space.location_reference ? `(${space.location_reference})` : ''}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {space.capacity} personas
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        space.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {space.is_active ? 'Habilitado' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Ver / Subir Fotos"
                        onClick={() => {
                          setSelectedSpaceForImages(space);
                          setImagesModalOpen(true);
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => handleOpen(space)}>
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${space.is_active ? 'text-amber-600' : 'text-emerald-600'}`}
                        onClick={() => toggleMutation.mutate(space)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" title="Eliminar espacio" onClick={() => setDeletingSpace(space)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmModal open={!!deletingSpace} onOpenChange={(open) => !open && setDeletingSpace(null)} title="Eliminar espacio" description={`¿Confirmas eliminar el espacio ${deletingSpace?.name ?? ''}? Esta acción no se puede deshacer.`} confirmLabel={deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'} variant="destructive" onConfirm={() => deletingSpace && deleteMutation.mutate(deletingSpace)} />

      {/* Create/Edit Space Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpace ? 'Editar Espacio' : 'Nuevo Espacio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Instalación / Sede *</Label>
              <select
                value={formData.facility_id}
                onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nombre del Espacio *</Label>
                <Input
                  placeholder="Ej: Sala de Grados A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Espacio *</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as SpaceType })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                >
                  <option value="DEGREE_ROOM">Sala de Grados</option>
                  <option value="AUDITORIUM">Auditorio</option>
                  <option value="CLASSROOM">Aula</option>
                  <option value="MEETING_ROOM">Sala de Reuniones</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Aforo / Capacidad</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Piso / Nivel</Label>
                <Input
                  placeholder="Piso 2"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ubicación / Referencia Interna</Label>
              <Input
                placeholder="Ala Norte, Pabellón Administrativo"
                value={formData.location_reference}
                onChange={(e) => setFormData({ ...formData, location_reference: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Equipamiento / Descripción</Label>
              <Textarea
                rows={2}
                placeholder="Proyector láser, microfonía, sistema de sonido..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              variant="unap"
              disabled={!formData.name || !formData.facility_id || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar Espacio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Space Images Dialog (Cloudflare) */}
      {selectedSpaceForImages && (
        <Dialog open={imagesModalOpen} onOpenChange={setImagesModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-unap-navy" />
                <span>Imágenes de: {selectedSpaceForImages.name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Fotografías institucionales del espacio (almacenadas de forma segura vía Cloudflare)
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMutation.mutate(file);
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-unap-navy text-white hover:bg-unap-blue transition-all">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Subir Foto</span>
                  </span>
                </label>
              </div>

              {spaceMedia.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No hay fotografías cargadas para este espacio.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {spaceMedia.map((m) => (
                    <div key={m.id} className="relative rounded-lg border border-slate-200 overflow-hidden group">
                      <img src={m.url} alt="Foto del espacio" className="h-32 w-full object-cover" />
                      <button
                        onClick={() => deleteMediaMutation.mutate(m.id)}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full opacity-90 hover:opacity-100 transition-all shadow-md"
                        title="Eliminar foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImagesModalOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
