import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

function showStartupMessage(message: string) {
  root.render(
    <main
      role="alert"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeContent: "center",
        gap: 12,
        padding: 24,
        background: "#08080e",
        color: "#f0f0ff",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>Não foi possível iniciar o dev.io</h1>
      <p style={{ maxWidth: 560, margin: 0, color: "#a0a0c0", lineHeight: 1.6 }}>
        {message}
      </p>
    </main>,
  )
}

if (
  !import.meta.env.VITE_SUPABASE_URL ||
  !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
) {
  showStartupMessage(
    "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente da hospedagem e gere um novo deployment.",
  )
} else {
  void import("./App")
    .then(({ default: App }) => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      )
    })
    .catch((reason: unknown) => {
      console.error("Falha ao carregar o app.", reason)
      showStartupMessage(
        "O app não conseguiu carregar. Confira a configuração do deployment e o console do navegador.",
      )
    })
}
