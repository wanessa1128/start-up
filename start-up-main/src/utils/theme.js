export function applyTheme(theme) {
    const isDark = theme === "escuro"

    document.body.classList.toggle("escuro", isDark)
    document.documentElement.style.colorScheme = isDark
        ? "dark"
        : "light"
}

export function loadSavedSettings() {
    try {
        const savedSettings = localStorage.getItem("configuracoes")

        if (!savedSettings) {
            return {}
        }

        const settings = JSON.parse(savedSettings)

        if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
            throw new Error("Formato inválido para as configurações salvas.")
        }

        return settings
    } catch (error) {
        console.error("Erro ao carregar configurações:", error)
        return {}
    }
}

export function saveSettings(settings) {
    try {
        localStorage.setItem("configuracoes", JSON.stringify(settings))
        return true
    } catch (error) {
        console.error("Erro ao salvar configurações:", error)
        return false
    }
}
