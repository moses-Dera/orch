import { SignIn } from "@clerk/nextjs"
import { clerkAppearance } from "@/lib/clerkAppearance"

export default function SignInPage() {
  return (
    <SignIn
      appearance={clerkAppearance}
      redirectUrl="/onboarding"
    />
  )
}
