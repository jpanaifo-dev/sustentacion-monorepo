import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitsService } from '../../../services/units.service';
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
import { Unit } from '../../../types';
import { Plus, Building2, FileEdit, Power, Mail, Phone, Trash2, Search } from 'lucide-react';

export const UnitsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    acronym: '',
    description: '',
    institutional_email: '',
    phone: '',
  });

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsService.getUnits(),
  });

  const filteredUnits = units.filter((unit) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [unit.name, unit.code, unit.acronym, unit.description, unit.email, unit.institutional_email, unit.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      if (editingUnit) {
        return unitsService.updateUnit(editingUnit.id, formData);
      }
      return unitsService.createUnit({ ...formData, type: 'UNIDAD', email: formData.institutional_email, is_faculty: false, is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setModalOpen(false);
      setEditingUnit(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (unit: Unit) => unitsService.toggleActive(unit.id, unit.is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (unit: Unit) => unitsService.deleteUnit(unit.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['units'] }); setDeletingUnit(null); },
  });

  const handleOpenModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        code: unit.code,
        acronym: unit.acronym || '',
        description: unit.description || '',
        institutional_email: unit.institutional_email || '',
        phone: unit.phone || '',
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: '',
        code: '',
        acronym: '',
        description: '',
        institutional_email: '',
        phone: '',
      });
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades Académicas de Posgrado"
        description="Gestión de facultades, programas de maestría y doctorado de la EPG - UNAP"
      >
        <Button variant="default" className="gap-2" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4" />
          <span>Nueva Unidad</span>
        </Button>
      </PageHeader>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, código o abreviatura..." className="bg-white pl-9" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando unidades...</div>
        ) : (
          <Table paginate pageSize={10} emptyMessage="No hay unidades para mostrar">
            <TableHeader>
              <TableRow>
                <TableHead>Código / Siglas</TableHead>
                <TableHead>Nombre de Unidad</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-mono text-xs font-bold text-unap-navy">
                    {unit.code} {unit.acronym ? `(${unit.acronym})` : ''}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-sm">{unit.name}</div>
                    {unit.description && <div className="text-xs text-slate-500 mt-0.5">{unit.description}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {unit.institutional_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{unit.institutional_email}</span>
                      </div>
                    )}
                    {unit.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{unit.phone}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        unit.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {unit.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600"
                        onClick={() => handleOpenModal(unit)}
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${unit.is_active ? 'text-amber-600' : 'text-emerald-600'}`}
                        title={unit.is_active ? 'Desactivar unidad' : 'Activar unidad'}
                        onClick={() => toggleActiveMutation.mutate(unit)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" title="Eliminar unidad" onClick={() => setDeletingUnit(unit)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmModal open={!!deletingUnit} onOpenChange={(open) => !open && setDeletingUnit(null)} title="Eliminar unidad" description={`¿Confirmas eliminar ${deletingUnit?.name ?? ''}? Si tiene sustentaciones asociadas, la API impedirá eliminarla.`} confirmLabel={deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'} variant="destructive" onConfirm={() => deletingUnit && deleteMutation.mutate(deletingUnit)} />

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Editar Unidad Académica' : 'Nueva Unidad Académica'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre de la Unidad *</Label>
              <Input
                placeholder="Ej: Unidad de Posgrado de Ciencias e Ingeniería"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código Institucional *</Label>
                <Input
                  placeholder="Ej: UPG-CI"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Acrónimo / Siglas</Label>
                <Input
                  placeholder="Ej: UPG-CI"
                  value={formData.acronym}
                  onChange={(e) => setFormData({ ...formData, acronym: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Correo Institucional</Label>
                <Input
                  type="email"
                  placeholder="posgrado.ci@unapiquitos.edu.pe"
                  value={formData.institutional_email}
                  onChange={(e) => setFormData({ ...formData, institutional_email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teléfono</Label>
                <Input
                  placeholder="+51 065 241512"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descripción</Label>
              <Textarea
                rows={2}
                placeholder="Áreas temáticas, maestrías y doctorados adscritos..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              variant="unap"
              disabled={!formData.name || !formData.code || createOrUpdateMutation.isPending}
              onClick={() => createOrUpdateMutation.mutate()}
            >
              {createOrUpdateMutation.isPending ? 'Guardando...' : 'Guardar Unidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
