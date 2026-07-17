import posthog from 'posthog-js'
import { env } from '@/lib/env'

posthog.init(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: env.NEXT_PUBLIC_POSTHOG_API_HOST,
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30'
})