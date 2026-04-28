const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
    const rawUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.SITE_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.VERCEL_URL ??
        DEFAULT_SITE_URL;
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

    return url.replace(/\/$/, "");
}

export function getAbsoluteUrl(path: string) {
    return `${getSiteUrl()}${path}`;
}
