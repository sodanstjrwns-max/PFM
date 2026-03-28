import { Hono } from 'hono'

export type Bindings = { DB: D1Database; R2: R2Bucket; JWT_SECRET: string }
export type Variables = { user?: UserPayload }
export type UserPayload = { id: string; hospitalId: string; email: string; name: string; role: string }
export type AppType = Hono<{ Bindings: Bindings; Variables: Variables }>
export type AppContext = Parameters<Parameters<AppType['get']>[1]>[0]
