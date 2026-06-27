"use client"

import { useRef, useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, FileText, Loader2, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import type { StoredDocumentRecord } from "@/lib/db"

interface DocumentVaultCardProps {
  initialDocuments: StoredDocumentRecord[]
}

const documentCategories = [
  { value: "identity", label: "Identity / proof" },
  { value: "notice", label: "Notice / order" },
  { value: "employment", label: "Employment" },
  { value: "housing", label: "Housing / tenancy" },
  { value: "police", label: "Police / FIR" },
  { value: "court", label: "Court / case" },
  { value: "medical", label: "Medical / injury" },
  { value: "evidence", label: "Evidence / supporting record" },
  { value: "contract", label: "Contract / agreement" },
  { value: "general", label: "General" },
]

function formatDate(value: string) {
  if (!value) {
    return "Just now"
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function DocumentVaultCard({ initialDocuments }: DocumentVaultCardProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<StoredDocumentRecord[]>(initialDocuments)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("general")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  function cancelUpload() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsUploading(false)
      toast({
        title: "Cancelled",
        description: "The upload session was cancelled.",
      })
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast({
        title: "Choose a file first",
        description: "Upload a PDF, DOC, DOCX, or text document to store it in the vault.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const formData = new FormData()
      formData.set("file", selectedFile)
      formData.set("title", title.trim() || selectedFile.name)
      formData.set("category", category)

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      const data = (await response.json()) as {
        document?: StoredDocumentRecord
        warning?: string | null
        error?: string
      }

      if (!response.ok || !data.document) {
        throw new Error(data.error ?? "Could not upload this document.")
      }

      setDocuments((current) => [data.document!, ...current].slice(0, 8))
      setSelectedFile(null)
      setTitle("")
      setCategory("general")

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      toast({
        title: "Document stored",
        description: data.warning ?? "The file was saved to the vault and linked to your workspace.",
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return
      }
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Try again with a smaller or cleaner file.",
        variant: "destructive",
      })
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setIsUploading(false)
    }
  }

  return (
    <Card className="glass-panel border-white/70">
      <CardHeader>
        <CardTitle className="text-2xl">Document vault</CardTitle>
        <CardDescription>Store important files in Cloudinary and keep their AI-ready summaries attached to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 md:grid-cols-[1fr_220px_auto]">
          <div className="space-y-2">
            <Label htmlFor="document-title">Document title</Label>
            <Input
              id="document-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Rent notice from landlord"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            {isUploading ? (
              <Button onClick={cancelUpload} variant="destructive" className="w-full">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            ) : (
              <Button onClick={handleUpload} disabled={!selectedFile} className="w-full">
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.json,.csv,.docx,.doc,.rtf,.xml,.html,.htm,.yaml,.yml,.log,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            setSelectedFile(file)

            if (file && !title.trim()) {
              setTitle(file.name.replace(/\.[^.]+$/, ""))
            }
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-white/80 px-6 text-center"
        >
          <UploadCloud className="h-10 w-10 text-primary" />
          <p className="mt-4 text-base font-medium text-foreground">
            {selectedFile ? selectedFile.name : "Choose a document to store and analyze"}
          </p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            PDF, text, and DOCX files can be analyzed immediately. Legacy DOC files are stored securely, with limited automatic extraction in this build.
          </p>
        </button>

        <div className="space-y-4">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No stored documents yet. Upload notices, contracts, complaints, orders, or evidence files here.
            </p>
          ) : (
            documents.map((document) => {
              const isExpanded = expandedDocId === document.id
              return (
                <div key={document.id} className="rounded-3xl border border-white/80 bg-white/85 p-5 transition-all duration-300">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <p className="font-medium text-foreground truncate">{document.title}</p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {isExpanded 
                          ? (document.preview || "Stored in the vault.")
                          : (document.preview ? `${document.preview.slice(0, 150)}...` : "Stored in the vault.")
                        }
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-900 shrink-0">
                      {document.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span>{document.category}</span>
                    <span>{formatDate(document.updatedAt)}</span>
                    <span>{Math.max(1, Math.round(document.fileSize / 1024))} KB</span>
                  </div>

                  {/* Expanded Summary and Analysis Box */}
                  {isExpanded && document.analysis && (
                    <div className="mt-4 rounded-2xl border border-white/60 bg-white/50 p-4 shadow-inner text-xs leading-relaxed space-y-2">
                      <p className="font-bold text-emerald-900 uppercase tracking-widest text-[9px]">Full Document Analysis</p>
                      <p className="text-foreground/80 whitespace-pre-wrap font-sans">{document.analysis}</p>
                    </div>
                  )}

                  {isExpanded && !document.analysis && document.extractedText && (
                    <div className="mt-4 rounded-2xl border border-white/60 bg-white/50 p-4 shadow-inner text-xs leading-relaxed space-y-2">
                      <p className="font-bold text-neutral-600 uppercase tracking-widest text-[9px]">Extracted Text Preview</p>
                      <p className="text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-[10px] bg-white/30 p-3 rounded-xl leading-relaxed">{document.extractedText}</p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/10 pt-3">
                    {document.secureUrl && (
                      <Button variant="ghost" asChild className="h-8 px-3 rounded-full text-xs">
                        <a href={document.secureUrl} target="_blank" rel="noreferrer">
                          Open stored file
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      type="button"
                      onClick={() => setExpandedDocId(isExpanded ? null : document.id)}
                      className="h-8 px-3 rounded-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                          Collapse summary
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                          View full summary
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
