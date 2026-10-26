import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import StartupCard from "../../components/StartupCard/StartupCard"
import UserCard from "../../components/UserCard/UserCard"
import { startups as sampleStartups } from "../../data/mockData"
import { supabase } from "../../services/supabase"

import "./Explore.css"

function Explore() {

    const [filter, setFilter] = useState("startups")
    const [searchParams] = useSearchParams()
    const search = searchParams.get("search")?.trim() || ""
    const [startups, setStartups] = useState(sampleStartups)
    const [loadingStartups, setLoadingStartups] = useState(
        typeof supabase.from === "function"
    )
    const [startupLoadError, setStartupLoadError] = useState("")

    useEffect(() => {
        let isActive = true

        async function loadStartups() {
            if (typeof supabase.from !== "function") {
                setLoadingStartups(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from("startups")
                    .select("id,name,category,solution,stage,created_at")
                    .order("created_at", { ascending: false })

                if (error) {
                    throw error
                }

                if (!isActive) {
                    return
                }

                const startupsByName = new Map(
                    sampleStartups.map((startup) => [
                        startup.name.trim().toLocaleLowerCase(),
                        startup
                    ])
                )

                for (const startup of data || []) {
                    if (!startup.name?.trim()) {
                        continue
                    }

                    startupsByName.set(
                        startup.name.trim().toLocaleLowerCase(),
                        {
                            ...startup,
                            description:
                                startup.description ||
                                startup.solution ||
                                "Conheça esta startup.",
                            members: startup.members ?? 1,
                            likes: startup.likes ?? 0
                        }
                    )
                }

                setStartups(Array.from(startupsByName.values()))
                setStartupLoadError("")
            } catch (error) {
                console.error("Erro ao buscar startups para explorar:", error)
                if (isActive) {
                    setStartupLoadError(
                        "Não foi possível carregar as startups da sua comunidade."
                    )
                }
            } finally {
                if (isActive) {
                    setLoadingStartups(false)
                }
            }
        }

        loadStartups()

        return () => {
            isActive = false
        }
    }, [])

    const users = [
        {
            name: "Marina Costa",
            username: "@marina",
            role: "Product Designer",
            skills: ["Figma", "UX", "UI"],
            followers: 420
        },
        {
            name: "Pedro Lima",
            username: "@pedrolima",
            role: "Desenvolvedor Backend",
            skills: ["Java", "Node.js", "SQL"],
            followers: 280
        }
    ]

    const normalizeText = (value) =>
        String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR")
    const normalizedSearch = normalizeText(search)
    const filteredStartups = useMemo(
        () =>
            startups.filter((startup) =>
                [
                    startup.name,
                    startup.description,
                    startup.solution,
                    startup.category,
                    startup.stage
                ]
                    .join(" ")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLocaleLowerCase("pt-BR")
                    .includes(normalizedSearch)
            ),
        [startups, normalizedSearch]
    )
    const filteredUsers = useMemo(
        () =>
            users.filter((user) =>
                [
                    user.name,
                    user.username,
                    user.role,
                    ...user.skills
                ]
                    .join(" ")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLocaleLowerCase("pt-BR")
                    .includes(normalizedSearch)
            ),
        [normalizedSearch]
    )

    return (
        <div className="explore">

            <h1>Explorar</h1>

            <p className="explore-subtitle">
                Descubra startups, pessoas e oportunidades.
            </p>

            <div className="explore-tabs">

                <button
                    className={
                        filter === "startups"
                            ? "active"
                            : ""
                    }
                    onClick={() => setFilter("startups")}
                >
                    🚀 Startups
                </button>

                <button
                    className={
                        filter === "people"
                            ? "active"
                            : ""
                    }
                    onClick={() => setFilter("people")}
                >
                    👥 Pessoas
                </button>

            </div>

            {search && (
                <div className="explore-search">
                    Resultados para:
                    <strong> "{search}"</strong>
                </div>
            )}

            {filter === "startups" && (
                <>
                    {startupLoadError && (
                        <p className="explore-error" role="status">
                            {startupLoadError} Exibindo os resultados disponíveis.
                        </p>
                    )}
                    {loadingStartups ? (
                        <p className="explore-empty" role="status">
                            Buscando startups...
                        </p>
                    ) : (
                        <div className="explore-grid">
                            {filteredStartups.map((startup) => (
                                <StartupCard
                                    key={startup.id || startup.name}
                                    {...startup}
                                />
                            ))}
                            {filteredStartups.length === 0 && (
                                <p className="explore-empty">
                                    Nenhuma startup encontrada para “{search}”.
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            {filter === "people" && (
                <div className="explore-users">
                    {filteredUsers.map((user) => (
                        <UserCard
                            key={user.username}
                            {...user}
                        />
                    ))}
                    {filteredUsers.length === 0 && (
                        <p>Nenhuma pessoa encontrada.</p>
                    )}
                </div>
            )}

        </div>
    )
}

export default Explore