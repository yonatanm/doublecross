import { usePageTitle } from "@/hooks/usePageTitle"

export default function VersionPage() {
  usePageTitle("גרסה")
  const version = { sha: __GIT_SHA__, date: __GIT_DATE__ }
  return <pre>{JSON.stringify(version, null, 2)}</pre>
}
