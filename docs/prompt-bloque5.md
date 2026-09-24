# Prompt — Fase 7, Bloque 5-B: bandeja y ficha de casos (pocketar-backoffice)

> Para un agente ejecutor en `C:\pocketar-backoffice`. Generado el 2026-09-23.
> Autocontenido: el contrato de las RPC está copiado abajo.

---

```
Trabajás en C:\pocketar-backoffice, el panel de administración de Pocketar (Next.js 15, App
Router, TypeScript estricto), desplegado en Vercel con auto-deploy desde main.

CONTEXTO MÍNIMO
Pocketar es una plataforma de compraventa de cartas coleccionables para Argentina. RESTRICCIÓN
LEGAL: nunca «subasta» ni «remate» en ningún lado; se dice publicación, lote, puja, oferta, cierre.
Todo en español argentino con voseo. Leé AGENTS.md antes de empezar.

Este repo es SÓLO el front y el server del panel: nunca migraciones ni SQL. La base y sus RPC viven
en otro repositorio y ya están hechas para este bloque.

Los Bloques 3 y 4 ya están en este repo: cola de revisión (app/revision), usuarios y sanciones
(app/usuarios). SEGUÍ SU PATRÓN, no lo reinventes:
- lecturas en lib/datos/, Server Actions en lib/acciones/, tipos en lib/tipos/;
- llamadas a RPC por lib/rpc.ts; errores de negocio por lib/errores.ts;
- reenvío de notificaciones por lib/avisos.ts (con ya_persistida: true);
- exigirStaff() primero en cada Server Action;
- la revelación de contacto ya existe en la ficha de usuario (fn_staff_revelar_contacto): reusala.

═══ QUÉ RESUELVE ESTE BLOQUE ═══

La app deja reportar un problema con una operación, pero hoy el reporte no le llega a nadie. Este
bloque le da al equipo una bandeja de casos para tomarlos, clasificarlos, responderle a quien
reportó y cerrarlos, pudiendo sancionar con lo que ya existe del Bloque 4.

Reglas de producto: la plataforma no media ni toma partido ni promete reembolsos. La respuesta al
usuario es UN mensaje, sin conversación. La persona reportada nunca se entera del reporte.

═══ EL CONTRATO DE LAS RPC ═══

Todas: POST /rest/v1/rpc/<nombre> con el JWT DEL STAFF (el cliente de sesión, NUNCA service_role:
el log quedaría sin actor). No staff → HTTP 403. Errores de negocio → HTTP 200 con
{"error": "<CÓDIGO>"}. En las escrituras, p_ip y p_user_agent (text, opcionales) van al final.
p_idempotency_key: 1 a 128 caracteres; un UUID nuevo por intento de operación, reusado si se
reintenta. Un reintento devuelve replayed: true y sin notificar.
Errores comunes de las escrituras: INVALID_INPUT, INVALID_IDEMPOTENCY_KEY,
IDEMPOTENCY_KEY_REUSED, CASE_NOT_FOUND, SELF_CASE (el caso es de una cuenta vinculada a quien llama).

Valores: estado = abierto · en_revision · esperando_usuario · resuelto · desestimado.
categoria = no_se_concreto · no_coincide_con_lo_publicado · conducta · operar_afuera · otro.
tipo de evento = nota_interna · respuesta_usuario · cambio_estado · clasificacion ·
sancion_vinculada · asignacion.

fn_staff_listar_casos(p_estado?, p_categoria?, p_asignado_a? uuid, p_sin_asignar? bool=false,
  p_limite? int=50 (1..200), p_offset? int=0)
  p_estado admite también «activos» (los tres no cerrados).
  → {success, total, resumen:{abierto,en_revision,esperando_usuario,resuelto,desestimado},
     mas_viejo_abierto:{caso_id,created_at,antiguedad_horas}|null,
     casos:[{id,report_id,auction_id,estado,categoria,asignado_a,asignado_at,reportante_id,
       reportante_alias,reportado_id,reportado_alias,publicacion:{status,titulo},respondido_at,
       cerrado_at,created_at,updated_at,antiguedad_horas}]}
  El más viejo primero. total respeta filtros; resumen y mas_viejo_abierto son de toda la bandeja.
  reportado_* puede ser null (no había contraparte).
  Errores: INVALID_FILTER, INVALID_INPUT.

fn_staff_ficha_caso(p_caso_id)
  → {success, caso:{id,report_id,estado,categoria,asignado_a,asignado_at,resolucion,
       respondido_at,cerrado_at,created_at,updated_at},
     reporte:{id,description,created_at}|null,
     publicacion:{id,status,seller_id,currency,current_price,buy_now_price,buy_now_status,ends_at,
       provincia,condicion,is_lot,images,description,item:{title,game}}|null,
     operacion:{estado_publicacion,buy_now_status,comprador_id,vendedor_id,
       oferta_ganadora:{bidder_id,amount,status}|null,contacto_revelado_at,precio_cierre,
       comprador_confirmo_at,vendedor_confirmo_at,confirmada_at,
       dada_de_baja:{baja_at,parte_suspendida,penalizacion_id,credito_a_contraparte}|null},
     eventos:[{id,tipo,actor_id,texto,datos,created_at}] (en orden),
     partes:{reportante:parte, reportado:parte|null}}
  parte = {user_id, rol_en_caso ('comprador'|'vendedor'), existe, alias, miembro_desde,
    completed_sales, completed_buys, baja_solicitada, sancion_vigente, penalizaciones[],
    casos_previos_total, casos_previos:[{caso_id,estado,categoria,created_at,cerrado_at,
    rol ('reportante'|'reportado')}]}
  reporte y publicacion son null si se borraron; existe:false y alias:null si la cuenta se borró.
  NINGÚN dato de contacto: para eso, fn_staff_revelar_contacto, que ya usa el panel.
  Errores: INVALID_INPUT, CASE_NOT_FOUND, SELF_CASE.

fn_staff_tomar_caso(p_caso_id? uuid, p_reasignar? bool=false, p_ip, p_user_agent)  (sin clave)
  Sin id: toma el más antiguo sin asignar. Un caso abierto pasa a en_revision.
  → {success,caso_id,estado,asignado_a,reasignado} o {success,sin_cambios:true,...} si ya era tuyo.
  La asignación NO vence.
  Errores: QUEUE_EMPTY, CASE_NOT_FOUND, CASE_CLOSED, SELF_CASE, ASSIGNED_TO_OTHER (lo tiene otra
  persona; con p_reasignar: true se lo lleva).

fn_staff_clasificar_caso(p_caso_id, p_categoria, p_idempotency_key)
  → {success,replayed,caso_id,categoria}. Admite caso cerrado. Error: INVALID_CATEGORY.

fn_staff_cambiar_estado_caso(p_caso_id, p_estado, p_idempotency_key)
  p_estado ∈ abierto · en_revision · esperando_usuario. Cerrar NO se hace acá.
  → {success,replayed,caso_id,estado,estado_anterior}
  Errores: INVALID_STATE, CASE_CLOSED, NOT_ASSIGNED, STATE_UNCHANGED.

fn_staff_agregar_nota_caso(p_caso_id, p_texto (≤2000), p_idempotency_key)
  → {success,replayed,caso_id,evento_id}. Admite caso cerrado.
  Errores: TEXT_REQUIRED, TEXT_TOO_LONG.

fn_staff_responder_caso(p_caso_id, p_texto (≤1000), p_idempotency_key)
  → {success,replayed,caso_id,evento_id,notificar[]}. Le llega SÓLO al reportante. No cambia el
  estado; completa respondido_at.
  Errores: TEXT_REQUIRED, TEXT_TOO_LONG, TEXT_CONTAINS_PERSONAL_DATA (cualquier arroba salvo la
  dirección de soporte, o 9 o más dígitos), CASE_CLOSED, NOT_ASSIGNED, REPORTER_NOT_FOUND.

fn_staff_resolver_caso(p_caso_id, p_resolucion (≤2000), p_idempotency_key)
fn_staff_desestimar_caso(p_caso_id, p_resolucion (≤2000), p_idempotency_key)
  → {success,replayed,caso_id,estado,estado_anterior,cerrado_at}. Un caso cerrado NO se reabre.
  Errores: RESOLUTION_REQUIRED, RESOLUTION_TOO_LONG, CASE_CLOSED, NOT_ASSIGNED.

fn_staff_vincular_sancion_caso(p_caso_id, p_penalizacion_id, p_idempotency_key)
  La sanción se aplica ANTES con las acciones del Bloque 4 (advertir, suspender, bloquear), y
  después se vincula. Puede ser de la persona reportada o del reportante que abusó del canal.
  → {success,replayed,caso_id,evento_id,penalizacion_id}. Admite caso cerrado.
  Errores: PENALIZACION_NOT_FOUND, PENALIZACION_NOT_RELATED, ALREADY_LINKED.

═══ QUÉ CONSTRUIR ═══

A — BANDEJA, en /reportes
- Resumen por estado arriba, y el caso abierto más viejo como el número más visible.
- Filtros: estado (por defecto «activos»), categoría, asignado a mí, sin asignar. Paginación.
- Cada fila: antigüedad, estado, categoría, publicación, alias del reportante y del reportado, y
  quién lo tiene tomado.
- Estado vacío propio. Responsive: se opera desde el celular.
- Sumá /reportes a la navegación.

B — FICHA, en /reportes/[id]
Al entrar, fn_staff_tomar_caso y después fn_staff_ficha_caso. Si lo tiene otra persona
(ASSIGNED_TO_OTHER), mostralo y ofrecé tomarlo con confirmación, sin tomarlo automáticamente.
Mostrá: el texto del reporte; la publicación y el estado de la operación; los eventos en orden; y
las DOS partes lado a lado, cada una con su rol, antigüedad, operaciones completadas, sanción
vigente, penalizaciones y casos previos (link a la ficha de usuario del Bloque 4).
El contacto de una parte se ve SÓLO con el revelado auditado que ya existe, nunca de otra forma.

C — ACCIONES DE LA FICHA
- Clasificar, cambiar estado (entre los tres abiertos), agregar nota interna.
- Responder al reportante. Junto al campo, un aviso visible: el texto lo lee el usuario y NUNCA
  puede llevar un dato de contacto de la contraparte. Junto al campo de nota, que puede quedar un
  dato personal y conviene no escribirlo.
- Tras responder, reenviá notificar a send_notification con ya_persistida: true, por lib/avisos.ts.
  Si falla, no revierte: logueá y seguí.
- Resolver y desestimar, con resolución obligatoria.
  REGLA DE PRODUCTO: RESOLVER EXIGE HABER RESPONDIDO. Si el caso no tiene respondido_at, el
  formulario de resolver pide también la respuesta al usuario, y en ese orden llamás
  responder y después resolver. Desestimar NO lo exige.
- Sancionar desde el caso: aplicá advertir, suspender o bloquear con las MISMAS acciones del Bloque
  4 (reusá su UI y su fricción), sobre cualquiera de las dos partes, y después
  fn_staff_vincular_sancion_caso con el penalizacion_id devuelto. Si suspender devuelve
  PENDING_SELLER_DECISION, mostrá que no se puede hasta que el vendedor decida (hasta 48 h).
- Cada código de error con un mensaje claro en la UI. NOT_ASSIGNED sugiere tomar el caso.

═══ REGLAS ═══

- Ninguna escritura directa a una tabla. Todo por las RPC de arriba.
- lib/supabase/admin.ts nunca desde un Componente de Cliente.
- No muestres mail ni teléfono salvo por el revelado auditado.
- Nada de alert ni confirm nativos.
- No inventes estados, acciones ni campos que no estén acá.
- No agregues migraciones ni SQL.

═══ VALIDACIÓN ═══

- npm run typecheck y npm run build en verde.
- SUPABASE_SERVICE_ROLE_KEY ausente de .next/static/.
- Revisión propia: cero escrituras directas; admin.ts sólo en el servidor.
- Prueba manual contra el entorno que te indique el operador: tomar, clasificar, anotar, responder,
  resolver sin respuesta previa (tiene que pedirla), desestimar, sancionar y vincular, y un
  NOT_ASSIGNED a propósito. A ancho de celular.

IMPORTANTE SOBRE EL DESPLIEGUE: las RPC de este bloque todavía no están en producción. Construí y
validá, pero NO mergees a main hasta que el operador te confirme que las migraciones del Bloque 5
están aplicadas: con auto-deploy, el panel publicado antes llamaría funciones que no existen.

Al terminar: qué construiste, qué decidiste que no estaba acá, y qué quedó pendiente.
```
