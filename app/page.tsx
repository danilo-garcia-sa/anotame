'use client'

import { useEffect, useState } from 'react'
import {
  Bell, BookOpen, CalendarDays, ChevronDown, ClipboardCheck, FileSpreadsheet, GraduationCap,
  Download, LayoutDashboard, Menu, NotebookPen, Plus, Search, Settings, Users, X,
} from 'lucide-react'
import {
  API_URL, borrarCursada, crearCursada, editarCursada, getCursadas, getCursos, getDocentes,
  getTotalEstudiantes,
  type Cursada, type Curso, type Docente, type NuevaCursada,
} from '@/lib/api'
import { exportarAExcel } from '@/lib/exportar'
import { fechaCorta, fechaLarga, hoyISO, nombresDias } from '@/lib/fechas'
import { Avatar, colorDe, iniciales } from '@/components/anotame/avatar'
import { PlanillaGrid } from '@/components/anotame/planilla'
import { MisCursos } from '@/components/anotame/mis-cursos'
import { Calificaciones } from '@/components/anotame/calificaciones'
import { usePlanilla, clave } from '@/components/anotame/use-planilla'

const LINEAS = ['blue', 'green', 'orange']
const navItems = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Asistencia', icon: ClipboardCheck },
  { label: 'Calificaciones', icon: NotebookPen },
  { label: 'Mis cursos', icon: BookOpen },
]
const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')
const nombreCursada = (c: Cursada) => `${c.curso.nombre} · ${nombresDias(c.diasDeClase)}`

function saludoSegunHora() {
  const hora = new Date().getHours()
  return hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Page() {
  const [active, setActive] = useState('Resumen')
  const [menuOpen, setMenuOpen] = useState(false)
  const [saludo, setSaludo] = useState('')
  const [hoy, setHoy] = useState('')

  const [docentes, setDocentes] = useState<Docente[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [totalEstudiantes, setTotalEstudiantes] = useState<number | null>(null)
  const [docenteId, setDocenteId] = useState<number | null>(null)
  const [cursadas, setCursadas] = useState<Cursada[]>([])
  const [cursadaId, setCursadaId] = useState<number | null>(null)

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  const pl = usePlanilla(cursadaId, intento)

  useEffect(() => {
    setHoy(hoyISO())
    setSaludo(saludoSegunHora())
  }, [])

  // 1) Docentes, cursos y total de estudiantes. El docente elegido se recuerda en este navegador
  //    (hasta que haya inicio de sesión).
  useEffect(() => {
    let cancelado = false
    setCargando(true)
    Promise.all([getDocentes(), getCursos(), getTotalEstudiantes()])
      .then(([ds, cs, total]) => {
        if (cancelado) return
        setDocentes(ds)
        setCursos(cs)
        setTotalEstudiantes(total)
        let guardado: number | null = null
        try { guardado = Number(localStorage.getItem('anotame.docenteId')) || null } catch { /* sin storage */ }
        setDocenteId((actual) => actual ?? (ds.find((d) => d.id === guardado)?.id ?? ds[0]?.id ?? null))
        setError(null)
        if (ds.length === 0) setCargando(false)
      })
      .catch((e) => { if (!cancelado) { setError(mensajeDe(e)); setCargando(false) } })
    return () => { cancelado = true }
  }, [intento])

  // 2) Cursadas del docente elegido
  useEffect(() => {
    if (docenteId === null) return
    let cancelado = false
    getCursadas(docenteId)
      .then((lista) => {
        if (cancelado) return
        setCursadas(lista)
        setCursadaId((actual) => (lista.some((c) => c.id === actual) ? actual : (lista[0]?.id ?? null)))
        setError(null)
      })
      .catch((e) => { if (!cancelado) setError(mensajeDe(e)) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [docenteId, intento])

  const cursada = cursadas.find((c) => c.id === cursadaId) ?? null
  const docente = docentes.find((d) => d.id === docenteId) ?? null
  const errorMostrado = error ?? pl.error
  const iniDocente = docente ? iniciales(docente.nombre, docente.apellido) : '··'

  const elegirDocente = (id: number) => {
    setDocenteId(id)
    try { localStorage.setItem('anotame.docenteId', String(id)) } catch { /* sin storage */ }
  }

  const guardarCursada = async (id: number | null, datos: NuevaCursada) => {
    try {
      const resultado = id === null ? await crearCursada(datos) : await editarCursada(id, datos)
      setError(null)
      pl.setError(null)
      setCursadas(await getCursadas(datos.docenteId))
      setCursadaId(resultado.id)
      setIntento((n) => n + 1)
      setActive('Asistencia')
    } catch (e) {
      setError(mensajeDe(e))
    }
  }

  const eliminarCursada = async (id: number) => {
    try {
      await borrarCursada(id)
      if (docenteId !== null) setCursadas(await getCursadas(docenteId))
      if (cursadaId === id) setCursadaId(null)
      setIntento((n) => n + 1)
    } catch (e) {
      setError(mensajeDe(e))
    }
  }

  const [exportando, setExportando] = useState(false)
  const exportar = async () => {
    if (!pl.planilla) return
    setExportando(true)
    try {
      await exportarAExcel(pl.planilla, pl.celdas)
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      setExportando(false)
    }
  }
  const botonExportar = (
    <button className="secondary-button" onClick={exportar} disabled={!pl.planilla || exportando}><Download /> {exportando ? 'Armando…' : 'Exportar a Excel'}</button>
  )

  const abrirCursada = (id: number) => { setCursadaId(id); setActive('Asistencia') }

  // Estadísticas de la última clase dada
  const ultima = pl.ultimaClase
  const estudiantes = pl.planilla?.estudiantes ?? []
  const cuenta = (l: 'P' | 'A' | 'T') => (ultima ? estudiantes.filter((e) => pl.celdas[clave(e.id, ultima.fecha)]?.letra === l).length : 0)
  const presentes = cuenta('P'), ausentes = cuenta('A'), tardes = cuenta('T')
  const registrados = presentes + ausentes + tardes
  const porcentaje = registrados > 0 ? Math.round((presentes / registrados) * 100) : null

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><span /></div>
          <span className="brand-name">anotame</span>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-icon"><GraduationCap /></div>
          <div><strong>Instituto San Martín</strong><span>Panel docente</span></div>
          <ChevronDown />
        </div>
        <nav className="main-nav" aria-label="Navegación principal">
          <p className="nav-label">Menú principal</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${active === label ? 'nav-item-active' : ''}`} onClick={() => { setActive(label); setMenuOpen(false) }}>
              <Icon /> <span>{label}</span>
            </button>
          ))}
          <p className="nav-label nav-label-spaced">Herramientas</p>
          <button className="nav-item"><CalendarDays /><span>Calendario</span></button>
          <button className="nav-item"><FileSpreadsheet /><span>Reportes</span></button>
          <button className="nav-item"><Settings /><span>Configuración</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-card">
            <span className="sync-dot" style={errorMostrado ? { background: '#ef746f' } : undefined} />
            <div>
              <strong>{errorMostrado ? 'Sin conexión' : cargando ? 'Conectando…' : 'Conectado al servidor'}</strong>
              <span>{API_URL.replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
          <div className="teacher-card">
            <Avatar initials={iniDocente} color="green" />
            <div>
              <select className="docente-select" aria-label="Docente" value={docenteId ?? ''} onChange={(ev) => elegirDocente(Number(ev.target.value))}>
                {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>)}
              </select>
              <span>Profesor</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="breadcrumb"><span>Inicio</span><span>/</span><strong>{active}</strong></div>
          <div className="topbar-actions"><button className="icon-button"><Search /></button><button className="icon-button notification"><Bell /><i /></button><div className="top-avatar">{iniDocente}</div></div>
        </header>
        <div className="page-wrap">
          {errorMostrado && (
            <div className="notice" role="alert">
              <span>{errorMostrado}</span>
              <button className="secondary-button" onClick={() => { setError(null); pl.setError(null); setIntento((n) => n + 1) }}>Reintentar</button>
            </div>
          )}
          {!errorMostrado && !cargando && docentes.length === 0 ? (
            <div className="panel empty-state">Todavía no hay docentes cargados en el backend.</div>
          ) : active === 'Mis cursos' ? (
            docenteId !== null && <MisCursos docenteId={docenteId} cursos={cursos} cursadas={cursadas} onGuardar={guardarCursada} onBorrar={eliminarCursada} onAbrir={abrirCursada} />
          ) : active === 'Asistencia' ? (
            <>
              <section className="welcome-row compact"><div><p className="eyebrow">{hoy ? fechaLarga(hoy) : ''}</p><h1>Planilla de asistencia</h1><p className="subtitle">Tocá una celda para marcar. Se guarda solo.</p></div>{botonExportar}</section>
              <CursadaSelector cursada={cursada} cursadas={cursadas} onCursada={setCursadaId} />
              <section className="panel planilla-panel">
                {!cursada ? (
                  <p className="empty-state">Todavía no tenés cursadas. <button className="text-button" onClick={() => setActive('Mis cursos')}>Creá una en “Mis cursos”</button>.</p>
                ) : !pl.planilla ? (
                  <p className="empty-state">{pl.cargando ? 'Cargando planilla…' : 'No se pudo cargar la planilla.'}</p>
                ) : pl.planilla.estudiantes.length === 0 ? (
                  <p className="empty-state">Este curso todavía no tiene alumnos inscriptos.</p>
                ) : (
                  <PlanillaGrid
                    planilla={pl.planilla} celdas={pl.celdas} guardando={pl.guardando} totales={pl.totales} ultimaClase={pl.ultimaClase}
                    onCiclar={pl.ciclar} onMotivo={pl.escribirMotivo} onGuardarMotivo={pl.guardarMotivo}
                    onTodosPresentes={pl.todosPresentes} onSinActividad={pl.cambiarSinActividad}
                  />
                )}
              </section>
            </>
          ) : active === 'Calificaciones' ? (
            <Calificaciones cursadaId={cursadaId} intento={intento} acciones={botonExportar} selector={<CursadaSelector cursada={cursada} cursadas={cursadas} onCursada={setCursadaId} />} />
          ) : (
            <DashboardView
              saludo={saludo} hoy={hoy} docente={docente} cursada={cursada} cursadas={cursadas} totalEstudiantes={totalEstudiantes}
              estudiantes={estudiantes} celdas={pl.celdas} ultimaFecha={ultima?.fecha ?? null} clasesDadas={pl.diasTomables.length} clasesTotales={pl.planilla?.dias.filter((d) => !d.sinActividad).length ?? 0}
              presentes={presentes} ausentes={ausentes} tardes={tardes} porcentaje={porcentaje}
              onNavigate={setActive} onCursada={setCursadaId}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function CursadaSelector({ cursada, cursadas, onCursada }: { cursada: Cursada | null; cursadas: Cursada[]; onCursada: (id: number) => void }) {
  return <div className="class-selector panel">
    <div className="selector-main">
      <div className="class-icon"><BookOpen /></div>
      <div>
        <span>Cursada</span>
        <select className="course-select" aria-label="Cursada" value={cursada?.id ?? ''} onChange={(ev) => onCursada(Number(ev.target.value))}>
          {cursadas.map((c) => <option key={c.id} value={c.id}>{nombreCursada(c)}</option>)}
        </select>
      </div>
    </div>
    {cursada && <div className="date-control"><CalendarDays />{fechaCorta(cursada.fechaInicio)} → {fechaCorta(cursada.fechaFin)}</div>}
  </div>
}

function DashboardView(p: {
  saludo: string; hoy: string; docente: Docente | null; cursada: Cursada | null; cursadas: Cursada[]
  totalEstudiantes: number | null; estudiantes: { id: number; nombre: string; apellido: string; fotoUrl: string | null }[]
  celdas: Record<string, { letra: 'P' | 'A' | 'T' }>; ultimaFecha: string | null; clasesDadas: number; clasesTotales: number
  presentes: number; ausentes: number; tardes: number; porcentaje: number | null
  onNavigate: (v: string) => void; onCursada: (id: number) => void
}) {
  const texto = p.porcentaje === null ? '—' : `${p.porcentaje}%`
  const titulo = p.ultimaFecha === p.hoy ? 'Asistencia de hoy' : 'Última clase'
  return <>
    <section className="welcome-row"><div><p className="eyebrow">{p.hoy ? fechaLarga(p.hoy) : ''}</p><h1>{p.saludo}{p.docente ? `, ${p.docente.nombre}` : ''} <span>✦</span></h1><p className="subtitle">Aquí tienes un resumen de lo que ocurre en tus cursos.</p></div><button className="primary-button" onClick={() => p.onNavigate('Asistencia')}><Plus /> Tomar asistencia</button></section>
    <section className="stats-grid">
      <StatCard icon={<Users />} label="Estudiantes" value={p.totalEstudiantes === null ? '—' : String(p.totalEstudiantes)} detail="en el sistema" tone="blue" />
      <StatCard icon={<ClipboardCheck />} label={titulo} value={texto} detail={`${p.presentes} de ${p.presentes + p.ausentes + p.tardes} registrados`} tone="green" />
      <StatCard icon={<BookOpen />} label="Mis cursadas" value={String(p.cursadas.length)} detail={p.cursadas.map((c) => c.curso.nombre).join(', ') || '—'} tone="purple" />
      <StatCard icon={<NotebookPen />} label="Clases dadas" value={String(p.clasesDadas)} detail={`de ${p.clasesTotales} con actividad`} tone="orange" />
    </section>
    <div className="content-grid">
      <section className="panel attendance-panel">
        <div className="panel-heading"><div><h2>{titulo}</h2><p>{p.cursada ? `${nombreCursada(p.cursada)}${p.ultimaFecha ? ` · ${fechaCorta(p.ultimaFecha)}` : ''}` : '—'}</p></div><button className="text-button" onClick={() => p.onNavigate('Asistencia')}>Ver planilla <span>→</span></button></div>
        <div className="progress-row"><div className="progress-track"><span style={{ width: `${p.porcentaje ?? 0}%` }} /></div><strong>{texto}</strong></div>
        <div className="attendance-summary"><span><i className="legend-dot present" /> Presentes <b>{p.presentes}</b></span><span><i className="legend-dot absent" /> Ausentes <b>{p.ausentes}</b></span><span><i className="legend-dot late" /> Tardanzas <b>{p.tardes}</b></span></div>
        <div className="mini-student-list">
          {p.estudiantes.length === 0 && <p className="empty-state">Este curso todavía no tiene alumnos inscriptos.</p>}
          {p.estudiantes.slice(0, 4).map((e, i) => {
            const letra = p.ultimaFecha ? p.celdas[clave(e.id, p.ultimaFecha)]?.letra ?? null : null
            return <div className="mini-student" key={e.id}><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(i)} fotoUrl={e.fotoUrl} /><span>{e.nombre} {e.apellido}</span><StatusBadge letra={letra} /></div>
          })}
        </div>
      </section>
      <section className="panel schedule-panel">
        <div className="panel-heading"><div><h2>Mis cursadas</h2><p>Tocá una para trabajar con ella</p></div></div>
        <div className="schedule-list">
          {p.cursadas.length === 0 && <p className="empty-state">Todavía no tenés cursadas.</p>}
          {p.cursadas.map((c, i) => (
            <div key={c.id} role="button" tabIndex={0} className={`schedule-item course-item ${c.id === p.cursada?.id ? 'schedule-current' : ''}`} onClick={() => p.onCursada(c.id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') p.onCursada(c.id) }}>
              <strong>{c.curso.anioLectivo}</strong><span className={`schedule-line ${LINEAS[i % LINEAS.length]}`} />
              <div><b>{c.curso.nombre}</b><small>{nombresDias(c.diasDeClase)}</small></div>
              {c.id === p.cursada?.id && <span className="now-tag">Seleccionada</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  </>
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div></div> }

function StatusBadge({ letra }: { letra: 'P' | 'A' | 'T' | null }) {
  if (letra === null) return <span className="status-badge status-none">Sin registrar</span>
  return <span className={`status-badge status-${letra.toLowerCase()}`}>{letra === 'P' ? 'Presente' : letra === 'A' ? 'Ausente' : 'Tarde'}</span>
}
