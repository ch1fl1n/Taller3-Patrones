-- Comandos transaccionales del write model (CQRS).
-- Cada función corre en una sola transacción: si algo falla, no queda nada a medias
-- (ni órdenes huérfanas ni stock descontado sin orden).

-- Crea la orden, congela precios, descuenta stock y registra la evidencia de fórmula.
-- p_items: [{"medication_id": "<uuid>", "quantity": <int>}, ...]
-- Errores (message): MEDICATION_NOT_FOUND:<id>, INVALID_QUANTITY:<id>,
--                    INSUFFICIENT_STOCK:<id>, PRESCRIPTION_REQUIRED
create or replace function create_order(
  p_patient_id uuid,
  p_items jsonb,
  p_document_url text default null
)
returns uuid as $$
declare
  v_order_id uuid;
  v_item record;
  v_med medications%rowtype;
  v_total numeric(10,2) := 0;
  v_requires_prescription boolean := false;
begin
  insert into orders (patient_id, status)
  values (p_patient_id, 'PENDING_APPROVAL')
  returning id into v_order_id;

  -- Agrupa ítems repetidos y bloquea filas en orden de id para evitar deadlocks
  for v_item in
    select (e->>'medication_id')::uuid as medication_id,
           sum((e->>'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    select * into v_med from medications where id = v_item.medication_id for update;

    if not found then
      raise exception 'MEDICATION_NOT_FOUND:%', v_item.medication_id;
    end if;
    if v_item.quantity <= 0 then
      raise exception 'INVALID_QUANTITY:%', v_item.medication_id;
    end if;
    if v_med.stock < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_item.medication_id;
    end if;

    update medications set stock = stock - v_item.quantity where id = v_med.id;

    -- Invariante 4: el precio unitario se congela al momento de la compra
    insert into order_items (order_id, medication_id, quantity, unit_price)
    values (v_order_id, v_med.id, v_item.quantity, v_med.price);

    v_total := v_total + v_med.price * v_item.quantity;
    v_requires_prescription := v_requires_prescription or v_med.requires_prescription;
  end loop;

  -- Invariante 1: sin evidencia de fórmula no hay orden con medicamentos formulados
  if v_requires_prescription then
    if coalesce(trim(p_document_url), '') = '' then
      raise exception 'PRESCRIPTION_REQUIRED';
    end if;
    insert into prescription_evidences (order_id, document_url)
    values (v_order_id, trim(p_document_url));
  end if;

  update orders set total = v_total where id = v_order_id;

  return v_order_id;
end;
$$ language plpgsql;

-- Cancela la orden y restaura el stock de forma atómica.
-- Solo PENDING_APPROVAL y APPROVED pueden pasar a CANCELLED (ver orderStatus.stateMachine.ts).
-- Errores (message): ORDER_NOT_FOUND, INVALID_ORDER_STATUS:<estado actual>
create or replace function cancel_order(p_order_id uuid)
returns void as $$
declare
  v_status order_status;
begin
  select status into v_status from orders where id = p_order_id for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_status not in ('PENDING_APPROVAL', 'APPROVED') then
    raise exception 'INVALID_ORDER_STATUS:%', v_status;
  end if;

  update medications m
  set stock = m.stock + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id and m.id = oi.medication_id;

  update orders set status = 'CANCELLED' where id = p_order_id;
end;
$$ language plpgsql;

-- Solo el backend (service_role) puede ejecutar los comandos
revoke execute on function create_order(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function cancel_order(uuid) from public, anon, authenticated;
grant execute on function create_order(uuid, jsonb, text) to service_role;
grant execute on function cancel_order(uuid) to service_role;
