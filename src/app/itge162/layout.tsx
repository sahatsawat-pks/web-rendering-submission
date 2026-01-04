import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ITGE162 - Lab Scores | MUICT Submissions",
  description: "Check your lab scores for ITGE162",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
