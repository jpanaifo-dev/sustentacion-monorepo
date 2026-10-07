import { api } from '../lib/api';

export interface PostgraduateProgram {
  id: number;
  uuid: string;
  unit_uuid: string;
  name: string;
  code: string;
  description?: string | null;
}

export const programsService = {
  async getPrograms(search?: string): Promise<PostgraduateProgram[]> {
    const result = await api.programs.get(search);
    if (result.error) throw result.error;
    const payload = result.data as any;
    const rows = Array.isArray(payload) ? payload : payload?.results ?? payload?.data ?? [];
    return rows.map((program: any) => ({
      id: Number(program.id ?? 0),
      uuid: String(program.uuid ?? program.uid ?? ''),
      unit_uuid: String(program.unit_uuid ?? program.unit?.uuid ?? ''),
      name: String(program.name ?? program.program_name ?? ''),
      // Keep the institutional code in the defense record even when the upstream
      // endpoint calls it abbreviation or program_code.
      code: String(program.code ?? program.abbreviation ?? program.program_code ?? ''),
      description: program.description ?? null,
    })).filter((program: PostgraduateProgram) => program.uuid && program.name);
  },
};
