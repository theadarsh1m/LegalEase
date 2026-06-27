export function getDocumentExtractionMessage(fileName: string) {
  const lowerName = fileName.toLowerCase()

  if (lowerName.endsWith(".doc")) {
    return "Legacy .doc files are processed on a best-effort basis. For the best results, save the file as .docx or .pdf and re-upload."
  }

  const supported = [".pdf", ".docx", ".doc", ".rtf", ".txt", ".md", ".json", ".csv", ".xml", ".html", ".log", ".yaml", ".yml", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"]
  const ext = lowerName.slice(lowerName.lastIndexOf("."))

  if (supported.includes(ext)) {
    return "The file was read, but no text content could be extracted. It may be empty or contain only non-readable content."
  }

  return "This file format is not supported for text extraction. Supported formats: PDF, DOCX, DOC, RTF, TXT, CSV, XML, HTML, YAML, images (PNG, JPG, WEBP, GIF, BMP, TIFF), and code files."
}
