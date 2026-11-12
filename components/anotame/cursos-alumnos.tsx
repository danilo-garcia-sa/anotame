'use client'

import { useState } from 'react'
import { ChevronDown, Plus, UserPlus } from 'lucide-react'
import { crearCurso, crearEstudiante, getEstudiantesDelCurso, inscribirEnCurso, type Curso, type Estudiante } from '@/lib/api'
import { Avatar, colorDe, iniciales } from './avatar'

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')

/** Crear cursos nuevos (ej. 6to B de 2027) y cargarles alumnos. */
export function CursosYAlumnos(p: { cursos: Curso[]; onCursosCambiaron: () => void; onError: (m: string | null) => void }) {
  const [nombre, setNombre] = useState('')
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [creando, setCreando] = useState(false)

  const anioValido = /^\d{4}$/.test(anio) && Number(anio) >= 2000
  const cursosOrdenados = [...p.cursos].sort((a, b) => b.anioLectivo - a.anioLectivo || a.nombre.localeCompare(b.nombre))

  const crear = async () => {
    const limpio = nombre.trim()
    if (!limpio || !anioValido) return
    const anioNum = Number(anio)
    if (p.cursos.some((c) => c.nombre.toLowerCase() === limpio.toLowerCase() && c.anioLectivo === anioNum)) {
      p.onError(`Ya existe el curso ${limpio} de ${anioNum}.`)
      return
    }
    setCreando(true)
    try {
      await crearCurso(limpio, anioNum)
      p.onError(null)
      setNombre('')
      p.onCursosCambiaron()
    } catch (e) {
      p.onError(mensajeDe(e))
    } finally {
      setCreando(false)
    }
  }

  return <section className="panel cursada-form">
    <div className="panel-heading"><div><h2>Cursos y alumnos</h2><p>Creá un curso nuevo (por ejemplo 6to B de 2027) y cargale sus alumnos. Después armá su cursada arriba.</p></div></div>

    <div className="nueva-eval">
      <input className="campo-input" placeholder="Nombre del curso (ej. 6to B)" aria-label="Nombre del curso" value={nombre} onChange={(ev) => setNombre(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') crear() }} />
      <label>Ciclo lectivo
        <input className="campo-input pts-input" inputMode="numeric" placeholder="2027" aria-label="Ciclo lectivo" maxLength={4} value={anio} onChange={(ev) => setAnio(ev.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(ev) => { if (ev.key === 'Enter') crear() }} />
      </label>
      <button className="primary-button" onClick={crear} disabled={!nombre.trim() || !anioValido || creando}><Plus /> {creando ? 'Creando…' : 'Crear curso'}</button>
    </div>

    <div className="alumnos-bloque">
      <span className="campo-titulo">Alumnos por curso</span>
      {cursosOrdenados.length === 0 && <p className="empty-state">Todavía no hay cursos.</p>}
      {cursosOrdenados.map((c) => <CursoPlegable key={c.id} curso={c} onError={p.onError} />)}
    </div>
  </section>
}

/** Un curso que se despliega para ver sus alumnos y agregar nuevos (se guardan en la base al instante). */
function CursoPlegable({ curso, onError }: { curso: Curso; onError: (m: string | null) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [alumnos, setAlumnos] = useState<Estudiante[] | null>(null)
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', dni: '', fotoUrl: '' })
  const [agregando, setAgregando] = useState(false)

  const cargar = async () => {
    try { setAlumnos(await getEstudiantesDelCurso(curso.id)) } catch (e) { onError(mensajeDe(e)) }
  }

  const alternar = () => {
    const ahora = !abierto
    setAbierto(ahora)
    if (ahora && alumnos === null) cargar()
  }

  const puedeAgregar = nuevo.nombre.trim() && nuevo.apellido.trim() && nuevo.dni.trim().length >= 7

  const agregar = async () => {
    if (!puedeAgregar) return
    setAgregando(true)
    try {
      const est = await crearEstudiante({
        nombre: nuevo.nombre.trim(), apellido: nuevo.apellido.trim(), dni: nuevo.dni.trim(),
        fotoUrl: nuevo.fotoUrl.trim() || null,
      })
      await inscribirEnCurso(curso.id, est.id)
      onError(null)
      setNuevo({ nombre: '', apellido: '', dni: '', fotoUrl: '' })
      await cargar()
    } catch (e) {
      onError(mensajeDe(e))
    } finally {
      setAgregando(false)
    }
  }

  return <div className={`curso-plegable ${abierto ? 'abierto' : ''}`}>
    <button className="curso-cabecera" onClick={alternar} aria-expanded={abierto}>
      <b>{curso.nombre} · {curso.anioLectivo}</b>
      <small>{alumnos === null ? 'Tocá para ver los alumnos' : `${alumnos.length} alumno${alumnos.length === 1 ? '' : 's'}`}</small>
      <ChevronDown className="curso-flecha" />
    </button>
    {abierto && <div className="curso-contenido">
      <div className="alumnos-lista">
        {alumnos === null && <p className="empty-state">Cargando…</p>}
        {alumnos?.length === 0 && <p className="empty-state">Este curso todavía no tiene alumnos.</p>}
        {alumnos?.map((e, i) => (
          <div className="mini-student" key={e.id}><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(i)} fotoUrl={e.fotoUrl} /><span>{e.apellido}, {e.nombre}</span><small>DNI {e.dni}</small></div>
        ))}
      </div>
      <div className="nueva-eval">
        <input className="campo-input" placeholder="Nombre" aria-label={`Nombre del alumno (${curso.nombre})`} value={nuevo.nombre} onChange={(ev) => setNuevo({ ...nuevo, nombre: ev.target.value })} />
        <input className="campo-input" placeholder="Apellido" aria-label={`Apellido del alumno (${curso.nombre})`} value={nuevo.apellido} onChange={(ev) => setNuevo({ ...nuevo, apellido: ev.target.value })} />
        <input className="campo-input" placeholder="DNI" aria-label={`DNI del alumno (${curso.nombre})`} inputMode="numeric" value={nuevo.dni} onChange={(ev) => setNuevo({ ...nuevo, dni: ev.target.value.replace(/\D/g, '').slice(0, 9) })} />
        <input className="campo-input" placeholder="Foto (opcional, ej. /fotos/gato1.jpg)" aria-label={`Foto del alumno (${curso.nombre})`} value={nuevo.fotoUrl} onChange={(ev) => setNuevo({ ...nuevo, fotoUrl: ev.target.value })} onKeyDown={(ev) => { if (ev.key === 'Enter') agregar() }} />
        <button className="primary-button" onClick={agregar} disabled={!puedeAgregar || agregando}><UserPlus /> {agregando ? 'Agregando…' : 'Agregar alumno'}</button>
      </div>
    </div>}
  </div>
}
