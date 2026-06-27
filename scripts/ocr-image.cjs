// Standalone OCR script using Tesseract.js.
// Called via child_process to bypass Next.js webpack bundling.
// Input: image file path as argv[2]
// Output: extracted text to stdout

const Tesseract = require("tesseract.js")
const path = require("path")

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    process.stderr.write("No file path provided")
    process.exit(1)
  }

  try {
    const { data } = await Tesseract.recognize(filePath, "eng", {
      logger: () => {}, // suppress progress logs
    })
    process.stdout.write(data.text || "")
  } catch (err) {
    process.stderr.write(err.message || "OCR failed")
    process.exit(1)
  }
}

main()
