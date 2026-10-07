import { DefenseWithRelations, ScheduleConflict } from '../types';

function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);

  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export function detectScheduleConflicts(params: {
  defenseId?: string;
  scheduled_date: string;
  start_time: string;
  estimated_end_time: string;
  space_id?: string | null;
  participantPersonIds: { person_id: string; type: 'STUDENT' | 'JUROR' | 'ADVISOR'; name?: string }[];
  allDefenses: DefenseWithRelations[];
}): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const { defenseId, scheduled_date, start_time, estimated_end_time, space_id, participantPersonIds, allDefenses } = params;

  if (!scheduled_date || !start_time || !estimated_end_time) {
    return conflicts;
  }

  // Filter only other active defenses on the exact same date (ignore CANCELLED or same ID)
  const activeDefensesOnDate = allDefenses.filter(
    (d) =>
      d.id !== defenseId &&
      d.scheduled_date === scheduled_date &&
      d.status !== 'CANCELLED'
  );

  for (const defense of activeDefensesOnDate) {
    const overlapping = isTimeOverlapping(
      start_time,
      estimated_end_time,
      defense.start_time,
      defense.estimated_end_time
    );

    if (!overlapping) continue;

    const timeRangeStr = `${defense.start_time.substring(0, 5)} - ${defense.estimated_end_time.substring(0, 5)}`;

    // 1. Space Conflict
    if (space_id && defense.space_id && space_id === defense.space_id) {
      conflicts.push({
        type: 'SPACE',
        severity: 'WARNING',
        conflictingDefenseId: defense.id,
        conflictingDefenseCode: defense.code || 'Sustentación',
        conflictingDefenseTitle: defense.title,
        conflictingTimeRange: timeRangeStr,
        spaceName: defense.space?.name || 'Espacio físico',
        message: `El espacio "${defense.space?.name || 'seleccionado'}" ya se encuentra reservado por "${defense.code}" de ${timeRangeStr}.`,
      });
    }

    // 2. Participants Conflict
    if (defense.participants && Array.isArray(defense.participants)) {
      for (const p of participantPersonIds) {
        const found = defense.participants.find((dp) => dp.person_id === p.person_id);
        if (found) {
          const personName = p.name || `${found.person?.first_name} ${found.person?.last_name}`;
          const roleLabel = p.type === 'JUROR' ? 'Jurado' : p.type === 'STUDENT' ? 'Sustentante' : 'Asesor';

          conflicts.push({
            type: p.type,
            severity: 'WARNING',
            conflictingDefenseId: defense.id,
            conflictingDefenseCode: defense.code || 'Sustentación',
            conflictingDefenseTitle: defense.title,
            conflictingTimeRange: timeRangeStr,
            participantName: personName,
            message: `El ${roleLabel} "${personName}" ya tiene una sustentación asignada (${defense.code}) en este mismo horario (${timeRangeStr}).`,
          });
        }
      }
    }
  }

  return conflicts;
}
