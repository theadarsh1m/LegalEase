"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Sparkles, Phone, Compass } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { LegalAidResource } from "@/lib/legal/library"

interface DirectoryBrowserProps {
  resources: LegalAidResource[]
}

function buildResourcePrompt(resource: LegalAidResource) {
  return `I may need help from ${resource.name}. Explain when to use this resource, what information I should keep ready, and what legal steps I should take in parallel.`
}

export function DirectoryBrowser({ resources }: DirectoryBrowserProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")

  const categories = useMemo(() => ["All", ...new Set(resources.map((resource) => resource.category))], [resources])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return resources.filter((resource) => {
      const categoryMatch = category === "All" || resource.category === category
      const queryMatch =
        normalizedQuery.length === 0 ||
        `${resource.name} ${resource.category} ${resource.coverage} ${resource.notes} ${resource.contactValue}`
          .toLowerCase()
          .includes(normalizedQuery)

      return categoryMatch && queryMatch
    })
  }, [category, query, resources])

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Header Panel */}
      <div className="rounded-3xl border border-white bg-white/40 p-6 shadow-sm backdrop-blur-md space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by issue type, helpline, or service name..."
            className="h-11 rounded-2xl border-white bg-white/80 focus-visible:ring-emerald-500 shadow-none text-sm placeholder:text-muted-foreground/60"
          />
          <div className="inline-flex items-center rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            {filtered.length} Resource{filtered.length === 1 ? "" : "s"} Found
          </div>
        </div>

        {/* Category Pills Row */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((item) => {
            const isActive = item === category
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide border transition-all ${
                  isActive
                    ? "bg-emerald-950 border-emerald-950 text-white shadow-sm"
                    : "bg-white/60 border-white hover:border-emerald-200 hover:bg-white text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid of Helpline / Aid resources */}
      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((resource) => (
          <article 
            key={resource.id} 
            className="group flex flex-col justify-between rounded-3xl border border-white bg-white/30 p-6 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm hover:border-emerald-200"
          >
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800 bg-emerald-50/50 border border-emerald-100/50 px-2.5 py-1 rounded-full">
                {resource.category}
              </span>
              <h3 className="mt-4 text-xl font-semibold text-neutral-900 group-hover:text-emerald-950 transition">
                {resource.name}
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {resource.notes}
              </p>

              {/* Contact Details Information Box */}
              <div className="mt-5 rounded-2xl border border-white/60 bg-white/60 p-4 shadow-inner space-y-2">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 block">
                    Contact Channel
                  </span>
                  <span className="text-xs font-semibold text-foreground mt-0.5 block">
                    {resource.contactLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60 block">
                    Helpline / Link
                  </span>
                  <span className="text-xs font-bold text-emerald-900 mt-0.5 block break-all font-mono">
                    {resource.contactValue}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                    Jurisdiction
                  </span>
                  <span className="text-[10px] font-semibold bg-white/70 px-2.5 py-0.5 rounded-full border border-white/80">
                    {resource.coverage}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="mt-6 pt-4 border-t border-border/20 space-y-2">
              <div className="flex gap-2">
                {resource.website ? (
                  <Button 
                    className="flex-1 rounded-xl text-xs h-8"
                    asChild
                  >
                    <Link href={resource.website} target="_blank" rel="noreferrer">
                      Visit Official Portal
                    </Link>
                  </Button>
                ) : null}
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl text-xs h-8 border-white bg-white/40 hover:bg-white/85" 
                  asChild
                >
                  <Link href={`/tools/legal-assistant?prompt=${encodeURIComponent(buildResourcePrompt(resource))}`}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-700" />
                    Consult AI
                  </Link>
                </Button>
              </div>
              <Button 
                variant="ghost" 
                className="w-full rounded-xl text-[11px] h-7 hover:bg-black/5 text-muted-foreground hover:text-foreground justify-center"
                asChild
              >
                <Link href="/tools/legal-assistant">
                  Open AI Assistant
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </article>
        ))}

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 p-10 text-center bg-white/20">
            <Compass className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No matching resources found.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground max-w-sm mx-auto">
              Try search keywords like IPC, helpline, women aid, tenant, or consult the AI assistant.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
