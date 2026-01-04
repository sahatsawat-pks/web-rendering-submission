import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Login | MUICT Submissions",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
