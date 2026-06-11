export {};

declare global {
    // Admin role, set per user in the Clerk Dashboard:
    // Users -> select user -> Metadata -> Private -> { "role": "admin" }
    interface UserPrivateMetadata {
        role?: "admin" | undefined;
    }
}
