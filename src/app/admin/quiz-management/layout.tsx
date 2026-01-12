import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Quiz Management - Admin Portal",
  description: "Manage quizzes across all subjects",
}

export default function QuizManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
