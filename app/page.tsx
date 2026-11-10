'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Upload,
  Users,
  X,
} from 'lucide-react'
import {
  API_URL,
  getAsistencias,
  getCursos,
  getEstudiantesDelCurso,
  getEvaluaciones,
  getNotas,
  getTotalEstudiantes,
  guardarAsistencia,
  type Asistencia,
  type Curso,
  type Docente,
  type EstadoAsistencia,
  type Estudiante,
  type Evaluacion,
  type Nota,
} from '@/lib/api'

type Letra = 'P' | 'A' | 'T'
type Registro = { letra: Letra | null; justificacion: string; id?: number; sucio: boolean }

const LETRA_A_ESTADO: Record<Letra, EstadoAsistencia> = { P: 'PRESENTE', A: 'AUSENTE', T: 'TARDE' }
const ESTADO_A_LETRA: Record<string, Letra> = { PRESENTE: 'P', AUSENTE: 'A', TARDE: 'T' }
const COLORES = ['peach', 'blue', 'lavender', 'mint', 'gold', 'rose', 'sky']
const LINEAS = ['blue', 'green', 'orange']

const navItems = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Asistencia', icon: ClipboardCheck },
  { label: 'Calificaciones', icon: NotebookPen },
  { label: 'Mis cursos', icon: BookOpen },
]

const colorDe = (i: number) => COLORES[i % COLORES.length]
const iniciales = (nombre: string, apellido: string) => `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
const nombreCompleto = (e: Estudiante) => `${e.nombre} ${e.apellido}`
const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')

const dosDigitos = (n: number) => String(n).padStart(2, '0')

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`
}

function fechaLarga(iso: string) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase()
}

function saludoSegunHora() {
  const hora = new Date().getHours()
  return hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
}

function aRegistros(lista: Asistencia[]) {
  const mapa: Record<number, Registro> = {}
  for (const a of lista) {
    mapa[a.estudiante.id] = {
      letra: ESTADO_A_LETRA[a.estado] ?? null,
      justificacion: a.justificacion ?? '',
      id: a.id,
      sucio: false,
    }
  }
  return mapa
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return <span className={`avatar avatar-${color}`}>{initials}</span>
}

export default function Page() {
  const [active, setActive] = useState('Resumen')
  const [menuOpen, setMenuOpen] = useState(false)

  const [cursos, setCursos] = useState<Curso[]>([])
  const [totalEstudiantes, setTotalEstudiantes] = useState<number | null>(null)
  const [cursoId, setCursoId] = useState<number | null>(null)
  const [fecha, setFecha] = useState('')
  const [saludo, setSaludo] = useState('')
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [registros, setRegistros] = useState<Record<number, Registro>>({})

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [intento, setIntento] = useState(0)

  // La fecha y el saludo se calculan en el navegador para no desacomodar el render del servidor.
  useEffect(() => {
    setFecha(hoyISO())
    setSaludo(saludoSegunHora())
  }, [])

  // 1) Cursos y total de estudiantes
  useEffect(() => {
    let cancelado = false
    setCargando(true)
    Promise.all([getCursos(), getTotalEstudiantes()])
      .then(([listaCursos, total]) => {
        if (cancelado) return
        setCursos(listaCursos)
        setTotalEstudiantes(total)
        setCursoId((actual) => actual ?? listaCursos[0]?.id ?? null)
        setError(null)
        if (listaCursos.length === 0) setCargando(false)
      })
      .catch((e) => {
        if (cancelado) return
        setError(mensajeDe(e))
        setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [intento])

  // 2) Alumnos, evaluaciones y notas del curso elegido
  useEffect(() => {
    if (cursoId === null) return
    let cancelado = false
    setCargando(true)
    Promise.all([getEstudiantesDelCurso(cursoId), getEvaluaciones(cursoId), getNotas(cursoId)])
      .then(([es, ev, ns]) => {
        if (cancelado) return
        setEstudiantes(es)
        setEvaluaciones(ev)
        setNotas(ns)
        setError(null)
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDe(e))
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [cursoId, intento])

  // 3) Asistencia del curso en la fecha elegida
  useEffect(() => {
    if (cursoId === null || !fecha) return
    let cancelado = false
    getAsistencias(cursoId, fecha)
      .then((lista) => {
        if (!cancelado) setRegistros(aRegistros(lista))
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDe(e))
      })
    return () => {
      cancelado = true
    }
  }, [cursoId, fecha, intento])

  const curso = cursos.find((c) => c.id === cursoId) ?? null
  const docente: Docente | null = curso?.docente ?? null
  const cuenta = (letra: Letra) => estudiantes.filter((e) => registros[e.id]?.letra === letra).length
  const presentes = cuenta('P')
  const ausentes = cuenta('A')
  const tardes = cuenta('T')
  const registrados = presentes + ausentes + tardes
  const porcentaje = registrados > 0 ? Math.round((presentes / registrados) * 100) : null
  const pendientes = estudiantes.length - registrados

  const elegirCurso = (id: number) => {
    setCursoId(id)
    setGuardado(false)
  }

  const elegirFecha = (nueva: string) => {
    setFecha(nueva)
    setGuardado(false)
  }

  const marcar = (estudianteId: number, letra: Letra) => {
    setRegistros((actual) => ({
      ...actual,
      [estudianteId]: { ...actual[estudianteId], justificacion: actual[estudianteId]?.justificacion ?? '', letra, sucio: true },
    }))
    setGuardado(false)
  }

  const escribirJustificacion = (estudianteId: number, texto: string) => {
    setRegistros((actual) => ({
      ...actual,
      [estudianteId]: { ...actual[estudianteId], letra: actual[estudianteId]?.letra ?? null, justificacion: texto, sucio: true },
    }))
    setGuardado(false)
  }

  const guardar = async () => {
    if (cursoId === null || !fecha) return
    setGuardando(true)
    setError(null)
    try {
      for (const e of estudiantes) {
        const r = registros[e.id]
        if (!r || !r.sucio || r.letra === null) continue
        await guardarAsistencia({
          id: r.id,
          fecha,
          estado: LETRA_A_ESTADO[r.letra],
          justificacion: r.justificacion.trim() || null,
          estudianteId: e.id,
          cursoId,
        })
      }
      setRegistros(aRegistros(await getAsistencias(cursoId, fecha)))
      setGuardado(true)
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      setGuardando(false)
    }
  }

  const iniDocente = docente ? iniciales(docente.nombre, docente.apellido) : '··'

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
              {label === 'Asistencia' && pendientes > 0 && fecha && <span className="nav-count">{pendientes}</span>}
            </button>
          ))}
          <p className="nav-label nav-label-spaced">Herramientas</p>
          <button className="nav-item"><CalendarDays /><span>Calendario</span></button>
          <button className="nav-item"><FileSpreadsheet /><span>Reportes</span></button>
          <button className="nav-item"><Settings /><span>Configuración</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-card">
            <span className="sync-dot" style={error ? { background: '#ef746f' } : undefined} />
            <div>
              <strong>{error ? 'Sin conexión' : cargando ? 'Conectando…' : 'Conectado al servidor'}</strong>
              <span>{API_URL.replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
          <div className="teacher-card">
            <Avatar initials={iniDocente} color="green" />
            <div><strong>{docente?.nombre ?? 'Docente'}</strong><span>Profesor</span></div>
            <MoreHorizontal />
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
          {error && (
            <div className="notice" role="alert">
              <span>{error}</span>
              <button className="secondary-button" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>
            </div>
          )}
          {!error && !cargando && cursos.length === 0 ? (
            <div className="panel empty-state">Todavía no hay cursos cargados en el backend.</div>
          ) : active === 'Asistencia' ? (
            <AttendanceView
              fecha={fecha}
              onFecha={elegirFecha}
              curso={curso}
              cursos={cursos}
              onCurso={elegirCurso}
              estudiantes={estudiantes}
              registros={registros}
              onMarcar={marcar}
              onJustificacion={escribirJustificacion}
              guardando={guardando}
              guardado={guardado}
              onGuardar={guardar}
              porcentaje={porcentaje}
              cargando={cargando}
            />
          ) : active === 'Calificaciones' ? (
            <GradesView curso={curso} cursos={cursos} onCurso={elegirCurso} estudiantes={estudiantes} evaluaciones={evaluaciones} notas={notas} cargando={cargando} />
          ) : (
            <DashboardView
              saludo={saludo}
              fecha={fecha}
              docente={docente}
              curso={curso}
              cursos={cursos}
              totalEstudiantes={totalEstudiantes}
              estudiantes={estudiantes}
              registros={registros}
              evaluaciones={evaluaciones.length}
              presentes={presentes}
              ausentes={ausentes}
              tardes={tardes}
              porcentaje={porcentaje}
              onNavigate={setActive}
              onCurso={elegirCurso}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function DashboardView(p: {
  saludo: string
  fecha: string
  docente: Docente | null
  curso: Curso | null
  cursos: Curso[]
  totalEstudiantes: number | null
  estudiantes: Estudiante[]
  registros: Record<number, Registro>
  evaluaciones: number
  presentes: number
  ausentes: number
  tardes: number
  porcentaje: number | null
  onNavigate: (value: string) => void
  onCurso: (id: number) => void
}) {
  const textoPorcentaje = p.porcentaje === null ? '—' : `${p.porcentaje}%`
  const esHoy = p.fecha === hoyISO()

  return <>
    <section className="welcome-row"><div><p className="eyebrow">{p.fecha ? fechaLarga(p.fecha) : ''}</p><h1>{p.saludo}{p.docente ? `, ${p.docente.nombre}` : ''} <span>✦</span></h1><p className="subtitle">Aquí tienes un resumen de lo que ocurre en tus cursos.</p></div><button className="primary-button" onClick={() => p.onNavigate('Asistencia')}><Plus /> Tomar asistencia</button></section>
    <section className="stats-grid">
      <StatCard icon={<Users />} label="Estudiantes" value={p.totalEstudiantes === null ? '—' : String(p.totalEstudiantes)} detail={`en ${p.cursos.length} cursos`} tone="blue" />
      <StatCard icon={<ClipboardCheck />} label={esHoy ? 'Asistencia hoy' : 'Asistencia del día'} value={textoPorcentaje} detail={`${p.presentes} de ${p.presentes + p.ausentes + p.tardes} registrados`} tone="green" />
      <StatCard icon={<BookOpen />} label="Cursos activos" value={String(p.cursos.length)} detail={p.cursos.map((c) => c.nombre).join(', ') || '—'} tone="purple" />
      <StatCard icon={<NotebookPen />} label="Evaluaciones" value={String(p.evaluaciones)} detail={`en ${p.curso?.nombre ?? '—'}`} tone="orange" />
    </section>
    <div className="content-grid">
      <section className="panel attendance-panel">
        <div className="panel-heading"><div><h2>{esHoy ? 'Asistencia de hoy' : 'Asistencia del día'}</h2><p>{p.curso?.nombre ?? '—'}</p></div><button className="text-button" onClick={() => p.onNavigate('Asistencia')}>Ver planilla <span>→</span></button></div>
        <div className="progress-row"><div className="progress-track"><span style={{ width: `${p.porcentaje ?? 0}%` }} /></div><strong>{textoPorcentaje}</strong></div>
        <div className="attendance-summary"><span><i className="legend-dot present" /> Presentes <b>{p.presentes}</b></span><span><i className="legend-dot absent" /> Ausentes <b>{p.ausentes}</b></span><span><i className="legend-dot late" /> Tardanzas <b>{p.tardes}</b></span></div>
        <div className="mini-student-list">
          {p.estudiantes.length === 0 && <p className="empty-state">Este curso todavía no tiene alumnos inscriptos.</p>}
          {p.estudiantes.slice(0, 4).map((e, i) => (
            <div className="mini-student" key={e.id}><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(i)} /><span>{nombreCompleto(e)}</span><StatusBadge letra={p.registros[e.id]?.letra ?? null} /></div>
          ))}
        </div>
      </section>
      <section className="panel schedule-panel">
        <div className="panel-heading"><div><h2>Mis cursos</h2><p>Tocá uno para trabajar con él</p></div></div>
        <div className="schedule-list">
          {p.cursos.map((c, i) => (
            <div key={c.id} role="button" tabIndex={0} className={`schedule-item course-item ${c.id === p.curso?.id ? 'schedule-current' : ''}`} onClick={() => p.onCurso(c.id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') p.onCurso(c.id) }}>
              <strong>{c.anioLectivo}</strong><span className={`schedule-line ${LINEAS[i % LINEAS.length]}`} />
              <div><b>{c.nombre}</b><small>{c.docente ? `${c.docente.nombre} ${c.docente.apellido}` : 'Sin docente'}</small></div>
              {c.id === p.curso?.id && <span className="now-tag">Seleccionado</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  </>
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div></div> }

function StatusBadge({ letra }: { letra: Letra | null }) {
  if (letra === null) return <span className="status-badge status-none">Sin registrar</span>
  return <span className={`status-badge status-${letra.toLowerCase()}`}>{letra === 'P' ? 'Presente' : letra === 'A' ? 'Ausente' : 'Tarde'}</span>
}

function CursoSelector({ curso, cursos, onCurso, children }: { curso: Curso | null; cursos: Curso[]; onCurso: (id: number) => void; children?: React.ReactNode }) {
  return <div className="class-selector panel">
    <div className="selector-main">
      <div className="class-icon"><BookOpen /></div>
      <div>
        <span>Curso seleccionado</span>
        <select className="course-select" aria-label="Curso" value={curso?.id ?? ''} onChange={(ev) => onCurso(Number(ev.target.value))}>
          {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.anioLectivo}</option>)}
        </select>
      </div>
    </div>
    {children}
  </div>
}

function AttendanceView(p: {
  fecha: string
  onFecha: (value: string) => void
  curso: Curso | null
  cursos: Curso[]
  onCurso: (id: number) => void
  estudiantes: Estudiante[]
  registros: Record<number, Registro>
  onMarcar: (estudianteId: number, letra: Letra) => void
  onJustificacion: (estudianteId: number, texto: string) => void
  guardando: boolean
  guardado: boolean
  onGuardar: () => void
  porcentaje: number | null
  cargando: boolean
}) {
  return <>
    <section className="welcome-row compact"><div><p className="eyebrow">{p.fecha ? fechaLarga(p.fecha) : ''}</p><h1>Tomar asistencia</h1><p className="subtitle">Registra la asistencia de tu curso de forma rápida y sencilla.</p></div><button className="primary-button" onClick={p.onGuardar} disabled={p.guardando || p.estudiantes.length === 0}><Check /> {p.guardando ? 'Guardando…' : p.guardado ? 'Guardado' : 'Guardar asistencia'}</button></section>
    <CursoSelector curso={p.curso} cursos={p.cursos} onCurso={p.onCurso}>
      <div className="date-control"><CalendarDays /><input className="date-input" type="date" aria-label="Fecha" value={p.fecha} onChange={(ev) => ev.target.value && p.onFecha(ev.target.value)} /></div>
    </CursoSelector>
    <section className="panel roster-panel">
      <div className="panel-heading"><div><h2>Lista de estudiantes</h2><p>Marca el estado de cada estudiante</p></div><div className="attendance-meter"><strong>{p.porcentaje === null ? '—' : `${p.porcentaje}%`}</strong><span>asistencia</span></div></div>
      <div className="roster-table">
        <div className="table-head"><span>Estudiante</span><span>Estado</span><span>Justificación</span><span /></div>
        {p.estudiantes.length === 0 && <p className="empty-state">{p.cargando ? 'Cargando alumnos…' : 'Este curso todavía no tiene alumnos inscriptos.'}</p>}
        {p.estudiantes.map((e, i) => {
          const r = p.registros[e.id]
          const letra = r?.letra ?? null
          return <div className="roster-row" key={e.id}>
            <div className="student-cell"><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(i)} /><strong>{nombreCompleto(e)}</strong></div>
            <div className="status-actions">
              <button className={letra === 'P' ? 'selected present-action' : ''} onClick={() => p.onMarcar(e.id, 'P')} aria-label={`${nombreCompleto(e)}: presente`}>P</button>
              <button className={letra === 'A' ? 'selected absent-action' : ''} onClick={() => p.onMarcar(e.id, 'A')} aria-label={`${nombreCompleto(e)}: ausente`}>A</button>
              <button className={letra === 'T' ? 'selected late-action' : ''} onClick={() => p.onMarcar(e.id, 'T')} aria-label={`${nombreCompleto(e)}: tarde`}>T</button>
            </div>
            <input className="justification-input" placeholder={letra === 'A' || letra === 'T' ? 'Motivo' : '—'} aria-label={`Justificación de ${nombreCompleto(e)}`} value={r?.justificacion ?? ''} disabled={letra === null || letra === 'P'} onChange={(ev) => p.onJustificacion(e.id, ev.target.value)} />
            <button className="more-button" aria-label="Más opciones"><MoreHorizontal /></button>
          </div>
        })}
      </div>
    </section>
  </>
}

function GradesView(p: {
  curso: Curso | null
  cursos: Curso[]
  onCurso: (id: number) => void
  estudiantes: Estudiante[]
  evaluaciones: Evaluacion[]
  notas: Nota[]
  cargando: boolean
}) {
  const evaluaciones = [...p.evaluaciones].sort((a, b) => a.id - b.id)
  const valores = new Map<string, number>()
  for (const n of p.notas) valores.set(`${n.estudiante.id}:${n.evaluacion.id}`, n.valor)

  const columnas = { gridTemplateColumns: `1.6fr repeat(${evaluaciones.length + 1}, 1fr)` }

  return <>
    <section className="welcome-row compact"><div><p className="eyebrow">EVALUACIONES · {(p.curso?.nombre ?? '').toUpperCase()}</p><h1>Calificaciones</h1><p className="subtitle">Revisa el progreso de tus estudiantes.</p></div><button className="secondary-button"><Upload /> Importar planilla</button></section>
    <CursoSelector curso={p.curso} cursos={p.cursos} onCurso={p.onCurso} />
    <section className="panel grades-panel">
      <div className="panel-heading"><div><h2>Planilla de notas</h2><p>{p.curso ? `${p.curso.nombre} · ${p.curso.anioLectivo}` : '—'}</p></div></div>
      <div className="grades-table">
        <div className="grades-head" style={columnas}><span>Estudiante</span>{evaluaciones.map((ev) => <span key={ev.id}>{ev.titulo}</span>)}<span>Promedio</span></div>
        {p.estudiantes.length === 0 && <p className="empty-state">{p.cargando ? 'Cargando alumnos…' : 'Este curso todavía no tiene alumnos inscriptos.'}</p>}
        {p.estudiantes.length > 0 && evaluaciones.length === 0 && !p.cargando && <p className="empty-state">Este curso todavía no tiene evaluaciones.</p>}
        {p.estudiantes.map((e, i) => {
          const cargadas = evaluaciones.map((ev) => valores.get(`${e.id}:${ev.id}`))
          const numeros = cargadas.filter((v): v is number => v !== undefined)
          const promedio = numeros.length > 0 ? (numeros.reduce((a, b) => a + b, 0) / numeros.length).toFixed(1) : '—'
          return <div className="grades-row" style={columnas} key={e.id}>
            <div className="student-cell"><Avatar initials={iniciales(e.nombre, e.apellido)} color={colorDe(i)} /><strong>{nombreCompleto(e)}</strong></div>
            {cargadas.map((v, j) => <span key={evaluaciones[j].id}>{v === undefined ? '—' : v.toFixed(1)}</span>)}
            <strong className="average-grade">{promedio}</strong>
          </div>
        })}
      </div>
    </section>
  </>
}
