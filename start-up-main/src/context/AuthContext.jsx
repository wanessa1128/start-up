import { createContext, useEffect, useState } from "react"

import { supabase } from "../services/supabase"

export const AuthContext = createContext(null)

function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [onlineUserIds, setOnlineUserIds] = useState([])
    const [presenceStatus, setPresenceStatus] = useState("offline")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadSession() {
            try {
                const {
                    data: { session }
                } = await supabase.auth.getSession()

                setUser(session?.user ?? null)
            } catch (error) {
                console.error("Erro ao carregar sessão:", error)
            } finally {
                setLoading(false)
            }
        }

        loadSession()

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null)
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        if (!user?.id || typeof supabase.channel !== "function") {
            setOnlineUserIds([])
            setPresenceStatus("offline")
            return undefined
        }

        let active = true
        setOnlineUserIds([])
        setPresenceStatus("connecting")
        const channel = supabase
            .channel("online-users", {
                config: {
                    presence: {
                        key: user.id
                    }
                }
            })
            .on("presence", { event: "sync" }, () => {
                if (!active) {
                    return
                }

                const userIds = Object.keys(channel.presenceState()).sort()
                setOnlineUserIds((current) =>
                    current.length === userIds.length &&
                    current.every((id, index) => id === userIds[index])
                        ? current
                        : userIds
                )
            })
            .subscribe(async (status) => {
                if (!active) {
                    return
                }

                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    setPresenceStatus("error")
                    setOnlineUserIds([])
                    console.error(`Erro no canal de presença do Supabase: ${status}`)
                    return
                }

                if (status === "CLOSED") {
                    setPresenceStatus("offline")
                    setOnlineUserIds([])
                    return
                }

                if (status !== "SUBSCRIBED") {
                    return
                }

                setPresenceStatus("connected")
                try {
                    await channel.track({ user_id: user.id })
                } catch (error) {
                    console.error("Erro ao atualizar presença online:", error)
                }
            })

        return () => {
            active = false
            supabase.removeChannel(channel)
        }
    }, [user?.id])

    async function login(email, password) {
        setLoading(true)

        try {
            const { data, error } =
                await supabase.auth.signInWithPassword({
                    email,
                    password
                })

            if (error) {
                throw error
            }

            setUser(data.user)

            return data
        } finally {
            setLoading(false)
        }
    }

    async function register(userData) {
        setLoading(true)

        try {
            const {
                email,
                password,
                ...metadata
            } = userData

            const { data, error } =
                await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: metadata
                    }
                })

            if (error) {
                throw error
            }

            setUser(data.user ?? null)

            return data
        } finally {
            setLoading(false)
        }
    }

    async function logout() {
        await supabase.auth.signOut()
        setUser(null)
    }

    const value = {
        user,
        onlineUserIds,
        presenceStatus,
        setUser,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider