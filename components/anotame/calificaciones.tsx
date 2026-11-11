'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  borrarEvaluacion, configurarCursada, crearEvaluacion, getCalificaciones, guardarInstancia, guardarNotaPuntos,
  type Calificaciones, type EstadoBimestre, type Instancia,
} from '@/lib/api'
import { Avatar, colorDe, iniciales } from './avatar'

export const INSTANCIAS: { id: Instancia; nombre: string; tipo: 'bimestre' | 'cuatrimestre' }[] = [
  { id: 'BIMESTRE_1', nombre: '1er bimestre', tipo: 'bimestre' },
  { id: 'CUATRIMESTRE_1', nombre: '1er cuatrimestre', tipo: 'cuatrimestre' },
  { id: 'BIMESTRE_2', nombre: '2do bimestre', tipo: 'bimestre' },
  { id: 'CUATRIMESTRE_2', nombre: '2do cuatrimestre', tipo: 'cuatrimestre' },
]
export const ESTADOS: { id: EstadoBimestre; nombre: string }[] = [
  { id: 'APROBADO', nombre: 'Aprobado' },
  { id: 'EN_PROCESO', nombre: 'En proceso' },
  { id: 'DESAPROBADO', nombre: 'Desaprobado' },
]
const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')

export function Calificaciones(p: { cursadaId: number | null; selector: React.ReactNode; intento: number; acciones?: React.ReactNode }) {
  const { cursadaId } = p
  const [datos, setDatos] = useState<Calificaciones | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const recargar = useCallback(async (id: number) => {
    setDatos(await getCalificaciones(id))
  }, [])

  useEffect(() => {
    if (cursadaId === null) { setDatos(null); return }
    let cancelado = false
    setCargando(true)
    recargar(cursadaId)
      .then(() => !cancelado && setError(null))
      .catch((e) => !cancelado && setError(mensajeDe(e)))
      .finally(() => !cancelado && setCargando(false))
    return () => { cancelado = true }
  }, [cursadaId, p.intento, recargar])

  // Ejecuta una acción contra el backend; si falla muestra el error y vuelve a leer lo que quedó guardado.
  const ejecutar = async (accion: () => Promise<unknown>, recargarTodo = false) => {
    if (cursadaId === null) return
    try {
      await accion()
      setError(null)
      if (recargarTodo) await recargar(cursadaId)
    } catch (e) {
      setError(mensajeDe(e))
      await recargar(cursadaId).catch(() => undefined)
    }
  }

  const setInstancia = (estudianteId: number, instancia: Instancia, nota: number | null, estado: EstadoBimestre | null) => {
    if (cursadaId === null) return
    setDatos((d) => d && {
      ...d,
      instancias: [
        ...d.instancias.filter((i) => !(i.estudianteId === estudianteId && i.instancia === instancia)),
        ...(nota !== null || estado !== null ? [{ estudianteId, instancia, nota, estado }] : []),
      ],
    })
    ejecutar(() => guardarInstancia(cursadaId, { estudianteId, instancia, nota, estado }))
  }

  const setPuntos = (estudianteId: number, evaluacionId: number, valor: number | null) => {
    if (cursadaId === null) return
    setDatos((d) => d && {
      ...d,
      notas: [
        ...d.notas.filter((n) => !(n.estudianteId === estudianteId && n.evaluacionId === evaluacionId)),
        ...(valor !== null ? [{ estudianteId, evaluacionId, valor }] : []),
      ],
    })
    ejecutar(() => guardarNotaPuntos(cursadaId, { estudianteId, evaluacionId, valor }))
  }

  const cambiarSistema = (sistema: 'NOTAS' | 'PUNTOS') =>
    ejecutar(() => configurarCursada(cursadaId!, sistema, datos?.cursada.puntosAprobar ?? null), true)

  const cambiarMeta = (meta: number | null) =>
    ejecutar(() => configurarCursada(cursadaId!, 'PUNTOS', meta), true)

  const agregarEvaluacion = (titulo: string, puntos: number | null) =>
    ejecutar(() => crearEvaluacion(cursadaId!, { titulo, puntosMaximos: puntos }), true)

  const quitarEvaluacion = (id: number) => ejecutar(() => borrarEvaluacion(cursadaId!, id), true)

  const porPuntos = datos?.cursada.sistema === 'PUNTOS'

  return <>
    <section className="welcome-row compact">
      <div><p className="eyebrow">CALIFICACIONES · {(datos?.cursada.curso.nombre ?? '').toUpperCase()}</p><h1>Calificaciones</h1><p className="subtitle">Bimestres, cuatrimestres y, si lo usás, puntos por evaluación.</p></div>
      {p.acciones}
    </section>
    {p.selector}
    {error && <div className="notice" role="alert"><span>{error}</span></div>}
    {cursadaId === null ? (
      <div className="panel empty-state">Todavía no tenés cursadas. Creá una en “Mis cursos”.</div>
    ) : !datos ? (
      <div className="panel empty-state">{cargando ? 'Cargando calificaciones…' : 'No se pudieron cargar las calificaciones.'}</div>
    ) : datos.estudiantes.length === 0 ? (
      <div className="panel empty-state">Este curso todavía no tiene alumnos inscriptos.</div>
    ) : <>
      <section className="panel sistema-panel">
        <div>
          <h2>Sistema de calificación</h2>
          <p>{porPuntos ? 'Se suman puntos por TP/evaluación y se aprueba al llegar a la meta.' : 'Cada cuatrimestre se califica de 1 a 10 (se aprueba con 7).'}</p>
        </div>
        <div className="segmentado" role="group" aria-label="Sistema">
          <button className={!porPuntos ? 'seg-on' : ''} onClick={() => cambiarSistema('NOTAS')}>Notas 1-10</button>
          <button className={porPuntos ? 'seg-on' : ''} onClick={() => cambiarSistema('PUNTOS')}>Puntos</button>
        </div>
      </section>

      <section className="panel grades-panel">
        <div className="panel-heading"><div><h2>Instancias</h2><p>Bimestres: aprobado, en proceso o desaprobado · Cuatrimestres: nota entera de 1 a 10 (aprueba con 7)</p></div></div>
        <div className="scroll-x">
          <table className="notas-tabla">
            <thead><tr><th className="izq">Estudiante</th>{INSTANCIAS.map((i) => <th key={i.id}>{i.nombre}</th>)}</tr></thead>
            <tbody>
              {datos.estudiantes.map((e, idx) => (
                <tr key={e.id}>
                  <th className="izq" scope="row"><div className="student-cell"><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(idx)} fotoUrl={e.fotoUrl} /><strong>{e.apellido}, {e.nombre}</strong></div></th>
                  {INSTANCIAS.map((inst) => {
                    const r = datos.instancias.find((x) => x.estudianteId === e.id && x.instancia === inst.id)
                    return <td key={inst.id}>
                      {inst.tipo === 'bimestre' ? (
                        <select className={`estado-select estado-${(r?.estado ?? 'vacio').toLowerCase()}`} aria-label={`${inst.nombre} de ${e.nombre} ${e.apellido}`} value={r?.estado ?? ''} onChange={(ev) => setInstancia(e.id, inst.id, null, (ev.target.value || null) as EstadoBimestre | null)}>
                          <option value="">—</option>
                          {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                      ) : (
                        <NumeroInput
                          valor={r?.nota ?? null} entero minimo={1} maximo={10}
                          etiqueta={`${inst.nombre} de ${e.nombre} ${e.apellido}`}
                          clase={r?.nota == null ? '' : r.nota >= 7 ? 'nota-ok' : 'nota-mal'}
                          onGuardar={(v) => setInstancia(e.id, inst.id, v, null)} onError={setError}
                        />
                      )}
                    </td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {porPuntos && <PuntosPanel datos={datos} onPuntos={setPuntos} onMeta={cambiarMeta} onAgregar={agregarEvaluacion} onQuitar={quitarEvaluacion} onError={setError} />}
    </>}
  </>
}

function PuntosPanel(p: {
  datos: Calificaciones
  onPuntos: (estudianteId: number, evaluacionId: number, valor: number | null) => void
  onMeta: (meta: number | null) => void
  onAgregar: (titulo: string, puntos: number | null) => void
  onQuitar: (id: number) => void
  onError: (m: string | null) => void
}) {
  const { datos } = p
  const [titulo, setTitulo] = useState('')
  const [puntos, setPuntos] = useState('25')
  const valores = new Map(datos.notas.map((n) => [`${n.estudianteId}:${n.evaluacionId}`, n.valor]))
  const posibles = datos.evaluaciones.reduce((a, ev) => a + (ev.puntosMaximos ?? 0), 0)

  const agregar = () => {
    if (!titulo.trim()) return
    const n = parseInt(puntos, 10)
    p.onAgregar(titulo.trim(), Number.isFinite(n) && n > 0 ? n : null)
    setTitulo('')
  }

  return <section className="panel grades-panel">
    <div className="panel-heading"><div><h2>Puntos por evaluación</h2><p>Se aprueba al llegar a la meta de puntos; no hay “en proceso”.</p></div></div>

    <div className="meta-row">
      <label>Puntos para aprobar
        <NumeroInput valor={datos.metaPuntos} entero minimo={1} etiqueta="Puntos para aprobar" ancho onGuardar={(v) => p.onMeta(v)} onError={p.onError} />
      </label>
      <span className="meta-nota">TPs cargados suman {posibles} pts posibles</span>
    </div>

    <div className="scroll-x">
      <table className="notas-tabla">
        <thead>
          <tr>
            <th className="izq">Estudiante</th>
            {datos.evaluaciones.map((ev) => (
              <th key={ev.id}>
                <span className="ev-titulo">{ev.titulo}</span>
                <small>{ev.puntosMaximos !== null ? `de ${ev.puntosMaximos}` : 'sin máximo'}</small>
                <button className="icon-button peligro ev-borrar" aria-label={`Borrar ${ev.titulo}`} onClick={() => { if (window.confirm(`¿Borrar ${ev.titulo}? Se pierden sus puntos.`)) p.onQuitar(ev.id) }}><Trash2 /></button>
              </th>
            ))}
            <th>Total</th><th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {datos.estudiantes.map((e, idx) => {
            const total = datos.evaluaciones.reduce((a, ev) => a + (valores.get(`${e.id}:${ev.id}`) ?? 0), 0)
            const aprobado = total >= datos.metaPuntos
            return <tr key={e.id}>
              <th className="izq" scope="row"><div className="student-cell"><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(idx)} fotoUrl={e.fotoUrl} /><strong>{e.apellido}, {e.nombre}</strong></div></th>
              {datos.evaluaciones.map((ev) => (
                <td key={ev.id}>
                  <NumeroInput valor={valores.get(`${e.id}:${ev.id}`) ?? null} minimo={0} maximo={ev.puntosMaximos ?? undefined} etiqueta={`${ev.titulo} de ${e.nombre} ${e.apellido}`} onGuardar={(v) => p.onPuntos(e.id, ev.id, v)} onError={p.onError} />
                </td>
              ))}
              <td className="total-pts"><b>{Number.isInteger(total) ? total : total.toFixed(1)}</b> / {datos.metaPuntos}</td>
              <td><span title={aprobado ? undefined : `Faltan ${Number.isInteger(datos.metaPuntos - total) ? datos.metaPuntos - total : (datos.metaPuntos - total).toFixed(1)} puntos`} className={`status-badge ${aprobado ? 'status-p' : 'status-a'}`}>{aprobado ? 'Aprobado' : 'No aprobado'}</span></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>

    <div className="nueva-eval">
      <input className="campo-input" placeholder="Nueva evaluación (ej. TP 4)" aria-label="Título de la evaluación" value={titulo} onChange={(ev) => setTitulo(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') agregar() }} />
      <label>Puntos <input className="campo-input pts-input" inputMode="numeric" value={puntos} onChange={(ev) => setPuntos(ev.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
      <button className="primary-button" onClick={agregar} disabled={!titulo.trim()}><Plus /> Agregar evaluación</button>
    </div>
  </section>
}

/** Campo numérico que guarda al salir (o con Enter). Con "entero" no deja escribir decimales. */
function NumeroInput(p: {
  valor: number | null
  entero?: boolean
  minimo?: number
  maximo?: number
  etiqueta: string
  clase?: string
  ancho?: boolean
  onGuardar: (v: number | null) => void
  onError: (m: string | null) => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  const texto = borrador ?? (p.valor === null ? '' : String(p.valor))

  const confirmar = () => {
    if (borrador === null) return
    const limpio = borrador.replace(',', '.').trim()
    setBorrador(null)
    if (limpio === '') { if (p.valor !== null) p.onGuardar(null); return }
    const n = Number(limpio)
    if (!Number.isFinite(n) || (p.minimo !== undefined && n < p.minimo) || (p.maximo !== undefined && n > p.maximo)) {
      const rango = p.maximo !== undefined ? `entre ${p.minimo ?? 0} y ${p.maximo}` : `de ${p.minimo ?? 0} o más`
      p.onError(`${p.etiqueta}: el valor tiene que ser ${rango}${p.entero ? ' (sin decimales)' : ''}.`)
      return
    }
    if (n !== p.valor) { p.onError(null); p.onGuardar(n) }
  }

  return <input
    className={`nota-input ${p.clase ?? ''} ${p.ancho ? 'nota-ancha' : ''}`}
    inputMode={p.entero ? 'numeric' : 'decimal'}
    aria-label={p.etiqueta}
    value={texto}
    onChange={(ev) => setBorrador(p.entero ? ev.target.value.replace(/\D/g, '').slice(0, 3) : ev.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
    onBlur={confirmar}
    onKeyDown={(ev) => { if (ev.key === 'Enter') ev.currentTarget.blur(); if (ev.key === 'Escape') setBorrador(null) }}
  />
}
