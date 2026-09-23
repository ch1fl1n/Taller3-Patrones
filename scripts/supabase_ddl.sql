-- DDL para Supabase (PostgreSQL) - Afirmative Pill E-Commerce Farmacéutico
-- Sección 4.1 del planning.md

-- Tabla de categorías terapéuticas
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Tabla de medicamentos (dataset de 50 medicamentos)
create table medications (
  id uuid primary key default gen_random_uuid(),
  commercial_name text not null,
  active_ingredient text not null,
  category_id uuid references categories(id),
  laboratory text not null,
  presentation text not null,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null check (stock >= 0),
  requires_prescription boolean not null default false,
  indications text,
  contraindications text,
  created_at timestamptz default now()
);

-- Índices para mejorar performance
create index idx_medications_category on medications(category_id);
create index idx_medications_active_ingredient on medications(active_ingredient);
create index idx_medications_commercial_name on medications(commercial_name);
create index idx_medications_requires_prescription on medications(requires_prescription);

-- Tabla de pacientes/usuarios
create table patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  created_at timestamptz default now()
);

-- Tipo enumerado para estado de orden
create type order_status as enum ('PENDING_APPROVAL','APPROVED','DISPATCHED','CANCELLED');

-- Tabla de órdenes/pedidos
create table orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) not null,
  status order_status not null default 'PENDING_APPROVAL',
  total numeric(10,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de items de orden (líneas de pedido)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  medication_id uuid references medications(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Tabla de evidencia de prescripción médica
create table prescription_evidences (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  document_url text,
  validation_status text not null default 'PENDING',
  validated_at timestamptz,
  created_at timestamptz default now()
);

-- Trigger para actualizar updated_at en orders
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_orders_updated_at
  before update on orders
  for each row
  execute function update_updated_at_column();

-- Función para decrementar stock de manera atómica (invariante de negocio)
create or replace function decrement_stock(
  p_medication_id uuid,
  p_quantity integer
)
returns boolean as $$
declare
  current_stock integer;
begin
  -- Bloqueo de fila para garantizar atomicidad
  select stock into current_stock
  from medications
  where id = p_medication_id
  for update;
  
  if current_stock >= p_quantity then
    update medications
    set stock = stock - p_quantity
    where id = p_medication_id;
    
    return true;
  else
    return false;
  end if;
end;
$$ language plpgsql;

-- Función para verificar si una orden requiere prescripción
create or replace function check_prescription_required(
  p_order_id uuid
)
returns boolean as $$
declare
  requires_prescription boolean;
begin
  select bool_or(m.requires_prescription) into requires_prescription
  from order_items oi
  join medications m on m.id = oi.medication_id
  where oi.order_id = p_order_id;
  
  return coalesce(requires_prescription, false);
end;
$$ language plpgsql;

-- Vista para proyección de medicamentos (read model optimizado)
create view medication_summary as
select 
  id,
  commercial_name,
  price,
  presentation,
  category_id,
  laboratory,
  requires_prescription,
  stock > 0 as in_stock
from medications;


-- Función para incrementar stock (para cancelaciones de órdenes)
create or replace function increment_stock(
  p_medication_id uuid,
  p_quantity integer
)
returns boolean as $$
begin
  update medications
  set stock = stock + p_quantity
  where id = p_medication_id;
  
  return true;
exception
  when others then
    return false;
end;
$$ language plpgsql;

-- Función para verificar si un usuario puede cancelar una orden
create or replace function can_cancel_order(
  p_order_id uuid,
  p_user_id uuid
)
returns boolean as $$
declare
  order_record record;
  is_admin boolean;
begin
  -- Obtener información de la orden
  select patient_id, status into order_record
  from orders
  where id = p_order_id;
  
  if not found then
    return false; -- Orden no existe
  end if;
  
  -- Verificar si el usuario es admin (simulado)
  -- En producción esto vendría de una tabla de roles
  is_admin := false; -- Por defecto no es admin
  
  -- Verificar permisos
  return (
    order_record.patient_id = p_user_id  -- Es el dueño
    or is_admin                          -- Es admin
    or order_record.status = 'PENDING_APPROVAL'  -- Orden aún no aprobada
  ) and order_record.status != 'DISPATCHED';     -- No puede cancelar despachada
end;
$$ language plpgsql;