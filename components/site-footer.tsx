import Link from "next/link"
import Image from "next/image"

const footerGroups = [
  {
    title: "Platform",
    links: [
      { href: "/tools/legal-assistant", label: "Legal assistant" },
      { href: "/tools/document-simplifier", label: "Document chat" },
      { href: "/tools/document-generator", label: "Draft studio" },
      { href: "/workspace", label: "Workspace" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources/legal-library", label: "Legal library" },
      { href: "/resources/rights-guide", label: "Rights guide" },
      { href: "/resources/templates", label: "Templates" },
      { href: "/resources/directory", label: "Aid directory" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-white/70 bg-[rgba(241,233,219,0.75)]">
      <div className="container-shell py-12">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-md">
            <Link href="/" className="flex items-center gap-3 mb-4 inline-flex">
              <Image src="/legalease.png" alt="LegalEase Logo" width={40} height={40} className="rounded-lg object-contain shadow-sm" />
              <p className="font-display text-3xl font-semibold">LegalEase</p>
            </Link>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              AI-assisted legal guidance for Indian users, grounded in a searchable knowledge base, backed by Firebase
              auth and conversation history, and designed to make first-step legal workflows usable.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{group.title}</p>
              <div className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm text-foreground/80 transition hover:text-foreground">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/80 pt-6 text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
          <p>
            LegalEase provides general legal information and drafting assistance. It does not replace a licensed
            advocate reviewing the exact facts of a matter.
          </p>
          <p className="font-medium flex-shrink-0">
            Made with love by The Adarsh
          </p>
        </div>
      </div>
    </footer>
  )
}
