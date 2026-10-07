import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { Pool } from 'pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r2 = process.env.R2_ACCOUNT_ID ? new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '' } }) : null;
const app = Fastify({ logger: true });
app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  const errorMessage = error instanceof Error ? error.message : 'Solicitud inválida.';
  const code = (error as { code?: string }).code;
  const statusCode = code === '23505' || code === '23503' || code === '23502' || code === '22P02' ? 400 : 500;
  const message = code === '23505'
    ? 'Ya existe un registro con esos datos.'
    : code === '23503'
      ? 'No se puede guardar porque una relación seleccionada no existe.'
      : code === '23502'
        ? 'Faltan datos obligatorios.'
        : code === '22P02'
          ? 'Uno de los datos enviados no tiene un formato válido.'
          : statusCode === 500 ? 'No se pudo completar la operación.' : errorMessage;
  return reply.code(statusCode).send({ error: message });
});
await app.register(cors, {
  origin: process.env.WEB_ORIGIN?.split(',') ?? true,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
await app.register(cookie);
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-only-secret' });
await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });

app.get('/health', async () => ({ ok: true, service: 'epg-api' }));

app.get('/api/holidays', async (request, reply) => {
  const query = request.query as { year?: string };
  const year = Number(query.year ?? 2026);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return reply.code(400).send({ error: 'El año solicitado no es válido.' });
  }

  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PE`);
  if (!response.ok) {
    return reply.code(502).send({ error: 'No se pudieron consultar los feriados de Perú.' });
  }

  const holidays = await response.json() as Array<{
    date: string;
    localName?: string;
    name?: string;
    countryCode?: string;
    global?: boolean;
    types?: string[];
  }>;

  return holidays.map((holiday) => ({
    date: holiday.date,
    name: holiday.localName || holiday.name || 'Día feriado',
    localName: holiday.localName || holiday.name || 'Día feriado',
    countryCode: holiday.countryCode || 'PE',
    global: holiday.global ?? true,
    types: holiday.types ?? [],
    source: 'Nager.Date',
  }));
});

app.get('/api/programs', async (request, reply) => {
  const query = request.query as { search?: string };
  const upstreamUrl = new URL('https://api.postgradounap.edu.pe/program/program/');
  if (query.search?.trim()) upstreamUrl.searchParams.set('search', query.search.trim());
  const response = await fetch(upstreamUrl);
  if (!response.ok) {
    return reply.code(502).send({ error: 'No se pudieron consultar los programas de posgrado.' });
  }
  return response.json();
});

type InstitutionalPerson = {
  id?: number;
  uuid?: string;
  document_number?: string | null;
  names?: string | null;
  last_name1?: string | null;
  last_name2?: string | null;
  photo?: string | null;
};

app.get('/api/persons/search', async (request, reply) => {
  const search = String((request.query as { search?: string }).search ?? '').trim();
  if (search.length < 2) return { results: [] };

  const upstreamUrl = new URL('https://api.postgradounap.edu.pe/person/person/');
  upstreamUrl.searchParams.set('search', search);
  const upstreamResponse = await fetch(upstreamUrl);
  if (!upstreamResponse.ok) return reply.code(502).send({ error: 'No se pudieron consultar las personas institucionales.' });
  const payload = await upstreamResponse.json() as { results?: InstitutionalPerson[] } | InstitutionalPerson[];
  const externalRows = Array.isArray(payload) ? payload : payload.results ?? [];
  const localQuery = `%${search}%`;
  const localResult = await pool.query(
    `select id, external_uuid, external_id, first_name, last_name, email, phone, document_number, photo_url
     from persons
     where lower(concat_ws(' ', first_name, last_name, coalesce(document_number, ''))) like lower($1)
     order by last_name, first_name limit 50`,
    [localQuery],
  );

  const localByExternal = new Set(localResult.rows.filter((person) => person.external_uuid).map((person) => String(person.external_uuid)));
  const localByDocument = new Set(localResult.rows.filter((person) => person.document_number).map((person) => String(person.document_number)));
  const external = externalRows.filter((person) => person.uuid && !localByExternal.has(person.uuid) && !(person.document_number && localByDocument.has(person.document_number))).map((person) => {
    const firstName = (person.names ?? '').trim();
    const lastName = [person.last_name1, person.last_name2].filter(Boolean).join(' ').trim();
    return {
      key: `institutional:${person.uuid}`,
      source: 'institutional' as const,
      external_id: person.id ?? null,
      external_uuid: person.uuid ?? null,
      first_name: firstName,
      last_name: lastName,
      email: null,
      phone: null,
      document_number: person.document_number ?? null,
      photo_url: person.photo ?? null,
    };
  });
  const local = localResult.rows.map((person) => ({ ...person, key: `local:${person.id}`, source: 'local' as const }));
  return { results: [...external, ...local] };
});

app.post('/api/persons/resolve', { preHandler: (app as any).authenticate }, async (request, reply) => {
  const body = request.body as {
    external_id?: number | null;
    external_uuid?: string | null;
    first_name?: string;
    last_name?: string;
    document_number?: string | null;
    email?: string | null;
    phone?: string | null;
    photo_url?: string | null;
  };
  const firstName = body.first_name?.trim();
  const lastName = body.last_name?.trim();
  const documentNumber = body.document_number?.trim() || null;
  const externalUuid = body.external_uuid?.trim() || null;
  if (!firstName || !lastName) return reply.code(400).send({ error: 'Nombres y apellidos son obligatorios.' });
  if (externalUuid && !/^[0-9a-f-]{36}$/i.test(externalUuid)) return reply.code(400).send({ error: 'El identificador institucional no es válido.' });

  const client = await pool.connect();
  try {
    await client.query('begin');
    let existing;
    if (externalUuid) {
      existing = await client.query('select * from persons where external_uuid = $1::uuid limit 1', [externalUuid]);
    }
    if (!existing?.rows[0] && documentNumber) {
      existing = await client.query('select * from persons where document_number = $1 limit 1', [documentNumber]);
    }
    if (!existing?.rows[0]) {
      existing = await client.query('select * from persons where lower(first_name) = lower($1) and lower(last_name) = lower($2) limit 1', [firstName, lastName]);
    }
    let result;
    if (existing?.rows[0]) {
      result = await client.query(
        `update persons set first_name = $1, last_name = $2,
         email = coalesce($3, email), phone = coalesce($4, phone), document_number = coalesce($5, document_number), photo_url = coalesce($6, photo_url),
         external_uuid = coalesce($7::uuid, external_uuid), external_id = coalesce($8, external_id), updated_at = now()
         where id = $9 returning *`,
        [firstName, lastName, body.email?.trim().toLowerCase() || null, body.phone?.trim() || null, documentNumber, body.photo_url?.trim() || null, externalUuid, body.external_id ?? null, existing.rows[0].id],
      );
    } else {
      result = await client.query(
        `insert into persons (first_name, last_name, email, phone, document_number, photo_url, external_uuid, external_id)
         values ($1,$2,$3,$4,$5,$6,$7::uuid,$8) returning *`,
        [firstName, lastName, body.email?.trim().toLowerCase() || null, body.phone?.trim() || null, documentNumber, body.photo_url?.trim() || null, externalUuid, body.external_id ?? null],
      );
    }
    await client.query('commit');
    return result.rows[0];
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
});

app.post('/api/auth/login', async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  if (!body.email || !body.password) return reply.code(400).send({ error: 'email y password son requeridos' });
  const result = await pool.query('select id, email, password_hash, first_name, last_name, is_active from profiles where email = $1 limit 1', [body.email]);
  const user = result.rows[0];
  if (!user || !user.is_active || !user.password_hash || !(await bcrypt.compare(body.password, user.password_hash))) return reply.code(401).send({ error: 'Credenciales inválidas' });
  const token = await app.jwt.sign({ sub: user.id, email: user.email });
  reply.setCookie('epg_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 });
  const { password_hash: _passwordHash, ...safeUser } = user;
  return { user: safeUser, roles: ['SUPER_ADMIN'], permissions: ['*'] };
});

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    const token = request.cookies.epg_session || request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Missing session');
    request.user = await app.jwt.verify(token);
  } catch { return reply.code(401).send({ error: 'No autorizado' }); }
});

app.get('/api/auth/me', { preHandler: (app as any).authenticate }, async (request: any, reply) => {
  const result = await pool.query('select id, email, first_name, last_name, is_active from profiles where id = $1 and is_active = true limit 1', [request.user.sub]);
  if (!result.rows[0]) return reply.code(401).send({ error: 'Sesión inválida' });
  return { user: result.rows[0], roles: ['SUPER_ADMIN'], permissions: ['*'] };
});

app.post('/api/auth/logout', async (_request, reply) => {
  reply.clearCookie('epg_session', { path: '/' });
  return { ok: true };
});

app.get('/api/defenses/:id/participants', { preHandler: (app as any).authenticate }, async (request) => {
  const defenseId = (request.params as { id: string }).id;
  const result = await pool.query(
    `select dp.*, row_to_json(p) as person
     from defense_participants dp
     left join persons p on p.id = dp.person_id
     where dp.defense_id = $1::uuid
     order by dp.created_at`,
    [defenseId],
  );
  return result.rows;
});

app.put('/api/defenses/:id/participants', { preHandler: (app as any).authenticate }, async (request, reply) => {
  const defenseId = (request.params as { id: string }).id;
  const participants = request.body as Array<{ person_id?: string; participant_type?: string; role?: string | null; is_primary?: boolean }>;
  if (!Array.isArray(participants)) return reply.code(400).send({ error: 'Los participantes deben enviarse como una lista.' });
  if (participants.some((participant) => !participant.person_id || !participant.participant_type)) {
    return reply.code(400).send({ error: 'Cada participante debe tener persona y tipo.' });
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const defense = await client.query('select id from defenses where id = $1::uuid', [defenseId]);
    if (!defense.rows[0]) {
      await client.query('rollback');
      return reply.code(404).send({ error: 'Sustentación no encontrada.' });
    }
    await client.query('delete from defense_participants where defense_id = $1::uuid', [defenseId]);
    for (const participant of participants) {
      await client.query(
        'insert into defense_participants (defense_id, person_id, participant_type, role, is_primary) values ($1::uuid, $2::uuid, $3, $4, $5)',
        [defenseId, participant.person_id, participant.participant_type, participant.role ?? null, participant.is_primary ?? false],
      );
    }
    const result = await client.query(
      `select dp.*, row_to_json(p) as person
       from defense_participants dp
       left join persons p on p.id = dp.person_id
       where dp.defense_id = $1::uuid
       order by dp.created_at`,
      [defenseId],
    );
    await client.query('commit');
    return result.rows;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
});

const usersWithRelationsSql = `
  select p.id, p.email, p.first_name, p.last_name, p.phone, p.document_number, p.avatar_url,
    p.is_active, p.created_at, p.updated_at,
    coalesce(json_agg(distinct r) filter (where r.id is not null), '[]'::json) as roles,
    coalesce(json_agg(distinct u) filter (where u.id is not null), '[]'::json) as units
  from profiles p
  left join user_roles ur on ur.user_id = p.id
  left join roles r on r.id = ur.role_id
  left join user_units uu on uu.user_id = p.id
  left join units u on u.id = uu.unit_id
  group by p.id`;

app.get('/api/admin/users', { preHandler: (app as any).authenticate }, async () => {
  const result = await pool.query(`${usersWithRelationsSql} order by p.last_name, p.first_name`);
  return result.rows;
});

app.post('/api/admin/users', { preHandler: (app as any).authenticate }, async (request, reply) => {
  const body = request.body as { first_name?: string; last_name?: string; email?: string; phone?: string | null; document_number?: string | null; role_ids?: string[]; unit_ids?: string[] };
  if (!body.first_name || !body.last_name || !body.email) return reply.code(400).send({ error: 'Nombres, apellidos y correo son obligatorios.' });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const user = await client.query('insert into profiles (first_name, last_name, email, phone, document_number, is_active) values ($1,$2,$3,$4,$5,true) returning id', [body.first_name, body.last_name, body.email, body.phone || null, body.document_number || null]);
    const userId = user.rows[0].id;
    if (body.role_ids?.length) await client.query('insert into user_roles (user_id, role_id) select $1, id from roles where id = any($2::uuid[]) on conflict do nothing', [userId, body.role_ids]);
    if (body.unit_ids?.length) await client.query('insert into user_units (user_id, unit_id) select $1, id from units where id = any($2::uuid[]) on conflict do nothing', [userId, body.unit_ids]);
    await client.query('commit');
    const result = await pool.query(`${usersWithRelationsSql} having p.id = $1`, [userId]);
    return reply.code(201).send(result.rows[0]);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
});

app.patch('/api/admin/users/:id', { preHandler: (app as any).authenticate }, async (request, reply) => {
  const body = request.body as { first_name?: string; last_name?: string; email?: string; phone?: string | null; document_number?: string | null; is_active?: boolean; role_ids?: string[]; unit_ids?: string[] };
  const id = (request.params as { id: string }).id;
  const client = await pool.connect();
  try {
    await client.query('begin');
    const fields = ['first_name', 'last_name', 'email', 'phone', 'document_number', 'is_active'].filter((key) => body[key as keyof typeof body] !== undefined);
    if (fields.length) {
      const values = fields.map((key) => body[key as keyof typeof body]);
      const updated = await client.query(`update profiles set ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')}, updated_at = now() where id = $${fields.length + 1} returning id`, [...values, id]);
      if (!updated.rows[0]) return reply.code(404).send({ error: 'Usuario no encontrado.' });
    }
    if (body.role_ids) {
      await client.query('delete from user_roles where user_id = $1', [id]);
      if (body.role_ids.length) await client.query('insert into user_roles (user_id, role_id) select $1, id from roles where id = any($2::uuid[]) on conflict do nothing', [id, body.role_ids]);
    }
    if (body.unit_ids) {
      await client.query('delete from user_units where user_id = $1', [id]);
      if (body.unit_ids.length) await client.query('insert into user_units (user_id, unit_id) select $1, id from units where id = any($2::uuid[]) on conflict do nothing', [id, body.unit_ids]);
    }
    await client.query('commit');
    const result = await pool.query(`${usersWithRelationsSql} having p.id = $1`, [id]);
    return result.rows[0] ?? reply.code(404).send({ error: 'Usuario no encontrado.' });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
});

app.get('/api/defenses', async (request) => {
  const query = request.query as Record<string, string | undefined>;
  const filters = Object.entries(query).filter(([key]) => ['status', 'unit_id', 'facility_id', 'space_id', 'modality'].includes(key));
  const where = filters.length ? ` where ${filters.map(([key], index) => `d.${key} = $${index + 1}`).join(' and ')}` : '';
  const values = filters.map(([, value]) => value);
  const result = await pool.query(
    `select d.*,
      row_to_json(u) as unit,
      row_to_json(f) as facility,
      row_to_json(s) as space,
      coalesce(json_agg(distinct jsonb_build_object(
        'id', dp.id, 'defense_id', dp.defense_id, 'person_id', dp.person_id,
        'participant_type', dp.participant_type, 'role', dp.role,
        'is_primary', dp.is_primary, 'created_at', dp.created_at,
        'person', to_jsonb(p)
      )) filter (where dp.id is not null), '[]'::json) as participants,
      coalesce(json_agg(distinct to_jsonb(dr)) filter (where dr.id is not null), '[]'::json) as reschedules
     from defenses d
     left join units u on u.id = d.unit_id
     left join facilities f on f.id = d.facility_id
     left join spaces s on s.id = d.space_id
     left join defense_participants dp on dp.defense_id = d.id
     left join persons p on p.id = dp.person_id
     left join defense_reschedules dr on dr.defense_id = d.id
     ${where}
     group by d.id, u.id, f.id, s.id
     order by d.scheduled_date asc nulls last, d.start_time asc nulls last`,
    values,
  );
  const token = request.cookies.epg_session || request.headers.authorization?.replace('Bearer ', '');
  let isAuthenticated = false;
  if (token) {
    try { await app.jwt.verify(token); isAuthenticated = true; } catch { isAuthenticated = false; }
  }
  if (isAuthenticated) return result.rows;
  return result.rows.map((defense) => ({
    ...defense,
    participants: (defense.participants ?? []).map((participant: any) => ({
      ...participant,
      person: participant.person ? { ...participant.person, document_number: null } : participant.person,
    })),
  }));
});

app.patch('/api/defenses/:id', { preHandler: (app as any).authenticate }, async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const body = request.body as Record<string, unknown>;
  const allowedFields = new Set([
    'unit_id', 'program_uuid', 'program_code', 'program_name', 'office_number', 'title', 'status', 'modality',
    'scheduled_date', 'start_time', 'estimated_end_time', 'estimated_duration_minutes',
    'facility_id', 'space_id', 'virtual_platform', 'virtual_url', 'observations', 'internal_notes',
  ]);
  const keys = Object.keys(body).filter((key) => allowedFields.has(key));
  if (!keys.length) return reply.code(400).send({ error: 'No hay campos válidos para actualizar.' });
  const values = [...keys.map((key) => body[key]), id];
  const result = await pool.query(
    `update defenses set ${keys.map((key, index) => `${key} = $${index + 1}`).join(', ')}, updated_at = now()
     where id = $${keys.length + 1} returning *`,
    values,
  );
  if (!result.rows[0]) return reply.code(404).send({ error: 'Sustentación no encontrada.' });
  return result.rows[0];
});

app.post('/api/defenses', { preHandler: (app as any).authenticate }, async (request, reply) => {
  const body = request.body as Record<string, unknown>;
  const allowedFields = [
    'unit_id', 'program_uuid', 'program_code', 'program_name', 'office_number', 'title', 'status', 'modality',
    'scheduled_date', 'start_time', 'estimated_end_time', 'estimated_duration_minutes',
    'facility_id', 'space_id', 'virtual_platform', 'virtual_url', 'observations', 'internal_notes',
  ];
  const fields = allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field));
  if (!fields.includes('unit_id') || !fields.includes('scheduled_date') || !fields.includes('start_time')) {
    return reply.code(400).send({ error: 'La unidad, fecha y hora de inicio son obligatorias.' });
  }

  const currentYear = new Date().getFullYear();
  const sequence = await pool.query<{ next_number: number }>(
    `select coalesce(max((regexp_match(code, '^DEF-${currentYear}-([0-9]+)$'))[1]::integer), 0) + 1 as next_number
     from defenses where code like $1`,
    [`DEF-${currentYear}-%`],
  );
  const generatedCode = `DEF-${currentYear}-${String(sequence.rows[0]?.next_number ?? 1).padStart(5, '0')}`;
  const insertFields = ['code', ...fields];
  const insertValues = [generatedCode, ...fields.map((field) => body[field])];
  const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');
  const result = await pool.query(
    `insert into defenses (${insertFields.join(', ')}) values (${placeholders}) returning *`,
    insertValues,
  );
  return reply.code(201).send(result.rows[0]);
});

app.post('/api/send-defense-notification', { preHandler: (app as any).authenticate }, async (request, reply) => {
  const body = request.body as { defense_id?: string; type?: string; reason?: string };
  if (!body.defense_id || !body.type) return reply.code(400).send({ error: 'La sustentación y el tipo de notificación son obligatorios.' });
  const defense = await pool.query<{ code: string | null; title: string }>('select code, title from defenses where id = $1::uuid limit 1', [body.defense_id]);
  if (!defense.rows[0]) return reply.code(404).send({ error: 'Sustentación no encontrada.' });
  const title = body.type === 'CONFIRMATION' ? 'Sustentación confirmada' : body.type === 'CANCELLATION' ? 'Sustentación cancelada' : 'Sustentación reprogramada';
  const message = body.reason ? `${defense.rows[0].title}. ${body.reason}` : defense.rows[0].title;
  await pool.query(
    `insert into notifications (defense_id, type, title, message, recipient_email, recipient_name, status, provider, sent_at)
     values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, now())`,
    [body.defense_id, body.type, title, message, 'posgrado@unapiquitos.edu.pe', 'Comunidad Académica EPG', 'SENT', 'internal'],
  );
  return { success: true, message: 'Notificación registrada correctamente.' };
});

const resources = ['profiles', 'roles', 'user_roles', 'user_units', 'units', 'facilities', 'spaces', 'persons', 'defense_participants', 'defense_reschedules', 'notifications', 'audit_logs', 'media'] as const;
for (const resource of resources) {
  app.get(`/api/${resource}`, async (request) => {
    const query = request.query as Record<string, string | undefined>;
    const allowed = Object.keys(query).filter((key) => /^[a-z_]+$/.test(key));
    const tableAlias = resource === 'spaces' ? 's' : resource === 'facilities' ? 'f' : resource;
    const where = allowed.length ? ` where ${allowed.map((key, i) => `${tableAlias}.${key} = $${i + 1}`).join(' and ')}` : '';
    const values = allowed.map((key) => query[key]);
    const select = resource === 'spaces'
      ? `select s.*, row_to_json(f) as facility from spaces s left join facilities f on f.id = s.facility_id`
      : resource === 'facilities'
        ? `select f.*, coalesce(json_agg(s) filter (where s.id is not null), '[]'::json) as spaces from facilities f left join spaces s on s.facility_id = f.id`
        : `select * from ${resource}`;
    const group = resource === 'facilities' ? ' group by f.id' : '';
    const result = await pool.query(`${select}${where}${group} order by ${tableAlias}.created_at desc nulls last`, values);
    return result.rows;
  });
  app.post(`/api/${resource}`, { preHandler: (app as any).authenticate }, async (request, reply) => {
    const body = request.body as Record<string, unknown> | Array<Record<string, unknown>>;
    if (Array.isArray(body)) {
      if (!body.length) return reply.code(400).send({ error: 'Payload vacío' });
      const client = await pool.connect();
      try {
        await client.query('begin');
        const rows = [];
        for (const row of body) {
          const rowKeys = Object.keys(row).filter((key) => /^[a-z_]+$/.test(key));
          if (!rowKeys.length) throw new Error('Payload inválido');
          const values = rowKeys.map((key) => row[key]);
          const result = await client.query(`insert into ${resource} (${rowKeys.join(',')}) values (${rowKeys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, values);
          rows.push(result.rows[0]);
        }
        await client.query('commit');
        return reply.code(201).send(rows);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    }
    const keys = Object.keys(body).filter((key) => /^[a-z_]+$/.test(key));
    if (!keys.length) return reply.code(400).send({ error: 'Payload vacío' });
    const values = keys.map((key) => body[key]);
    const result = await pool.query(`insert into ${resource} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, values);
    return reply.code(201).send(result.rows[0]);
  });
  app.patch(`/api/${resource}/:id`, { preHandler: (app as any).authenticate }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const keys = Object.keys(body).filter((key) => /^[a-z_]+$/.test(key) && key !== 'updated_at' && key !== 'created_at');
    if (!keys.length) return reply.code(400).send({ error: 'Payload vacío' });
    const values = [...keys.map((key) => body[key]), (request.params as { id: string }).id];
    const result = await pool.query(`update ${resource} set ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = now() where id = $${keys.length + 1} returning *`, values);
    if (!result.rows[0]) return reply.code(404).send({ error: 'Registro no encontrado' });
    return result.rows[0];
  });
  app.delete(`/api/${resource}`, { preHandler: (app as any).authenticate }, async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const allowed = Object.keys(query).filter((key) => /^[a-z_]+$/.test(key));
    if (!allowed.length) return reply.code(400).send({ error: 'Debe indicar un filtro para eliminar registros.' });
    const values = allowed.map((key) => query[key]);
    await pool.query(`delete from ${resource} where ${allowed.map((key, i) => `${key} = $${i + 1}`).join(' and ')}`, values);
    return reply.code(204).send();
  });
  app.delete(`/api/${resource}/:id`, { preHandler: (app as any).authenticate }, async (request, reply) => {
    await pool.query(`delete from ${resource} where id = $1`, [(request.params as { id: string }).id]);
    return reply.code(204).send();
  });
}

app.post('/api/media/upload-url', { preHandler: (app as any).authenticate }, async (request, reply) => {
  if (!r2 || !process.env.R2_BUCKET) return reply.code(503).send({ error: 'Cloudflare R2 no está configurado' });
  const body = request.body as { fileName?: string; contentType?: string };
  const key = `media/${randomUUID()}-${(body.fileName ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const command = new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: body.contentType ?? 'application/octet-stream' });
  return { key, uploadUrl: await getSignedUrl(r2, command, { expiresIn: 900 }), publicUrl: process.env.R2_PUBLIC_URL ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}` : null };
});

const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: '0.0.0.0' });
