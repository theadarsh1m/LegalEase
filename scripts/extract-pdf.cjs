// Standalone PDF text extraction script.
// Called via child_process to bypass Next.js webpack bundling.
// Input: PDF file path as argv[2]
// Output: extracted text to stdout

const fs = require("fs")
const path = require("path")
const pdfParse = require("pdf-parse")

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    process.stderr.write("No file path provided")
    process.exit(1)
  }

  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    process.stdout.write(data.text)
  } catch (err) {
    process.stderr.write(err.message || "PDF extraction failed")
    process.exit(1)
  }
}

main()
