import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../../services/users.service';
import { unitsService } from '../../../services/units.service';
import { PageHeader } from '../../../components/shared/page-header';
import { ConfirmModal } from '../../../components/shared/confirm-modal';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { UserWithDetails } from '../../../types';
import { Plus, UserCog, Mail, Power, FileEdit, Shield, Building2, Trash2 } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithDetails | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    document_number: '',
    role_ids: [] as string[],
    unit_ids: [] as string[],
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersService.getRoles(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsService.getUnits(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        return usersService.updateUser(editingUser.id, formData);
      }
      return usersService.createUser(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setEditingUser(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (u: UserWithDetails) => usersService.toggleActive(u.id, u.is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (u: UserWithDetails) => usersService.deleteUser(u.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setDeletingUser(null); },
  });

  const handleOpen = (u?: UserWithDetails) => {
    if (u) {
      setEditingUser(u);
      setFormData({
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone || '',
        document_number: u.document_number || '',
        role_ids: u.roles.map((r) => r.id),
        unit_ids: u.units.map((unit) => unit.id),
      });
    } else {
      setEditingUser(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        document_number: '',
        role_ids: [roles.find((r) => r.code === 'VIEWER')?.id || ''],
        unit_ids: [],
      });
    }
    setModalOpen(true);
  };

  const handleRoleToggle = (roleId: string) => {
    const exists = formData.role_ids.includes(roleId);
    if (exists) {
      setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== roleId) });
    } else {
      setFormData({ ...formData, role_ids: [...formData.role_ids, roleId] });
    }
  };

  const handleUnitToggle = (unitId: string) => {
    const exists = formData.unit_ids.includes(unitId);
    if (exists) {
      setFormData({ ...formData, unit_ids: formData.unit_ids.filter((id) => id !== unitId) });
    } else {
      setFormData({ ...formData, unit_ids: [...formData.unit_ids, unitId] });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Usuarios y Accesos"
        description="Administración de cuentas institucionales, asignación de múltiples roles y unidades"
      >
        <Button variant="default" className="gap-2" onClick={() => handleOpen()}>
          <Plus className="h-4 w-4" />
          <span>Nuevo Usuario</span>
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando usuarios...</div>
        ) : (
          <Table paginate pageSize={10} emptyMessage="No hay usuarios para mostrar">
            <TableHeader>
              <TableRow>
                <TableHead>Usuario / Nombre</TableHead>
                <TableHead>Roles Asignados (Multi-rol)</TableHead>
                <TableHead>Alcance de Unidades</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-bold text-slate-900 text-sm">{u.first_name} {u.last_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span>{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span
                          key={r.id}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.code === 'SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {u.roles.some((r) => r.code === 'SUPER_ADMIN' || r.code === 'ADMIN') ? (
                      <span className="font-semibold text-slate-900">Acceso Global</span>
                    ) : u.units.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.units.map((unit) => (
                          <span key={unit.id} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px]">
                            {unit.acronym || unit.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sin unidad asignada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {u.is_active ? 'Activo' : 'Deshabilitado'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => handleOpen(u)}>
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${u.is_active ? 'text-amber-600' : 'text-emerald-600'}`}
                        title={u.is_active ? 'Desactivar usuario' : 'Habilitar usuario'}
                        onClick={() => toggleMutation.mutate(u)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" title="Eliminar usuario" onClick={() => setDeletingUser(u)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmModal open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)} title="Eliminar usuario" description={`¿Confirmas eliminar a ${deletingUser?.first_name ?? ''} ${deletingUser?.last_name ?? ''}? Esta acción no se puede deshacer.`} confirmLabel={deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'} variant="destructive" onConfirm={() => deletingUser && deleteMutation.mutate(deletingUser)} />

      {/* User Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nombres *</Label>
                <Input
                  placeholder="Juan Carlos"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Apellidos *</Label>
                <Input
                  placeholder="Pérez Vargas"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Correo Institucional *</Label>
                <Input
                  type="email"
                  placeholder="jperez@unapiquitos.edu.pe"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teléfono</Label>
                <Input
                  placeholder="965123456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Multi-Role selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold block">Asignación de Roles (Multi-rol)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roles.map((r) => {
                  const isChecked = formData.role_ids.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked ? 'bg-unap-navy/5 border-unap-navy text-unap-navy font-semibold' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleRoleToggle(r.id)}
                        className="mt-0.5 rounded text-unap-navy"
                      />
                      <div>
                        <div>{r.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{r.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Multi-Unit selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold block">Alcance de Unidades Académicas</Label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {units.map((u) => {
                  const isChecked = formData.unit_ids.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleUnitToggle(u.id)}
                        className="rounded text-unap-navy"
                      />
                      <span>{u.acronym ? `[${u.acronym}] ` : ''}{u.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              variant="unap"
              disabled={!formData.first_name || !formData.email || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
