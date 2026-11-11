# anotame — frontend

Panel docente (Next.js + React + Tailwind) para registrar asistencia y ver calificaciones.
Se conecta al backend `modelo-del-proyecto` (Kotlin + Spring Boot + MariaDB).

## Cómo correrlo

1. Levantá el backend (repo `modelo-del-proyecto`) en `http://localhost:8080`. Ver el README de ese repo.
2. En otra terminal, en esta carpeta:

```powershell
pnpm install
pnpm dev
```

3. Abrí http://localhost:3000

Si el backend está en otra dirección, copiá `.env.example` como `.env.local` y cambiá `NEXT_PUBLIC_API_URL`.

## Qué hace hoy

- **Resumen**: cursos, total de estudiantes, asistencia del día y evaluaciones del curso elegido.
- **Asistencia**: elegís curso y fecha, marcás P / A / T, escribís el motivo y guardás (crea o actualiza).
- **Calificaciones**: planilla de solo lectura con las evaluaciones del curso y el promedio de cada alumno.

Los datos salen de la API (`lib/api.ts`). Si el backend no responde, aparece un aviso con el botón "Reintentar".

## Planilla de asistencia

- **Mis cursos**: cada docente elige curso, días de la semana y período (año o cuatrimestre) y el backend genera el calendario.
- **Asistencia**: planilla alumnos × fechas. Click en una celda: P → A → T → vacía (se guarda al instante). El botón ✓✓ bajo cada fecha marca a todos presentes. Tocar el número de una fecha la marca como "SA" (sin actividad).
- El docente se elige abajo a la izquierda (hasta que haya inicio de sesión).
- Fotos de alumnos: se usa `fotoUrl` del alumno; si no tiene, se muestran las iniciales. Las imágenes van en `public/fotos/`.
- Requiere la rama `calendario` del backend.

## Calificaciones y Excel

- **Instancias:** 1er bimestre / 1er cuatrimestre / 2do bimestre / 2do cuatrimestre. Bimestre = Aprobado, En proceso o Desaprobado; cuatrimestre = nota entera de 1 a 10 (verde con 7 o más).
- **Sistema de puntos** (el de Joaquín): se activa con el selector "Puntos". Se cargan TPs con su puntaje máximo, la app suma y compara con la meta (6 pts × clases, editable).
- **Exportar a Excel:** botón en Asistencia y en Calificaciones; genera un .xlsx con las dos hojas y los totales como fórmulas.
- Requiere la rama `calificaciones` del backend.
