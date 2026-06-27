import Link from "next/link"
import Image from "next/image"
import { AlertTriangle, BookOpenText, FileText, LayoutDashboard, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { getOptionalSessionUser } from "@/lib/auth"
import { SignOutButton } from "@/components/auth/sign-out-button"

const navLinks = [
  { href: "/tools/legal-assistant", label: "Assistant" },
  { href: "/tools/document-simplifier", label: "Document Chat" },
  { href: "/tools/document-generator", label: "Draft Studio" },
  { href: "/resources/legal-library", label: "Library" },
]

export async function SiteHeader() {
  const user = await getOptionalSessionUser()

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-[rgba(250,246,238,0.82)] backdrop-blur-xl">
      <div className="container-shell flex h-20 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/legalease.png" alt="LegalEase Logo" width={44} height={44} className="rounded-xl object-contain shadow-sm" priority />
          <div>
            <p className="font-display text-2xl font-semibold leading-none">LegalEase</p>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mt-1">Legal guidance platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
          <Link href="/emergency" className="nav-link text-red-700 hover:text-red-800 ml-2">
            <AlertTriangle className="mr-2 h-4 w-4 inline" />
            Emergency
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Button variant="outline" asChild className="rounded-full shadow-sm">
                <Link href="/workspace">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Workspace
                </Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">Log in</Link>
              <Button asChild className="rounded-full px-6 shadow-md shadow-emerald-900/10 transition-transform hover:scale-105">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] bg-[rgba(251,247,241,0.98)]">
            <SheetHeader>
              <SheetTitle className="font-display text-3xl">LegalEase</SheetTitle>
              <SheetDescription>Assistant, RAG search, document drafting, and emergency guidance.</SheetDescription>
            </SheetHeader>

            <div className="mt-8 space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Platform</p>
                <div className="flex flex-col gap-2">
                  <SheetClose asChild>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/tools/legal-assistant">
                        <BookOpenText className="mr-2 h-4 w-4" />
                        Legal assistant
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/tools/document-simplifier">
                        <FileText className="mr-2 h-4 w-4" />
                        Document chat
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href="/resources/legal-library">
                        <BookOpenText className="mr-2 h-4 w-4" />
                        Legal library
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="ghost" asChild className="justify-start text-red-700 hover:bg-red-50 hover:text-red-800">
                      <Link href="/emergency">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Emergency
                      </Link>
                    </Button>
                  </SheetClose>
                </div>
              </div>

              {user ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Account</p>
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button variant="outline" asChild className="justify-start">
                        <Link href="/workspace">Workspace</Link>
                      </Button>
                    </SheetClose>
                    <SignOutButton className="justify-start" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <SheetClose asChild>
                    <Button variant="outline" asChild>
                      <Link href="/login">Log in</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href="/signup">Create account</Link>
                    </Button>
                  </SheetClose>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
