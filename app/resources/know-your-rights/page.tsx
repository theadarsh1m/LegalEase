import Link from "next/link"
import { ArrowRight, FileText, ShieldCheck, Sparkles } from "lucide-react"
import SearchSection from "@/components/know-your-rights/search-section"
import RightsList from "@/components/know-your-rights/rights-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getFeaturedRights, getRightCategories } from "@/lib/rights"

export default function KnowYourRightsPage() {
  const featuredRights = getFeaturedRights()
  const categories = getRightCategories()

  return (
    <main className="page-section">
      <div className="container-shell space-y-8">
        {/* ── Page Header: open layout ── */}
        <section>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Know your rights
              </div>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Read the law, open the source files, and ask questions beside them.
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                Browse rights by category, open the actual PDF-backed files, and launch an AI explanation flow
                for any right you do not fully understand.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6 shadow-md shadow-emerald-900/10">
                <Link href="/tools/legal-assistant?prompt=Help me understand my rights in a legal situation and what evidence I should preserve first.">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Ask rights assistant
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-6">
                <Link href="/resources/legal-library">Open legal library</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Subtle divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <SearchSection />

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Card key={category} className="glass-panel border-white/70">
              <CardHeader>
                <CardTitle className="text-3xl">{category}</CardTitle>
                <CardDescription>Browse rights and source files in this category.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/resources/know-your-rights/rights/${encodeURIComponent(category)}`}>
                    Open category
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Featured Rights</p>
              <h2 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-5xl">Start with the most-used protections.</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/resources/know-your-rights/rights">
                <FileText className="mr-2 h-4 w-4" />
                View all rights
              </Link>
            </Button>
          </div>

          <RightsList rights={featuredRights} />
        </section>
      </div>
    </main>
  )
}
