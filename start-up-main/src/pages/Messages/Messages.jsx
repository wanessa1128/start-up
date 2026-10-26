import { useCallback, useEffect, useRef, useState } from "react"

import useAuth from "../../hooks/useAuth"
import { supabase } from "../../services/supabase"
import {
    findPeopleToMessage,
    listOnlinePeople,
    listConversations,
    listMessages,
    openDirectConversation,
    sendConversationMessage
} from "../../services/messages"

import "./Messages.css"

function mergeMessages(current, incoming) {
    const byId = new Map(current.map((message) => [message.id, message]))

    for (const message of incoming) {
        byId.set(message.id, message)
    }

    return [...byId.values()].sort(
        (first, second) =>
            new Date(first.created_at).getTime() -
            new Date(second.created_at).getTime()
    )
}

function formatMessageTime(timestamp) {
    if (!timestamp) {
        return ""
    }

    return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(timestamp))
}

function getErrorMessage(error) {
    const text = error?.message || ""

    if (
        text.includes("profiles") ||
        text.includes("conversation_participants") ||
        text.includes("open_direct_conversation") ||
        text.includes("messages")
    ) {
        return "O banco ainda não está preparado para mensagens. Aplique a migration SQL do projeto no Supabase."
    }

    return text || "Não foi possível concluir essa ação. Tente novamente."
}

function Messages() {
    const { user, onlineUserIds, presenceStatus } = useAuth()
    const [conversations, setConversations] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [messages, setMessages] = useState([])
    const [message, setMessage] = useState("")
    const [search, setSearch] = useState("")
    const [people, setPeople] = useState([])
    const [onlinePeople, setOnlinePeople] = useState([])
    const [loadingPeople, setLoadingPeople] = useState(false)
    const [loadingOnlinePeople, setLoadingOnlinePeople] = useState(false)
    const [loadingConversations, setLoadingConversations] = useState(true)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState("")
    const [connectionStatus, setConnectionStatus] = useState("offline")
    const messagesEndRef = useRef(null)
    const searchRequestRef = useRef(0)
    const conversationsRef = useRef(conversations)
    const selectedIdRef = useRef(selectedId)
    const isConfigured = typeof supabase.from === "function" &&
        typeof supabase.channel === "function"

    conversationsRef.current = conversations
    selectedIdRef.current = selectedId

    const currentConversation =
        conversations.find((conversation) => conversation.id === selectedId) || null

    const refreshConversations = useCallback(async () => {
        if (!user?.id || !isConfigured) {
            setConversations([])
            setLoadingConversations(false)
            return []
        }

        const items = await listConversations(user.id)
        setConversations(items)
        return items
    }, [isConfigured, user?.id])

    useEffect(() => {
        let active = true

        async function loadConversations() {
            if (!user?.id) {
                setLoadingConversations(false)
                return
            }

            if (!isConfigured) {
                setLoadingConversations(false)
                return
            }

            try {
                setLoadingConversations(true)
                const items = await listConversations(user.id)
                if (active) {
                    setConversations(items)
                    setSelectedId((current) =>
                        items.some((item) => item.id === current)
                            ? current
                            : items[0]?.id || null
                    )
                    setError("")
                }
            } catch (loadError) {
                console.error("Erro ao carregar conversas:", loadError)
                if (active) {
                    setError(getErrorMessage(loadError))
                }
            } finally {
                if (active) {
                    setLoadingConversations(false)
                }
            }
        }

        loadConversations()
        return () => {
            active = false
        }
    }, [isConfigured, user?.id])

    useEffect(() => {
        let active = true

        if (!user?.id || !isConfigured) {
            setOnlinePeople([])
            setLoadingOnlinePeople(false)
            return () => {
                active = false
            }
        }

        setOnlinePeople([])
        setLoadingOnlinePeople(true)

        listOnlinePeople(user.id, onlineUserIds)
            .then((items) => {
                if (active) {
                    setOnlinePeople(items)
                }
            })
            .catch((loadError) => {
                console.error("Erro ao carregar pessoas online:", loadError)
                if (active) {
                    setError(getErrorMessage(loadError))
                }
            })
            .finally(() => {
                if (active) {
                    setLoadingOnlinePeople(false)
                }
            })

        return () => {
            active = false
        }
    }, [isConfigured, onlineUserIds, user?.id])

    useEffect(() => {
        if (!user?.id || !isConfigured) {
            setConnectionStatus("offline")
            return undefined
        }

        let active = true
        setConnectionStatus("connecting")

        const channel = supabase
            .channel(`direct-messages:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                ({ new: newMessage }) => {
                    if (!active) {
                        return
                    }

                    if (newMessage.conversation_id === selectedIdRef.current) {
                        setMessages((current) => mergeMessages(current, [newMessage]))
                    }

                    setConversations((current) => current.map((conversation) =>
                        conversation.id === newMessage.conversation_id
                            ? {
                                ...conversation,
                                lastMessage: {
                                    content: newMessage.content,
                                    created_at: newMessage.created_at
                                }
                            }
                            : conversation
                    ).sort((first, second) =>
                        (second.lastMessage?.created_at || "").localeCompare(
                            first.lastMessage?.created_at || ""
                        )
                    ))

                    if (!conversationsRef.current.some(
                        (conversation) =>
                            conversation.id === newMessage.conversation_id
                    )) {
                        refreshConversations().catch((refreshError) => {
                            console.error(
                                "Erro ao atualizar a lista de conversas:",
                                refreshError
                            )
                        })
                    }
                }
            )
            .subscribe((status) => {
                if (!active) {
                    return
                }

                if (status === "SUBSCRIBED") {
                    setConnectionStatus("connected")
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    setConnectionStatus("error")
                }
            })

        return () => {
            active = false
            supabase.removeChannel(channel)
        }
    }, [isConfigured, refreshConversations, user?.id])

    useEffect(() => {
        if (!selectedId || !user?.id || !isConfigured) {
            setMessages([])
            return undefined
        }

        let active = true
        setMessages([])

        listMessages(selectedId)
            .then((initialMessages) => {
                if (active) {
                    setMessages((current) => mergeMessages(current, initialMessages))
                }
            })
            .catch((loadError) => {
                console.error("Erro ao carregar mensagens:", loadError)
                if (active) {
                    setError(getErrorMessage(loadError))
                }
            })

        return () => {
            active = false
        }
    }, [isConfigured, selectedId, user?.id])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    async function searchPeople(event) {
        event.preventDefault()
        const query = search.trim()

        if (query.length < 2) {
            setPeople([])
            setError("Digite pelo menos 2 caracteres para encontrar pessoas.")
            return
        }

        if (!isConfigured) {
            setError("Configure o Supabase para iniciar conversas reais.")
            return
        }

        const requestId = ++searchRequestRef.current
        setLoadingPeople(true)
        setError("")

        try {
            const results = await findPeopleToMessage(user.id, query)
            if (requestId === searchRequestRef.current) {
                setPeople(results)
            }
        } catch (searchError) {
            console.error("Erro ao buscar pessoas:", searchError)
            setError(getErrorMessage(searchError))
        } finally {
            if (requestId === searchRequestRef.current) {
                setLoadingPeople(false)
            }
        }
    }

    async function startConversation(person) {
        setError("")

        try {
            const conversationId = await openDirectConversation(person.id)
            const items = await refreshConversations()
            const newConversation = items.find((item) => item.id === conversationId)

            if (!newConversation) {
                throw new Error("A conversa foi criada, mas não apareceu na lista.")
            }

            setSelectedId(conversationId)
            setPeople([])
            setSearch("")
        } catch (startError) {
            console.error("Erro ao iniciar conversa:", startError)
            setError(getErrorMessage(startError))
        }
    }

    async function sendMessage(event) {
        event.preventDefault()
        const content = message.trim()

        if (!content || !currentConversation || sending) {
            return
        }

        if (content.length > 4000) {
            setError("A mensagem deve ter no máximo 4000 caracteres.")
            return
        }

        setSending(true)
        setError("")

        try {
            const savedMessage = await sendConversationMessage(
                currentConversation.id,
                user.id,
                content
            )
            setMessages((current) => mergeMessages(current, [savedMessage]))
            setConversations((current) => current.map((conversation) =>
                conversation.id === currentConversation.id
                    ? {
                        ...conversation,
                        lastMessage: {
                            content: savedMessage.content,
                            created_at: savedMessage.created_at
                        }
                    }
                    : conversation
            ))
            setMessage("")
        } catch (sendError) {
            console.error("Erro ao enviar mensagem:", sendError)
            setError(getErrorMessage(sendError))
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="messages">
            <div className="messages-layout">
                <aside className="conversation-list">
                    <h1>Mensagens</h1>

                    {!isConfigured && (
                        <p className="messages-notice">
                            O chat em tempo real exige um projeto Supabase configurado.
                        </p>
                    )}

                    <form className="people-search" onSubmit={searchPeople}>
                        <input
                            aria-label="Buscar pessoas"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Iniciar conversa com..."
                            disabled={!isConfigured}
                        />
                        <button
                            type="submit"
                            disabled={loadingPeople || !isConfigured}
                            aria-label="Buscar pessoas"
                        >
                            {loadingPeople ? "…" : "Buscar"}
                        </button>
                    </form>

                    {people.length > 0 && (
                        <div className="people-results">
                            <p>Encontrar pessoa</p>
                            {people.map((person) => (
                                <button
                                    key={person.id}
                                    type="button"
                                    className="people-result"
                                    onClick={() => startConversation(person)}
                                >
                                    <span className="message-avatar">
                                        {person.display_name?.charAt(0).toUpperCase() || "U"}
                                    </span>
                                    <span>
                                        <strong>{person.display_name}</strong>
                                        {person.username && <small>@{person.username}</small>}
                                    </span>
                                    <span className="start-chat-icon">＋</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <h2 className="conversation-heading">Pessoas online</h2>
                    {!isConfigured ? (
                        <p className="messages-empty">
                            Configure o Supabase para ver quem está online.
                        </p>
                    ) : !user?.id ? (
                        <p className="messages-empty">
                            Entre na sua conta para ver quem está online.
                        </p>
                    ) : presenceStatus === "error" ? (
                        <p className="messages-empty">
                            Não foi possível verificar quem está online. Tente novamente mais tarde.
                        </p>
                    ) : presenceStatus !== "connected" || loadingOnlinePeople ? (
                        <p className="messages-empty">Carregando pessoas online...</p>
                    ) : onlinePeople.length ? (
                        <div className="online-people">
                            {onlinePeople.map((person) => (
                                <button
                                    key={person.id}
                                    type="button"
                                    className="people-result"
                                    onClick={() => startConversation(person)}
                                >
                                    <span className="message-avatar">
                                        {person.display_name?.charAt(0).toUpperCase() || "U"}
                                    </span>
                                    <span>
                                        <strong>{person.display_name}</strong>
                                        {person.username && <small>@{person.username}</small>}
                                    </span>
                                    <span className="online-indicator" aria-label="Online" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="messages-empty">
                            Não há outras pessoas online no momento.
                        </p>
                    )}

                    <h2 className="conversation-heading">Suas conversas</h2>

                    {loadingConversations ? (
                        <p className="messages-empty">Carregando conversas...</p>
                    ) : conversations.length ? (
                        conversations.map((conversation) => (
                            <button
                                key={conversation.id}
                                className={
                                    selectedId === conversation.id
                                        ? "conversation active"
                                        : "conversation"
                                }
                                onClick={() => {
                                    setSelectedId(conversation.id)
                                    setError("")
                                }}
                            >
                                <span className="message-avatar">
                                    {conversation.person.display_name?.charAt(0).toUpperCase() || "U"}
                                </span>
                                <span className="conversation-copy">
                                    <strong>{conversation.person.display_name}</strong>
                                    <span>
                                        {conversation.lastMessage?.content ||
                                            "Conversa iniciada. Envie uma mensagem!"}
                                    </span>
                                </span>
                            </button>
                        ))
                    ) : (
                        <p className="messages-empty">
                            Ainda não há conversas. Busque alguém acima para começar.
                        </p>
                    )}
                </aside>

                <section className="chat" aria-label="Conversa">
                    {currentConversation ? (
                        <>
                            <header className="chat-header">
                                <span className="message-avatar">
                                    {currentConversation.person.display_name?.charAt(0).toUpperCase() || "U"}
                                </span>
                                <div>
                                    <strong>{currentConversation.person.display_name}</strong>
                                    <span className={`chat-status ${connectionStatus}`}>
                                        {connectionStatus === "connected"
                                            ? "Conectado"
                                            : connectionStatus === "connecting"
                                                ? "Conectando..."
                                                : connectionStatus === "error"
                                                    ? "Reconectando..."
                                                    : ""}
                                    </span>
                                </div>
                            </header>

                            <div className="chat-messages" aria-live="polite">
                                {messages.length ? messages.map((msg) => {
                                    const ownMessage = msg.sender_id === user.id

                                    return (
                                        <div
                                            key={msg.id}
                                            className={ownMessage
                                                ? "chat-message own"
                                                : "chat-message"}
                                        >
                                            <p>{msg.content}</p>
                                            <time dateTime={msg.created_at}>
                                                {formatMessageTime(msg.created_at)}
                                            </time>
                                        </div>
                                    )
                                }) : (
                                    <p className="chat-empty">
                                        Dê o primeiro passo: mande uma mensagem para iniciar a conversa.
                                    </p>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input" onSubmit={sendMessage}>
                                <input
                                    aria-label="Mensagem"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Escreva sua mensagem..."
                                    maxLength={4000}
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    disabled={!message.trim() || sending}
                                >
                                    {sending ? "Enviando..." : "Enviar"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="chat-welcome">
                            <span>✉️</span>
                            <h2>Conexões começam com uma conversa.</h2>
                            <p>
                                Busque uma pessoa pelo nome para trocar ideias sobre produtos,
                                startups e oportunidades.
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="messages-error" role="alert">
                            {error}
                        </p>
                    )}
                </section>
            </div>
        </div>
    )
}

export default Messages
