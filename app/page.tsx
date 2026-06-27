import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Book, Clock, FileText as FileTextIcon, MessageSquare, Shield, Sparkles } from "lucide-react"
import { getOptionalSessionUser } from "@/lib/auth"
import { getSetupSummary } from "@/lib/env"
import { legalAidResources, legalDocuments } from "@/lib/legal/library"
import { documentTemplates } from "@/lib/legal/templates"
import { getLocalKnowledgeBaseStatus } from "@/lib/rag/retrieval"
import styles from "./page.module.css"

export default async function HomePage() {
  const [user] = await Promise.all([getOptionalSessionUser()])
  const knowledgeStatus = getLocalKnowledgeBaseStatus()
  const setup = getSetupSummary()

  const featureCards = [
    {
      title: "AI Lawyer",
      description: "A clean assistant UI with retrieval-backed legal guidance, saved threads, and JSON export.",
      href: "/tools/legal-assistant",
      cta: "Open assistant",
      icon: <MessageSquare className="h-6 w-6" />,
    },
    {
      title: "Document Chat",
      description: "Attach PDFs, DOCX, JSON, or text files, generate a legal brief, and continue the conversation.",
      href: "/tools/document-simplifier",
      cta: "Analyze documents",
      icon: <FileTextIcon className="h-6 w-6" />,
    },
    {
      title: "Draft Studio",
      description: "Generate FIR-style complaints, RTIs, legal notices, and workplace complaints from structured facts.",
      href: "/tools/document-generator",
      cta: "Generate draft",
      icon: <FileTextIcon className="h-6 w-6" />,
    },
    {
      title: "Rights + Directory",
      description: "Browse legal resources, rights summaries, and aid channels with AI handoff into the assistant.",
      href: "/resources/legal-library",
      cta: "Browse library",
      icon: <Book className="h-6 w-6" />,
    },
  ]

  return (
    <main>
      <section className={styles.heroSection}>
        <div className="container-shell">
          <div className={styles.splitLayout}>
            {/* Copy Side */}
            <div className={styles.heroContent}>
              <div className={styles.badge}>
                <Sparkles className="h-4 w-4" />
                Your Legal Companion
              </div>
              <h1 className={styles.heroTitle}>
                LegalEase turns legal confusion into guided action.
              </h1>
              <p className={styles.heroDescription}>
                A trustworthy AI legal assistant for Indian users. Understand your rights, chat with complex documents, and confidently draft first-pass legal notices, RTIs, and complaints.
              </p>
              <div className={styles.actionGroup}>
                <Link href={user ? "/workspace" : "/signup"} className={styles.primaryButton}>
                  {user ? "Open workspace" : "Create workspace"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/resources/legal-library" className={styles.secondaryButton}>
                  Browse legal library
                </Link>
              </div>
            </div>

            {/* Illustration Side */}
            <div className={styles.illustrationContainer}>
              <div className={styles.scanner}></div>
              <div className={styles.assistantPanel}>
                <div className={styles.panelHeader}>
                  <div className={styles.aiAvatar}>
                    <Image src="/legalease.png" alt="LegalEase" width={28} height={28} className="rounded-md object-contain" />
                  </div>
                  <div>
                    <div className={styles.aiTitle}>LegalEase AI</div>
                    <div className={styles.aiStatus}>
                      <div className={styles.pulse}></div>
                      Online and ready
                    </div>
                  </div>
                </div>

                <div className={styles.chatWindow}>
                  <div className={`${styles.chatBubble} ${styles.userBubble}`}>
                    How do I respond to an eviction notice?
                  </div>
                  <div className={styles.typingIndicator}>
                    <div className={styles.typingDot}></div>
                    <div className={styles.typingDot}></div>
                    <div className={styles.typingDot}></div>
                  </div>
                  <div className={`${styles.chatBubble} ${styles.aiBubble}`}>
                    Under the Rent Control Act, your landlord must provide proper notice before eviction. Let's draft a legal response citing your tenant rights.
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className={`${styles.floatingCard} ${styles.floatingCard1}`}>
                <div className={`${styles.iconCircle} ${styles.iconCircleGreen}`}>
                  <Shield className="h-4 w-4" />
                </div>
                <div className={styles.cardText}>
                  <span className={styles.cardTitle}>Rights Analysis</span>
                  <span className={styles.cardSub}>Completed</span>
                </div>
              </div>

              <div className={`${styles.floatingCard} ${styles.floatingCard2}`}>
                <div className={`${styles.iconCircle} ${styles.iconCircleAmber}`}>
                  <FileTextIcon className="h-4 w-4" />
                </div>
                <div className={styles.cardText}>
                  <span className={styles.cardTitle}>Draft RTI</span>
                  <span className={styles.cardSub}>Generating...</span>
                </div>
              </div>

              <div className={`${styles.floatingCard} ${styles.floatingCard3}`}>
                <div className={`${styles.iconCircle} ${styles.iconCircleBlue}`}>
                  <Clock className="h-4 w-4" />
                </div>
                <div className={styles.cardText}>
                  <span className={styles.cardTitle}>24/7 Access</span>
                  <span className={styles.cardSub}>Multilingual</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className="container-shell">
          <h2 className={styles.sectionTitle}>Everything you need in one place</h2>
          <div className={styles.featureGrid}>
            {featureCards.map((feature) => (
              <div key={feature.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  {feature.icon}
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
                <Link href={feature.href} className={styles.featureLink}>
                  {feature.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
