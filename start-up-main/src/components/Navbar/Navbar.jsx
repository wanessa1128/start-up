
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import "./Navbar.css"

import useAuth from "../../hooks/useAuth"

function Navbar({ onSearch }) {
    const { user } = useAuth()
    const [searchParams] = useSearchParams()
    const [search, setSearch] = useState(
        searchParams.get("search") || ""
    )

    useEffect(() => {
        setSearch(searchParams.get("search") || "")
    }, [searchParams])

    const displayName =
        user?.user_metadata?.name?.trim() ||
        user?.user_metadata?.full_name?.trim() ||
        user?.name?.trim() ||
        user?.user_metadata?.username?.replace(/^@/, "").trim() ||
        user?.email?.split("@")[0] ||
        "Usuário"

    const avatarLetter =
        displayName
            .charAt(0)
            .toUpperCase()


    return (

        <header className="navbar">

            <div className="navbar-logo">

                <span>
                    START
                </span>

                <strong>
                    _UP
                </strong>

            </div>


            <form
                className="navbar-search"
                onSubmit={(event) => {
                    event.preventDefault()
                    onSearch?.(search.trim())
                }}
            >

                <input
                    type="text"
                    placeholder="Pesquisar startups, pessoas ou ideias..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Pesquisar startups, pessoas ou ideias"
                />

            </form>


            <div className="navbar-actions">


                <button
                    className="navbar-icon"
                    title="Notificações"
                >
                    🔔
                </button>


                <button
                    className="navbar-icon"
                    title="Mensagens"
                >
                    💬
                </button>


                <div className="navbar-user">


                    <div className="user-avatar">

                        {avatarLetter}

                    </div>


                    <span>

                        {displayName}

                    </span>


                </div>


            </div>

        </header>

    )
}

export default Navbar
