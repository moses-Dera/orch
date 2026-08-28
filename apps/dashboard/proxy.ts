import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes: Landing page (/), Docs (/docs), Auth pages, and GitHub webhook
const isPublicRoute = createRouteMatcher([
  '/',
  '/docs(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/api/orch/github/webhook(.*)'
])

const isAdminRoute = createRouteMatcher([
  '/team(.*)',
  '/projects(.*)',
  '/models(.*)',
  '/github(.*)',
  '/analytics(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId, sessionClaims, redirectToSignIn } = await auth()
    if (!userId) return redirectToSignIn()
    
    if (isAdminRoute(req)) {
      const role = sessionClaims?.metadata?.role || 'viewer'
      if (role !== 'admin' && role !== 'owner') {
        const url = new URL('/chat', req.url)
        return Response.redirect(url)
      }
    }
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
