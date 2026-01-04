import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ITCS123 - OOP | MUICT Submissions",
  description: "Check your lab scores for ITCS123",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
