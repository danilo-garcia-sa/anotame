'use client'

import { useEffect, useState } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { crearCurso, crearEstudiante, getEstudiantesDelCurso, inscribirEnCurso, type Curso, type Estudiante } from '@/lib/api'
import { Avatar, colorDe, iniciales } from './avatar'

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')

/** Crear cursos nuevos (ej. 6to B de 2027) y cargarles alumnos. */
export function CursosYAlumnos(p: { cursos: Curso[]; onCursosCambiaron: () => void; onError: (m: string | null) => void }) {
  const anioActual = new Date().getFullYear()
  const [nombre, setNombre] = useState('')
  const [anio, setAnio] = useState(anioActual)
  const [creando, setCreando] = useState(false)

  const [cursoId, setCursoId] = useState<number | ''>('')
  const [alumnos, setAlumnos] = useState<Estudiante[]>([])
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', dni: '' })
  const [agregando, setAgregando] = useState(false)

  const cursosOrdenados = [...p.cursos].sort((a, b) => b.anioLectivo - a.anioLectivo || a.nombre.localeCompare(b.nombre))

  useEffect(() => {
    if (cursoId === '') { setAlumnos([]); return }
    let cancelado = false
    getEstudiantesDelCurso(cursoId)
      .then((l) => !cancelado && setAlumnos(l))
      .catch((e) => !cancelado && p.onError(mensajeDe(e)))
    return () => { cancelado = true }
    // p.onError es estable para este uso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId])

  const crear = async () => {
    const limpio = nombre.trim()
    if (!limpio) return
    if (p.cursos.some((c) => c.nombre.toLowerCase() === limpio.toLowerCase() && c.anioLectivo === anio)) {
      p.onError(`Ya existe el curso ${limpio} de ${anio}.`)
      return
    }
    setCreando(true)
    try {
      const curso = await crearCurso(limpio, anio)
      p.onError(null)
      setNombre('')
      setCursoId(curso.id)
      p.onCursosCambiaron()
    } catch (e) {
      p.onError(mensajeDe(e))
    } finally {
      setCreando(false)
    }
  }

  const dniValido = nuevo.dni.trim().length >= 7
  const puedeAgregar = cursoId !== '' && nuevo.nombre.trim() && nuevo.apellido.trim() && dniValido

  const agregar = async () => {
    if (!puedeAgregar) return
    setAgregando(true)
    try {
      const est = await crearEstudiante({ nombre: nuevo.nombre.trim(), apellido: nuevo.apellido.trim(), dni: nuevo.dni.trim() })
      await inscribirEnCurso(cursoId as number, est.id)
      p.onError(null)
      setNuevo({ nombre: '', apellido: '', dni: '' })
      setAlumnos(await getEstudiantesDelCurso(cursoId as number))
    } catch (e) {
      p.onError(mensajeDe(e))
    } finally {
      setAgregando(false)
    }
  }

  return <section className="panel cursada-form">
    <div className="panel-heading"><div><h2>Cursos y alumnos</h2><p>Creá un curso nuevo (por ejemplo 6to B de 2027) y cargale sus alumnos. Después armá su cursada arriba.</p></div></div>

    <div className="nueva-eval">
      <input className="campo-input" placeholder="Nombre del curso (ej. 6to B)" aria-label="Nombre del curso" value={nombre} onChange={(ev) => setNombre(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') crear() }} />
      <label>Ciclo lectivo
        <select className="campo-input" value={anio} onChange={(ev) => setAnio(Number(ev.target.value))}>
          {[anioActual - 1, anioActual, anioActual + 1, anioActual + 2].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <button className="primary-button" onClick={crear} disabled={!nombre.trim() || creando}><Plus /> {creando ? 'Creando…' : 'Crear curso'}</button>
    </div>

    <div className="campo alumnos-bloque">
      <span>Alumnos del curso</span>
      <select className="campo-input" aria-label="Curso" value={cursoId} onChange={(ev) => setCursoId(ev.target.value ? Number(ev.target.value) : '')}>
        <option value="">Elegí un curso…</option>
        {cursosOrdenados.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.anioLectivo}</option>)}
      </select>
    </div>

    {cursoId !== '' && <>
      <div className="alumnos-lista">
        {alumnos.length === 0 && <p className="empty-state">Este curso todavía no tiene alumnos.</p>}
        {alumnos.map((e, i) => (
          <div className="mini-student" key={e.id}><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(i)} fotoUrl={e.fotoUrl} /><span>{e.apellido}, {e.nombre}</span><small>DNI {e.dni}</small></div>
        ))}
      </div>
      <div className="nueva-eval">
        <input className="campo-input" placeholder="Nombre" aria-label="Nombre del alumno" value={nuevo.nombre} onChange={(ev) => setNuevo({ ...nuevo, nombre: ev.target.value })} />
        <input className="campo-input" placeholder="Apellido" aria-label="Apellido del alumno" value={nuevo.apellido} onChange={(ev) => setNuevo({ ...nuevo, apellido: ev.target.value })} />
        <input className="campo-input" placeholder="DNI" aria-label="DNI del alumno" inputMode="numeric" value={nuevo.dni} onChange={(ev) => setNuevo({ ...nuevo, dni: ev.target.value.replace(/\D/g, '').slice(0, 9) })} onKeyDown={(ev) => { if (ev.key === 'Enter') agregar() }} />
        <button className="primary-button" onClick={agregar} disabled={!puedeAgregar || agregando}><UserPlus /> {agregando ? 'Agregando…' : 'Agregar alumno'}</button>
      </div>
    </>}
  </section>
}
