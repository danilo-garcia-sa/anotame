'use client'

import { useMemo, useState } from 'react'
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

const students = [
  { name: 'Sofía Ramírez', initials: 'SR', status: 'P', note: '—', color: 'peach' },
  { name: 'Mateo González', initials: 'MG', status: 'P', note: '—', color: 'blue' },
  { name: 'Valentina Torres', initials: 'VT', status: 'A', note: 'Enfermedad', color: 'lavender' },
  { name: 'Lucas Fernández', initials: 'LF', status: 'P', note: '—', color: 'mint' },
  { name: 'Emilia Castro', initials: 'EC', status: 'T', note: 'Transporte', color: 'gold' },
  { name: 'Martín Silva', initials: 'MS', status: 'P', note: '—', color: 'rose' },
  { name: 'Camila Rojas', initials: 'CR', status: 'P', note: '—', color: 'sky' },
]

const grades = [
  { name: 'Sofía Ramírez', initials: 'SR', task1: 9.5, task2: 8.7, task3: 9.1, color: 'peach' },
  { name: 'Mateo González', initials: 'MG', task1: 8.2, task2: 9.0, task3: 8.6, color: 'blue' },
  { name: 'Valentina Torres', initials: 'VT', task1: 7.8, task2: 8.4, task3: 8.1, color: 'lavender' },
  { name: 'Lucas Fernández', initials: 'LF', task1: 9.0, task2: 9.3, task3: 9.2, color: 'mint' },
  { name: 'Emilia Castro', initials: 'EC', task1: 8.8, task2: 8.1, task3: 8.5, color: 'gold' },
]

const navItems = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Asistencia', icon: ClipboardCheck },
  { label: 'Calificaciones', icon: NotebookPen },
  { label: 'Mis cursos', icon: BookOpen },
]

function Avatar({ initials, color }: { initials: string; color: string }) {
  return <span className={`avatar avatar-${color}`}>{initials}</span>
}

export default function Page() {
  const [active, setActive] = useState('Resumen')
  const [menuOpen, setMenuOpen] = useState(false)
  const [attendance, setAttendance] = useState(students)
  const [saved, setSaved] = useState(false)

  const presentCount = useMemo(() => attendance.filter((student) => student.status === 'P').length, [attendance])
  const attendancePercent = Math.round((presentCount / attendance.length) * 100)

  const toggleAttendance = (index: number, status: string) => {
    setAttendance((current) => current.map((student, studentIndex) => studentIndex === index ? { ...student, status } : student))
    setSaved(false)
  }

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
              <Icon /> <span>{label}</span>{label === 'Asistencia' && <span className="nav-count">3</span>}
            </button>
          ))}
          <p className="nav-label nav-label-spaced">Herramientas</p>
          <button className="nav-item"><CalendarDays /><span>Calendario</span></button>
          <button className="nav-item"><FileSpreadsheet /><span>Reportes</span></button>
          <button className="nav-item"><Settings /><span>Configuración</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-card"><span className="sync-dot" /><div><strong>Todo sincronizado</strong><span>Última actualización hace 2 min</span></div></div>
          <div className="teacher-card"><Avatar initials="JQ" color="green" /><div><strong>Joaquín</strong><span>Profesor</span></div><MoreHorizontal /></div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="breadcrumb"><span>Inicio</span><span>/</span><strong>{active}</strong></div>
          <div className="topbar-actions"><button className="icon-button"><Search /></button><button className="icon-button notification"><Bell /><i /></button><div className="top-avatar">JQ</div></div>
        </header>
        <div className="page-wrap">
          {active === 'Asistencia' ? (
            <AttendanceView attendance={attendance} onToggle={toggleAttendance} saved={saved} onSave={() => setSaved(true)} attendancePercent={attendancePercent} />
          ) : active === 'Calificaciones' ? <GradesView /> : <DashboardView onNavigate={setActive} attendancePercent={attendancePercent} presentCount={presentCount} />}
        </div>
      </main>
    </div>
  )
}

function DashboardView({ onNavigate, attendancePercent, presentCount }: { onNavigate: (value: string) => void; attendancePercent: number; presentCount: number }) {
  return <>
    <section className="welcome-row"><div><p className="eyebrow">LUNES, 14 DE SEPTIEMBRE DE 2026</p><h1>Buenos días, Joaquín <span>✦</span></h1><p className="subtitle">Aquí tienes un resumen de lo que ocurre en tus cursos.</p></div><button className="primary-button" onClick={() => onNavigate('Asistencia')}><Plus /> Tomar asistencia</button></section>
    <section className="stats-grid">
      <StatCard icon={<Users />} label="Estudiantes" value="32" detail="en 2 cursos" tone="blue" />
      <StatCard icon={<ClipboardCheck />} label="Asistencia hoy" value={`${attendancePercent}%`} detail={`${presentCount} de 7 presentes`} tone="green" />
      <StatCard icon={<BookOpen />} label="Cursos activos" value="2" detail="5° A y 6° B" tone="purple" />
      <StatCard icon={<NotebookPen />} label="Tareas por revisar" value="8" detail="entregas pendientes" tone="orange" />
    </section>
    <div className="content-grid">
      <section className="panel attendance-panel"><div className="panel-heading"><div><h2>Asistencia de hoy</h2><p>5° A · Matemática</p></div><button className="text-button" onClick={() => onNavigate('Asistencia')}>Ver planilla <span>→</span></button></div><div className="progress-row"><div className="progress-track"><span style={{ width: `${attendancePercent}%` }} /></div><strong>{attendancePercent}%</strong></div><div className="attendance-summary"><span><i className="legend-dot present" /> Presentes <b>{presentCount}</b></span><span><i className="legend-dot absent" /> Ausentes <b>1</b></span><span><i className="legend-dot late" /> Tardanzas <b>1</b></span></div><div className="mini-student-list">{students.slice(0, 4).map((student) => <div className="mini-student" key={student.name}><Avatar initials={student.initials} color={student.color} /><span>{student.name}</span><StatusBadge status={student.status} /></div>)}</div></section>
      <section className="panel schedule-panel"><div className="panel-heading"><div><h2>Próximas clases</h2><p>Tu agenda para hoy</p></div><button className="icon-button"><MoreHorizontal /></button></div><div className="schedule-list"><ScheduleItem time="09:00" subject="Matemática" course="5° A" color="blue" current /><ScheduleItem time="11:15" subject="Ciencias Naturales" course="6° B" color="green" /><ScheduleItem time="14:00" subject="Reunión de apoderados" course="Sala de profesores" color="orange" /></div></section>
    </div>
    <section className="panel activity-panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Últimos movimientos en tus cursos</p></div><button className="text-button">Ver todo <span>→</span></button></div><div className="activity-list"><Activity icon={<ClipboardCheck />} title="Asistencia registrada" detail="5° A · Matemática" time="Hace 25 min" tone="green" /><Activity icon={<Upload />} title="Planilla importada" detail="6° B · Lenguaje" time="Ayer, 16:42" tone="blue" /><Activity icon={<NotebookPen />} title="Nueva tarea creada" detail="Guía de fracciones · 5° A" time="Ayer, 11:20" tone="orange" /></div></section>
  </>
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div></div> }
function StatusBadge({ status }: { status: string }) { return <span className={`status-badge status-${status.toLowerCase()}`}>{status === 'P' ? 'Presente' : status === 'A' ? 'Ausente' : 'Tarde'}</span> }
function ScheduleItem({ time, subject, course, color, current = false }: { time: string; subject: string; course: string; color: string; current?: boolean }) { return <div className={`schedule-item ${current ? 'schedule-current' : ''}`}><strong>{time}</strong><span className={`schedule-line ${color}`} /><div><b>{subject}</b><small>{course}</small></div>{current && <span className="now-tag">Ahora</span>}</div> }
function Activity({ icon, title, detail, time, tone }: { icon: React.ReactNode; title: string; detail: string; time: string; tone: string }) { return <div className="activity-item"><span className={`activity-icon ${tone}`}>{icon}</span><div><b>{title}</b><small>{detail}</small></div><time>{time}</time></div> }

function AttendanceView({ attendance, onToggle, saved, onSave, attendancePercent }: { attendance: typeof students; onToggle: (index: number, status: string) => void; saved: boolean; onSave: () => void; attendancePercent: number }) {
  return <><section className="welcome-row compact"><div><p className="eyebrow">LUNES, 14 DE SEPTIEMBRE DE 2026</p><h1>Tomar asistencia</h1><p className="subtitle">Registra la asistencia de tu curso de forma rápida y sencilla.</p></div><button className="primary-button" onClick={onSave}><Check /> {saved ? 'Guardado' : 'Guardar asistencia'}</button></section><div className="class-selector panel"><div className="selector-main"><div className="class-icon"><BookOpen /></div><div><span>Curso seleccionado</span><strong>5° A · Matemática</strong></div><ChevronDown /></div><div className="date-control"><CalendarDays /><span>Hoy, 14 sep 2026</span><ChevronDown /></div></div><section className="panel roster-panel"><div className="panel-heading"><div><h2>Lista de estudiantes</h2><p>Marca el estado de cada estudiante</p></div><div className="attendance-meter"><strong>{attendancePercent}%</strong><span>asistencia</span></div></div><div className="roster-table"><div className="table-head"><span>Estudiante</span><span>Estado</span><span>Justificación</span><span /></div>{attendance.map((student, index) => <div className="roster-row" key={student.name}><div className="student-cell"><Avatar initials={student.initials} color={student.color} /><strong>{student.name}</strong></div><div className="status-actions"><button className={student.status === 'P' ? 'selected present-action' : ''} onClick={() => onToggle(index, 'P')}>P</button><button className={student.status === 'A' ? 'selected absent-action' : ''} onClick={() => onToggle(index, 'A')}>A</button><button className={student.status === 'T' ? 'selected late-action' : ''} onClick={() => onToggle(index, 'T')}>T</button></div><span className="justification">{student.note}</span><button className="more-button"><MoreHorizontal /></button></div>)}</div></section></>
}

function GradesView() { return <><section className="welcome-row compact"><div><p className="eyebrow">EVALUACIONES · 5° A</p><h1>Calificaciones</h1><p className="subtitle">Revisa el progreso de tus estudiantes.</p></div><button className="secondary-button"><Upload /> Importar planilla</button></section><section className="panel grades-panel"><div className="panel-heading"><div><h2>Planilla de notas</h2><p>Matemática · Segundo trimestre</p></div><button className="primary-button small"><Check /> Guardar cambios</button></div><div className="grades-table"><div className="grades-head"><span>Estudiante</span><span>Guía 1</span><span>Control 1</span><span>Proyecto</span><span>Promedio</span></div>{grades.map((student) => { const average = ((student.task1 + student.task2 + student.task3) / 3).toFixed(1); return <div className="grades-row" key={student.name}><div className="student-cell"><Avatar initials={student.initials} color={student.color} /><strong>{student.name}</strong></div><span>{student.task1.toFixed(1)}</span><span>{student.task2.toFixed(1)}</span><span>{student.task3.toFixed(1)}</span><strong className="average-grade">{average}</strong></div> })}</div></section></> }
