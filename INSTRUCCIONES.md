# Guía de inicio: cómo levantar Afirmative Pill

Esta guía lleva el proyecto desde un repositorio recién clonado hasta la app funcionando en el navegador. Toma unos 10 minutos la primera vez, la mayor parte en descargas.

Para entender la arquitectura, ver [README.md](README.md).

---

## 1. Requisitos

| Herramienta | Versión | Para qué | Comprobar |
| --- | --- | --- | --- |
| Node.js + npm | 18 o superior (probado con 26) | Backend y frontend | `node -v` |
| Docker | Docker Desktop o Docker Engine | Supabase local corre en contenedores | `docker info` |
| Supabase CLI | 2.x | Levanta la base de datos y aplica migraciones | `supabase -v` |

En Arch/CachyOS: `sudo pacman -S nodejs npm`. Para Supabase CLI, ver <https://supabase.com/docs/guides/cli>.

**Memoria:** Supabase local usa unos 2 a 3 GB. En Docker Desktop, 4 GB asignados a la VM (*Settings → Resources*) son suficientes.

---

## 2. Base de datos (Supabase local)

Desde la **raíz del repositorio**:

```bash
supabase start
```

La primera vez descarga las imágenes (varios minutos). Al terminar, la base ya queda **lista y con datos**, porque se aplican automáticamente:

- `supabase/migrations/`: tablas, índices, la vista `medication_summary` y las funciones transaccionales `create_order` y `cancel_order`.
- `supabase/seed.sql`: 10 categorías, 50 medicamentos y el paciente demo.

No hay que pegar SQL en ningún lado ni ejecutar `npm run seed`.

Servicios que quedan disponibles:

| Servicio | URL |
| --- | --- |
| API de Supabase | <http://127.0.0.1:54321> |
| Studio (panel web para ver las tablas) | <http://127.0.0.1:54323> |

---

## 3. Backend

### 3.1 Variables de entorno

```bash
cd backend
cp .env.example .env
```

Completa `backend/.env` con los valores que muestra `supabase status -o env` (ejecutado en la raíz del repo):

| Variable en `backend/.env` | Valor de `supabase status -o env` |
| --- | --- |
| `SUPABASE_URL` | `API_URL` (normalmente `http://127.0.0.1:54321`) |
| `SUPABASE_ANON_KEY` | `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |

> ⚠️ **Error común:** no usar los valores `S3_PROTOCOL_ACCESS_KEY_*` ni la URL `.../storage/v1/s3`. Esas son credenciales del almacenamiento de archivos, no de la API.

`backend/.env` está en `.gitignore`: nunca se sube al repositorio.

### 3.2 Instalar y arrancar

```bash
npm install
npm run dev
```

Debe mostrar:

```text
🚀 Servidor GraphQL listo en http://localhost:4000/graphql
🔌 Subscriptions disponibles en ws://localhost:4000/graphql
```

Abrir <http://localhost:4000/graphql> muestra **Apollo Sandbox**, desde donde se pueden ejecutar queries a mano. Hay ejemplos en [`backend/examples/graphql_queries.graphql`](backend/examples/graphql_queries.graphql).

Deja esta terminal abierta: aquí salen los logs del DataLoader y del procesamiento de órdenes.

---

## 4. Frontend

En **otra terminal**:

```bash
cd frontend
npm install
npm run dev
```

Abre <http://localhost:3000>.

El frontend apunta por defecto a `http://localhost:4000/graphql`. Si el backend está en otra dirección, crea `frontend/.env.local` con:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://otro-host:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://otro-host:4000/graphql
```

---

## 5. Probar que todo funciona

### Recorrido manual (5 minutos)

1. **Catálogo:** entra a *Catálogo*, busca "amox" y filtra por una categoría.
2. **Orden sin fórmula:** agrega *Paracetamol* al carrito y confirma la orden. En la pantalla de seguimiento, **sin recargar**, la orden pasa a *Aprobada* (~5 s) y a *Despachada* (~8 s después).
3. **Fórmula obligatoria:** agrega *Amoxicilina* y confirma sin enlace. Debe aparecer el error de fórmula obligatoria.
4. **Fórmula rechazada y reenviada:**
   - Confirma con `https://ejemplo.com/formula-rechazada.pdf`. La fórmula queda *Rechazada*.
   - Reenvíala con `https://ejemplo.com/formula.pdf`. La orden queda *Aprobada*.
5. **Cancelar:** en una orden pendiente, pulsa *Cancelar orden*.

> La revisión de fórmulas es **simulada y predecible**: un enlace que contenga `rechaz` se rechaza; cualquier otro enlace http(s) se aprueba.

### Pruebas automáticas

```bash
cd backend
npm test            # 31 pruebas unitarias, no necesitan base de datos
npm run test:e2e    # 28 escenarios; necesita Supabase y "npm run dev" corriendo (~40 s)
```

`test:e2e` crea órdenes de prueba. Para dejar la base como recién instalada:

```bash
supabase db reset   # desde la raíz del repo; vuelve a aplicar migraciones y seed
```

### Despacho manual como administrador

La autenticación está simulada. Para ejecutar `confirmOrder` en Apollo Sandbox, agrega el header `x-demo-role: admin` (pestaña *Headers*).

---

## 6. Apagar

```bash
# Ctrl+C en las terminales del backend y del frontend
supabase stop       # desde la raíz del repo; los datos se conservan
```

Docker Desktop reserva la memoria de su VM aunque no haya contenedores. Para liberarla del todo:

```bash
systemctl --user stop docker-desktop
```

---

## 7. Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `Missing Supabase configuration` al arrancar el backend | No existe `backend/.env` o está incompleto | Paso 3.1 |
| El backend arranca pero toda consulta falla | `.env` con credenciales S3 o URL `/storage/v1/s3` | Usar `API_URL` y `SERVICE_ROLE_KEY` de `supabase status -o env` |
| `relation "medications" does not exist` | Supabase no aplicó las migraciones | `supabase db reset` |
| `supabase status` dice que no hay contenedor | Supabase se inició desde otra carpeta, o está detenido | Ejecutar `supabase start` **desde la raíz del repo** |
| `port 4000 is already in use` | Hay otro backend corriendo | Cerrarlo, o usar `PORT=4001 npm run dev` y ajustar `NEXT_PUBLIC_GRAPHQL_URL` |
| El frontend muestra "Error al cargar los medicamentos" | El backend no está corriendo | Paso 3.2 |
| El seguimiento dice "Sin conexión en tiempo real" | El WebSocket no conecta con el backend | Verificar que el backend esté en `ws://localhost:4000/graphql` |
| Una orden se queda en "Pendiente" para siempre | El backend se reinició durante el procesamiento (los temporizadores viven en memoria) | Crear una orden nueva; es una limitación conocida, documentada en el README |
