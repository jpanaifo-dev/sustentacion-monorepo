import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personsService } from '../../../services/persons.service';
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
import { Person } from '../../../types';
import { Plus, Users, Search, FileEdit, Mail, Phone, CreditCard, Trash2, Image as ImageIcon } from 'lucide-react';

export const PersonsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    document_number: '',
    photo_url: '',
  });

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personsService.getPersons(),
  });

  const filteredPersons = persons.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      (p.document_number && p.document_number.includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (editingPerson) {
        return personsService.updatePerson(editingPerson.id, formData);
      }
      return personsService.createPerson(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      setModalOpen(false);
      setEditingPerson(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (person: Person) => personsService.deletePerson(person.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['persons'] }); setDeletingPerson(null); },
  });

  const handleOpen = (p?: Person) => {
    if (p) {
      setEditingPerson(p);
      setFormData({
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email || '',
        phone: p.phone || '',
        document_number: p.document_number || '',
        photo_url: p.photo_url || '',
      });
    } else {
      setEditingPerson(null);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', document_number: '', photo_url: '' });
    }
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio de Personas"
        description="Sustentantes, jurados calificadores y docentes asesores de la EPG - UNAP"
      >
        <Button variant="default" className="gap-2" onClick={() => handleOpen()}>
          <Plus className="h-4 w-4" />
          <span>Registrar Persona</span>
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, apellido o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs sm:text-sm bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando directorio...</div>
        ) : (
          <Table paginate pageSize={10} emptyMessage="No hay personas para mostrar">
            <TableHeader>
              <TableRow>
                <TableHead>Apellidos y Nombres</TableHead>
                <TableHead>Documento / DNI</TableHead>
                <TableHead>Correo Electrónico</TableHead>
                <TableHead>Teléfono / Celular</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersons.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      {person.photo_url ? <img src={person.photo_url} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50"><ImageIcon className="h-3.5 w-3.5 text-slate-400" /></span>}
                      <span>{person.last_name}, {person.first_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium text-slate-700">
                    {person.document_number || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {person.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{person.email}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No registrado</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {person.phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{person.phone}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => handleOpen(person)}><FileEdit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" title="Eliminar persona" onClick={() => setDeletingPerson(person)}><Trash2 className="h-4 w-4" /></Button></div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmModal open={!!deletingPerson} onOpenChange={(open) => !open && setDeletingPerson(null)} title="Eliminar persona" description={`¿Confirmas eliminar a ${deletingPerson?.first_name ?? ''} ${deletingPerson?.last_name ?? ''}? Esta acción no se puede deshacer.`} confirmLabel={deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'} variant="destructive" onConfirm={() => deletingPerson && deleteMutation.mutate(deletingPerson)} />

      {/* Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Editar Datos de Persona' : 'Registrar Nueva Persona'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nombres *</Label>
                <Input
                  placeholder="Ej: Carlos Alberto"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Apellidos *</Label>
                <Input
                  placeholder="Ej: Mendoza Ríos"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">DNI / Documento</Label>
                <Input
                  placeholder="72341201"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Teléfono / Celular</Label>
                <Input
                  placeholder="965123456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Correo Electrónico (Para notificaciones)</Label>
              <Input
                type="email"
                placeholder="cmendoza@unapiquitos.edu.pe"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL de foto</Label>
              <Input type="url" placeholder="https://.../foto.jpg" value={formData.photo_url} onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })} />
              <p className="text-[11px] text-slate-500">Puedes actualizar la URL de la foto institucional desde aquí.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              variant="unap"
              disabled={!formData.first_name || !formData.last_name || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar Persona'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
