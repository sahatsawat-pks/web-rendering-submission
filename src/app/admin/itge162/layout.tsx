import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin - ITGE162 | MUICT Submissions",
  description: "Admin dashboard for ITGE162",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
