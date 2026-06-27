"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Search, Sparkles, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { LegalCorpusDocument } from "@/lib/rag/chunking"

interface LegalLibraryBrowserProps {
  documents: LegalCorpusDocument[]
}

function buildAssistantPrompt(document: LegalCorpusDocument) {
  return `Explain the key rights, practical next steps, and evidence checklist for ${document.title}. Focus on Indian users and keep the answer grounded in source-backed guidance.`
}

export function LegalLibraryBrowser({ documents }: LegalLibraryBrowserProps) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  const categories = useMemo(() => ["All", ...new Set(documents.map((document) => document.category))], [documents])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return documents.filter((document) => {
      const categoryMatch = activeCategory === "All" || document.category === activeCategory
      const textMatch =
        normalizedQuery.length === 0 ||
        `${document.title} ${document.summary} ${document.sourceTitle} ${document.tags.join(" ")} ${document.body}`
          .toLowerCase()
          .includes(normalizedQuery)

      return categoryMatch && textMatch
    })
  }, [activeCategory, documents, query])

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header Panel */}
      <div className="rounded-3xl border border-white bg-white/40 p-6 shadow-sm backdrop-blur-md space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search legal topics, rights, laws, or issue types..."
              className="pl-10 h-11 rounded-2xl border-white bg-white/80 focus-visible:ring-emerald-500 shadow-none text-sm placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="inline-flex items-center rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            {filtered.length} Topic{filtered.length === 1 ? "" : "s"} · {categories.length - 1} Categories
          </div>
        </div>

        {/* Category Pills Row */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((category) => {
            const isActive = category === activeCategory
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide border transition-all ${
                  isActive
                    ? "bg-emerald-950 border-emerald-950 text-white shadow-sm"
                    : "bg-white/60 border-white hover:border-emerald-200 hover:bg-white text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid List of Legal Resources */}
      <div className="grid gap-6">
        {filtered.map((document) => (
          <article 
            key={document.id} 
            className="group rounded-3xl border border-white bg-white/30 p-6 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm hover:border-emerald-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800 bg-emerald-50/50 border border-emerald-100/50 px-2.5 py-1 rounded-full">
                  {document.category}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-neutral-900 group-hover:text-emerald-950 transition">
                  {document.title}
                </h3>
                <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  {document.summary}
                </p>
              </div>
              <Badge className="border-white bg-white/85 text-primary text-[10px] tracking-wider uppercase px-3 py-1 shadow-none" variant="outline">
                {document.jurisdiction}
              </Badge>
            </div>

            {/* Keyword tags row */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {document.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="rounded-full border border-amber-100 bg-amber-50/30 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Body Excerpt Box */}
            <div className="mt-5 rounded-2xl border border-white/60 bg-white/60 p-5 shadow-inner">
              <p className="text-xs leading-relaxed text-foreground/80 font-sans">
                {document.body.split("\n\n")[0]}
              </p>
            </div>

            {/* Actions Bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/20 pt-4">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span>{document.sourceTitle}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  asChild 
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-8 border-white bg-white/40 hover:bg-white/80"
                >
                  <Link href={`/tools/legal-assistant?prompt=${encodeURIComponent(buildAssistantPrompt(document))}`}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-700" />
                    Consult AI Assistant
                  </Link>
                </Button>
                <Button 
                  asChild
                  size="sm"
                  className="rounded-xl text-xs h-8"
                >
                  <Link href="/tools/legal-assistant">
                    Open Assistant
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </article>
        ))}

        {/* Empty Search State */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 p-10 text-center bg-white/20">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No matching legal resources found.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground max-w-sm mx-auto">
              Try typing a broader search term, changing categories, or open the AI assistant for customized guidance.
            </p>
            <Button asChild className="mt-4 rounded-xl text-xs h-9">
              <Link href="/tools/legal-assistant">Open AI Assistant</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
