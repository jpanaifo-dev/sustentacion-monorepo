import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { defensesService, CreateDefensePayload } from '../../../services/defenses.service';
import { unitsService } from '../../../services/units.service';
import { facilitiesService } from '../../../services/facilities.service';
import { spacesService } from '../../../services/spaces.service';
import { personsService } from '../../../services/persons.service';
import { programsService } from '../../../services/programs.service';
import { detectScheduleConflicts } from '../../../services/conflictChecker';
import { defenseDraftSchema, defenseConfirmSchema, DefenseDraftInput } from '../../../schemas';
import { PageHeader } from '../../../components/shared/page-header';
import { ConflictCheckerAlert } from '../../../components/shared/conflict-checker-alert';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { calculateEndTime } from '../../../lib/utils';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Building2,
  MapPin,
  Users,
  Video,
  Search,
  ChevronDown,
  Pencil,
  Info,
  Settings2,
} from 'lucide-react';
import { JurorRole, ParticipantType } from '../../../types';
import { toast } from 'sonner';

const normalizeDateInput = (value?: string | null) => {
  if (!value) return '';
  // The API may return an ISO datetime; input[type=date] only accepts YYYY-MM-DD.
  return value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
};

const SaveActionSelect: React.FC<{ disabled?: boolean; onSave: (asConfirmed: boolean) => void; compact?: boolean }> = ({ disabled, onSave, compact }) => {
  const [open, setOpen] = useState(false);
  const buttonClass = compact ? 'h-9 px-3 text-xs' : 'h-10 px-4 text-sm';

  return (
    <div className="relative">
      <div className="inline-flex rounded-md shadow-sm">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(false)}
          className={`inline-flex items-center gap-2 rounded-l-md border border-r-0 border-slate-300 bg-white font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 ${buttonClass}`}
        >
          <Save className="h-4 w-4" />
          <span>Guardar como Borrador (DRAFT)</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          aria-label="Más acciones de guardado"
          className={`rounded-r-md border border-slate-300 bg-white px-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 ${buttonClass}`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => { setOpen(false); onSave(false); }}
            className="flex w-full items-start gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
          >
            <Save className="mt-0.5 h-4 w-4 text-slate-600" />
            <span><strong className="block text-xs text-slate-900">Guardar como Borrador (DRAFT)</strong><small className="text-[11px] text-slate-500">Guardar y continuar editando después</small></span>
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onSave(true); }}
            className="flex w-full items-start gap-2 rounded px-3 py-2 text-left hover:bg-slate-50"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
            <span><strong className="block text-xs text-slate-900">Validar y Confirmar Sustentación</strong><small className="text-[11px] text-slate-500">Validar datos y publicar la sustentación</small></span>
          </button>
        </div>
      )}
    </div>
  );
};

export const DefenseFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [participantMode, setParticipantMode] = useState<'search' | 'create'>('search');
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [participantEditIndex, setParticipantEditIndex] = useState<number | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [participantTypeDraft, setParticipantTypeDraft] = useState<ParticipantType>('JUROR');
  const [participantRoleDraft, setParticipantRoleDraft] = useState<JurorRole>('MEMBER');
  const [newPerson, setNewPerson] = useState({ first_name: '', last_name: '', email: '', phone: '', document_number: '' });
  const [programSearch, setProgramSearch] = useState('');
  const [programMenuOpen, setProgramMenuOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [spaceConfigOpen, setSpaceConfigOpen] = useState(false);

  // Queries
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => unitsService.getUnits() });
  const { data: facilities = [] } = useQuery({ queryKey: ['facilities'], queryFn: () => facilitiesService.getFacilities() });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => spacesService.getSpaces() });
  const { data: persons = [] } = useQuery({ queryKey: ['persons'], queryFn: () => personsService.getPersons() });
  const { data: institutionalPersonResults = [], isFetching: isSearchingPersons } = useQuery({
    queryKey: ['persons-search', participantSearch.trim()],
    queryFn: () => personsService.searchPeople(participantSearch.trim()),
    enabled: participantModalOpen && participantMode === 'search' && participantSearch.trim().length >= 2,
    staleTime: 30_000,
  });
  const { data: allDefenses = [] } = useQuery({ queryKey: ['defenses'], queryFn: () => defensesService.getDefenses() });
  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery({
    queryKey: ['postgraduate-programs', programSearch],
    queryFn: () => programsService.getPrograms(programSearch),
    staleTime: 1000 * 60 * 30,
  });

  const { data: existingDefense, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['defense', id],
    queryFn: () => (id ? defensesService.getDefenseById(id) : null),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(defenseDraftSchema as any),
    defaultValues: {
      unit_id: '',
      program_uuid: '',
      program_code: '',
      program_name: '',
      office_number: '',
      title: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      start_time: '10:00:00',
      estimated_duration_minutes: 120,
      modality: 'PRESENTIAL',
      facility_id: null,
      space_id: null,
      virtual_platform: '',
      virtual_url: '',
      observations: '',
      internal_notes: '',
      participants: [],
    },
  });

  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: 'participants',
  });

  const createPersonMutation = useMutation({
    mutationFn: () => {
      const normalizedEmail = newPerson.email.trim().toLowerCase();
      const normalizedDocument = newPerson.document_number.trim();
      const duplicate = persons.find((person) =>
        (normalizedDocument && person.document_number?.trim() === normalizedDocument) ||
        (normalizedEmail && person.email?.trim().toLowerCase() === normalizedEmail)
      );
      if (duplicate) throw new Error('Ya existe una persona con ese correo o documento. Selecciónala desde la búsqueda.');
      return personsService.createPerson({
        first_name: newPerson.first_name.trim(),
        last_name: newPerson.last_name.trim(),
        email: normalizedEmail || null,
        phone: newPerson.phone.trim() || null,
        document_number: normalizedDocument || null,
      });
    },
    onSuccess: (person) => {
      queryClient.setQueryData(['persons'], (current: any[] | undefined) => current?.some((candidate) => candidate.id === person.id) ? current : [...(current ?? []), person]);
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      setSelectedParticipant(person);
      setNewPerson({ first_name: '', last_name: '', email: '', phone: '', document_number: '' });
      setParticipantError(null);
    },
    onError: (error) => setParticipantError(error instanceof Error ? error.message : 'No se pudo registrar la persona.'),
  });

  const resolvePersonMutation = useMutation({
    mutationFn: (input: { candidate: any; participantType: ParticipantType; role: JurorRole }) => personsService.resolvePerson({
      ...input.candidate,
      first_name: input.candidate.first_name,
      last_name: input.candidate.last_name,
      document_number: input.candidate.document_number || null,
      email: input.candidate.email || null,
      phone: input.candidate.phone || null,
      photo_url: input.candidate.photo_url || input.candidate.photo || null,
      external_id: input.candidate.external_id || null,
      external_uuid: input.candidate.external_uuid || null,
    }),
    onSuccess: (person, input) => {
      queryClient.setQueryData(['persons'], (current: any[] | undefined) => current?.some((candidate) => candidate.id === person.id) ? current : [...(current ?? []), person]);
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      append({ person_id: person.id, participant_type: input.participantType, role: input.participantType === 'JUROR' ? input.role : null, is_primary: false });
      setParticipantError(null);
      setParticipantSearch('');
      setSelectedParticipant(null);
      setParticipantModalOpen(false);
    },
    onError: (error) => setParticipantError(error instanceof Error ? error.message : 'No se pudo registrar la persona institucional.'),
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (input: { participants: any[]; removed: any; index: number }) => {
      if (!id) return input.participants;
      return defensesService.syncParticipants(id, input.participants);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defense', id] });
      queryClient.invalidateQueries({ queryKey: ['defenses'] });
      toast.success('Participante eliminado', { description: 'El participante se quitó y la sustentación fue actualizada.' });
    },
    onError: (error: any, input) => {
      insert(input.index, input.removed);
      toast.error('No se pudo eliminar el participante', { description: error?.message || 'El API rechazó la actualización; se restauró el participante.' });
    },
  });

  const participantResults = participantSearch.trim().length >= 2
    ? institutionalPersonResults
    : [];

  const selectParticipant = (person: any) => {
    const localMatch = persons.find((candidate) =>
      (person.id && candidate.id === person.id) ||
      (person.external_uuid && candidate.external_uuid === person.external_uuid) ||
      (person.document_number && candidate.document_number === person.document_number)
    );
    const personId = localMatch?.id;
    if (personId && watchedParticipants.some((participant: any) => participant.person_id === personId) && participantEditIndex === null) {
      setParticipantError('Esta persona ya está agregada a la sustentación.');
      return;
    }
    setSelectedParticipant(personId ? { ...person, id: personId } : person);
    setParticipantError(null);
  };

  const openAddParticipant = () => {
    setParticipantEditIndex(null);
    setSelectedParticipant(null);
    setParticipantTypeDraft('JUROR');
    setParticipantRoleDraft('MEMBER');
    setParticipantMode('search');
    setParticipantSearch('');
    setParticipantError(null);
    setParticipantModalOpen(true);
  };

  const openEditParticipant = (index: number) => {
    const current = watchedParticipants[index] as any;
    const person = persons.find((candidate) => candidate.id === current?.person_id);
    setParticipantEditIndex(index);
    setSelectedParticipant(person ?? null);
    setParticipantTypeDraft(current?.participant_type ?? 'JUROR');
    setParticipantRoleDraft(current?.role ?? 'MEMBER');
    setParticipantError(null);
    setParticipantModalOpen(true);
  };

  const saveParticipantModal = () => {
    if (!selectedParticipant) {
      setParticipantError('Selecciona una persona antes de continuar.');
      return;
    }
    if (participantEditIndex !== null) {
      setValue(`participants.${participantEditIndex}.participant_type`, participantTypeDraft);
      setValue(`participants.${participantEditIndex}.role`, participantTypeDraft === 'JUROR' ? participantRoleDraft : null);
      setParticipantModalOpen(false);
      return;
    }
    if (selectedParticipant.id) {
      append({ person_id: selectedParticipant.id, participant_type: participantTypeDraft, role: participantTypeDraft === 'JUROR' ? participantRoleDraft : null, is_primary: false });
      setSelectedParticipant(null);
      setParticipantSearch('');
      setParticipantModalOpen(false);
    } else {
      resolvePersonMutation.mutate({ candidate: selectedParticipant, participantType: participantTypeDraft, role: participantRoleDraft });
    }
  };

  const handleRemoveParticipant = (index: number) => {
    const removed = watchedParticipants[index];
    const remaining = watchedParticipants.filter((_: any, participantIndex: number) => participantIndex !== index);
    remove(index);
    if (!id) {
      toast.success('Participante quitado del formulario', { description: 'El cambio se aplicará al guardar la sustentación.' });
      return;
    }
    removeParticipantMutation.mutate({ participants: remaining, removed, index });
  };

  // Watch fields for live end-time calculation and conflict detection
  const watchedStartTime = watch('start_time');
  const watchedDuration = watch('estimated_duration_minutes') || 120;
  const watchedDate = watch('scheduled_date');
  const watchedSpaceId = watch('space_id');
  const watchedFacilityId = watch('facility_id');
  const watchedModality = watch('modality');
  const watchedUnitId = watch('unit_id');
  const watchedProgramName = watch('program_name');
  const watchedParticipants = watch('participants') || [];

  const filteredPrograms = programs.filter((program) => {
    if (watchedUnitId && program.unit_uuid !== watchedUnitId) return false;
    return true;
  });
  const filteredUnits = units.filter((unit) => `${unit.acronym || ''} ${unit.name}`.toLowerCase().includes(unitSearch.trim().toLowerCase()));
  const selectedUnit = units.find((unit) => unit.id === watchedUnitId);

  // Filtered spaces by selected facility
  const availableSpaces = watchedFacilityId
    ? spaces.filter((s) => s.facility_id === watchedFacilityId && s.is_active)
    : spaces.filter((s) => s.is_active);

  // Set initial values when editing
  useEffect(() => {
    if (existingDefense) {
      reset({
        unit_id: existingDefense.unit_id,
        program_uuid: existingDefense.program_uuid || '',
        program_code: existingDefense.program_code || '',
        program_name: existingDefense.program_name || '',
        office_number: existingDefense.office_number || '',
        title: existingDefense.title,
        scheduled_date: normalizeDateInput(existingDefense.scheduled_date),
        start_time: existingDefense.start_time.substring(0, 5),
        estimated_duration_minutes: existingDefense.estimated_duration_minutes,
        modality: existingDefense.modality,
        facility_id: existingDefense.facility_id,
        space_id: existingDefense.space_id,
        virtual_platform: existingDefense.virtual_platform || '',
        virtual_url: existingDefense.virtual_url || '',
        observations: existingDefense.observations || '',
        internal_notes: existingDefense.internal_notes || '',
        participants: (existingDefense.participants || []).map((p) => ({
          person_id: p.person_id,
          participant_type: p.participant_type,
          role: p.role,
          is_primary: p.is_primary,
        })),
      });
    } else if (units.length > 0 && facilities.length > 0) {
      setValue('unit_id', units[0].id);
      setValue('facility_id', facilities[0].id);
      const firstSpace = spaces.find((s) => s.facility_id === facilities[0].id);
      if (firstSpace) setValue('space_id', firstSpace.id);
    }
  }, [existingDefense, units, facilities, spaces, reset, setValue]);

  // Calculated End Time
  const calculatedEndTime = watchedStartTime
    ? calculateEndTime(watchedStartTime, Number(watchedDuration))
    : '12:00:00';

  // Live Conflict Detection
  const participantPersonIds = watchedParticipants
    .filter((p: any) => p.person_id)
    .map((p: any) => {
      const personObj = persons.find((item) => item.id === p.person_id);
      return {
        person_id: p.person_id,
        type: p.participant_type as 'STUDENT' | 'JUROR' | 'ADVISOR',
        name: personObj ? `${personObj.first_name} ${personObj.last_name}` : undefined,
      };
    });

  const conflicts = detectScheduleConflicts({
    defenseId: id,
    scheduled_date: watchedDate,
    start_time: watchedStartTime,
    estimated_end_time: calculatedEndTime,
    space_id: watchedSpaceId,
    participantPersonIds,
    allDefenses,
  });

  const spaceAvailability = availableSpaces.map((space) => ({
    space,
    conflicts: detectScheduleConflicts({
      defenseId: id,
      scheduled_date: watchedDate,
      start_time: watchedStartTime,
      estimated_end_time: calculatedEndTime,
      space_id: space.id,
      participantPersonIds,
      allDefenses,
    }).filter((conflict) => conflict.type === 'SPACE'),
  }));

  const selectedSpace = spaces.find((space) => space.id === watchedSpaceId);
  const selectedStudents = watchedParticipants
    .filter((participant: any) => participant.participant_type === 'STUDENT')
    .map((participant: any) => persons.find((person) => person.id === participant.person_id))
    .filter(Boolean);

  // Save Mutations
  const saveMutation = useMutation({
    mutationFn: async ({ data, asConfirmed }: { data: any; asConfirmed: boolean }) => {
      if (!data.program_uuid || !data.program_name) {
        throw new Error('Seleccione un programa de posgrado antes de guardar la sustentación.');
      }
      if (asConfirmed) {
        // Strict validation check before confirming
        const validation = defenseConfirmSchema.safeParse(data);
        if (!validation.success) {
          const firstErr = validation.error.issues[0]?.message || 'Información incompleta para confirmar';
          throw new Error(firstErr);
        }
      }

      const payload: CreateDefensePayload = {
        unit_id: data.unit_id,
        program_uuid: data.program_uuid || null,
        program_code: data.program_code || null,
        program_name: data.program_name || null,
        office_number: data.office_number?.trim() || null,
        title: data.title || 'Sustentación en borrador',
        scheduled_date: data.scheduled_date,
        start_time: data.start_time.includes(':') && data.start_time.split(':').length === 2 ? `${data.start_time}:00` : data.start_time,
        estimated_duration_minutes: Number(data.estimated_duration_minutes),
        modality: data.modality,
        facility_id: data.facility_id || null,
        space_id: data.space_id || null,
        virtual_platform: data.virtual_platform || null,
        virtual_url: data.virtual_url || null,
        observations: data.observations || null,
        internal_notes: data.internal_notes || null,
        participants: data.participants as any,
        asConfirmed,
      };

      if (isEditing && id) {
        return defensesService.updateDefense(id, payload);
      }
      return defensesService.createDefense(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['defenses'] });
      queryClient.invalidateQueries({ queryKey: ['defense', result.id] });
      toast.success(isEditing ? 'Sustentación actualizada' : 'Sustentación creada', { description: 'Los datos y participantes se guardaron correctamente.' });
      navigate(`/admin/defenses/${result.id}`);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Error al guardar la sustentación');
      toast.error('No se pudo guardar la sustentación', { description: err.message || 'Verifica los datos e inténtalo nuevamente.' });
    },
  });

  const handleSave = (asConfirmed: boolean) => {
    setFormError(null);
    handleSubmit((data) => {
      saveMutation.mutate({ data, asConfirmed });
    })();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-slate-600"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>

        <SaveActionSelect compact disabled={saveMutation.isPending} onSave={handleSave} />
      </div>

      <PageHeader
        title={isEditing ? `Editar Sustentación: ${existingDefense?.code || ''}` : 'Nueva Sustentación de Tesis'}
        description="Complete la información académica, participantes y asignación de espacio físico o virtual."
      />

      {/* Conflict Warnings Banner */}
      <ConflictCheckerAlert conflicts={conflicts} />

      {/* Error banner */}
      {formError && (
        <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          {formError}
        </div>
      )}

      <form className="space-y-6">
        {/* Section 1: Información Académica */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-unap-navy" />
              <span>1. Información General y Académica</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Unidad de posgrado y título oficial de la tesis o trabajo académico
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <Label htmlFor="unit_search" className="text-xs font-semibold">Unidad Académica de Posgrado *</Label>
                <input type="hidden" {...register('unit_id')} />
                <div className="relative">
                  <Input
                    id="unit_search"
                    value={unitMenuOpen ? unitSearch : (selectedUnit ? `${selectedUnit.acronym ? `[${selectedUnit.acronym}] ` : ''}${selectedUnit.name}` : '')}
                    onFocus={() => { setUnitMenuOpen(true); setUnitSearch(''); }}
                    onChange={(event) => { setUnitSearch(event.target.value); setUnitMenuOpen(true); }}
                    placeholder="Buscar unidad académica..."
                    autoComplete="off"
                    className="pr-9"
                  />
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                {unitMenuOpen && (
                  <>
                    <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setUnitMenuOpen(false)} aria-label="Cerrar unidades" />
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                      {filteredUnits.length === 0 ? <div className="px-3 py-4 text-xs text-slate-500">No se encontraron unidades.</div> : filteredUnits.map((unit) => (
                        <button type="button" key={unit.id} onClick={() => {
                          setValue('unit_id', unit.id, { shouldValidate: true });
                          if (watchedProgramName && !programs.some((program) => program.uuid === watch('program_uuid') && program.unit_uuid === unit.id)) {
                            setValue('program_uuid', '');
                            setValue('program_code', '');
                            setValue('program_name', '');
                          }
                          setUnitSearch('');
                          setUnitMenuOpen(false);
                        }} className="w-full rounded px-3 py-2 text-left hover:bg-slate-50">
                          <span className="block text-xs font-semibold text-slate-900">{unit.name}</span>
                          {unit.acronym && <span className="block text-[11px] text-slate-500">{unit.acronym}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {errors.unit_id?.message && <p className="text-[11px] text-rose-600">{String(errors.unit_id.message)}</p>}
              </div>

              <div className="space-y-1.5 relative">
                <Label htmlFor="program_search" className="text-xs font-semibold">Programa de Posgrado *</Label>
                <input type="hidden" {...register('program_uuid')} />
                <input type="hidden" {...register('program_code')} />
                <input type="hidden" {...register('program_name')} />
                <div className="relative">
                  <Input
                    id="program_search"
                    value={programMenuOpen ? programSearch : (watchedProgramName || '')}
                    onFocus={() => { setProgramMenuOpen(true); setProgramSearch(''); }}
                    onChange={(event) => { setProgramSearch(event.target.value); setProgramMenuOpen(true); }}
                    placeholder={isLoadingPrograms ? 'Cargando programas...' : 'Buscar por código o nombre...'}
                    autoComplete="off"
                    disabled={isLoadingPrograms}
                    className="pr-9"
                  />
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                {programMenuOpen && !isLoadingPrograms && (
                  <>
                    <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setProgramMenuOpen(false)} aria-label="Cerrar programas" />
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                      {filteredPrograms.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-slate-500">No se encontraron programas.</div>
                      ) : filteredPrograms.map((program) => (
                        <button
                          type="button"
                          key={program.uuid}
                          onClick={() => {
                            setValue('program_uuid', program.uuid, { shouldValidate: true });
                            setValue('program_code', program.code, { shouldValidate: true });
                            setValue('program_name', program.name, { shouldValidate: true });
                            if (!watchedUnitId) setValue('unit_id', program.unit_uuid, { shouldValidate: true });
                            setProgramSearch('');
                            setProgramMenuOpen(false);
                          }}
                          className="w-full rounded px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <span className="block text-xs font-semibold text-slate-900">{program.name}</span>
                          <span className="block text-[11px] text-slate-500">Código: {program.code}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {!watchedProgramName && <p className="text-[11px] text-amber-700">Seleccione un programa para asociarlo a la sustentación.</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label htmlFor="modality" className="text-xs font-semibold">Modalidad *</Label>
                  <select
                    id="modality"
                    {...register('modality')}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                  >
                    <option value="PRESENTIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="HYBRID">Híbrida (Presencial + Virtual)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="office_number" className="flex items-center gap-1.5 text-xs font-semibold">
                    Número de oficio / documento
                    <span title="Referencia del oficio institucional asociado a la sustentación. Ejemplo: 2081-2026-CGA-EPG-UNAP" className="inline-flex cursor-help text-slate-400 hover:text-unap-navy"><Info className="h-3.5 w-3.5" /></span>
                  </Label>
                  <Input id="office_number" placeholder="Ej. 2081-2026-CGA-EPG-UNAP" {...register('office_number')} />
                  <p className="text-[11px] text-slate-500">Referencia documental institucional, si corresponde.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold">Título de la Tesis o Trabajo Académico *</Label>
              <Textarea
                id="title"
                rows={2}
                placeholder="Ingrese el título completo aprobado en el plan de tesis..."
                {...register('title')}
              />
              {errors.title?.message && <p className="text-[11px] text-rose-600">{String(errors.title.message)}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Programación Horaria */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-unap-navy" />
              <span>2. Programación de Horario</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Fecha, hora de inicio y cálculo automático de término estimado
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="scheduled_date" className="text-xs font-semibold">Fecha de Sustentación *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  {...register('scheduled_date')}
                />
                {errors.scheduled_date?.message && <p className="text-[11px] text-rose-600">{String(errors.scheduled_date.message)}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="start_time" className="text-xs font-semibold">Hora de Inicio *</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...register('start_time')}
                />
                {errors.start_time?.message && <p className="text-[11px] text-rose-600">{String(errors.start_time.message)}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimated_duration_minutes" className="text-xs font-semibold">Duración Estimada</Label>
                <select
                  id="estimated_duration_minutes"
                  {...register('estimated_duration_minutes')}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                >
                  <option value="60">60 minutos (1 hora)</option>
                  <option value="90">90 minutos (1.5 horas)</option>
                  <option value="120">120 minutos (2 horas predeterminada)</option>
                  <option value="150">150 minutos (2.5 horas)</option>
                  <option value="180">180 minutos (3 horas)</option>
                </select>
              </div>
            </div>

            {/* Calculated End Time Indicator */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-unap-navy" />
                <span>Horario calculado de sustentación:</span>
              </span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {watchedStartTime || '10:00'} — {calculatedEndTime.substring(0, 5)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Ubicación y Espacio Físico / Virtual */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-unap-navy" />
                <span>3. Asignación de Espacio Físico / Plataforma</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Instalación, espacio seleccionado y enlaces para modalidad virtual
              </CardDescription>
            </div>
            {(watchedModality === 'PRESENTIAL' || watchedModality === 'HYBRID') && (
              <Button type="button" variant="outline" size="icon" title="Configuración avanzada de espacio" onClick={() => setSpaceConfigOpen(true)}>
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">Abrir configuración avanzada de espacio</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {(watchedModality === 'PRESENTIAL' || watchedModality === 'HYBRID') && (
              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Espacio presencial</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {facilities.find((facility) => facility.id === watchedFacilityId)?.name || 'Sede no seleccionada'}
                      {' · '}
                      {selectedSpace?.name || 'Aula no seleccionada'}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setSpaceConfigOpen(true)}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Configurar disponibilidad
                  </Button>
                </div>
                {watchedSpaceId && (
                  <button
                    type="button"
                    className="mt-3 text-xs font-medium text-slate-600 underline-offset-2 hover:text-unap-navy hover:underline"
                    onClick={() => setValue('space_id', null, { shouldValidate: true, shouldDirty: true })}
                  >
                    Quitar aula asignada
                  </button>
                )}
                {!watchedFacilityId || !watchedSpaceId ? (
                  <p className="mt-3 text-xs text-slate-500">Puedes confirmar sin aula y asignar el espacio posteriormente.</p>
                ) : conflicts.some((conflict) => conflict.type === 'SPACE') ? (
                  <p className="mt-3 text-xs font-medium text-amber-700">Hay un cruce en el espacio seleccionado. Revisa la configuración avanzada.</p>
                ) : (
                  <p className="mt-3 text-xs font-medium text-emerald-700">Espacio disponible para el horario actual.</p>
                )}
              </div>
            )}

            {(watchedModality === 'VIRTUAL' || watchedModality === 'HYBRID') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label htmlFor="virtual_platform" className="text-xs font-semibold">Plataforma Virtual</Label>
                  <Input
                    id="virtual_platform"
                    placeholder="Ej: Google Meet, Zoom Institucional..."
                    {...register('virtual_platform')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="virtual_url" className="text-xs font-semibold">Enlace de Videoconferencia (URL)</Label>
                  <Input
                    id="virtual_url"
                    placeholder="https://meet.google.com/..."
                    {...register('virtual_url')}
                  />
                  {errors.virtual_url?.message && <p className="text-[11px] text-rose-600">{String(errors.virtual_url.message)}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={spaceConfigOpen} onOpenChange={setSpaceConfigOpen}>
          <DialogContent className="h-screen max-h-screen w-screen max-w-none gap-0 rounded-none border-0 p-0">
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
              <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-6 py-5 pr-16 text-left">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Settings2 className="h-5 w-5 text-unap-navy" />
                  Configuración avanzada de espacio
                </DialogTitle>
                <DialogDescription>
                  Revisa la disponibilidad del aula considerando la fecha, horario y sustentantes seleccionados.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Horario de la sustentación</CardTitle>
                        <CardDescription className="text-xs">La disponibilidad se calcula en tiempo real.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Fecha</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{watchedDate || 'Sin fecha'}</p>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Horario</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{watchedStartTime || '--:--'} — {calculatedEndTime.slice(0, 5)}</p>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Sustentantes</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{selectedStudents.length || 'Ninguno seleccionado'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Sede e instalaciones</CardTitle>
                        <CardDescription className="text-xs">Selecciona una sede para filtrar sus aulas.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="advanced_facility_id" className="text-xs font-semibold">Instalación / Sede (opcional)</Label>
                          <select
                            id="advanced_facility_id"
                            value={watchedFacilityId || ''}
                            onChange={(event) => {
                              const facilityId = event.target.value;
                              setValue('facility_id', facilityId || null, { shouldValidate: true, shouldDirty: true });
                              const firstSpace = spaces.find((space) => space.facility_id === facilityId && space.is_active);
                              setValue('space_id', firstSpace?.id || null, { shouldValidate: true, shouldDirty: true });
                            }}
                            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-unap-navy"
                          >
                            <option value="">Seleccione una instalación...</option>
                            {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs font-semibold">Espacios disponibles para revisar</Label>
                            <p className="mt-1 text-[11px] text-slate-500">Los espacios con cruce quedan marcados antes de guardar.</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setValue('space_id', null, { shouldValidate: true, shouldDirty: true })}
                              className={`rounded-md border border-dashed p-3 text-left transition-colors sm:col-span-2 ${!watchedSpaceId ? 'border-unap-navy bg-unap-navy/5 ring-1 ring-unap-navy' : 'border-slate-300 bg-white hover:border-slate-400'}`}
                            >
                              <span className="text-sm font-semibold text-slate-900">Sin aula asignada</span>
                              <p className="mt-1 text-xs text-slate-500">Puedes confirmar la sustentación y asignar el aula después.</p>
                            </button>
                            {spaceAvailability.length === 0 ? (
                              <div className="rounded-md border border-dashed border-slate-300 p-4 text-xs text-slate-500 sm:col-span-2">No hay espacios activos para esta sede.</div>
                            ) : spaceAvailability.map(({ space, conflicts: spaceConflicts }) => {
                              const isSelected = watchedSpaceId === space.id;
                              const hasConflict = spaceConflicts.length > 0;
                              return (
                                <button
                                  type="button"
                                  key={space.id}
                                  onClick={() => setValue('space_id', space.id, { shouldValidate: true, shouldDirty: true })}
                                  className={`rounded-md border p-3 text-left transition-colors ${isSelected ? 'border-unap-navy bg-unap-navy/5 ring-1 ring-unap-navy' : 'border-slate-200 bg-white hover:border-slate-400'} ${hasConflict ? 'border-amber-300' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-semibold text-slate-900">{space.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${hasConflict ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {hasConflict ? 'Cruce' : 'Disponible'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">{space.type || 'Espacio'} · Aforo: {space.capacity || 'N/A'}</p>
                                  {hasConflict && <p className="mt-2 text-[11px] text-amber-700">Reservado en {spaceConflicts[0].conflictingTimeRange}</p>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Personas consideradas</CardTitle>
                        <CardDescription className="text-xs">Los cruces de los sustentantes también se validan.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedStudents.length === 0 ? (
                          <p className="text-xs text-slate-500">Aún no has seleccionado sustentantes.</p>
                        ) : selectedStudents.map((student: any) => (
                          <div key={student.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                            <p className="text-xs font-semibold text-slate-900">{student.first_name} {student.last_name}</p>
                            <p className="text-[11px] text-slate-500">DNI: {student.document_number || 'No asignado'} · {student.email || 'Correo no asignado'}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Validación de cruces</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {conflicts.length > 0 ? (
                          <ConflictCheckerAlert conflicts={conflicts} className="shadow-none" />
                        ) : (
                          <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold">Sin cruces detectados</p>
                              <p className="mt-1 text-xs">El horario y el espacio seleccionado no presentan conflictos registrados.</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
                <Button type="button" onClick={() => setSpaceConfigOpen(false)}>Aplicar selección</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Section 4: Participantes (Sustentantes, Jurados, Asesores) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-unap-navy" />
                <span>4. Participantes de la Sustentación</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Añada sustentantes, jurados y asesores desde el directorio de personas
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={openAddParticipant}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar Participante</span>
            </Button>
          </CardHeader>

          <CardContent className="pt-5">
            {fields.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No hay participantes asignados. Haga clic en "Agregar Participante" para añadir sustentantes, jurados y asesores.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-sm border border-slate-200">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr className="border-b border-slate-200"><th className="px-3 py-3 font-semibold">Tipo</th><th className="px-3 py-3 font-semibold">Participante</th><th className="px-3 py-3 font-semibold">Rol</th><th className="w-12 px-3 py-3"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                  {fields.map((field, index) => {
                const participantType = watch(`participants.${index}.participant_type`);

                return (
                  <tr
                    key={field.id}
                    className="align-middle hover:bg-slate-50"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-700">{participantType === 'STUDENT' ? 'Sustentante (Alumno)' : participantType === 'JUROR' ? 'Jurado Calificador' : 'Asesor(a) de Tesis'}</td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                      {(() => { const selectedPerson = persons.find((person) => person.id === watch(`participants.${index}.person_id`)); return selectedPerson?.photo_url ? <img src={selectedPerson.photo_url} alt="" className="h-7 w-7 rounded-full border border-slate-200 object-cover" /> : <span className="h-7 w-7 shrink-0 rounded-full border border-slate-200 bg-slate-50" />; })()}
                      <span className="font-medium text-slate-900">{persons.find((person) => person.id === watch(`participants.${index}.person_id`))?.first_name || 'Persona'} {persons.find((person) => person.id === watch(`participants.${index}.person_id`))?.last_name || 'no asignada'}</span>
                      </div>
                      {(() => { const selectedPerson = persons.find((person) => person.id === watch(`participants.${index}.person_id`)); return <div className="mt-1 pl-9 text-[10px] text-slate-500">{selectedPerson?.email || 'Correo no asignado'} · DNI: {selectedPerson?.document_number || 'No asignado'}</div>; })()}
                    </td>

                    <td className="px-3 py-3 text-slate-700">
                      {participantType === 'JUROR' ? ({ PRESIDENT: 'Presidente', SECRETARY: 'Secretario', MEMBER: 'Miembro', OTHER: 'Otro' } as Record<string, string>)[watch(`participants.${index}.role`)] || 'Miembro' : '—'}
                    </td>

                    <td className="px-3 py-3 text-right">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100" title="Editar participante" onClick={() => openEditParticipant(index)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                      disabled={removeParticipantMutation.isPending}
                      onClick={() => handleRemoveParticipant(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    </td>
                  </tr>
                );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={participantModalOpen} onOpenChange={setParticipantModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{participantEditIndex !== null ? 'Editar participante' : 'Añadir participante'}</DialogTitle>
              <DialogDescription>{participantEditIndex !== null ? 'Actualiza el tipo y rol sin modificar la sustentación hasta guardar el formulario.' : 'Busca una persona registrada o crea un nuevo registro y define su tipo y rol.'}</DialogDescription>
            </DialogHeader>
            {participantEditIndex === null && <div className="flex gap-2 border-b border-slate-200 pb-3">
              <Button type="button" variant={participantMode === 'search' ? 'default' : 'outline'} size="sm" onClick={() => { setParticipantMode('search'); setParticipantError(null); }}>Buscar registrada</Button>
              <Button type="button" variant={participantMode === 'create' ? 'default' : 'outline'} size="sm" onClick={() => { setParticipantMode('create'); setParticipantError(null); }}>Crear persona</Button>
            </div>}
            {participantEditIndex !== null ? null : participantMode === 'search' ? (
              <div className="space-y-3">
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder="Buscar por nombre, correo o documento..." className="pl-9" autoFocus /></div>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
                  {participantSearch.trim().length < 2 ? <p className="p-6 text-center text-sm text-slate-500">Escribe al menos 2 caracteres para buscar en el registro institucional y local.</p> : isSearchingPersons ? <p className="p-6 text-center text-sm text-slate-500">Buscando personas…</p> : participantResults.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No encontramos personas en las fuentes disponibles.</p> : participantResults.map((person) => {
                    const localMatch = persons.find((candidate) => (person.id && candidate.id === person.id) || (person.external_uuid && candidate.external_uuid === person.external_uuid) || (person.document_number && candidate.document_number === person.document_number));
                    const alreadyAdded = Boolean(localMatch && watchedParticipants.some((participant: any) => participant.person_id === localMatch.id));
                    return <button type="button" key={person.key} disabled={alreadyAdded || resolvePersonMutation.isPending} onClick={() => selectParticipant(person)} className={`flex w-full items-center justify-between rounded-md border p-3 text-left hover:border-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${selectedParticipant?.key === person.key ? 'border-unap-navy bg-slate-50' : 'border-transparent'}`}><span><span className="block text-sm font-semibold text-slate-900">{person.first_name} {person.last_name}</span><span className="block text-xs text-slate-500">{person.email || 'Sin correo'} {person.document_number ? `· DNI ${person.document_number}` : ''}</span><span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{person.source === 'institutional' ? 'Registro institucional' : 'Base local'}</span></span><span className="text-xs font-medium text-unap-navy">{alreadyAdded ? 'Agregada' : selectedParticipant?.key === person.key ? 'Seleccionada' : 'Seleccionar'}</span></button>;
                  })}
                </div>
              </div>
            ) : participantEditIndex === null ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><Label>Nombres *</Label><Input value={newPerson.first_name} onChange={(event) => setNewPerson({ ...newPerson, first_name: event.target.value })} placeholder="Nombres" /></div>
                <div><Label>Apellidos *</Label><Input value={newPerson.last_name} onChange={(event) => setNewPerson({ ...newPerson, last_name: event.target.value })} placeholder="Apellidos" /></div>
                <div><Label>Correo electrónico</Label><Input type="email" value={newPerson.email} onChange={(event) => setNewPerson({ ...newPerson, email: event.target.value })} placeholder="persona@unap.edu.pe" /></div>
                <div><Label>Teléfono</Label><Input value={newPerson.phone} onChange={(event) => setNewPerson({ ...newPerson, phone: event.target.value })} placeholder="Celular" /></div>
                <div className="sm:col-span-2"><Label>DNI / Documento</Label><Input value={newPerson.document_number} onChange={(event) => setNewPerson({ ...newPerson, document_number: event.target.value })} placeholder="Número de documento" /></div>
              </div>
            ) : null}
            {selectedParticipant && <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 text-sm"><div className="font-semibold text-slate-900">{selectedParticipant.first_name} {selectedParticipant.last_name}</div><div className="text-xs text-slate-500">{selectedParticipant.email || 'Correo no asignado'} · DNI: {selectedParticipant.document_number || 'No asignado'}</div></div>}
            {(selectedParticipant || participantEditIndex !== null) && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><Label>Tipo *</Label><select value={participantTypeDraft} onChange={(event) => setParticipantTypeDraft(event.target.value as ParticipantType)} className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-2 text-xs"><option value="STUDENT">Sustentante (Alumno)</option><option value="JUROR">Jurado Calificador</option><option value="ADVISOR">Asesor(a) de Tesis</option></select></div>{participantTypeDraft === 'JUROR' && <div><Label>Rol *</Label><select value={participantRoleDraft} onChange={(event) => setParticipantRoleDraft(event.target.value as JurorRole)} className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-2 text-xs"><option value="PRESIDENT">Presidente</option><option value="SECRETARY">Secretario</option><option value="MEMBER">Miembro</option><option value="OTHER">Otro</option></select></div>}</div>}
            {participantError && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{participantError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setParticipantModalOpen(false)}>Cancelar</Button>
              {participantMode === 'create' && !selectedParticipant && <Button type="button" variant="unap" disabled={!newPerson.first_name.trim() || !newPerson.last_name.trim() || createPersonMutation.isPending} onClick={() => createPersonMutation.mutate()}>{createPersonMutation.isPending ? 'Guardando…' : 'Crear persona'}</Button>}
              {(selectedParticipant || participantEditIndex !== null) && <Button type="button" variant="unap" disabled={resolvePersonMutation.isPending} onClick={saveParticipantModal}>{resolvePersonMutation.isPending ? 'Guardando…' : participantEditIndex !== null ? 'Guardar cambios' : 'Agregar participante'}</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Section 5: Observaciones y Notas Internas */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              5. Observaciones y Notas Internas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="observations" className="text-xs font-semibold">Observaciones Públicas</Label>
              <Textarea
                id="observations"
                rows={2}
                placeholder="Requerimientos técnicos, equipos necesarios, o notas visibles en la citación..."
                {...register('observations')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="internal_notes" className="text-xs font-semibold text-slate-700">
                Notas Internas (Solo administradores / Privado)
              </Label>
              <Textarea
                id="internal_notes"
                rows={2}
                placeholder="Expediente de grado, resolución decanal, observaciones privadas..."
                {...register('internal_notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bottom Save Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </Button>

          <SaveActionSelect disabled={saveMutation.isPending} onSave={handleSave} />
        </div>
      </form>
    </div>
  );
};
