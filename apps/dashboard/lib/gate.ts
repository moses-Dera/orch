import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getMe } from "@/app/actions/onboarding"

export async function requireOnboarded() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const me = await getMe()
  if (!me?.onboarded) redirect("/onboarding")

  return me
}
