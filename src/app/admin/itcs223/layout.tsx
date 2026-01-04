import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin - ITCS223 | MUICT Submissions",
  description: "Admin dashboard for ITCS223",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
