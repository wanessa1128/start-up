import { useState } from "react"

import Modal from "../Modal/Modal"
import "./Sidebar.css"

export default function Sidebar({ activePage = "home", onNavigate }) {
  const [helpOpen, setHelpOpen] = useState(false)

  const menuItems = [
    {
      id: "home",
      icon: "🏠",
      label: "Início"
    },
    {
      id: "explore",
      icon: "🔎",
      label: "Explorar"
    },
    {
      id: "startups",
      icon: "🚀",
      label: "Startups"
    },
    {
      id: "communities",
      icon: "👥",
      label: "Comunidades"
    },
    {
      id: "messages",
      icon: "💬",
      label: "Mensagens"
    },
    {
      id: "dashboard",
      icon: "📊",
      label: "Dashboard"
    }
  ]

  return (
    <aside className="sidebar">

      <div className="sidebar-create">
        <button
          onClick={() => onNavigate?.("create-startup")}
        >
          <span>＋</span>
          Criar Startup
        </button>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={
              activePage === item.id
                ? "sidebar-item active"
                : "sidebar-item"
            }
            onClick={() => onNavigate?.(item.id)}
          >
            <span className="sidebar-icon">
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">

        <button
          className={
            activePage === "configuration"
              ? "sidebar-item active"
              : "sidebar-item"
          }
          onClick={() => onNavigate?.("configuration")}
        >
          <span className="sidebar-icon">
            ⚙️
          </span>

          Configurações
        </button>

        <button
          className="sidebar-item"
          onClick={() => setHelpOpen(true)}
        >
          <span className="sidebar-icon">
            ❓
          </span>

          Ajuda
        </button>

      </div>

      <Modal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Central de ajuda"
        size="small"
      >
        <div className="help-content">
          <p>
            Encontre rapidamente os principais recursos da plataforma:
          </p>
          <ul>
            <li><strong>Criar Startup:</strong> registre uma ideia e acompanhe seu desenvolvimento.</li>
            <li><strong>Dashboard:</strong> veja um resumo da sua atividade.</li>
            <li><strong>Configurações:</strong> personalize sua conta e escolha o tema.</li>
          </ul>
          <button
            className="help-settings-button"
            onClick={() => {
              setHelpOpen(false)
              onNavigate?.("configuration")
            }}
          >
            Abrir configurações
          </button>
        </div>
      </Modal>

    </aside>
  )
}