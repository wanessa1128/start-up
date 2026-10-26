import { createClient } from "@supabase/supabase-js"

const env = typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env
    : typeof process !== "undefined"
        ? process.env
        : {}

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const isDemoMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project")

const demoUsers = new Map()
let activeDemoUser = null

function createDemoUser(email, password, metadata = {}) {
    const user = {
        id: `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        email: email.trim().toLowerCase(),
        user_metadata: {
            ...metadata,
            username: metadata.username || `@${email.split("@")[0]}`
        },
        app_metadata: {},
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString()
    }

    demoUsers.set(user.email, {
        password,
        user
    })

    activeDemoUser = user
    return user
}

createDemoUser(
    "joao@startup.com",
    "123456",
    {
        name: "João Carlos",
        username: "@joaocarlos",
        role: "Desenvolvedor Full Stack"
    }
)

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase()
}

function buildSession(user) {
    return {
        access_token: "demo-access-token",
        refresh_token: "demo-refresh-token",
        user
    }
}

const demoAuth = {
    async signInWithPassword({ email, password }) {
        const normalizedEmail = normalizeEmail(email)

        if (!normalizedEmail || !password) {
            return {
                data: { user: null, session: null },
                error: { message: "E-mail e senha são obrigatórios.", status: 400 }
            }
        }

        const userRecord = demoUsers.get(normalizedEmail)

        if (!userRecord || userRecord.password !== String(password)) {
            return {
                data: { user: null, session: null },
                error: { message: "E-mail ou senha incorretos.", status: 401 }
            }
        }

        const user = userRecord.user
        activeDemoUser = user

        return {
            data: {
                user,
                session: buildSession(user)
            },
            error: null
        }
    },

    async signUp({ email, password, options = {} }) {
        const normalizedEmail = normalizeEmail(email)

        if (!normalizedEmail || !password) {
            return {
                data: { user: null, session: null },
                error: { message: "E-mail e senha são obrigatórios.", status: 400 }
            }
        }

        if (demoUsers.has(normalizedEmail)) {
            return {
                data: { user: demoUsers.get(normalizedEmail).user, session: null },
                error: { message: "Este usuário já existe.", status: 409 }
            }
        }

        const user = createDemoUser(
            normalizedEmail,
            password,
            options.data || {}
        )

        return {
            data: {
                user,
                session: buildSession(user)
            },
            error: null
        }
    },

    async signOut() {
        activeDemoUser = null
        return { error: null }
    },

    async getSession() {
        return {
            data: {
                session: activeDemoUser
                    ? buildSession(activeDemoUser)
                    : null
            },
            error: null
        }
    },

    async getUser() {
        return {
            data: { user: activeDemoUser ?? null },
            error: null
        }
    },

    async updateUser({ data }) {
        if (!activeDemoUser) {
            return {
                data: { user: null },
                error: { message: "Usuário não autenticado.", status: 401 }
            }
        }

        const user = {
            ...activeDemoUser,
            user_metadata: {
                ...activeDemoUser.user_metadata,
                ...data
            }
        }

        demoUsers.set(user.email, {
            password: demoUsers.get(user.email)?.password || "",
            user
        })

        activeDemoUser = user

        return {
            data: { user },
            error: null
        }
    },

    onAuthStateChange(callback) {
        const session = activeDemoUser
            ? buildSession(activeDemoUser)
            : null

        callback("INITIAL_SESSION", session)

        return {
            data: {
                subscription: {
                    unsubscribe() {}
                }
            }
        }
    }
}

const supabaseClient = isDemoMode
    ? { auth: demoAuth }
    : createClient(supabaseUrl, supabaseAnonKey)

export const supabase = supabaseClient

if (isDemoMode) {
    console.warn(
        "VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não configuradas. Usando modo demo local para autenticação."
    )
}