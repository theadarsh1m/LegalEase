"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Copy, Download, FileText, Loader2, Scale, Sparkles, Volume2, VolumeX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { documentTemplates, type DocumentTemplateDefinition } from "@/lib/legal/templates"

interface DocumentGeneratorWorkspaceProps {
  initialTemplateId?: string
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function DocumentGeneratorWorkspace({ initialTemplateId }: DocumentGeneratorWorkspaceProps) {
  const { toast } = useToast()
  const [templateId, setTemplateId] = useState(initialTemplateId ?? documentTemplates[0]?.id ?? "")
  const [values, setValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [documentText, setDocumentText] = useState("")
  const [artifactId, setArtifactId] = useState("")
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const searchParams = useSearchParams()
  const artifactIdParam = searchParams ? searchParams.get("artifactId") : null

  useEffect(() => {
    if (!artifactIdParam) return

    async function loadArtifact() {
      try {
        const res = await fetch(`/api/documents/artifact?artifactId=${artifactIdParam}`)
        const data = await res.json()
        if (res.ok && data.artifact) {
          const { payload, id } = data.artifact
          setArtifactId(id)
          if (payload) {
            if (payload.templateId) setTemplateId(payload.templateId)
            if (payload.values) setValues(payload.values)
            if (payload.output) setDocumentText(payload.output)
          }
        }
      } catch (err) {
        console.error("Failed to load artifact:", err)
      }
    }

    void loadArtifact()
  }, [artifactIdParam])

  const activeTemplate = useMemo<DocumentTemplateDefinition | null>(() => {
    return documentTemplates.find((template) => template.id === templateId) ?? null
  }, [templateId])

  const exportPayload = useMemo(() => {
    return {
      exportedAt: new Date().toISOString(),
      templateId,
      templateName: activeTemplate?.name ?? null,
      values,
      artifactId: artifactId || null,
      output: documentText || null,
    }
  }, [activeTemplate?.name, artifactId, documentText, templateId, values])

  // Clear text and values when changing templates
  useEffect(() => {
    setValues({})
    setDocumentText("")
    setArtifactId("")
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [templateId])

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  function updateValue(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }))
  }

  async function handleGenerate() {
    if (!activeTemplate) {
      return
    }

    const missingFields = activeTemplate.fields.filter((field) => field.required && !values[field.id]?.trim())

    if (missingFields.length > 0) {
      toast({
        title: "Missing required details",
        description: `Complete these fields first: ${missingFields.map((field) => field.label).join(", ")}.`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)

    try {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
          values,
        }),
      })

      const data = (await response.json()) as { document?: string; artifactId?: string; error?: string }

      if (!response.ok || !data.document) {
        throw new Error(data.error ?? "Could not generate the document.")
      }

      setDocumentText(data.document)
      setArtifactId(data.artifactId ?? "")
    } catch (error) {
      toast({
        title: "Document generation failed",
        description: error instanceof Error ? error.message : "Try again with more factual detail.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(documentText)
    setCopied(true)
    toast({
      title: "Copied",
      description: "Draft copied to clipboard.",
    })
    window.setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([documentText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${activeTemplate?.name ?? "generated-document"}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleSpeak() {
    if (typeof window === "undefined") return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    
    // Strip markdown formatting characters to avoid speaking them
    const cleanText = documentText
      .replace(/[\*\_#`~]/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = "en-IN"

    utterance.onend = () => {
      setIsSpeaking(false)
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
    }

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <main className="flex-1 overflow-hidden bg-gradient-to-br from-amber-50/20 via-neutral-50/50 to-sky-50/30">
      <div className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-7xl gap-4 p-4 lg:p-6">
        
        {/* Left Sidebar Panel: Templates & Variable Forms */}
        <div className="flex w-full flex-col gap-4 lg:w-[360px] xl:w-[400px] shrink-0 overflow-hidden">
          <div className="flex flex-col gap-1.5 p-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/50 bg-emerald-50/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800 w-fit">
              <FileText className="h-3 w-3" />
              Draft Studio
            </div>
            <h1 className="font-display text-2xl font-semibold leading-tight text-neutral-900 mt-2">
              Generate Legal Drafts
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Factual, structured Indian legal drafts without invented claims.
            </p>
          </div>

          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4 pb-4">
              
              {/* Template Picker Accordion */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block px-1">
                  1. Choose Template
                </span>
                <div className="grid gap-2">
                  {documentTemplates.map((template) => {
                    const isActive = template.id === templateId
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setTemplateId(template.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          isActive
                            ? "border-emerald-300 bg-emerald-50/50 shadow-sm"
                            : "border-white bg-white/70 hover:border-emerald-200 hover:bg-white"
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">{template.name}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {template.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Guardrails Box */}
              {activeTemplate && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                    Drafting Guardrails
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-900/80">
                    {activeTemplate.draftingNotes}
                  </p>
                </div>
              )}

              {/* Form Variables Input */}
              {activeTemplate && (
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block px-1">
                    2. Provide Details
                  </span>
                  <div className="rounded-2xl border border-white bg-white/50 p-4 space-y-4">
                    {activeTemplate.fields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label htmlFor={field.id} className="text-[11px] font-medium text-foreground/80">
                          {field.label}
                          {field.required ? " *" : ""}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={field.id}
                            value={values[field.id] ?? ""}
                            onChange={(event) => updateValue(field.id, event.target.value)}
                            placeholder={field.placeholder}
                            className="min-h-[90px] rounded-xl border-white bg-white/60 text-xs placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-emerald-500"
                          />
                        ) : (
                          <Input
                            id={field.id}
                            type={field.type}
                            value={values[field.id] ?? ""}
                            onChange={(event) => updateValue(field.id, event.target.value)}
                            placeholder={field.placeholder}
                            className="h-9 rounded-xl border-white bg-white/60 text-xs placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-emerald-500"
                          />
                        )}
                      </div>
                    ))}

                    <div className="grid gap-2 pt-2">
                      <Button onClick={handleGenerate} disabled={isLoading} className="rounded-xl h-9 text-xs">
                        {isLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                        Generate legal draft
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadJsonFile(`legalease-draft-${activeTemplate.id}.json`, exportPayload)}
                        className="rounded-xl h-9 text-xs border-white bg-white/40 hover:bg-white/80"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export JSON
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>
        </div>

        {/* Right Workspace Panel: Dynamic Document Editor */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white bg-white/30 shadow-xl backdrop-blur-md">
          {/* Header toolbar */}
          <div className="flex items-center justify-between border-b border-border/40 bg-white/60 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl border bg-white shadow-sm">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">
                  {activeTemplate ? activeTemplate.name : "Select Template"}
                </span>
                <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                  {artifactId ? `Document Vault ID: ${artifactId}` : "Interactive Draft Editor"}
                </span>
              </div>
            </div>

            {/* Document Controls */}
            {documentText && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSpeak}
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 border-white/80 bg-white/60 hover:bg-white text-xs px-3"
                  title="Listen to draft"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="mr-1.5 h-3.5 w-3.5 animate-pulse text-destructive" />
                      Stop Reading
                    </>
                  ) : (
                    <>
                      <Volume2 className="mr-1.5 h-3.5 w-3.5" />
                      Listen
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 border-white/80 bg-white/60 hover:bg-white text-xs px-3"
                >
                  {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy text"}
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 border-white/80 bg-white/60 hover:bg-white text-xs px-3"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download TXT
                </Button>
              </div>
            )}
          </div>

          {/* Paper View Container */}
          <ScrollArea className="flex-1 bg-neutral-100/50 p-6">
            <div className="mx-auto my-4 max-w-[680px]">
              {documentText ? (
                <div 
                  className="bg-white rounded-xl shadow-md border border-neutral-200/50 p-10 min-h-[800px] flex flex-col transition-all duration-200"
                  style={{
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)"
                  }}
                >
                  <div className="mb-4 border-b border-border/20 pb-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 flex justify-between">
                    <span>Generated Legal Draft</span>
                    <span>Feel free to edit directly below</span>
                  </div>
                  <Textarea
                    value={documentText}
                    onChange={(event) => setDocumentText(event.target.value)}
                    className="flex-1 w-full min-h-[700px] p-0 border-0 outline-none focus-visible:ring-0 shadow-none resize-none text-sm leading-relaxed text-foreground font-sans font-normal"
                    placeholder="Enter details in the left panel and click generate..."
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-white/40 border border-dashed border-neutral-300 rounded-3xl">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-semibold text-foreground">No draft generated yet</p>
                  <p className="mt-1 max-w-[320px] text-xs leading-relaxed text-muted-foreground">
                    Complete the required form parameters on the left sidebar to generate your legal document draft here.
                  </p>
                  
                  {activeTemplate && (
                    <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl text-xs bg-white border-white">
                      <Link
                        href={`/tools/legal-assistant?issue=general&urgency=normal&prompt=${encodeURIComponent(
                          `Help me prepare the facts and evidence checklist for a ${activeTemplate.name} before I generate it.`,
                        )}`}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Ask AI Assistant for help
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

      </div>
    </main>
  )
}
