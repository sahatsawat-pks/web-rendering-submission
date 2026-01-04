import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ITCS223 - Full Stack | MUICT Submissions",
  description: "Check your lab scores for ITCS223",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
