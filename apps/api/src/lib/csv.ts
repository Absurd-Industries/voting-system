export interface CsvTalkRow {
  title: string
  description: string | null
  duration_minutes: number
  presenter_name: string
  presenter_bio: string | null
  presenter_email: string | null
}

export interface CsvError {
  row: number
  field: string
  message: string
}

export function parseAndValidateCsv(csv: string): {
  rows: CsvTalkRow[]
  errors: CsvError[]
} {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').map(l => l.trim())
  if (lines.length < 2) return { rows: [], errors: [] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  const rows: CsvTalkRow[] = []
  const errors: CsvError[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const get = (col: string) => {
      const idx = headers.indexOf(col)
      return idx >= 0 ? (values[idx] ?? '').trim() : ''
    }

    const rowErrors: CsvError[] = []

    const title = get('title')
    if (!title) rowErrors.push({ row: i, field: 'title', message: 'title is required' })

    const presenterName = get('presenter_name')
    if (!presenterName) rowErrors.push({ row: i, field: 'presenter_name', message: 'presenter_name is required' })

    const durationRaw = get('duration_minutes')
    const duration = parseInt(durationRaw, 10)
    if (!durationRaw || isNaN(duration) || duration <= 0 || String(duration) !== durationRaw) {
      rowErrors.push({ row: i, field: 'duration_minutes', message: 'duration_minutes must be a positive integer' })
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      continue
    }

    rows.push({
      title,
      description: get('description') || null,
      duration_minutes: duration,
      presenter_name: presenterName,
      presenter_bio: get('presenter_bio') || null,
      presenter_email: get('presenter_email') || null,
    })
  }

  return { rows, errors }
}

// Minimal CSV line parser handling quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
