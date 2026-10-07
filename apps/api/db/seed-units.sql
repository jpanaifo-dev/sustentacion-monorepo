-- Seeder idempotente de unidades de la Escuela de Postgrado.
-- El id numérico de origen se omite; el UUID institucional es la clave primaria.
insert into units (id, name, type, email, institutional_email, phone, acronym, code, is_faculty, is_active)
values
  ('47566d22-307e-4665-a2ff-6f205173c589', 'CIENCIAS ECONÓMICAS Y NEGOCIOS', 'UNIDAD', '', '', '', 'FACEN', 'FACEN', true, true),
  ('de95c3b4-b9f6-47da-90ee-f12a54f4d0d7', 'CIENCIAS BIOLÓGICAS', 'UNIDAD', '', '', '', 'FCB', 'FCB', true, true),
  ('cdc7e6c8-d1d3-48a5-b64f-06290bfeab21', 'CIENCIAS FORESTALES', 'UNIDAD', '', '', '', 'FCF', 'FCF', true, true),
  ('6906e048-bd1d-4674-9754-dd00d055ef0f', 'INGENIERÍA QUIMICA', 'UNIDAD', '', '', '', 'FIQ', 'FIQ', true, true),
  ('548471ef-45c1-453e-82dc-b97a0f952ee0', 'CIENCIA DE LA EDUCACIÓN Y HUMANIDADES', 'UNIDAD', '', '', '', 'FCEH', 'FCEH', true, true),
  ('4eefc205-7617-47d2-85c3-650ab6de7e35', 'INGENIERÍA DE SISTEMAS E INFORMÁTICA', 'UNIDAD', '', '', '', 'FISI', 'FISI', true, true),
  ('5497cc8b-52e6-48d2-bc93-f7d7fa260a99', 'INDUSTRIAS ALIMENTARIAS', 'UNIDAD', '', '', '', 'FIA', 'FIA', true, true),
  ('5ded46c4-a7ad-4619-b578-ea1bdc10a297', 'MEDICINA HUMANA', 'UNIDAD', '', '', '', 'FMH', 'FMH', true, true),
  ('7923000e-7b95-44ae-99e4-d6dad5edef00', 'DERECHO Y CIENCIAS POLÍTICAS', 'UNIDAD', '', '', '', 'FADECIP', 'FADECIP', true, true),
  ('78714fab-f13f-49d2-81e0-01b934dae4a7', 'AGRONOMÍA', 'UNIDAD', '', '', '', 'FA', 'FA', true, true),
  ('87087a96-d956-41e8-9006-36adf2c74746', 'ODONTOLOGÍA', 'UNIDAD', '', '', '', 'FO', 'FO', true, true),
  ('c08ff944-c67f-44b4-862a-797790009cbe', 'ZOOTECNIA', 'UNIDAD', '', '', '', 'FZ', 'FZ', true, true),
  ('61e0d79a-5f7a-45a7-b9fa-4bae590baca5', 'FARMACIA Y BIOQUIMICA', 'UNIDAD', '', '', '', 'FFB', 'FFB', true, true),
  ('10863fc9-30f5-48db-b052-9f2caa456feb', 'ENFERMERÍA', 'UNIDAD', '', '', '', 'FE', 'FE', true, true),
  ('7f198871-32f0-40b3-bdb7-45200b73035f', 'ASUNTOS ACADEMICOS', 'UNIDAD', 'academicos@postgradounap.edu.pe', 'academicos@postgradounap.edu.pe', '', 'UAA', 'UAA', false, true),
  ('86c7032e-18f9-43b5-936b-9155afebe36d', 'ASUNTOS ECONOMICOS', 'UNIDAD', 'economicos@postgradounap.edu.pe', 'economicos@postgradounap.edu.pe', '', 'UAE', 'UAE', false, true)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  email = excluded.email,
  institutional_email = excluded.institutional_email,
  phone = excluded.phone,
  acronym = excluded.acronym,
  code = excluded.code,
  is_faculty = excluded.is_faculty,
  is_active = excluded.is_active,
  updated_at = now();
