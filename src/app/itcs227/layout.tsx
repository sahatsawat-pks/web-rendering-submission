import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ITCS227 - Data Science | MUICT Submissions",
  description: "Check your lab scores for ITCS227",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
