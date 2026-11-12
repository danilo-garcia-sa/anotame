'use client'

import { useState } from 'react'
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react'
import { CursosYAlumnos } from './cursos-alumnos'
import type { Curso, Cursada, DiaSemana, NuevaCursada } from '@/lib/api'
import { DIAS_SEMANA, fechaCorta, nombresDias, periodos } from '@/lib/fechas'

type Props = {
  docenteId: number
  cursos: Curso[]
  cursadas: Cursada[]
  onGuardar: (id: number | null, datos: NuevaCursada) => Promise<void>
  onBorrar: (id: number) => Promise<void>
  onAbrir: (id: number) => void
  onCursosCambiaron: () => void
  onError: (mensaje: string | null) => void
}

export function MisCursos({ docenteId, cursos, cursadas, onGuardar, onBorrar, onAbrir, onCursosCambiaron, onError }: Props) {
  const [editando, setEditando] = useState<number | null>(null)
  const [cursoId, setCursoId] = useState<number | ''>('')
  const [dias, setDias] = useState<DiaSemana[]>([])
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [enviando, setEnviando] = useState(false)

  const curso = cursos.find((c) => c.id === cursoId)
  const anio = curso?.anioLectivo ?? new Date().getFullYear()
  const valido = cursoId !== '' && dias.length > 0 && inicio !== '' && fin !== '' && fin >= inicio

  const limpiar = () => {
    setEditando(null); setCursoId(''); setDias([]); setInicio(''); setFin('')
  }

  const elegirPeriodo = (p: { inicio: string; fin: string }) => { setInicio(p.inicio); setFin(p.fin) }

  const alternarDia = (d: DiaSemana) => setDias((a) => (a.includes(d) ? a.filter((x) => x !== d) : [...a, d]))

  const empezarEdicion = (c: Cursada) => {
    setEditando(c.id); setCursoId(c.curso.id); setDias(c.diasDeClase); setInicio(c.fechaInicio); setFin(c.fechaFin)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const enviar = async () => {
    if (!valido) return
    const original = editando !== null ? cursadas.find((c) => c.id === editando) : undefined
    const cambioCalendario = original && (
      original.fechaInicio !== inicio || original.fechaFin !== fin ||
      [...original.diasDeClase].sort().join() !== [...dias].sort().join()
    )
    if (cambioCalendario && !window.confirm('Cambiaste los días o el período: las fechas que ya no corresponden se borran junto con su asistencia. ¿Seguir?')) return
    setEnviando(true)
    try {
      await onGuardar(editando, { docenteId, cursoId, diasDeClase: dias, fechaInicio: inicio, fechaFin: fin })
      limpiar()
    } finally {
      setEnviando(false)
    }
  }

  return <>
    <section className="welcome-row compact"><div><p className="eyebrow">CURSADAS</p><h1>Mis cursos</h1><p className="subtitle">Elegí el curso, los días de la semana y el período: la app arma el calendario de clases.</p></div></section>

    <section className="panel cursada-form">
      <div className="panel-heading"><div><h2>{editando ? 'Editar cursada' : 'Nueva cursada'}</h2><p>{editando ? 'Si cambiás días o fechas, el calendario se actualiza (las fechas que ya no corresponden se borran junto con su asistencia).' : 'Podés tener el mismo curso en más de un día.'}</p></div></div>
      <div className="form-grid">
        <label className="campo">
          <span>Curso</span>
          <select className="campo-input" value={cursoId} onChange={(ev) => setCursoId(ev.target.value ? Number(ev.target.value) : '')}>
            <option value="">Elegí un curso…</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.anioLectivo}</option>)}
          </select>
        </label>
        <div className="campo">
          <span>Días de la semana</span>
          <div className="chips">
            {DIAS_SEMANA.map((d) => (
              <button key={d.valor} type="button" className={`chip ${dias.includes(d.valor) ? 'chip-on' : ''}`} aria-pressed={dias.includes(d.valor)} aria-label={d.largo} title={d.largo} onClick={() => alternarDia(d.valor)}>{d.corto}</button>
            ))}
          </div>
        </div>
        <div className="campo campo-ancho">
          <span>Período</span>
          <div className="chips">
            {periodos(anio).map((p) => (
              <button key={p.id} type="button" className={`chip chip-texto ${inicio === p.inicio && fin === p.fin ? 'chip-on' : ''}`} onClick={() => elegirPeriodo(p)}>{p.nombre}</button>
            ))}
          </div>
          <div className="fechas-row">
            <label>Desde <input className="campo-input" type="date" value={inicio} onChange={(ev) => setInicio(ev.target.value)} /></label>
            <label>Hasta <input className="campo-input" type="date" value={fin} onChange={(ev) => setFin(ev.target.value)} /></label>
          </div>
        </div>
      </div>
      <div className="form-actions">
        {editando && <button className="secondary-button" onClick={limpiar}>Cancelar</button>}
        <button className="primary-button" onClick={enviar} disabled={!valido || enviando}><CalendarPlus /> {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Generar calendario'}</button>
      </div>
    </section>

    <section className="panel cursada-lista">
      <div className="panel-heading"><div><h2>Tus cursadas</h2><p>Tocá una para abrir su planilla</p></div></div>
      {cursadas.length === 0 && <p className="empty-state">Todavía no tenés cursadas. Creá la primera arriba.</p>}
      {cursadas.map((c) => (
        <div className="cursada-item" key={c.id}>
          <button className="cursada-abrir" onClick={() => onAbrir(c.id)}>
            <b>{c.curso.nombre} · {c.curso.anioLectivo}</b>
            <small>{nombresDias(c.diasDeClase)} · {fechaCorta(c.fechaInicio)} → {fechaCorta(c.fechaFin)}</small>
          </button>
          <button className="icon-button" onClick={() => empezarEdicion(c)} aria-label={`Editar ${c.curso.nombre}`}><Pencil /></button>
          <button className="icon-button peligro" onClick={() => { if (window.confirm(`¿Borrar la cursada de ${c.curso.nombre}? Se pierde su asistencia.`)) onBorrar(c.id) }} aria-label={`Borrar ${c.curso.nombre}`}><Trash2 /></button>
        </div>
      ))}
    </section>

    <CursosYAlumnos cursos={cursos} onCursosCambiaron={onCursosCambiaron} onError={onError} />
  </>
}
