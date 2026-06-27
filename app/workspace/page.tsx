import Link from "next/link"
import { ArrowRight, BookOpenText, Database, FileText, MessageSquare, Server, ShieldCheck, Sparkles } from "lucide-react"
import { requireSessionUser } from "@/lib/auth"
import { getUserProfile, listUserArtifacts, listUserConversations, listUserDocuments, upsertUserProfile } from "@/lib/db"
import { getLocalKnowledgeBaseStatus } from "@/lib/rag/retrieval"
import { getSetupSummary } from "@/lib/env"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileSettingsCard } from "@/components/legal/profile-settings-card"
import { DocumentVaultCard } from "@/components/legal/document-vault-card"

function formatDate(value: string) {
  if (!value) {
    return "No activity yet"
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export default async function WorkspacePage() {
  const user = await requireSessionUser("/workspace")
  await upsertUserProfile(user)
  const knowledgeStatus = getLocalKnowledgeBaseStatus()

  const [profile, conversations, artifacts, documents] = await Promise.all([
    getUserProfile(user),
    listUserConversations(user.uid),
    listUserArtifacts(user.uid),
    listUserDocuments(user.uid),
  ])

  const setup = getSetupSummary()
  const firstName = (profile.name || user.name)?.split(" ")[0]

  return (
    <main className="page-section">
      <div className="container-shell space-y-10">
        {/* ── Hero: open layout, no box ── */}
        <section>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Workspace
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
                {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                Your persistent workspace for assistant sessions, source-backed answers, and saved document outputs.
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6 shadow-md shadow-emerald-900/10">
                <Link href="/tools/legal-assistant">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Assistant
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-6">
                <Link href="/tools/document-simplifier">
                  <FileText className="mr-2 h-4 w-4" />
                  Document chat
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-6">
                <Link href="/tools/document-generator">
                  <BookOpenText className="mr-2 h-4 w-4" />
                  Draft studio
                </Link>
              </Button>
            </div>
          </div>

          {/* Stat chips row */}
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/80 bg-white/60 px-4 py-2 text-sm backdrop-blur-sm">
              <Database className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">{knowledgeStatus.mode}</span>
              <span className="text-muted-foreground">· {knowledgeStatus.chunkCount} chunks</span>
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/80 bg-white/60 px-4 py-2 text-sm backdrop-blur-sm">
              <Server className="h-4 w-4 text-primary" />
              <span className="font-medium">Gemini</span>
              <span className={setup.hasGeminiConfig ? "text-emerald-600" : "text-red-500"}>
                {setup.hasGeminiConfig ? "✓" : "✗"}
              </span>
              <span className="text-muted-foreground/50">|</span>
              <span className="font-medium">Firebase</span>
              <span className={setup.hasFirebaseClientConfig ? "text-emerald-600" : "text-red-500"}>
                {setup.hasFirebaseClientConfig ? "✓" : "✗"}
              </span>
              <span className="text-muted-foreground/50">|</span>
              <span className="font-medium">MongoDB</span>
              <span className={setup.hasMongoConfig ? "text-emerald-600" : "text-red-500"}>
                {setup.hasMongoConfig ? "✓" : "✗"}
              </span>
            </div>
          </div>
        </section>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* ── Two-column content ── */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Recent conversations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Recent conversations</h2>
              <Link href="/tools/legal-assistant" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">Saved assistant threads linked to your account.</p>

            {conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-white/40 p-8 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No saved conversations yet.</p>
                <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
                  <Link href="/tools/legal-assistant">Start your first conversation</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/tools/legal-assistant?conversationId=${conversation.id}`}
                    className="block rounded-2xl border border-white/80 bg-white/60 p-4 backdrop-blur-sm transition hover:bg-white hover:border-emerald-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{conversation.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{conversation.preview}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                        {conversation.urgency}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Updated {formatDate(conversation.updatedAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Saved outputs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Saved outputs</h2>
            </div>
            <p className="text-sm text-muted-foreground">Generated drafts and simplified document results.</p>

            {artifacts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-white/40 p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">No saved outputs yet.</p>
                <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
                  <Link href="/tools/document-simplifier">Create your first document</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {artifacts.map((artifact) => {
                  const href =
                    artifact.kind === "draft"
                      ? `/tools/document-generator?artifactId=${artifact.id}`
                      : `/tools/document-simplifier?artifactId=${artifact.id}`
                  return (
                    <Link
                      key={artifact.id}
                      href={href}
                      className="block rounded-2xl border border-white/80 bg-white/60 p-4 backdrop-blur-sm transition hover:bg-white hover:border-emerald-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="truncate font-medium text-foreground">{artifact.title}</p>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-800">
                          {artifact.kind}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{artifact.preview}</p>
                      <p className="mt-3 text-xs text-muted-foreground">Saved {formatDate(artifact.updatedAt)}</p>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Disclaimer chip */}
            <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                Assistant answers are grounded in the platform corpus, but matter-specific legal action should still be validated by a licensed advocate.
              </p>
            </div>
          </div>
        </section>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* ── Profile & Vault ── */}
        <section className="grid gap-6 xl:grid-cols-[0.52fr_0.48fr]">
          <ProfileSettingsCard initialProfile={profile} />
          <DocumentVaultCard initialDocuments={documents} />
        </section>
      </div>
    </main>
  )
}
