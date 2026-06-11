import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
    '/quiz/self(.*)',
    '/ranking/self(.*)',
    '/articles/self(.*)',
    '/articles/(.*)/edit',
    // Authentication only: the admin role lives in Clerk private metadata,
    // which is not in the session token, so the role check happens in
    // lib/admin.ts (admin layout + every admin server action). Non-admins
    // get a 404 from requireAdmin().
    '/admin(.*)',
])

export default clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
        await auth.protect()
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
