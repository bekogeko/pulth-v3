import {cache} from "react";
import {auth, clerkClient} from "@clerk/nextjs/server";
import {notFound} from "next/navigation";

// The admin role lives in Clerk *private* metadata, which is never embedded in
// the session token, so every check goes through the Clerk Backend API.
// cache() dedupes the lookup within a single request.
const hasAdminRole = cache(async (userId: string) => {
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        return user.privateMetadata?.role === "admin";
    } catch {
        // Fail closed if Clerk is unreachable.
        return false;
    }
});

export async function isAdmin() {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated) {
        return false;
    }

    return hasAdminRole(userId);
}

/**
 * Gate for admin pages and layouts. Renders the 404 page for non-admins so the
 * admin area is indistinguishable from a missing route.
 *
 * Server actions should use `isAdmin()` and return an error state instead.
 */
export async function requireAdmin() {
    const {isAuthenticated, userId} = await auth();

    if (!isAuthenticated || !(await hasAdminRole(userId))) {
        notFound();
    }

    return {userId};
}
