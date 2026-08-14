import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes: Landing page (/), Docs (/docs), Auth pages, and GitHub webhook
const isPublicRoute = createRouteMatcher([
  '/',
  '/docs(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/orch/github/webhook(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId, redirectToSignIn } = await auth()
    if (!userId) return redirectToSignIn()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
