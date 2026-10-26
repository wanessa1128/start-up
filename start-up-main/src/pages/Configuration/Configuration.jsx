import { useState } from "react"

import useAuth from "../../hooks/useAuth"
import { updateCurrentUser } from "../../services/auth"
import { applyTheme, loadSavedSettings, saveSettings } from "../../utils/theme"

import "./Configuration.css"

export default function Configuration() {
  const { user, setUser } = useAuth()
  const [activeSection, setActiveSection] = useState("conta")
  const [saving, setSaving] = useState(false)

  const accountName = [
    user?.user_metadata?.name,
    user?.user_metadata?.full_name,
    user?.name,
    user?.user_metadata?.username
  ].find((value) => typeof value === "string" && value.trim())
    ?.trim()
    .replace(/^@/, "") || user?.email?.split("@")[0] || ""

  const [config, setConfig] = useState(() => {
    const saved = loadSavedSettings()

    return {
      nome: accountName,
      email: user?.email || "",
      notificacoes: saved.notificacoes ?? true,
      emailNotificacoes: saved.emailNotificacoes ?? true,
      perfilPublico: saved.perfilPublico ?? true,
      statusOnline: saved.statusOnline ?? true,
      tema: saved.tema === "escuro" ? "escuro" : "claro"
    }
  })

  function updateConfig(campo, valor) {
    if (campo === "tema") {
      applyTheme(valor)
      if (!saveSettings({
        ...config,
        tema: valor
      })) {
        alert("O tema foi aplicado, mas não foi possível salvá-lo neste dispositivo.")
      }
    }

    setConfig((prev) => ({
      ...prev,
      [campo]: valor
    }))
  }

  async function saveConfig() {
    if (!config.nome.trim()) {
      alert("Informe o nome da conta antes de salvar.")
      return
    }

    setSaving(true)

    try {
      const updatedUser = await updateCurrentUser({
        name: config.nome.trim()
      })

      setUser(updatedUser)
      if (!saveSettings({
        ...config,
        nome: config.nome.trim(),
        email: user?.email || ""
      })) {
        throw new Error("Não foi possível salvar as configurações localmente.")
      }

      alert("Configurações salvas com sucesso! ✅")
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      alert("Não foi possível salvar as configurações.")
    } finally {
      setSaving(false)
    }
  }

  function resetConfig() {
    const defaultConfig = {
      nome: accountName,
      email: user?.email || "",
      notificacoes: true,
      emailNotificacoes: true,
      perfilPublico: true,
      statusOnline: true,
      tema: "claro"
    }

    setConfig(defaultConfig)
    applyTheme(defaultConfig.tema)
    if (!saveSettings(defaultConfig)) {
      alert("Não foi possível salvar as configurações restauradas.")
    }
  }

  const sections = [
    {
      id: "conta",
      icon: "👤",
      title: "Conta",
      description: "Informações pessoais"
    },
    {
      id: "notificacoes",
      icon: "🔔",
      title: "Notificações",
      description: "Gerencie seus avisos"
    },
    {
      id: "aparencia",
      icon: "🎨",
      title: "Aparência",
      description: "Personalize sua interface"
    },
    {
      id: "privacidade",
      icon: "🔒",
      title: "Privacidade",
      description: "Controle sua visibilidade"
    },
    {
      id: "seguranca",
      icon: "🛡️",
      title: "Segurança",
      description: "Proteja sua conta"
    }
  ]

  return (
    <div className="config-page">

      <div className="config-top">
        <div>
          <span className="config-badge">
            CONFIGURAÇÕES
          </span>

          <h1>Configurações</h1>

          <p>
            Personalize sua conta e controle como sua experiência
            funciona dentro da plataforma.
          </p>
        </div>
      </div>

      <div className="config-layout">

        <aside className="config-menu">

          <div className="profile-mini">

            <div className="profile-avatar">
              {config.nome?.charAt(0).toUpperCase() || "U"}
            </div>

            <div>
              <strong>
                {config.nome || "Usuário"}
              </strong>

              <span>
                {config.email || "Sua conta"}
              </span>
            </div>

          </div>

          <div className="config-menu-list">

            {sections.map((section) => (
              <button
                key={section.id}
                className={`config-menu-item ${
                  activeSection === section.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveSection(section.id)
                }
              >

                <div className="menu-icon">
                  {section.icon}
                </div>

                <div className="menu-text">
                  <strong>
                    {section.title}
                  </strong>

                  <span>
                    {section.description}
                  </span>
                </div>

                <span className="menu-arrow">
                  ›
                </span>

              </button>
            ))}

          </div>

          <button
            className="reset-button"
            onClick={resetConfig}
          >
            Restaurar configurações
          </button>

        </aside>

        <main className="config-content">

          {activeSection === "conta" && (
            <section className="settings-card">

              <div className="section-header">
                <div className="section-title">

                  <span>👤</span>

                  <div>
                    <h2>Conta</h2>

                    <p>
                      Gerencie as informações da sua conta.
                    </p>
                  </div>

                </div>
              </div>

              <div className="user-preview">

                <div className="big-avatar">
                  {config.nome?.charAt(0).toUpperCase() || "U"}
                </div>

                <div>
                  <h3>
                    {config.nome || "Usuário"}
                  </h3>

                  <span>
                    {config.email || "Email não informado"}
                  </span>
                </div>

                <div className="account-status">
                  <span></span>
                  Conta ativa
                </div>

              </div>

              <div className="fields-grid">

                <div className="field">

                  <label>
                    Nome completo
                  </label>

                  <input
                    type="text"
                    value={config.nome}
                    placeholder="Digite seu nome"
                    onChange={(e) =>
                      updateConfig(
                        "nome",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="field">

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    value={user?.email || config.email}
                    placeholder="seuemail@email.com"
                    readOnly
                  />

                </div>

              </div>

            </section>
          )}

          {activeSection === "notificacoes" && (
            <section className="settings-card">

              <div className="section-header">
                <div className="section-title">

                  <span>🔔</span>

                  <div>
                    <h2>Notificações</h2>

                    <p>
                      Escolha quais notificações deseja receber.
                    </p>
                  </div>

                </div>
              </div>

              <div className="settings-list">

                <SettingToggle
                  title="Notificações da plataforma"
                  description="Receba avisos sobre atividades importantes."
                  value={config.notificacoes}
                  onChange={(value) =>
                    updateConfig(
                      "notificacoes",
                      value
                    )
                  }
                />

                <SettingToggle
                  title="Notificações por email"
                  description="Receba atualizações importantes no seu email."
                  value={config.emailNotificacoes}
                  onChange={(value) =>
                    updateConfig(
                      "emailNotificacoes",
                      value
                    )
                  }
                />

              </div>

            </section>
          )}

          {activeSection === "aparencia" && (
            <section className="settings-card">

              <div className="section-header">
                <div className="section-title">

                  <span>🎨</span>

                  <div>
                    <h2>Aparência</h2>

                    <p>
                      Personalize a aparência da plataforma.
                    </p>
                  </div>

                </div>
              </div>

              <div className="theme-container">

                <label className="theme-option">

                  <input
                    type="radio"
                    name="theme"
                    checked={config.tema === "claro"}
                    onChange={() =>
                      updateConfig(
                        "tema",
                        "claro"
                      )
                    }
                  />

                  <div className="theme-preview light-preview">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>

                  <strong>
                    Claro
                  </strong>

                  <span>
                    Interface clara e limpa
                  </span>

                </label>

                <label className="theme-option">

                  <input
                    type="radio"
                    name="theme"
                    checked={config.tema === "escuro"}
                    onChange={() =>
                      updateConfig(
                        "tema",
                        "escuro"
                      )
                    }
                  />

                  <div className="theme-preview dark-preview">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>

                  <strong>
                    Escuro
                  </strong>

                  <span>
                    Interface escura para ambientes com pouca luz
                  </span>

                </label>

              </div>

            </section>
          )}

          {activeSection === "privacidade" && (
            <section className="settings-card">

              <div className="section-header">
                <div className="section-title">

                  <span>🔒</span>

                  <div>
                    <h2>Privacidade</h2>

                    <p>
                      Controle quem pode visualizar suas informações.
                    </p>
                  </div>

                </div>
              </div>

              <div className="settings-list">

                <SettingToggle
                  title="Perfil público"
                  description="Permitir que outros usuários encontrem seu perfil."
                  value={config.perfilPublico}
                  onChange={(value) =>
                    updateConfig(
                      "perfilPublico",
                      value
                    )
                  }
                />

                <SettingToggle
                  title="Mostrar status online"
                  description="Permitir que outros usuários saibam quando você está online."
                  value={config.statusOnline}
                  onChange={(value) =>
                    updateConfig(
                      "statusOnline",
                      value
                    )
                  }
                />

              </div>

            </section>
          )}

          {activeSection === "seguranca" && (
            <section className="settings-card">

              <div className="section-header">
                <div className="section-title">

                  <span>🛡️</span>

                  <div>
                    <h2>Segurança</h2>

                    <p>
                      Mantenha sua conta protegida.
                    </p>
                  </div>

                </div>
              </div>

              <div className="security-item">

                <div>
                  <strong>
                    Senha
                  </strong>

                  <span>
                    Altere sua senha regularmente para manter sua conta segura.
                  </span>
                </div>

                <button className="secondary-button">
                  Alterar senha
                </button>

              </div>

              <div className="security-item">

                <div>
                  <strong>
                    Sessões ativas
                  </strong>

                  <span>
                    Veja onde sua conta está conectada.
                  </span>
                </div>

                <button className="secondary-button">
                  Ver sessões
                </button>

              </div>

              <div className="security-warning">

                <span>
                  ⚠️
                </span>

                <div>
                  <strong>
                    Proteja sua conta
                  </strong>

                  <p>
                    Nunca compartilhe sua senha ou informações de acesso.
                  </p>
                </div>

              </div>

            </section>
          )}

          <div className="save-container">

            <button
              className="save-button"
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? "Salvando..." : "✓ Salvar alterações"}
            </button>

          </div>

          <div className="danger-zone">

            <div>

              <span className="danger-icon">
                ⚠️
              </span>

              <div>
                <h3>
                  Zona de perigo
                </h3>

                <p>
                  Ações nesta área podem afetar permanentemente sua conta.
                </p>
              </div>

            </div>

            <button className="delete-button">
              Excluir conta
            </button>

          </div>

        </main>

      </div>

    </div>
  )
}

function SettingToggle({
  title,
  description,
  value,
  onChange
}) {
  return (
    <div className="setting-row">

      <div className="setting-info">

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

      <button
        className={`toggle ${value ? "on" : ""}`}
        onClick={() => onChange(!value)}
        aria-label={title}
      >
        <span></span>
      </button>

    </div>
  )
}