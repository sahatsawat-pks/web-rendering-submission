import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin - ITCS123 | MUICT Submissions",
  description: "Admin dashboard for ITCS123",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
