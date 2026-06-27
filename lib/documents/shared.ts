export function getDocumentExtractionMessage(fileName: string) {
  const lowerName = fileName.toLowerCase()

  if (lowerName.endsWith(".doc")) {
    return "Legacy .doc files are processed on a best-effort basis. For the best results, save the file as .docx or .pdf and re-upload."
  }

  const supported = [".pdf", ".docx", ".doc", ".rtf", ".txt", ".md", ".json", ".csv", ".xml", ".html", ".log", ".yaml", ".yml"]
  const ext = lowerName.slice(lowerName.lastIndexOf("."))

  if (supported.includes(ext)) {
    return "The file was read, but no text content could be extracted. It may be empty or contain only images."
  }

  return "This file format is not supported for text extraction. Supported formats: PDF, DOCX, DOC, RTF, TXT, MD, JSON, CSV, XML, HTML, YAML, and code files."
}
