"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo, useState, useRef } from "react"
import {
  BookOpenText,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  MessageSquareQuote,
  Mic,
  Plus,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { ConversationMessage, ConversationSummary } from "@/lib/db"
import { ChatMinimap } from "./chat-minimap"

interface AssistantSource {
  id: string
  title: string
  sourceTitle: string
  category?: string
  excerpt: string
  score?: number
}

interface AssistantMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt?: string
  sources?: AssistantSource[]
}

interface AssistantWorkspaceProps {
  initialConversations: ConversationSummary[]
  initialPrompt?: string
  initialIssueType?: string
  initialUrgency?: string
}

const suggestions = [
  "My landlord is threatening to evict me without written notice. What should I gather first?",
  "I need a step-by-step plan for unpaid salary and wage recovery.",
  "Help me understand whether this workplace harassment situation should go to HR or the Internal Committee.",
  "What should I do first if someone is blackmailing me online with private photos or chats?",
]

const issueTypes = [
  { value: "general", label: "General legal guidance" },
  { value: "housing", label: "Housing / tenancy" },
  { value: "employment", label: "Employment / wages" },
  { value: "police", label: "Police / detention" },
  { value: "cyber", label: "Cybercrime / privacy" },
  { value: "family", label: "Family / domestic violence" },
]

const urgencyLevels = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
]

function messageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildIntroMessage(initialPrompt?: string): AssistantMessage {
  return {
    id: messageId(),
    role: "assistant",
    content: initialPrompt
      ? "A legal issue from another page has been loaded into the composer. Review it, add missing facts, and send when ready."
      : "Describe the facts, timeline, people involved, documents you have, and the outcome you want. I’ll answer with retrieved legal context and practical next steps.",
  }
}

function deriveConversationTitle(input: string) {
  const title = input.replace(/\s+/g, " ").trim().slice(0, 72)
  return title.length > 52 ? `${title.slice(0, 52)}...` : title
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

function mapConversationMessages(messages: ConversationMessage[]): AssistantMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    sources: message.sources?.map((source) => ({
      id: source.id,
      title: source.title,
      sourceTitle: source.sourceTitle,
      category: source.sourceTitle,
      excerpt: source.excerpt,
    })),
  }))
}

function formatDate(value: string) {
  if (!value) {
    return "No recent update"
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
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

export function AssistantWorkspace({
  initialConversations,
  initialPrompt,
  initialIssueType = "general",
  initialUrgency = "normal",
}: AssistantWorkspaceProps) {
  const { toast } = useToast()
  const [query, setQuery] = useState(initialPrompt ?? "")
  const [issueType, setIssueType] = useState(initialIssueType)
  const [urgency, setUrgency] = useState(initialUrgency)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [threadList, setThreadList] = useState(initialConversations)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([buildIntroMessage(initialPrompt)])
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
        setQuery((current) => (current ? `${current} ${speechToText}`.trim() : speechToText))
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

  const latestAssistantSources = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant" && message.sources?.length)?.sources ?? []
  }, [messages])

  const conversationExport = useMemo(() => {
    return {
      exportedAt: new Date().toISOString(),
      conversationId: conversationId ?? null,
      issueType,
      urgency,
      messages,
      sources: latestAssistantSources,
    }
  }, [conversationId, issueType, latestAssistantSources, messages, urgency])

  function startNewConversation() {
    setConversationId(undefined)
    setMessages([buildIntroMessage()])
    setQuery("")
  }

  async function loadConversation(targetConversationId: string) {
    setIsLoadingConversation(true)

    try {
      const response = await fetch(`/api/chat?conversationId=${encodeURIComponent(targetConversationId)}`)
      const data = (await response.json()) as { messages?: ConversationMessage[]; error?: string }

      if (!response.ok || !data.messages) {
        throw new Error(data.error ?? "Could not load this conversation.")
      }

      setConversationId(targetConversationId)
      setMessages(data.messages.length > 0 ? mapConversationMessages(data.messages) : [buildIntroMessage()])
    } catch (error) {
      toast({
        title: "Could not open the thread",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingConversation(false)
    }
  }

  async function sendMessage(messageText: string) {
    if (!messageText.trim()) {
      return
    }

    const trimmed = messageText.trim()
    const userMessage: AssistantMessage = {
      id: messageId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    }

    setMessages((current) => [...current, userMessage])
    setQuery("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmed,
          conversationId,
          issueType,
          urgency,
        }),
      })

      const data = (await response.json()) as {
        response?: string
        error?: string
        conversationId?: string
        sources?: AssistantSource[]
      }

      if (!response.ok || !data.response) {
        throw new Error(data.error ?? "Could not get a legal response.")
      }

      const nextConversationId = data.conversationId ?? conversationId
      const timestamp = new Date().toISOString()

      setConversationId(nextConversationId)
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: data.response ?? "",
          createdAt: timestamp,
          sources: data.sources ?? [],
        },
      ])

      if (nextConversationId) {
        setThreadList((current) => {
          const nextSummary: ConversationSummary = {
            id: nextConversationId,
            title: deriveConversationTitle(trimmed),
            issueType,
            urgency,
            preview: trimmed,
            createdAt: timestamp,
            updatedAt: timestamp,
          }

          const remaining = current.filter((thread) => thread.id !== nextConversationId)
          return [nextSummary, ...remaining].slice(0, 8)
        })
      }
    } catch (error) {
      toast({
        title: "Assistant request failed",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      })
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content:
            "I could not complete that request. Check your Gemini and Firebase setup if this is a fresh environment, then retry.",
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="page-section">
      <div className="container-shell space-y-8">
        {/* ── Page Header: open layout ── */}
        <section>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Scale className="h-3.5 w-3.5" />
                RAG-grounded AI legal guidance
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                AI Legal Assistant
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                Conversational legal workspace loaded with RAG memory, interactive drafting connections, and secure threat tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* ── Left Sidebar (History & Settings) ── */}
          <aside className="flex flex-col gap-6">
            {/* New Thread / Thread List Container */}
            <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/40 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Threads</span>
                <Button 
                  onClick={startNewConversation}
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-white/80"
                  title="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[280px] pr-2">
                <div className="flex flex-col gap-2">
                  {threadList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No saved threads yet
                    </div>
                  ) : (
                    threadList.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => void loadConversation(conversation.id)}
                        className={`group relative flex flex-col gap-1 rounded-2xl p-3 text-left transition-all ${
                          conversation.id === conversationId
                            ? "bg-white shadow-sm border border-border"
                            : "hover:bg-white/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-1 text-xs font-semibold text-foreground">
                            {conversation.title}
                          </span>
                          {conversation.urgency === "emergency" && (
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 mt-1" />
                          )}
                        </div>
                        <span className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {conversation.preview}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDate(conversation.updatedAt)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Quick Connected Tools Card */}
            <div className="rounded-3xl border border-white/60 bg-white/40 p-5 backdrop-blur-sm space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Connected Tools</span>
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full justify-start rounded-2xl h-10 border-white/80 bg-white/60 hover:bg-white">
                  <Link href="/tools/document-generator">
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-xs">Draft Studio</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start rounded-2xl h-10 border-white/80 bg-white/60 hover:bg-white">
                  <Link href="/tools/document-simplifier">
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-xs">Simplifier</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start rounded-2xl h-10 border-white/80 bg-white/60 hover:bg-white">
                  <Link href="/resources/legal-library">
                    <BookOpenText className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-xs">Legal Library</span>
                  </Link>
                </Button>
              </div>
            </div>
          </aside>

          {/* ── Right Workspace (Chat & Input) ── */}
          <div className="flex flex-col gap-6">
            {/* Main Chat Panel */}
            <div className="flex flex-col rounded-3xl border border-white bg-white/30 backdrop-blur-md shadow-xl shadow-emerald-950/5 overflow-hidden">
              {/* Chat Panel Header */}
              <div className="flex items-center justify-between border-b border-border/40 bg-white/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {conversationId ? "Active Legal Thread" : "New Matter Draft"}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-2">
                        {conversationId ? "Saved" : "Unsaved"}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      RAG-grounded guidance based on Indian law references
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => downloadJsonFile(`legalease-assistant-${conversationId ?? "draft"}.json`, conversationExport)}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/80 bg-white/60 hover:bg-white text-xs h-8"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
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
                            ? "bg-emerald-950 border-emerald-900 text-white" 
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
                              ? "bg-emerald-950 text-white rounded-tr-none"
                              : "bg-white/80 border border-border/80 text-foreground/90 rounded-tl-none"
                          }`}>
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 space-y-1">{renderFormattedContent(message.content)}</div>
                              <button
                                onClick={() => handleSpeak(message.id, message.content)}
                                type="button"
                                className={`rounded-full p-1 transition shrink-0 ${
                                  message.role === "user"
                                    ? "text-emerald-300 hover:text-emerald-100 hover:bg-white/10"
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

                            {/* Source cards in assistant response */}
                            {message.role === "assistant" && message.sources?.length ? (
                              <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                                  Retrieved Legal Sources
                                </span>
                                <div className="flex flex-col gap-2">
                                  {message.sources.map((source) => (
                                    <div key={source.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="font-semibold text-amber-950 line-clamp-1">{source.title}</span>
                                        {typeof source.score === "number" && (
                                          <Badge className="border-amber-300 bg-amber-100 text-amber-950 text-[9px] hover:bg-amber-100 h-4 px-1.5" variant="outline">
                                            {Math.round(source.score * 100)}% match
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-[9px] font-medium uppercase tracking-wider text-amber-800 block mb-1.5">
                                        {source.sourceTitle}
                                      </span>
                                      <p className="text-amber-950/80 leading-relaxed font-sans">{source.excerpt}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-3 mr-auto items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-border shadow-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                        <div className="rounded-2xl rounded-tl-none bg-white/60 border border-border/60 px-4 py-3 text-xs text-muted-foreground">
                          Thinking & searching legal database...
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
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Describe your legal matter, ask about a policy, or frame a next step..."
                    className="min-h-[96px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-0 shadow-none focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        void sendMessage(query)
                      }
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-2.5 mt-2 px-1">
                    <div className="flex items-center gap-2">
                      {/* Integrated Selects */}
                      <div className="flex items-center gap-1.5 bg-secondary/50 rounded-full px-2 py-1">
                        <span className="text-[10px] text-muted-foreground/80 font-medium pl-1.5">Issue:</span>
                        <Select value={issueType} onValueChange={setIssueType}>
                          <SelectTrigger className="h-6 border-0 bg-transparent px-2 text-xs font-semibold hover:bg-white/60 rounded-full shadow-none w-auto gap-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {issueTypes.map((item) => (
                              <SelectItem key={item.value} value={item.value} className="text-xs">
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-1.5 bg-secondary/50 rounded-full px-2 py-1">
                        <span className="text-[10px] text-muted-foreground/80 font-medium pl-1.5">Urgency:</span>
                        <Select value={urgency} onValueChange={setUrgency}>
                          <SelectTrigger className={`h-6 border-0 bg-transparent px-2 text-xs font-semibold hover:bg-white/60 rounded-full shadow-none w-auto gap-1 ${
                            urgency === "emergency" ? "text-red-600 font-bold" : ""
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {urgencyLevels.map((item) => (
                              <SelectItem key={item.value} value={item.value} className="text-xs">
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">
                        Dictation: Win+H (Win) · Double Fn (Mac)
                      </span>
                      <span className="hidden text-[10px] text-muted-foreground/30 sm:inline">|</span>
                      <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">
                        Shift+Enter for new line
                      </span>
                      <Button
                        onClick={() => void sendMessage(query)}
                        disabled={isLoading || !query.trim()}
                        size="sm"
                        className="rounded-full h-8 px-4"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Starter Prompts Row */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Starter Prompts</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuery(suggestion)}
                    className="rounded-2xl border border-white/60 bg-white/40 p-4 text-left text-xs leading-relaxed text-foreground/80 transition-all hover:bg-white hover:shadow-sm"
                  >
                    {suggestion}
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
