import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { facilitiesService } from '../../../services/facilities.service';
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
import { Facility } from '../../../types';
import { Plus, Building2, MapPin, FileEdit, Power, Trash2 } from 'lucide-react';

export const FacilitiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    reference: '',
  });

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => facilitiesService.getFacilities(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingFacility) {
        return facilitiesService.updateFacility(editingFacility.id, formData);
      }
      return facilitiesService.createFacility({ ...formData, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      setModalOpen(false);
      setEditingFacility(null);
    },
    onError: (error) => {
      toast.error('No se pudo guardar la sede', { description: error instanceof Error ? error.message : 'La API rechazó la operación.' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (f: Facility) => facilitiesService.toggleActive(f.id, f.is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (facility: Facility) => facilitiesService.deleteFacility(facility.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['facilities'] }); setDeletingFacility(null); },
  });

  const handleOpen = (f?: Facility) => {
    if (f) {
      setEditingFacility(f);
      setFormData({
        name: f.name,
        description: f.description || '',
        address: f.address || '',
        reference: f.reference || '',
      });
    } else {
      setEditingFacility(null);
      setFormData({ name: '', description: '', address: '', reference: '' });
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instalaciones y Sedes"
        description="Sedes institucionales donde se desarrollan las sustentaciones"
      >
        <Button variant="default" className="gap-2" onClick={() => handleOpen()}>
          <Plus className="h-4 w-4" />
          <span>Nueva Instalación</span>
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando instalaciones...</div>
        ) : (
          <Table paginate pageSize={10} emptyMessage="No hay sedes para mostrar">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre de Sede</TableHead>
                <TableHead>Dirección y Referencia</TableHead>
                <TableHead>Espacios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((fac) => (
                <TableRow key={fac.id}>
                  <TableCell>
                    <div className="font-bold text-slate-900 text-sm">{fac.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{fac.description}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{fac.address}</span>
                    </div>
                    {fac.reference && (
                      <div className="text-[11px] text-slate-500 ml-5 mt-0.5">Ref: {fac.reference}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-semibold text-slate-700">
                      {fac.spaces?.length || 0} espacios
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        fac.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {fac.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => handleOpen(fac)}>
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${fac.is_active ? 'text-amber-600' : 'text-emerald-600'}`}
                        onClick={() => toggleMutation.mutate(fac)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" title="Eliminar sede" onClick={() => setDeletingFacility(fac)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmModal open={!!deletingFacility} onOpenChange={(open) => !open && setDeletingFacility(null)} title="Eliminar sede" description={`¿Confirmas eliminar la sede ${deletingFacility?.name ?? ''}? Los espacios relacionados podrían impedir la eliminación.`} confirmLabel={deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'} variant="destructive" onConfirm={() => deletingFacility && deleteMutation.mutate(deletingFacility)} />

      {/* Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFacility ? 'Editar Instalación' : 'Nueva Instalación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre de la Sede *</Label>
              <Input
                placeholder="Ej: Escuela de Postgrado UNAP - Sede Central"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dirección *</Label>
              <Input
                placeholder="Calle Los Lirios 125, San Juan Bautista, Iquitos"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Referencia</Label>
              <Input
                placeholder="Frente a la Plaza Abelardo Quiñones"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descripción</Label>
              <Textarea
                rows={2}
                placeholder="Pabellones académicos, oficinas administrativas..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              variant="unap"
              disabled={!formData.name || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar Sede'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
