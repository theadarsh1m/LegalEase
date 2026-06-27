import { requireSessionUser } from "@/lib/auth"
import { upsertUserProfile } from "@/lib/db"
import { DocumentSimplifierWorkspace } from "@/components/legal/document-simplifier-workspace"

interface DocumentSimplifierPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DocumentSimplifierPage({ searchParams }: DocumentSimplifierPageProps) {
  const params = searchParams ? await searchParams : undefined
  const user = await requireSessionUser("/tools/document-simplifier")
  await upsertUserProfile(user)
  const artifactId = params?.artifactId

  return <DocumentSimplifierWorkspace initialArtifactId={typeof artifactId === "string" ? artifactId : undefined} />
}
