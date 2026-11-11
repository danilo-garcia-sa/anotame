'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CheckCheck, Loader2 } from 'lucide-react'
import type { DiaDeClase, Planilla } from '@/lib/api'
import { diaMes, fechaCorta, hoyISO, mesCorto, nombresDias } from '@/lib/fechas'
import { Avatar, colorDe, iniciales } from './avatar'
import { clave, type Celda, type Totales } from './use-planilla'

type Props = {
  planilla: Planilla
  celdas: Record<string, Celda>
  guardando: boolean
  totales: (estudianteId: number) => Totales
  ultimaClase: DiaDeClase | null
  onCiclar: (estudianteId: number, fecha: string) => void
  onMotivo: (estudianteId: number, fecha: string, texto: string) => void
  onGuardarMotivo: (estudianteId: number, fecha: string) => void
  onTodosPresentes: (fecha: string) => void
  onSinActividad: (fecha: string, sinActividad: boolean, motivo?: string) => void
}

const ETIQUETA = { P: 'Presente', A: 'Ausente', T: 'Tarde' } as const

export function PlanillaGrid(p: Props) {
  const { planilla, celdas } = p
  const hoy = hoyISO()
  const contenedor = useRef<HTMLDivElement>(null)
  const [seleccion, setSeleccion] = useState<{ estudianteId: number; fecha: string } | null>(null)
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null)

  // Meses para la fila de arriba de la cabecera.
  const meses = useMemo(() => {
    const grupos: { clave: string; nombre: string; cantidad: number }[] = []
    for (const d of planilla.dias) {
      const k = d.fecha.slice(0, 7)
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && ultimo.clave === k) ultimo.cantidad++
      else grupos.push({ clave: k, nombre: mesCorto(d.fecha), cantidad: 1 })
    }
    return grupos
  }, [planilla.dias])

  // Al abrir, la planilla se acomoda en la última clase dada.
  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const col = p.ultimaClase ? el.querySelector<HTMLElement>(`[data-fecha="${p.ultimaClase.fecha}"]`) : null
    if (col) el.scrollLeft = Math.max(0, col.offsetLeft - el.clientWidth / 2)
    else el.scrollLeft = 0
    // solo cuando cambia la cursada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planilla.cursada.id])

  const celdaSeleccionada = seleccion ? celdas[clave(seleccion.estudianteId, seleccion.fecha)] : undefined
  const estudianteSel = seleccion ? planilla.estudiantes.find((e) => e.id === seleccion.estudianteId) : null
  const diaSel = diaAbierto ? planilla.dias.find((d) => d.fecha === diaAbierto) : null

  if (planilla.dias.length === 0) {
    return <p className="empty-state">Esta cursada no tiene clases en el período elegido. Editala en “Mis cursos”.</p>
  }

  return (
    <>
      <div className="planilla-scroll" ref={contenedor}>
        <table className="planilla">
          <thead>
            <tr>
              <th className="col-alumno sticky-col" rowSpan={3}>Estudiante</th>
              {meses.map((m) => <th key={m.clave} colSpan={m.cantidad} className="mes">{m.nombre}</th>)}
              <th className="col-total" rowSpan={3}>P</th>
              <th className="col-total" rowSpan={3}>A</th>
              <th className="col-total" rowSpan={3}>T</th>
              <th className="col-total col-pct" rowSpan={3}>%</th>
            </tr>
            <tr>
              {planilla.dias.map((d) => (
                <th key={d.fecha} data-fecha={d.fecha} className={`dia ${d.sinActividad ? 'dia-sa' : ''} ${d.fecha === hoy ? 'dia-hoy' : ''}`}>
                  <button className="dia-btn" onClick={() => setDiaAbierto(diaAbierto === d.fecha ? null : d.fecha)} aria-label={`Clase ${d.numero}, ${fechaCorta(d.fecha)}`} title={d.motivo ?? undefined}>
                    {diaMes(d.fecha)}
                  </button>
                </th>
              ))}
            </tr>
            <tr>
              {planilla.dias.map((d) => {
                const puede = !d.sinActividad && d.fecha <= hoy
                return (
                  <th key={d.fecha} className={`num ${d.sinActividad ? 'dia-sa' : ''}`}>
                    {d.sinActividad ? 'SA' : puede ? (
                      <button className="todos-btn" onClick={() => p.onTodosPresentes(d.fecha)} title={`Todos presentes · clase ${d.numero}`} aria-label={`Todos presentes el ${fechaCorta(d.fecha)}`}>
                        <CheckCheck />
                      </button>
                    ) : d.numero}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {planilla.estudiantes.map((e, i) => {
              const t = p.totales(e.id)
              return (
                <tr key={e.id}>
                  <th className="col-alumno sticky-col" scope="row">
                    <div className="student-cell">
                      <Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(i)} fotoUrl={e.fotoUrl} size="lg" />
                      <strong>{e.apellido}, {e.nombre}</strong>
                    </div>
                  </th>
                  {planilla.dias.map((d) => {
                    if (d.sinActividad) return <td key={d.fecha} className="celda celda-sa" />
                    const celda = celdas[clave(e.id, d.fecha)]
                    const futuro = d.fecha > hoy
                    const activa = seleccion?.estudianteId === e.id && seleccion.fecha === d.fecha
                    return (
                      <td key={d.fecha} className="celda">
                        <button
                          className={`celda-btn ${celda ? `celda-${celda.letra.toLowerCase()}` : ''} ${activa ? 'celda-activa' : ''}`}
                          disabled={futuro}
                          onClick={() => { p.onCiclar(e.id, d.fecha); setSeleccion({ estudianteId: e.id, fecha: d.fecha }) }}
                          aria-label={`${e.nombre} ${e.apellido}, ${fechaCorta(d.fecha)}: ${celda ? ETIQUETA[celda.letra] : 'sin registrar'}`}
                        >
                          {celda?.letra ?? ''}
                        </button>
                      </td>
                    )
                  })}
                  <td className="total total-p">{t.p}</td>
                  <td className="total total-a">{t.a}</td>
                  <td className="total total-t">{t.t}</td>
                  <td className="total col-pct">{t.porcentaje === null ? '—' : `${t.porcentaje}%`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="planilla-barra">
        {diaSel ? (
          <DiaPanel key={diaSel.fecha} dia={diaSel} onSinActividad={p.onSinActividad} onCerrar={() => setDiaAbierto(null)} />
        ) : estudianteSel && seleccion && celdaSeleccionada && celdaSeleccionada.letra !== 'P' ? (
          <label className="motivo-bar">
            <span>Motivo · {estudianteSel.nombre} {estudianteSel.apellido} · {fechaCorta(seleccion.fecha)} ({ETIQUETA[celdaSeleccionada.letra]})</span>
            <input
              className="justification-input"
              placeholder="Ej: Enfermedad, transporte…"
              value={celdaSeleccionada.justificacion}
              onChange={(ev) => p.onMotivo(seleccion.estudianteId, seleccion.fecha, ev.target.value)}
              onBlur={() => p.onGuardarMotivo(seleccion.estudianteId, seleccion.fecha)}
              onKeyDown={(ev) => { if (ev.key === 'Enter') ev.currentTarget.blur() }}
            />
          </label>
        ) : (
          <p className="planilla-ayuda">
            Tocá una celda: <b className="l-p">P</b> presente → <b className="l-a">A</b> ausente → <b className="l-t">T</b> tarde → vacía.
            Tocá el número de una fecha para marcarla “sin actividad” y usá el doble tilde de abajo para marcar a todos presentes. Todo se guarda solo.
          </p>
        )}
        <span className={`guardado-tag ${p.guardando ? 'guardando' : ''}`}>
          {p.guardando ? <><Loader2 className="girar" /> Guardando…</> : <><Check /> Guardado</>}
        </span>
      </div>
      <p className="planilla-ayuda planilla-cursada">{nombresDias(planilla.cursada.diasDeClase)} · {planilla.dias.filter((d) => !d.sinActividad).length} clases con actividad</p>
    </>
  )
}

function DiaPanel({ dia, onSinActividad, onCerrar }: { dia: DiaDeClase; onSinActividad: (f: string, s: boolean, m?: string) => void; onCerrar: () => void }) {
  const [motivo, setMotivo] = useState(dia.motivo ?? '')
  return (
    <div className="motivo-bar dia-panel">
      <span>Clase {dia.numero} · {fechaCorta(dia.fecha)}{dia.sinActividad ? ' · sin actividad' : ''}</span>
      {dia.sinActividad ? (
        <button className="secondary-button" onClick={() => { onSinActividad(dia.fecha, false); onCerrar() }}>Volver a dar clase</button>
      ) : (
        <>
          <input className="justification-input" placeholder="Motivo (feriado, paro, acto…)" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />
          <button className="secondary-button" onClick={() => { onSinActividad(dia.fecha, true, motivo); onCerrar() }}>Marcar SA</button>
        </>
      )}
      <button className="text-button" onClick={onCerrar}>Cerrar</button>
    </div>
  )
}
