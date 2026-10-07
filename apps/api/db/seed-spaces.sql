-- Seeder idempotente de espacios de sustentación.
-- Los ids numéricos de origen se omiten; se usan los UUID de cada sede.

insert into facilities (id, name, description, address, is_active)
values
  ('d719a5f3-472b-478b-866b-c4a0ca41f689', 'Escuela de Postgrado UNAP - Sede Central', 'Sede central de la Escuela de Postgrado.', 'Iquitos, Loreto', true),
  ('e140a256-1b7d-41a9-8850-6a8eab2a449f', 'Escuela de Postgrado UNAP - Sede Requena', 'Sede descentralizada de Requena.', 'Requena, Loreto', true),
  ('0aa2e14f-1b86-4178-95bc-2a2fd0b6f4f9', 'Escuela de Postgrado UNAP - Sede Contamana', 'Sede descentralizada de Contamana.', 'Contamana, Loreto', true),
  ('2851cdf0-cdb3-4c42-89c5-a4fc24d3a7df', 'Escuela de Postgrado UNAP - Sede Datem del Marañón', 'Sede descentralizada del Datem del Marañón.', 'Datem del Marañón, Loreto', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  address = excluded.address,
  is_active = excluded.is_active,
  updated_at = now();

insert into spaces (name, facility_id, description, capacity, type, is_active)
select seed.name, seed.facility_id::uuid, seed.description, seed.capacity::integer, seed.type, seed.is_active::boolean
from (values
  ('Aula 02', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 47, 'CLASSROOM', true),
  ('Aula 03', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 50, 'CLASSROOM', true),
  ('Aula 04', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 26, 'CLASSROOM', true),
  ('Aula 04a', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 30, 'CLASSROOM', true),
  ('Aula 05', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 30, 'CLASSROOM', true),
  ('Aula 05a', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 31, 'CLASSROOM', true),
  ('Aula 06', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 26, 'CLASSROOM', true),
  ('Aula 06a', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 30, 'CLASSROOM', true),
  ('Aula 07', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 26, 'CLASSROOM', true),
  ('Aula 07a', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 30, 'CLASSROOM', true),
  ('Aula 08', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 50, 'CLASSROOM', true),
  ('Aula 09', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 50, 'CLASSROOM', true),
  ('Aula 10', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 60, 'CLASSROOM', true),
  ('Aula 11', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 60, 'CLASSROOM', true),
  ('Aula 12', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 30, 'CLASSROOM', true),
  ('Aula 13', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 50, 'CLASSROOM', true),
  ('Aula 14', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 50, 'CLASSROOM', true),
  ('Aula 01 Requena', 'e140a256-1b7d-41a9-8850-6a8eab2a449f', null, 30, 'CLASSROOM', true),
  ('Aula 01 Contamana', '0aa2e14f-1b86-4178-95bc-2a2fd0b6f4f9', null, 30, 'CLASSROOM', true),
  ('Aula 01 Datem del Marañón', '2851cdf0-cdb3-4c42-89c5-a4fc24d3a7df', null, 50, 'CLASSROOM', true),
  ('Aula 01', 'd719a5f3-472b-478b-866b-c4a0ca41f689', null, 50, 'CLASSROOM', true)
) as seed(name, facility_id, description, capacity, type, is_active)
where not exists (
  select 1 from spaces existing
  where existing.name = seed.name and existing.facility_id = seed.facility_id::uuid
);
