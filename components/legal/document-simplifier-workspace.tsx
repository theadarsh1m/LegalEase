"use client"

import { useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  Download,
  FileText,
  Loader2,
  MessageSquareQuote,
  Mic,
  Send,
  Sparkles,
  UploadCloud,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { extractDocumentText, getDocumentExtractionMessage } from "@/lib/documents/client"
import { ChatMinimap } from "./chat-minimap"

interface AttachedDocument {
  id: string
  name: string
  type: string
  size: number
  text: string
  source: "upload" | "paste"
}

interface DocumentChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  kind: "intro" | "summary" | "chat"
}

const quickQuestions = [
  "Summarize the key obligations and deadlines in these documents.",
  "What facts, dates, and missing records should I verify before taking action?",
  "What should I preserve as evidence based on these documents?",
  "Does anything here suggest urgent legal or safety risk?",
]

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createIntroMessage(): DocumentChatMessage {
  return {
    id: createId("doc-msg"),
    role: "assistant",
    kind: "intro",
    content:
      "Attach legal documents or paste official text, then generate a plain-language brief or ask follow-up questions. I will stay grounded in the document text and explicitly say when something is unclear.",
  }
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

function renderFormattedContent(content: string) {
  const lines = content.split("\n")
  return lines.map((line, lineIdx) => {
    let isHeader = false
    let headerText = ""
    if (line.startsWith("### ")) {
      isHeader = true
      headerText = line.slice(4)
    } else if (line.startsWith("## ")) {
      isHeader = true
      headerText = line.slice(3)
    } else if (line.startsWith("# ")) {
      isHeader = true
      headerText = line.slice(2)
    }

    const parseBold = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g)
      return parts.map((part, partIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={partIdx} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
        }
        return part
      })
    }

    if (isHeader) {
      return (
        <h4 key={lineIdx} className="text-sm font-bold text-foreground mt-2 mb-1 block">
          {parseBold(headerText)}
        </h4>
      )
    }

    return (
      <span key={lineIdx} className="block min-h-[1.2em]">
        {parseBold(line)}
      </span>
    )
  })
}

export function DocumentSimplifierWorkspace() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("LegalEase document session")
  const [text, setText] = useState("")
  const [question, setQuestion] = useState("")
  const [artifactId, setArtifactId] = useState("")
  const [documents, setDocuments] = useState<AttachedDocument[]>([])
  const [messages, setMessages] = useState<DocumentChatMessage[]>([createIntroMessage()])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  function cancelExtraction() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsExtracting(false)
      toast({
        title: "Cancelled",
        description: "Text extraction was cancelled.",
      })
    }
  }

  const [isListening, setIsListening] = useState(false)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  function startSpeechToText() {
    if (typeof window === "undefined") return

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast({
        title: "Voice typing not supported",
        description: "Your browser does not support voice input. Try Google Chrome or Microsoft Edge.",
        variant: "destructive",
      })
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = "en-IN"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      if (event.error === "network") {
        console.warn("Speech Recognition Network Error:", event.error)
        toast({
          title: "Voice connection error",
          description: "Embedded browser previews lack speech API keys. Please open this app in an external Google Chrome or Microsoft Edge browser to use voice typing.",
          variant: "destructive",
        })
      } else if (event.error !== "no-speech") {
        console.warn("Speech Recognition Error:", event.error)
        toast({
          title: "Voice typing error",
          description: `Failed: ${event.error}. Please check your browser microphone permission settings.`,
          variant: "destructive",
        })
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript
      if (speechToText) {
        setQuestion((current) => (current ? `${current} ${speechToText}`.trim() : speechToText))
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.error("Speech start error:", err)
      setIsListening(false)
    }
  }

  function handleSpeak(msgId: string, content: string) {
    if (typeof window === "undefined") return

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingMsgId(null)
      return
    }

    window.speechSynthesis.cancel()

    // Strip markdown formatting characters to avoid speaking them
    const cleanText = content
      .replace(/[\*\_#`~]/g, "") // remove formatting characters
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // replace markdown links with their label
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = "en-IN"

    utterance.onend = () => {
      setSpeakingMsgId((current) => (current === msgId ? null : current))
    }
    utterance.onerror = () => {
      setSpeakingMsgId((current) => (current === msgId ? null : current))
    }

    setSpeakingMsgId(msgId)
    window.speechSynthesis.speak(utterance)
  }

  const workingDocuments = useMemo<AttachedDocument[]>(() => {
    if (documents.length > 0) {
      return documents
    }

    if (text.trim().length >= 20) {
      return [
        {
          id: "pasted-draft",
          name: title.trim() || "Pasted legal text",
          type: "text/plain",
          size: text.trim().length,
          text: text.trim(),
          source: "paste",
        },
      ]
    }

    return []
  }, [documents, text, title])

  const latestAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant" && message.kind !== "intro") ?? null
  }, [messages])

  const exportPayload = useMemo(() => {
    return {
      exportedAt: new Date().toISOString(),
      title,
      artifactId: artifactId || null,
      documents: workingDocuments,
      messages,
    }
  }, [artifactId, messages, title, workingDocuments])

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])

    if (files.length === 0) {
      return
    }

    setIsExtracting(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const extractedDocuments: AttachedDocument[] = []
      const failedFiles: string[] = []

      for (const file of files) {
        if (controller.signal.aborted) break
        try {
          const extractedText = (await extractDocumentText(file, controller.signal)).trim()

          if (!extractedText) {
            toast({
              title: `Limited extraction for ${file.name}`,
              description: getDocumentExtractionMessage(file.name),
            })
            continue
          }

          extractedDocuments.push({
            id: createId("doc"),
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            text: extractedText,
            source: "upload",
          })
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return
          }
          failedFiles.push(
            `${file.name}: ${error instanceof Error ? error.message : "The file could not be read on the server."}`,
          )
        }
      }

      if (extractedDocuments.length > 0) {
        setDocuments((current) => [...extractedDocuments, ...current].slice(0, 8))
        setMessages((current) => [
          ...current,
          {
            id: createId("doc-msg"),
            role: "assistant",
            kind: "chat",
            content: `Loaded ${extractedDocuments.length} document${extractedDocuments.length > 1 ? "s" : ""}. You can now generate a brief or ask follow-up questions.`,
          },
        ])
      }

      if (failedFiles.length > 0) {
        toast({
          title: failedFiles.length === 1 ? "Could not read this file" : "Could not read some files",
          description:
            failedFiles.length === 1
              ? failedFiles[0]
              : `${failedFiles[0]} (+${failedFiles.length - 1} more file${failedFiles.length > 2 ? "s" : ""})`,
          variant: "destructive",
        })
      }
    } finally {
      setIsExtracting(false)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function handleSummarize() {
    const combinedText = workingDocuments
      .map((document) => `Document: ${document.name}\n${document.text}`)
      .join("\n\n---\n\n")
      .slice(0, 60000)

    if (combinedText.trim().length < 20) {
      toast({
        title: "Add documents or paste text first",
        description: "Upload a PDF, DOCX, text file, or paste legal content before generating a brief.",
        variant: "destructive",
      })
      return
    }

    setIsSummarizing(true)

    try {
      const response = await fetch("/api/simplify-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          text: combinedText,
        }),
      })

      const data = (await response.json()) as { simplifiedText?: string; artifactId?: string; error?: string }

      if (!response.ok || !data.simplifiedText) {
        throw new Error(data.error ?? "Could not simplify this document.")
      }

      setArtifactId(data.artifactId ?? "")
      setMessages((current) => [
        ...current,
        {
          id: createId("doc-msg"),
          role: "assistant",
          kind: "summary",
          content: data.simplifiedText ?? "",
        },
      ])
    } catch (error) {
      toast({
        title: "Simplification failed",
        description: error instanceof Error ? error.message : "Try again with a shorter or cleaner document.",
        variant: "destructive",
      })
    } finally {
      setIsSummarizing(false)
    }
  }

  async function handleAsk(customQuestion?: string) {
    const prompt = (customQuestion ?? question).trim()

    if (workingDocuments.length === 0) {
      toast({
        title: "Add a document first",
        description: "Upload documents or paste legal text before starting the chat.",
        variant: "destructive",
      })
      return
    }

    if (!prompt) {
      toast({
        title: "Ask a question",
        description: "Write a follow-up question about the attached documents.",
        variant: "destructive",
      })
      return
    }

    const userMessage: DocumentChatMessage = {
      id: createId("doc-msg"),
      role: "user",
      kind: "chat",
      content: prompt,
    }

    setMessages((current) => [...current, userMessage])
    setQuestion("")
    setIsChatLoading(true)

    try {
      const response = await fetch("/api/document-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          question: prompt,
          documents: workingDocuments.map((document) => ({
            id: document.id,
            name: document.name,
            type: document.type,
            text: document.text,
          })),
          history: messages.filter((message) => message.kind !== "intro").map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const data = (await response.json()) as { answer?: string; error?: string }

      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "Could not analyze the documents.")
      }

      setMessages((current) => [
        ...current,
        {
          id: createId("doc-msg"),
          role: "assistant",
          kind: "chat",
          content: data.answer ?? "",
        },
      ])
    } catch (error) {
      toast({
        title: "Document chat failed",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsChatLoading(false)
    }
  }

  function removeDocument(documentId: string) {
    setDocuments((current) => current.filter((document) => document.id !== documentId))
  }

  return (
    <main className="page-section">
      <div className="container-shell space-y-8">
        {/* ── Page Header: open layout ── */}
        <section>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Document Brief & Analysis
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Document Simplifier
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                Upload legal documents, extract their text locally, generate a quick brief, and query their contents.
              </p>
            </div>
          </div>
        </section>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* ── Left Sidebar (Document Manager) ── */}
          <aside className="flex flex-col gap-6">
            {/* Document Sources Container */}
            <div className="flex flex-col gap-5 rounded-3xl border border-white/60 bg-white/40 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources & Settings</span>
                <Badge variant="secondary" className="text-[10px] px-2 h-4">
                  {workingDocuments.length} Active
                </Badge>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Session Title</label>
                <Input 
                  value={title} 
                  onChange={(event) => setTitle(event.target.value)} 
                  placeholder="Rent notice and follow-up chat" 
                  className="rounded-2xl border-white/80 bg-white/60 h-9 text-xs focus-visible:ring-emerald-500"
                />
              </div>

              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-full h-8 p-1">
                  <TabsTrigger value="upload" className="rounded-full text-[11px] h-6">Upload</TabsTrigger>
                  <TabsTrigger value="paste" className="rounded-full text-[11px] h-6">Paste Text</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.json,.csv,.docx,.doc,.rtf,.xml,.html,.htm,.yaml,.yml,.log,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.py,.js,.ts,.jsx,.tsx,.css,.sql,.java,.go,.rs,.c,.cpp"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleFiles(event.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isExtracting) {
                        cancelExtraction()
                      } else {
                        fileInputRef.current?.click()
                      }
                    }}
                    className={`flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center transition ${
                      isExtracting
                        ? "border-destructive bg-destructive/5 hover:bg-destructive/10"
                        : "border-border bg-white/60 hover:border-sky-300 hover:bg-white"
                    }`}
                  >
                    {isExtracting ? (
                      <>
                        <div className="relative flex items-center justify-center">
                          <Loader2 className="h-7 w-7 animate-spin text-destructive" />
                          <X className="absolute h-3 w-3 text-destructive" />
                        </div>
                        <span className="mt-3 text-xs font-semibold text-destructive">Extracting text...</span>
                        <span className="mt-1 text-[10px] text-destructive/70 underline">
                          Click to cancel
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-7 w-7 text-primary" />
                        <span className="mt-3 text-xs font-semibold text-foreground">Attach document files</span>
                        <span className="mt-1 text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
                          PDF, DOCX, DOC, RTF, plain text, or images (Local OCR)
                        </span>
                      </>
                    )}
                  </button>
                </TabsContent>

                <TabsContent value="paste" className="mt-4">
                  <Textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    className="min-h-[160px] rounded-2xl border-white/80 bg-white/60 text-xs placeholder:text-muted-foreground/70"
                    placeholder="Paste your legal notice, contract clause, or official text here..."
                  />
                </TabsContent>
              </Tabs>

              <div className="grid gap-2">
                <Button 
                  onClick={handleSummarize} 
                  disabled={isSummarizing || isExtracting || workingDocuments.length === 0}
                  className="rounded-2xl text-xs h-9"
                >
                  {isSummarizing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                  Generate Brief
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadJsonFile(`legalease-document-chat-${title || "session"}.json`, exportPayload)}
                  disabled={workingDocuments.length === 0}
                  className="rounded-2xl border-white/80 bg-white/60 hover:bg-white text-xs h-9"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export Session JSON
                </Button>
              </div>
            </div>

            {/* Attached Sources List */}
            {workingDocuments.length > 0 && (
              <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/40 p-4 backdrop-blur-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Attached Files</span>
                <ScrollArea className="h-[200px] pr-2">
                  <div className="flex flex-col gap-2">
                    {workingDocuments.map((doc) => (
                      <div key={doc.id} className="rounded-2xl border border-border bg-white p-3 text-xs flex flex-col gap-1.5 relative group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{doc.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                              {doc.source} · {Math.max(1, Math.round(doc.size / 1024))} KB
                            </p>
                          </div>
                          {doc.id !== "pasted-draft" && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 shrink-0" 
                              onClick={() => removeDocument(doc.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] leading-relaxed text-muted-foreground line-clamp-2 border-t border-border/40 pt-1.5">
                          {doc.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </aside>

          {/* ── Right Workspace (Chat & Input) ── */}
          <div className="flex flex-col gap-6">
            {/* Main Chat Panel */}
            <div className="flex flex-col rounded-3xl border border-white bg-white/30 backdrop-blur-md shadow-xl shadow-emerald-950/5 overflow-hidden">
              {/* Chat Panel Header */}
              <div className="flex items-center justify-between border-b border-border/40 bg-white/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Document Chat Room</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-2">
                        {workingDocuments.length} {workingDocuments.length === 1 ? "document" : "documents"} loaded
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      Answers are strictly grounded in your active document content
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Conversation Workspace */}
              <div className="p-6">
                <ScrollArea className="h-[480px] pr-4">
                  <div className="flex flex-col gap-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        id={message.role === "user" ? `chat-msg-${message.id}` : undefined}
                        className={`flex gap-3 max-w-[85%] ${
                          message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm ${
                          message.role === "user" 
                            ? "bg-sky-950 border-sky-900 text-white" 
                            : "bg-white border-border"
                        }`}>
                          {message.role === "user" ? (
                            <span className="text-[10px] font-bold">U</span>
                          ) : (
                            <Image src="/legalease.png" alt="LegalEase" width={16} height={16} className="rounded-sm object-contain" />
                          )}
                        </div>

                        {/* Content bubble */}
                        <div className="flex flex-col gap-1.5">
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            message.role === "user"
                              ? "bg-sky-950 text-white rounded-tr-none"
                              : "bg-white/80 border border-border/80 text-foreground/90 rounded-tl-none"
                          }`}>
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 space-y-1">{renderFormattedContent(message.content)}</div>
                              <button
                                onClick={() => handleSpeak(message.id, message.content)}
                                type="button"
                                className={`rounded-full p-1 transition shrink-0 ${
                                  message.role === "user"
                                    ? "text-sky-300 hover:text-sky-100 hover:bg-white/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                                }`}
                                title="Listen to this message"
                              >
                                {speakingMsgId === message.id ? (
                                  <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                                ) : (
                                  <Volume2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(isSummarizing || isChatLoading) && (
                      <div className="flex gap-3 mr-auto items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-border shadow-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                        <div className="rounded-2xl rounded-tl-none bg-white/60 border border-border/60 px-4 py-3 text-xs text-muted-foreground">
                          {isSummarizing ? "Generating plain-language legal brief..." : "Analyzing documents & extracting answers..."}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <ChatMinimap messages={messages} />
              </div>

              {/* Chat Composer */}
              <div className="border-t border-border/40 bg-white/50 p-4">
                <div className="relative rounded-2xl border border-white bg-white/90 p-3 shadow-sm focus-within:shadow-md transition">
                  <Textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask about contract dates, liabilities, obligations, clauses, or discrepancies..."
                    className="min-h-[96px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0 shadow-none focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        void handleAsk()
                      }
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-2.5 mt-2 px-1">
                    <div className="flex items-center gap-3">
                      <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">
                        Dictation: Win+H (Win) · Double Fn (Mac)
                      </span>
                      <span className="hidden text-[10px] text-muted-foreground/30 sm:inline">|</span>
                      <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">
                        Enter to send · Shift+Enter for new line
                      </span>
                    </div>

                    <Button
                      onClick={() => void handleAsk()}
                      disabled={isChatLoading || !question.trim() || workingDocuments.length === 0}
                      size="sm"
                      className="rounded-full h-8 px-4"
                    >
                      {isChatLoading ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Ask Document
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Starter Questions Row */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Quick Queries</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void handleAsk(item)}
                    className="rounded-2xl border border-white/60 bg-white/40 p-4 text-left text-xs leading-relaxed text-foreground/80 transition-all hover:bg-white hover:shadow-sm"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
