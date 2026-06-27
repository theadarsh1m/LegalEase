import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { execFileSync } from "node:child_process"
import mammoth from "mammoth"

function normalizeExtractedText(value: string) {
  return value.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

function extractPdfText(buffer: Buffer): string {
  const tmpPath = path.join(os.tmpdir(), `legalease-pdf-${Date.now()}.pdf`)
  fs.writeFileSync(tmpPath, buffer)

  try {
    const scriptPath = path.join(process.cwd(), "scripts", "extract-pdf.cjs")
    const result = execFileSync("node", [scriptPath, tmpPath], {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 30_000,
    })
    return result
  } finally {
    try { fs.unlinkSync(tmpPath) } catch {}
  }
}

// ── Format detection helpers ──

const PDF_EXTENSIONS = [".pdf"]
const PLAIN_TEXT_EXTENSIONS = [".txt", ".md", ".json", ".csv", ".log", ".xml", ".html", ".htm", ".yaml", ".yml", ".ini", ".cfg", ".conf", ".env", ".sh", ".bat", ".ps1", ".py", ".js", ".ts", ".jsx", ".tsx", ".css", ".scss", ".sql", ".r", ".c", ".cpp", ".h", ".java", ".rb", ".go", ".rs", ".swift", ".kt"]
const DOCX_EXTENSIONS = [".docx"]
const DOC_EXTENSIONS = [".doc"]
const RTF_EXTENSIONS = [".rtf"]

function isPdf(file: File, lowerName: string) {
  return file.type === "application/pdf" || PDF_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
}

function isPlainText(file: File, lowerName: string) {
  return (
    file.type.startsWith("text/") ||
    PLAIN_TEXT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

function isDocx(file: File, lowerName: string) {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    DOCX_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

function isDoc(file: File, lowerName: string) {
  return (
    file.type === "application/msword" ||
    DOC_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

function isRtf(file: File, lowerName: string) {
  return (
    file.type === "application/rtf" ||
    file.type === "text/rtf" ||
    RTF_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

// ── RTF text extraction (no external dependency) ──

function extractRtfText(raw: string): string {
  // Strip RTF control words and groups, extract plain text
  let depth = 0
  let result = ""
  let i = 0
  while (i < raw.length) {
    const ch = raw[i]
    if (ch === "{") {
      depth++
      i++
    } else if (ch === "}") {
      depth--
      i++
    } else if (ch === "\\") {
      i++
      // Read control word
      let word = ""
      while (i < raw.length && /[a-zA-Z]/.test(raw[i])) {
        word += raw[i]
        i++
      }
      // Skip optional numeric parameter
      if (i < raw.length && /[-\d]/.test(raw[i])) {
        while (i < raw.length && /[\d]/.test(raw[i])) i++
      }
      // Skip single trailing space
      if (i < raw.length && raw[i] === " ") i++

      if (word === "par" || word === "line") result += "\n"
      else if (word === "tab") result += "\t"
      else if (ch === "\\") {
        // Escaped character like \\ \{ \}
        if (raw[i] === "\\" || raw[i] === "{" || raw[i] === "}") {
          result += raw[i]
          i++
        }
      }
    } else {
      if (depth <= 1) result += ch
      i++
    }
  }
  return result
}

// ── .doc extraction via mammoth (best-effort, works for many .doc files) ──

async function extractDocText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch {
    // mammoth can fail on older binary .doc formats
    return ""
  }
}

// ── Main extraction function ──

export async function extractDocumentTextFromFile(file: File) {
  const lowerName = file.name.toLowerCase()

  // PDF
  if (isPdf(file, lowerName)) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const text = extractPdfText(buffer)
    return normalizeExtractedText(text)
  }

  // DOCX (Office Open XML)
  if (isDocx(file, lowerName)) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })
    return normalizeExtractedText(result.value)
  }

  // DOC (legacy Word — mammoth best-effort)
  if (isDoc(file, lowerName)) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const text = await extractDocText(buffer)
    return normalizeExtractedText(text)
  }

  // RTF
  if (isRtf(file, lowerName)) {
    const raw = await file.text()
    return normalizeExtractedText(extractRtfText(raw))
  }

  // Plain text & code files
  if (isPlainText(file, lowerName)) {
    return normalizeExtractedText(await file.text())
  }

  // Fallback: try reading as plain text
  try {
    const text = await file.text()
    if (text && text.length > 10) {
      return normalizeExtractedText(text)
    }
  } catch {}

  return ""
}
