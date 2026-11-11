import { getCalificaciones, type Planilla } from '@/lib/api'
import { aFecha, hoyISO } from '@/lib/fechas'

type Celdas = Record<string, { letra: 'P' | 'A' | 'T'; justificacion: string }>

const AZUL_SA = 'FFDBEAFE'
const FILL = { P: 'FFE3F6EB', A: 'FFFFEBEB', T: 'FFFFF3D9' } as const
const COLOR = { P: 'FF309A60', A: 'FFDB6C67', T: 'FFC48B31' } as const
const ESTADO = { APROBADO: 'Aprobado', EN_PROCESO: 'En proceso', DESAPROBADO: 'Desaprobado' } as const
const INSTANCIAS = [
  ['BIMESTRE_1', '1er bimestre'], ['CUATRIMESTRE_1', '1er cuatrimestre'],
  ['BIMESTRE_2', '2do bimestre'], ['CUATRIMESTRE_2', '2do cuatrimestre'],
] as const

/** Ahora mismo: columna Excel (1 = A, 27 = AA). */
function col(n: number) {
  let s = ''
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s
  return s
}

/**
 * Arma un .xlsx con la planilla de asistencia y las calificaciones de la cursada (igual a las hojas de Excel
 * que se usaban a mano, pero con los totales como fórmulas) y lo descarga.
 */
export async function exportarAExcel(planilla: Planilla, celdas: Celdas) {
  const ExcelJS = (await import('exceljs')).default
  const calif = await getCalificaciones(planilla.cursada.id)
  const wb = new ExcelJS.Workbook()
  const hoy = hoyISO()
  const c = planilla.cursada

  // ---------- Asistencia ----------
  const hojaA = wb.addWorksheet('Asistencia', { views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }] })
  hojaA.getCell('A1').value = `${c.curso.nombre} · ${c.docente.nombre} ${c.docente.apellido} · Asistencia ${c.curso.anioLectivo}`
  hojaA.getCell('A1').font = { bold: true, size: 13 }
  const n = planilla.dias.length
  const primera = 2
  const ultima = primera + n - 1
  const cP = ultima + 1
  hojaA.getRow(2).getCell(1).value = 'Fecha'
  hojaA.getRow(3).getCell(1).value = 'Estudiante'
  planilla.dias.forEach((d, i) => {
    const f = aFecha(d.fecha)
    const x = primera + i
    const celda = hojaA.getRow(2).getCell(x)
    celda.value = d.sinActividad ? 'SA' : f
    if (!d.sinActividad) celda.numFmt = 'dd/mm'
    hojaA.getRow(3).getCell(x).value = d.numero
    if (d.sinActividad) for (const fila of [2, 3]) {
      hojaA.getRow(fila).getCell(x).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_SA } }
    }
    hojaA.getColumn(x).width = 6
  })
  ;['P', 'A', 'T', '%'].forEach((t, i) => { hojaA.getRow(3).getCell(cP + i).value = t })
  hojaA.getRow(2).getCell(cP).value = 'Totales'
  for (const fila of [2, 3]) hojaA.getRow(fila).eachCell((x) => { x.font = { bold: true }; x.alignment = { horizontal: 'center' } })
  hojaA.getColumn(1).width = 28

  const hastaHoy = planilla.dias.filter((d) => !d.sinActividad && d.fecha <= hoy).map((d) => d.fecha)
  planilla.estudiantes.forEach((e, r) => {
    const fila = 4 + r
    hojaA.getCell(fila, 1).value = `${e.apellido}, ${e.nombre}`
    let p = 0, a = 0, t = 0
    planilla.dias.forEach((d, i) => {
      const x = primera + i
      const cel = hojaA.getCell(fila, x)
      cel.alignment = { horizontal: 'center' }
      if (d.sinActividad) { cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_SA } }; return }
      const reg = celdas[`${e.id}|${d.fecha}`]
      if (!reg) return
      cel.value = reg.letra
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL[reg.letra] } }
      cel.font = { bold: true, color: { argb: COLOR[reg.letra] } }
      if (reg.justificacion) cel.note = reg.justificacion
      if (hastaHoy.includes(d.fecha)) { if (reg.letra === 'P') p++; else if (reg.letra === 'A') a++; else t++ }
    })
    const rango = `${col(primera)}${fila}:${col(ultima)}${fila}`
    const total = p + a + t
    hojaA.getCell(fila, cP).value = { formula: `COUNTIF(${rango},"P")`, result: p }
    hojaA.getCell(fila, cP + 1).value = { formula: `COUNTIF(${rango},"A")`, result: a }
    hojaA.getCell(fila, cP + 2).value = { formula: `COUNTIF(${rango},"T")`, result: t }
    const pctCell = hojaA.getCell(fila, cP + 3)
    pctCell.value = { formula: `IF(SUM(${col(cP)}${fila}:${col(cP + 2)}${fila})=0,"",${col(cP)}${fila}/SUM(${col(cP)}${fila}:${col(cP + 2)}${fila}))`, result: total ? p / total : '' }
    pctCell.numFmt = '0%'
    for (let k = 0; k < 4; k++) hojaA.getCell(fila, cP + k).alignment = { horizontal: 'center' }
  })

  // ---------- Calificaciones ----------
  const hojaC = wb.addWorksheet('Calificaciones')
  hojaC.getCell('A1').value = `${c.curso.nombre} · ${c.docente.nombre} ${c.docente.apellido} · Calificaciones ${c.curso.anioLectivo}`
  hojaC.getCell('A1').font = { bold: true, size: 13 }
  hojaC.getRow(3).values = ['Estudiante', ...INSTANCIAS.map(([, nombre]) => nombre)]
  hojaC.getRow(3).font = { bold: true }
  calif.estudiantes.forEach((e, i) => {
    const fila = 4 + i
    hojaC.getCell(fila, 1).value = `${e.apellido}, ${e.nombre}`
    INSTANCIAS.forEach(([id], k) => {
      const r = calif.instancias.find((x) => x.estudianteId === e.id && x.instancia === id)
      const cel = hojaC.getCell(fila, 2 + k)
      cel.alignment = { horizontal: 'center' }
      if (!r) return
      if (r.estado) cel.value = ESTADO[r.estado]
      else if (r.nota !== null) {
        cel.value = r.nota
        cel.font = { bold: true, color: { argb: r.nota >= 7 ? COLOR.P : COLOR.A } }
      }
    })
  })
  hojaC.getColumn(1).width = 28
  for (let k = 2; k <= 5; k++) hojaC.getColumn(k).width = 18

  if (c.sistema === 'PUNTOS') {
    const base = 4 + calif.estudiantes.length + 2
    hojaC.getCell(base, 1).value = `Puntos por evaluación (meta: ${calif.metaPuntos} pts)`
    hojaC.getCell(base, 1).font = { bold: true, size: 12 }
    const cab = base + 1
    hojaC.getRow(cab).values = ['Estudiante', ...calif.evaluaciones.map((ev) => (ev.puntosMaximos ? `${ev.titulo} (${ev.puntosMaximos})` : ev.titulo)), 'Total', 'Resultado']
    hojaC.getRow(cab).font = { bold: true }
    const ne = calif.evaluaciones.length
    calif.estudiantes.forEach((e, i) => {
      const fila = cab + 1 + i
      hojaC.getCell(fila, 1).value = `${e.apellido}, ${e.nombre}`
      let total = 0
      calif.evaluaciones.forEach((ev, k) => {
        const v = calif.notas.find((x) => x.estudianteId === e.id && x.evaluacionId === ev.id)?.valor
        const cel = hojaC.getCell(fila, 2 + k)
        cel.alignment = { horizontal: 'center' }
        if (v !== undefined) { cel.value = v; total += v }
      })
      const celTotal = hojaC.getCell(fila, 2 + ne)
      const rango = ne > 0 ? `${col(2)}${fila}:${col(1 + ne)}${fila}` : ''
      celTotal.value = ne > 0 ? { formula: `SUM(${rango})`, result: total } : 0
      celTotal.font = { bold: true }
      celTotal.alignment = { horizontal: 'center' }
      const res = hojaC.getCell(fila, 3 + ne)
      res.value = { formula: `IF(${col(2 + ne)}${fila}>=${calif.metaPuntos},"Aprobado","No aprobado")`, result: total >= calif.metaPuntos ? 'Aprobado' : 'No aprobado' }
      res.alignment = { horizontal: 'center' }
    })
    hojaC.getColumn(2 + ne).width = 12
    hojaC.getColumn(3 + ne).width = 16
  }

  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${c.curso.nombre} - ${c.docente.apellido} - ${c.curso.anioLectivo}.xlsx`.replace(/[\\/:*?"<>|]/g, '')
  a.click()
  URL.revokeObjectURL(url)
}
