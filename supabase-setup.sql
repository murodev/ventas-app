-- ═══════════════════════════════════════════════════════════════
-- SETUP COMPLETO - Sistema de ventas
-- Ejecutá esto en Supabase > SQL Editor > New query
-- ═══════════════════════════════════════════════════════════════

-- 1. TABLA DE ROLES (vinculada a auth de Supabase)
create table if not exists usuarios_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  nombre     text not null,
  rol        text not null default 'vendedor' check (rol in ('admin','vendedor','produccion')),
  created_at timestamptz default now()
);

-- 2. CLIENTES
create table if not exists clientes (
  idCliente  serial primary key,
  Alias      text,
  Nombre     text not null,
  Email      text,
  Telefono   text,
  Direccion  text,
  fecha_ins  timestamptz default now()
);

-- 3. PRODUCTOS
create table if not exists productos (
  idProducto serial primary key,
  Producto   text not null
);

-- 4. MEDIOS DE PAGO
create table if not exists mediosPagos (
  idMedioPago serial primary key,
  medioPago   text not null
);

-- 5. STOCK (por producto y lote)
create table if not exists stock (
  id         serial primary key,
  idProducto int references productos(idProducto),
  Lote       text,
  Cantidad   numeric(10,2) default 0,
  unique(idProducto, Lote)
);

-- 6. VENTAS
create table if not exists "Ventas" (
  idventa        serial primary key,
  Fecha          timestamptz default now(),
  Cliente        text,
  idCliente      int references clientes(idCliente),
  MontoVenta     numeric(12,2) not null default 0,
  MontoPendiente numeric(12,2) default 0,
  Fecha_act      timestamptz,
  Estado         text default 'Pendiente' check (Estado in ('Pendiente','Parcial','Pagado')),
  Entregado      boolean default false,
  vendedor_id    uuid references auth.users(id)
);

-- 7. DETALLE DE VENTAS
create table if not exists detalleventas (
  id         serial primary key,
  idVenta    int references "Ventas"(idventa) on delete cascade,
  Producto   text,
  idProducto int references productos(idProducto),
  Lote       text,
  Cantidad   numeric(10,2) not null,
  Precio     numeric(12,2) not null,
  subTotal   numeric(12,2) generated always as (Cantidad * Precio) stored,
  Fecha_Ins  timestamptz default now()
);

-- 8. PAGOS
create table if not exists "Pagos" (
  idPago      serial primary key,
  idVenta     int references "Ventas"(idventa) on delete cascade,
  monto       numeric(12,2) not null,
  fechaPago   timestamptz default now(),
  idMedioPago int references mediosPagos(idMedioPago)
);

-- 9. INSUMOS
create table if not exists insumos (
  id            serial primary key,
  Insumo        text not null,
  Cantidad      numeric(10,2) default 0,
  PorcionReceta numeric(10,4),
  Tipo          text
);

-- 10. FABRICACIÓN
create table if not exists fabricacion (
  idFabricacion serial primary key,
  Tipo          text,
  Lote          text,
  Cantidad      numeric(10,2),
  Fecha         timestamptz default now(),
  operario_id   uuid references auth.users(id)
);

-- 11. FABRICA (estado de fabricación)
create table if not exists fabrica (
  id            serial primary key,
  idFabricacion int references fabricacion(idFabricacion) on delete cascade,
  Estado        text default 'En proceso' check (Estado in ('En proceso','Terminado','Cancelado')),
  Fecha         timestamptz default now()
);

-- 12. REPORTES (configuración)
create table if not exists reportes (
  idreporte  serial primary key,
  reporte    text not null,
  Parametro1 text,
  Parametro2 text,
  Parametro3 text,
  Parametro4 text
);


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) - Seguridad por usuario
-- ═══════════════════════════════════════════════════════════════

alter table usuarios_roles enable row level security;
alter table "Ventas"        enable row level security;
alter table detalleventas   enable row level security;
alter table "Pagos"         enable row level security;
alter table clientes        enable row level security;
alter table productos       enable row level security;
alter table stock           enable row level security;
alter table fabricacion     enable row level security;
alter table fabrica         enable row level security;
alter table insumos         enable row level security;
alter table mediosPagos     enable row level security;
alter table reportes        enable row level security;

-- Función helper: obtiene el rol del usuario actual
create or replace function get_my_rol()
returns text language sql stable as $$
  select rol from usuarios_roles where user_id = auth.uid()
$$;

-- Política: cada usuario ve solo su propio rol
create policy "usuario ve su rol"
  on usuarios_roles for select
  using (user_id = auth.uid());

-- Política: admin puede ver todos los roles
create policy "admin ve todos los roles"
  on usuarios_roles for all
  using (get_my_rol() = 'admin');

-- Políticas para Ventas: todos los autenticados pueden leer/crear; admin puede editar/borrar
create policy "leer ventas"    on "Ventas" for select using (auth.role() = 'authenticated');
create policy "crear ventas"   on "Ventas" for insert with check (auth.role() = 'authenticated');
create policy "editar ventas"  on "Ventas" for update using (get_my_rol() = 'admin');
create policy "borrar ventas"  on "Ventas" for delete using (get_my_rol() = 'admin');

-- Detalle ventas
create policy "leer detalle"   on detalleventas for select using (auth.role() = 'authenticated');
create policy "crear detalle"  on detalleventas for insert with check (auth.role() = 'authenticated');

-- Pagos
create policy "leer pagos"     on "Pagos" for select using (auth.role() = 'authenticated');
create policy "crear pagos"    on "Pagos" for insert with check (auth.role() = 'authenticated');

-- Clientes, productos, stock, insumos: todos autenticados leen; admin y produccion editan
create policy "leer clientes"  on clientes  for select using (auth.role() = 'authenticated');
create policy "editar clientes"on clientes  for all    using (get_my_rol() in ('admin','vendedor'));
create policy "leer productos" on productos for select using (auth.role() = 'authenticated');
create policy "editar productos" on productos for all  using (get_my_rol() = 'admin');
create policy "leer stock"     on stock     for select using (auth.role() = 'authenticated');
create policy "editar stock"   on stock     for all    using (get_my_rol() in ('admin','produccion'));
create policy "leer insumos"   on insumos   for select using (auth.role() = 'authenticated');
create policy "editar insumos" on insumos   for all    using (get_my_rol() in ('admin','produccion'));
create policy "leer fabricacion"  on fabricacion for select using (auth.role() = 'authenticated');
create policy "editar fabricacion"on fabricacion for all    using (get_my_rol() in ('admin','produccion'));
create policy "leer fabrica"   on fabrica   for select using (auth.role() = 'authenticated');
create policy "editar fabrica" on fabrica   for all    using (get_my_rol() in ('admin','produccion'));
create policy "leer medios"    on mediosPagos for select using (auth.role() = 'authenticated');
create policy "editar medios"  on mediosPagos for all    using (get_my_rol() = 'admin');
create policy "leer reportes"  on reportes  for select using (auth.role() = 'authenticated');


-- ═══════════════════════════════════════════════════════════════
-- DATOS DE EJEMPLO (opcional, borrá si no querés)
-- ═══════════════════════════════════════════════════════════════

insert into mediosPagos (medioPago) values ('Efectivo'),('Transferencia'),('Mercado Pago'),('Tarjeta débito');
insert into productos (Producto) values ('Producto A'),('Producto B'),('Producto C'),('Producto D'),('Producto E');
insert into clientes (Alias, Nombre, Telefono) values ('maria','María García','11-1234-5678'),('juan','Juan López','11-2345-6789'),('ana','Ana Martínez','11-3456-7890');
insert into stock (idProducto, Lote, Cantidad) values (1,'L024',85),(2,'L023',60),(3,'L022',30),(4,'L021',10),(5,'L020',72);


-- ═══════════════════════════════════════════════════════════════
-- CÓMO CREAR TU PRIMER USUARIO ADMIN:
-- 1. Ir a Authentication > Users > Invite user (ponés tu email)
-- 2. Aceptar el mail y setear contraseña
-- 3. Copiar el UUID del usuario desde Authentication > Users
-- 4. Ejecutar esto (reemplazando el UUID y nombre):
--
-- insert into usuarios_roles (user_id, nombre, rol)
-- values ('PEGAR-UUID-AQUI', 'Tu Nombre', 'admin');
-- ═══════════════════════════════════════════════════════════════
