import { NextResponse } from "next/server"
import { getOptionalSessionUser } from "@/lib/auth"
import { getSavedArtifact } from "@/lib/db"

export async function GET(request: Request) {
  const user = await getOptionalSessionUser()

  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const artifactId = searchParams.get("artifactId")

  if (!artifactId) {
    return NextResponse.json({ error: "Missing artifactId." }, { status: 400 })
  }

  try {
    const artifact = await getSavedArtifact(user.uid, artifactId)
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found." }, { status: 404 })
    }
    return NextResponse.json({ artifact })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load artifact.",
      },
      { status: 400 },
    )
  }
}
