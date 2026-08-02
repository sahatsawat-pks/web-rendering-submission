import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/admin/login");
  } else {
    redirect("/admin/dashboard");
  }
}
