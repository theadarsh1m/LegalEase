import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import mammoth from "mammoth"
// @ts-ignore
import pdfParse from "pdf-parse"
import Tesseract from "tesseract.js"

function normalizeExtractedText(value: string) {
  return value.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

// ── PDF text extraction ──

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer)
    return data.text || ""
  } catch (err: any) {
    throw new Error(err.message || "PDF extraction failed")
  }
}

// ── OCR via Tesseract.js (free, local, no API keys) ──

async function ocrImage(buffer: Buffer): Promise<string> {
  try {
    const { data } = await Tesseract.recognize(buffer, "eng", {
      logger: () => {}, // suppress progress logs
    })
    return data.text || ""
  } catch (err: any) {
    throw new Error(err.message || "OCR failed")
  }
}

// ── Format detection helpers ──

const PDF_EXTENSIONS = [".pdf"]
const PLAIN_TEXT_EXTENSIONS = [".txt", ".md", ".json", ".csv", ".log", ".xml", ".html", ".htm", ".yaml", ".yml", ".ini", ".cfg", ".conf", ".env", ".sh", ".bat", ".ps1", ".py", ".js", ".ts", ".jsx", ".tsx", ".css", ".scss", ".sql", ".r", ".c", ".cpp", ".h", ".java", ".rb", ".go", ".rs", ".swift", ".kt"]
const DOCX_EXTENSIONS = [".docx"]
const DOC_EXTENSIONS = [".doc"]
const RTF_EXTENSIONS = [".rtf"]
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".tif"]

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

function isImage(file: File, lowerName: string) {
  return (
    file.type.startsWith("image/") ||
    IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

function getExtension(lowerName: string): string {
  const dot = lowerName.lastIndexOf(".")
  return dot >= 0 ? lowerName.slice(dot) : ".bin"
}

// ── RTF text extraction (no external dependency) ──

function extractRtfText(raw: string): string {
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
      let word = ""
      while (i < raw.length && /[a-zA-Z]/.test(raw[i])) {
        word += raw[i]
        i++
      }
      if (i < raw.length && /[-\d]/.test(raw[i])) {
        while (i < raw.length && /[\d]/.test(raw[i])) i++
      }
      if (i < raw.length && raw[i] === " ") i++

      if (word === "par" || word === "line") result += "\n"
      else if (word === "tab") result += "\t"
      else if (ch === "\\") {
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

// ── .doc extraction via mammoth (best-effort) ──

async function extractDocText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch {
    return ""
  }
}

// ── Main extraction function ──

export async function extractDocumentTextFromFile(file: File) {
  const lowerName = file.name.toLowerCase()

  // PDF — try text extraction first, fall back to OCR if empty (scanned PDF)
  if (isPdf(file, lowerName)) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let text = await extractPdfText(buffer)
    text = normalizeExtractedText(text)

    // If pdf-parse found very little text, it's likely a scanned/image-based PDF
    // Note: Tesseract works on images, not PDFs directly — so for scanned PDFs
    // we return whatever pdf-parse found (even if minimal)
    return text
  }

  // Images — OCR via Tesseract.js (free, runs locally)
  if (isImage(file, lowerName)) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const text = await ocrImage(buffer)
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
