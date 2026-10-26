import { supabase } from "./supabase"

export async function findPeopleToMessage(userId, search) {
    const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,username")
        .neq("id", userId)
        .ilike("display_name", `%${search.trim()}%`)
        .order("display_name")
        .limit(12)

    if (error) {
        throw error
    }

    return data || []
}

export async function listOnlinePeople(userId, onlineUserIds) {
    const otherUserIds = onlineUserIds.filter((id) => id !== userId)

    if (otherUserIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name,username")
        .in("id", otherUserIds)
        .order("display_name")

    if (error) {
        throw error
    }

    return data || []
}

export async function openDirectConversation(otherUserId) {
    const { data, error } = await supabase.rpc(
        "open_direct_conversation",
        { other_user_id: otherUserId }
    )

    if (error) {
        throw error
    }

    return data
}

export async function listConversations(userId) {
    const { data: ownParticipants, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId)

    if (participantError) {
        throw participantError
    }

    const conversationIds = [
        ...new Set((ownParticipants || []).map(({ conversation_id }) => conversation_id))
    ]

    if (conversationIds.length === 0) {
        return []
    }

    const [
        { data: conversations, error: conversationsError },
        { data: participants, error: participantsError },
    ] = await Promise.all([
        supabase
            .from("conversations")
            .select("id,last_message,last_message_at")
            .in("id", conversationIds),
        supabase
            .from("conversation_participants")
            .select("conversation_id,user_id")
            .in("conversation_id", conversationIds)
            .neq("user_id", userId)
    ])

    if (conversationsError) {
        throw conversationsError
    }
    if (participantsError) {
        throw participantsError
    }

    const otherUserIds = [...new Set((participants || []).map(({ user_id }) => user_id))]
    const { data: profiles, error: profilesError } = otherUserIds.length
        ? await supabase
            .from("profiles")
            .select("id,display_name,username")
            .in("id", otherUserIds)
        : { data: [], error: null }

    if (profilesError) {
        throw profilesError
    }

    const profilesById = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
    )
    const conversationsById = new Map(
        (conversations || []).map((conversation) => [
            conversation.id,
            conversation
        ])
    )

    return (participants || [])
        .map(({ conversation_id, user_id }) => {
            const conversation = conversationsById.get(conversation_id)

            return {
                id: conversation_id,
                person: profilesById.get(user_id) || {
                    id: user_id,
                    display_name: "Usuário"
                },
                lastMessage: conversation?.last_message
                    ? {
                        content: conversation.last_message,
                        created_at: conversation.last_message_at
                    }
                    : null
            }
        })
        .sort((first, second) =>
            (second.lastMessage?.created_at || "").localeCompare(
                first.lastMessage?.created_at || ""
            )
        )
}

export async function listMessages(conversationId) {
    const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,content,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500)

    if (error) {
        throw error
    }

    return data || []
}

export async function sendConversationMessage(conversationId, senderId, content) {
    const { data, error } = await supabase
        .from("messages")
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: content.trim()
        })
        .select("id,conversation_id,sender_id,content,created_at")
        .single()

    if (error) {
        throw error
    }

    return data
}
