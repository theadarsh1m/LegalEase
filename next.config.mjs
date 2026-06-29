/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["pdfjs-dist", "mammoth", "pdf-parse", "tesseract.js"],
}

export default nextConfig
