import { useState, useEffect, useRef } from "react"
import {
  Home,
  Compass,
  Upload,
  BookOpen,
  User,
  Search,
  Bell,
  ChevronRight,
  ChevronLeft,
  X,
  Heart,
  Share2,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Code2,
  Package,
  Zap,
  Globe,
  Puzzle,
  Wrench,
  Gamepad2,
  ArrowLeft,
  MoreVertical,
  Settings,
  LogOut,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Info,
  Plus,
  Filter,
  SortAsc,
  Edit3,
  Trash2,
  FileCode,
  Lock,
  Bell as BellIcon,
  Moon,
  FileText,
  Flag,
  Send,
  DollarSign,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Users,
  Archive,
  ImagePlus,
} from "lucide-react"
import {
  addToLibrary,
  changePassword,
  completePasswordReset,
  confirmEmail,
  deleteAdminProject,
  deleteAdminUser,
  deleteProject,
  downloadProject,
  getAdminProjects,
  getAdminUsers,
  getCurrentUser,
  getLibrary,
  getMyProjects,
  getProjectFile,
  getProjects,
  hasActiveSession,
  logoutAccount,
  loginAccount,
  loginGoogle,
  removeAvatar,
  registerAccount,
  requestPasswordReset,
  resendConfirmation,
  setAdminProjectBlocked,
  setAdminUserBlocked,
  updateProfile,
  updateProject,
  uploadAvatar,
  uploadProject,
} from "./lib/api"
import type {
  AdminProject,
  AdminUser,
  ApiProject,
  ProfileUser,
} from "./lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen = "splash" | "login" | "register" | "email-confirmation" | "password-reset" | "password-change" | "home" | "explore" | "search" | "project-detail" | "acquire" | "acquire-success" | "donate" | "library" | "publish" | "security-check" | "security-blocked" | "sandbox" | "my-projects" | "profile" | "profile-edit" | "settings" | "admin" | "report"

// ─── Shared colour tokens ─────────────────────────────────────────────────────
const C = {
  bg: "#08080e",
  surface: "#10101a",
  surface2: "#18182a",
  surface3: "#20203a",
  border: "#2a2a44",
  primary: "#4f6ef7",
  primaryDim: "#3a54d4",
  accent: "#7c3aed",
  cyan: "#06b6d4",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  text: "#f0f0ff",
  text2: "#9090b8",
  text3: "#55557a",
}

type Project = {
  id: string
  name: string
  dev: string
  category: string
  price: string
  version: string
  updated: string
  desc: string
  fileName?: string
  fileType?: string
  sandboxType?: string
}

function normalizeProject(value: ApiProject): Project {
  return {
    id: typeof value.id === "string" ? value.id : "",
    name: typeof value.name === "string" ? value.name : "",
    dev: typeof value.dev === "string" ? value.dev : "devio",
    category: typeof value.category === "string" ? value.category : "Outros",
    price: typeof value.price === "string" ? value.price : "Grátis",
    version: typeof value.version === "string" ? value.version : "",
    updated: typeof value.updated === "string" ? value.updated : "",
    desc: typeof value.desc === "string" ? value.desc : "",
    fileName: typeof value.fileName === "string" ? value.fileName : undefined,
    fileType: typeof value.fileType === "string" ? value.fileType : undefined,
    sandboxType: typeof value.sandboxType === "string" ? value.sandboxType : undefined,
  }
}

function startProjectDownload(projectId: string) {
  void downloadProject(projectId).catch((reason) => {
    window.alert(
      reason instanceof Error ? reason.message : "Não foi possível baixar o arquivo.",
    )
  })
}

type SandboxType = "auto" | "html" | "javascript" | "css" | "source" | "unsupported"

function detectSandboxType(fileName: string, mimeType = ""): SandboxType {
  const extension = fileName.split(".").pop()?.toLowerCase() || ""
  if (["html", "htm"].includes(extension) || mimeType === "text/html") return "html"
  if (
    ["js", "mjs", "cjs", "jsx"].includes(extension) ||
    ["application/javascript", "text/javascript", "application/x-javascript"].includes(mimeType)
  ) return "javascript"
  if (extension === "css" || mimeType === "text/css") return "css"
  if (
    ["txt", "md", "json", "ts", "tsx", "py", "java", "c", "h", "cpp", "hpp", "rs", "go", "sh", "xml", "yaml", "yml", "sql", "php", "rb", "swift", "kt", "dart"].includes(extension) ||
    mimeType.startsWith("text/") ||
    ["application/json", "application/xml"].includes(mimeType)
  ) return "source"
  return "unsupported"
}

function sandboxTypeLabel(type: SandboxType) {
  return {
    auto: "Detecção automática",
    html: "HTML",
    javascript: "JavaScript",
    css: "CSS",
    source: "Texto/código (somente leitura)",
    unsupported: "Formato não executável no navegador",
  }[type]
}

function usePublicProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    getProjects()
      .then(({ projects: rows }) =>
        setProjects(rows.map(normalizeProject)),
      )
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar os projetos.",
        ),
      )
      .finally(() => setLoading(false))
  }, [])

  return { projects, loading, error }
}

const CATEGORIES = [
  { label: "Aplicativos", icon: Package, color: C.primary },
  { label: "Websites", icon: Globe, color: C.cyan },
  { label: "Bibliotecas", icon: BookOpen, color: C.accent },
  { label: "Plugins", icon: Puzzle, color: "#f472b6" },
  { label: "Ferramentas", icon: Wrench, color: C.warning },
  { label: "Jogos", icon: Gamepad2, color: C.success },
  { label: "APIs", icon: Code2, color: "#fb923c" },
  { label: "Outros", icon: Archive, color: C.text3 },
]

// ─── Reusable micro-components ───────────────────────────────────────────────
function Btn({
  label,
  onClick,
  variant = "primary",
  full = false,
  small = false,
}: {
  label: string
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger"
  full?: boolean
  small?: boolean
}) {
  const base = `inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 cursor-pointer ${
    full ? "w-full" : ""
  } ${small ? "px-3 py-1.5 text-xs" : "px-5 py-3 text-sm"}`
  const styles: Record<string, string> = {
    primary: `bg-[${C.primary}] text-white hover:opacity-90`,
    secondary: `bg-[${C.surface2}] text-[${C.text}] border border-[${C.border}] hover:bg-[${C.surface3}]`,
    ghost: `text-[${C.primary}] hover:bg-[${C.surface2}]`,
    danger: `bg-[${C.danger}] text-white hover:opacity-90`,
  }
  const inlineStyle: React.CSSProperties = {
    background:
      variant === "primary"
        ? C.primary
        : variant === "danger"
          ? C.danger
          : variant === "secondary"
            ? C.surface2
            : "transparent",
    color: variant === "ghost" ? C.primary : C.text,
    border: variant === "secondary" ? `1px solid ${C.border}` : "none",
    width: full ? "100%" : undefined,
    padding: small ? "6px 12px" : "12px 20px",
    fontSize: small ? "12px" : "14px",
    fontWeight: 600,
    borderRadius: "12px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
    fontFamily: "Inter, sans-serif",
  }
  return (
    <button style={inlineStyle} onClick={onClick} className={base}>
      {label}
    </button>
  )
}

function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
}: {
  label?: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPw, setShowPw] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <div
          style={{
            fontSize: 12,
            color: C.text2,
            marginBottom: 6,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          type={type === "password" && showPw ? "text" : type}
          placeholder={placeholder}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "13px 16px",
            paddingRight: type === "password" ? 44 : 16,
            background: C.surface2,
            border: `1.5px solid ${
              error ? C.danger : focused ? C.primary : C.border
            }`,
            borderRadius: 12,
            color: C.text,
            fontSize: 14,
            outline: "none",
            fontFamily: "Inter, sans-serif",
            boxSizing: "border-box",
          }}
        />
        {type === "password" && (
          <button
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: C.text3,
              cursor: "pointer",
              padding: 4,
            }}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  )
}

function Badge({
  label,
  color = C.primary,
}: {
  label: string
  color?: string
}) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color,
        background: color + "22",
        padding: "2px 8px",
        borderRadius: 20,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  )
}

function ProjectCard({
  project,
  onPress,
}: {
  project: Project
  onPress: () => void
}) {
  return (
    <div
      onClick={onPress}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 12,
        cursor: "pointer",
        transition: "border-color 0.2s",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          flexShrink: 0,
          background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${C.border}`,
        }}
      >
        <Code2 size={22} color={C.primary} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: C.text,
              lineHeight: 1.3,
            }}
          >
            {project.name}
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: project.price === "Grátis" ? C.success : C.warning,
              whiteSpace: "nowrap",
              marginLeft: 8,
            }}
          >
            {project.price}
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
          @{project.dev}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
          }}
        >
          <Badge label={project.category} color={C.primary} />
        </div>
      </div>
    </div>
  )
}

function BottomNav({
  active,
  navigate,
}: {
  active: string
  navigate: (s: Screen) => void
}) {
  const items = [
    { id: "home", label: "Início", icon: Home },
    { id: "explore", label: "Explorar", icon: Compass },
    { id: "publish", label: "Publicar", icon: Upload },
    { id: "library", label: "Biblioteca", icon: BookOpen },
    { id: "profile", label: "Perfil", icon: User },
  ]
  return (
    <div
      style={{
        position: "static",
        width: "100%",
        height: "auto",
        background: C.surface,
        borderTop: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        gap: 6,
        padding: "16px 12px",
      }}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => navigate(id as Screen)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px 14px",
              width: "100%",
              borderRadius: 12,
              transition: "all 0.15s",
            }}
          >
            {id === "publish" ? (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 0,
                  boxShadow: `0 4px 16px ${C.primary}66`,
                }}
              >
                <Icon size={20} color="white" />
              </div>
            ) : (
              <Icon
                size={22}
                color={isActive ? C.primary : C.text3}
                strokeWidth={isActive ? 2 : 1.5}
              />
            )}
            {id !== "publish" && (
              <span
                style={{
                  fontSize: 13,
                  color: isActive ? C.primary : C.text3,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Header({
  title,
  onBack,
  right,
}: {
  title?: string
  onBack?: () => void
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: "16px 20px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            marginLeft: -4,
            color: C.text,
          }}
        >
          <ArrowLeft size={22} color={C.text} />
        </button>
      )}
      {title && (
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text, flex: 1 }}>
          {title}
        </div>
      )}
      {right}
    </div>
  )
}

// ─── SCREEN: Splash ──────────────────────────────────────────────────────────
function SplashScreen({
  navigate,
  authLoaded,
  error,
}: {
  navigate: (s: Screen) => void
  authLoaded: boolean
  error: string
}) {
  useEffect(() => {
    if (!authLoaded) return
    const t = setTimeout(() => navigate("login"), 2600)
    return () => clearTimeout(t)
  }, [authLoaded])
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* BG decoration */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.primary}22 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accent}22 0%, transparent 70%)`,
        }}
      />
      {/* Code lines decoration */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 20 + Math.sin(i) * 10,
            top: 60 + i * 38,
            height: 1.5,
            width: 40 + i * 18,
            background: C.border,
            borderRadius: 1,
            opacity: 0.5,
          }}
        />
      ))}
      <div style={{ position: "absolute", right: 24, top: 80 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 1.5,
              width: 28 + i * 12,
              background: C.border,
              borderRadius: 1,
              marginBottom: 8,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
      {/* Logo */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
          width: 80,
          height: 80,
          borderRadius: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 40px ${C.primary}55`,
          marginBottom: 20,
        }}
      >
        <Code2 size={38} color="white" />
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: C.text,
          letterSpacing: "-0.03em",
          marginBottom: 8,
        }}
      >
        dev<span style={{ color: C.primary }}>.io</span>
      </div>
      <div
        style={{
          fontSize: 14,
          color: C.text2,
          letterSpacing: "0.06em",
          marginBottom: 60,
        }}
      >
        Crie. Compartilhe. Desenvolva.
      </div>
      {/* Loader */}
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === 1 ? C.primary : C.border,
              animation: `pulse 1.4s ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      {error && (
        <div style={{ color: C.warning, fontSize: 12, marginTop: 16 }}>
          {error}
        </div>
      )}
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1.2)} }`}</style>
    </div>
  )
}

// ─── SCREEN: Login ───────────────────────────────────────────────────────────
function LoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return
    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setLoading(true)
          setError("")
          try {
            await loginGoogle(credential)
            navigate("home")
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Não foi possível entrar com Google.",
            )
          } finally {
            setLoading(false)
          }
        },
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        text: "signin_with",
        width: 360,
      })
    }
    if (window.google) {
      renderGoogleButton()
      return
    }
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = renderGoogleButton
    document.head.appendChild(script)
  }, [googleClientId])
  const login = async () => {
    if (!email || !password) {
      setError("Preencha todos os campos.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const response = await loginAccount({ email, password })
      navigate(response.passwordChangeRequired ? "password-change" : "home")
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível entrar.",
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "48px 28px 32px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              width: 64,
              height: 64,
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 24px ${C.primary}44`,
              marginBottom: 14,
            }}
          >
            <Code2 size={28} color="white" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>
            dev<span style={{ color: C.primary }}>.io</span>
          </div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>
            Entre na sua conta
          </div>
        </div>

        {error && (
          <div
            style={{
              background: C.danger + "22",
              border: `1px solid ${C.danger}44`,
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <XCircle size={14} color={C.danger} />
            <span style={{ fontSize: 13, color: C.danger }}>{error}</span>
          </div>
        )}

        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={setEmail}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
        />

        <button
          onClick={() => navigate("password-reset")}
          style={{
            background: "none",
            border: "none",
            color: C.primary,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 20,
            padding: 0,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Esqueci minha senha
        </button>

        <Btn label={loading ? "Entrando..." : "Entrar"} onClick={login} full />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "20px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.text3 }}>ou</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {googleClientId ? (
          <div
            ref={googleButtonRef}
            style={{ minHeight: 42, display: "flex", justifyContent: "center" }}
          />
        ) : (
          <button
            onClick={() =>
              setError(
                "Login Google indisponível: configure VITE_GOOGLE_CLIENT_ID e GOOGLE_CLIENT_ID.",
              )
            }
            style={{
              width: "100%",
              padding: "12px 20px",
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              cursor: "pointer",
              color: C.text,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Entrar com Google
          </button>
        )}

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <span style={{ fontSize: 13, color: C.text2 }}>
            Não tem uma conta?{" "}
          </span>
          <button
            onClick={() => navigate("register")}
            style={{
              background: "none",
              border: "none",
              color: C.primary,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Criar conta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Register ────────────────────────────────────────────────────────
function RegisterScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  })
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }))
  const register = async () => {
    if (
      !terms ||
      !form.name ||
      !form.username ||
      !form.email ||
      form.password.length < 8 ||
      form.password !== form.confirm
    ) {
      setError(
        "Preencha os campos, aceite os termos e confirme uma senha com pelo menos 8 caracteres.",
      )
      return
    }
    setLoading(true)
    setError("")
    try {
      const response = await registerAccount(form)
      sessionStorage.setItem(
        "devio_pending_email",
        form.email.trim().toLowerCase(),
      )
      sessionStorage.removeItem("devio_confirmation_rate_limited")
      sessionStorage.setItem(
        "devio_confirmation_email_sent",
        String(response.emailSent),
      )
      navigate("email-confirmation")
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("email rate limit exceeded")
      ) {
        sessionStorage.setItem(
          "devio_pending_email",
          form.email.trim().toLowerCase(),
        )
        sessionStorage.setItem("devio_confirmation_email_sent", "false")
        sessionStorage.setItem("devio_confirmation_rate_limited", "true")
        navigate("email-confirmation")
        return
      }
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta.",
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
      }}
    >
      <Header title="Criar conta" onBack={() => navigate("login")} />
      <div style={{ padding: "24px 28px 32px" }}>
        {error && (
          <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <Input
          label="Nome completo"
          placeholder="Joselino Alves Ambique"
          value={form.name}
          onChange={set("name")}
        />
        <Input
          label="Nome de usuário"
          placeholder="@juce_dev"
          value={form.username}
          onChange={set("username")}
        />
        <Input
          label="E-mail"
          type="email"
          placeholder="juceleno@email.com"
          value={form.email}
          onChange={set("email")}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={form.password}
          onChange={set("password")}
        />
        <Input
          label="Confirmar senha"
          type="password"
          placeholder="Repita a senha"
          value={form.confirm}
          onChange={set("confirm")}
          error={
            form.confirm && form.confirm !== form.password
              ? "As senhas não coincidem"
              : undefined
          }
        />

        {/* Password strength */}
        {form.password && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 6 }}>
              Força da senha
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background:
                      i < Math.min(Math.floor(form.password.length / 3), 4)
                        ? i < 2
                          ? C.warning
                          : C.success
                        : C.border,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setTerms(!terms)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              border: `2px solid ${terms ? C.primary : C.border}`,
              background: terms ? C.primary : "transparent",
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            }}
          >
            {terms && <Check size={11} color="white" />}
          </button>
          <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
            Concordo com os{" "}
            <span style={{ color: C.primary }}>Termos de Uso</span> e a{" "}
            <span style={{ color: C.primary }}>Política de Privacidade</span> do
            dev.io
          </span>
        </div>

        <Btn
          label={loading ? "Criando..." : "Criar conta"}
          onClick={register}
          full
        />
      </div>
    </div>
  )
}

function EmailConfirmationScreen({
  navigate,
}: {
  navigate: (s: Screen) => void
}) {
  const [error, setError] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [rateLimited, setRateLimited] = useState(
    () => sessionStorage.getItem("devio_confirmation_rate_limited") === "true",
  )
  const [deliveryReady, setDeliveryReady] = useState(
    () => sessionStorage.getItem("devio_confirmation_email_sent") !== "false",
  )
  const [token, setToken] = useState(
    () =>
      new URLSearchParams(window.location.search).get("token_hash") ||
      new URLSearchParams(window.location.hash.slice(1)).get("token_hash") ||
      new URLSearchParams(window.location.hash.slice(1)).get("confirmEmail") ||
      sessionStorage.getItem("devio_confirmation_token") ||
      "",
  )
  const confirm = async () => {
    try {
      await confirmEmail(
        token,
        sessionStorage.getItem("devio_pending_email") || undefined,
      )
      sessionStorage.removeItem("devio_confirmation_token")
      sessionStorage.removeItem("devio_pending_email")
      sessionStorage.removeItem("devio_pending_email_change")
      sessionStorage.removeItem("devio_confirmation_email_sent")
      sessionStorage.removeItem("devio_confirmation_rate_limited")
      window.history.replaceState(null, "", window.location.pathname)
      setConfirmed(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar o e-mail.",
      )
    }
  }
  const resend = async () => {
    const email = sessionStorage.getItem("devio_pending_email")
    if (!email) {
      setError("Volte ao cadastro e informe o e-mail da sua conta.")
      return
    }
    setResending(true)
    setError("")
    try {
      const response = await resendConfirmation(
        email,
        sessionStorage.getItem("devio_pending_email_change") === "true",
      )
      setDeliveryReady(response.emailSent)
      setRateLimited(false)
      sessionStorage.removeItem("devio_confirmation_rate_limited")
      sessionStorage.setItem(
        "devio_confirmation_email_sent",
        String(response.emailSent),
      )
      setResent(response.emailSent)
      if (!response.emailSent) {
        setError(
          "Não foi possível enviar o e-mail. Verifique as configurações de autenticação do Supabase.",
        )
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("email rate limit exceeded")
      ) {
        setRateLimited(true)
        sessionStorage.setItem("devio_confirmation_rate_limited", "true")
        setError(
          "O limite de envios do Supabase foi atingido. Aguarde antes de tentar novamente ou configure SMTP personalizado no Supabase.",
        )
      } else {
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível reenviar o e-mail.",
        )
      }
    } finally {
      setResending(false)
    }
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header title="Confirme seu e-mail" onBack={() => navigate("register")} />
      <div style={{ padding: "56px 28px", textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: C.primary + "22",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Send size={32} color={C.primary} />
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.text,
            marginBottom: 10,
          }}
        >
          {rateLimited
            ? "Envio de confirmação temporariamente limitado"
            : "Verifique sua caixa de entrada"}
        </div>
        <div
          style={{
            fontSize: 13,
            color: C.text2,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          {rateLimited
            ? "O limite de envio do Supabase foi atingido. Sua conta pode já ter sido criada, mas o e-mail talvez não tenha sido enviado. Aguarde antes de reenviar e não tente cadastrar novamente."
            : deliveryReady
              ? "Enviamos um link de confirmação para ativar sua conta."
              : "O e-mail de confirmação não foi enviado. Verifique as configurações de autenticação do Supabase ou tente reenviar."}
        </div>
        {error && (
          <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {(deliveryReady || confirmed) && (
          <Btn
            label={
              confirmed
                ? "Continuar para o login"
                : "Já confirmei meu e-mail"
            }
            onClick={() => (confirmed ? navigate("login") : confirm())}
            full
          />
        )}
        <button
          onClick={resend}
          disabled={resending}
          style={{
            background: "none",
            border: "none",
            color: C.primary,
            fontSize: 13,
            cursor: "pointer",
            marginTop: 18,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {resending
            ? "Enviando..."
            : resent
              ? "E-mail reenviado"
              : "Reenviar e-mail"}
        </button>
      </div>
    </div>
  )
}

function PasswordResetScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [email, setEmail] = useState("")
  const [requestSent, setRequestSent] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [token, setToken] = useState(
    () =>
      new URLSearchParams(window.location.search).get("token_hash") ||
      new URLSearchParams(window.location.hash.slice(1)).get("resetPassword") ||
      (new URLSearchParams(window.location.search).has("resetPassword")
        ? "recovery"
        : "") ||
      (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"
        ? "recovery"
        : "") ||
      sessionStorage.getItem("devio_reset_token") ||
      "",
  )
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const requestReset = async () => {
    if (!email.trim()) {
      setError("Informe seu e-mail.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await requestPasswordReset(email)
      setRequestSent(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar a redefinição.",
      )
    } finally {
      setLoading(false)
    }
  }
  const resetPassword = async () => {
    if (password.length < 8 || password !== confirm) {
      setError(
        "Informe uma senha com pelo menos 8 caracteres e confirme-a corretamente.",
      )
      return
    }
    setLoading(true)
    setError("")
    try {
      await completePasswordReset(token, password)
      sessionStorage.removeItem("devio_reset_token")
      window.history.replaceState(null, "", window.location.pathname)
      setToken("")
      setResetDone(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível redefinir a senha.",
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
      }}
    >
      <Header title="Recuperar senha" onBack={() => navigate("login")} />
      <div style={{ padding: "28px 28px" }}>
        {token ? (
          <>
            <div
              style={{
                fontSize: 14,
                color: C.text2,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Escolha uma nova senha. O link de recuperação pode ser usado uma
              única vez.
            </div>
            {error && (
              <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <Input
              label="Nova senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={setPassword}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              placeholder="Repita a nova senha"
              value={confirm}
              onChange={setConfirm}
            />
            <Btn
              label={loading ? "Salvando..." : "Redefinir senha"}
              onClick={resetPassword}
              full
            />
          </>
        ) : resetDone ? (
          <div style={{ textAlign: "center", paddingTop: 32 }}>
            <CheckCircle
              size={48}
              color={C.success}
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                marginBottom: 10,
              }}
            >
              Senha atualizada
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.text2,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Sua senha foi alterada. Entre novamente com a nova senha.
            </div>
            <Btn
              label="Voltar para o login"
              onClick={() => navigate("login")}
              full
            />
          </div>
        ) : requestSent ? (
          <div style={{ textAlign: "center", paddingTop: 32 }}>
            <CheckCircle
              size={48}
              color={C.success}
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                marginBottom: 10,
              }}
            >
              Verifique seu e-mail
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.text2,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Se existir uma conta para este e-mail, enviaremos um link para
              redefinir sua senha.
            </div>
            <Btn
              label="Voltar para o login"
              onClick={() => navigate("login")}
              full
            />
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 14,
                color: C.text2,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Informe o e-mail da sua conta. Nunca compartilhamos se o endereço
              está cadastrado.
            </div>
            {error && (
              <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={setEmail}
            />
            <Btn
              label={loading ? "Enviando..." : "Enviar link de recuperação"}
              onClick={requestReset}
              full
            />
          </>
        )}
      </div>
    </div>
  )
}

function PasswordChangeScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [changed, setChanged] = useState(false)
  const submit = async () => {
    if (newPassword.length < 8 || newPassword !== confirm) {
      setError(
        "A nova senha deve ter pelo menos 8 caracteres e as confirmações devem coincidir.",
      )
      return
    }
    setLoading(true)
    setError("")
    try {
      await changePassword(currentPassword, newPassword)
      setChanged(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.",
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
      }}
    >
      <Header title="Alterar senha" onBack={() => navigate("settings")} />
      <div style={{ padding: "28px 28px" }}>
        {changed ? (
          <>
            <div style={{ color: C.success, fontSize: 15, marginBottom: 20 }}>
              Senha alterada com sucesso.
            </div>
            <Btn label="Continuar" onClick={() => navigate("settings")} full />
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 13,
                color: C.text2,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Atualize sua senha periodicamente e sempre que suspeitar que ela
              foi comprometida.
            </div>
            {error && (
              <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <Input
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <Input
              label="Nova senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={setNewPassword}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirm}
              onChange={setConfirm}
            />
            <Btn
              label={loading ? "Salvando..." : "Alterar senha"}
              onClick={submit}
              full
            />
          </>
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: Home ─────────────────────────────────────────────────────────────
function HomeScreen({
  navigate,
}: {
  navigate: (s: Screen, data?: unknown) => void
}) {
  const { projects, loading, error } = usePublicProjects()
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: C.text2 }}>Olá, desenvolvedor 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
            dev<span style={{ color: C.primary }}>.io</span>
          </div>
        </div>
        <button
          style={{
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 8,
            cursor: "pointer",
          }}
        >
          <Bell size={20} color={C.text2} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "0 20px 20px" }}>
        <div
          onClick={() => navigate("search")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "12px 16px",
            cursor: "pointer",
          }}
        >
          <Search size={16} color={C.text3} />
          <span style={{ fontSize: 14, color: C.text3 }}>
            Buscar projetos, ferramentas...
          </span>
        </div>
      </div>

      {/* Banner */}
      <div style={{ margin: "0 20px 24px" }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${C.primary}dd, ${C.accent}dd)`,
            borderRadius: 20,
            padding: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -10,
              top: -10,
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 20,
              bottom: -20,
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
            }}
          />
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              marginBottom: 4,
            }}
          >
            {projects[0] ? "Projeto recente" : "Comece a compartilhar"}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "white",
              marginBottom: 8,
            }}
          >
            {projects[0]?.name || "Publique seu primeiro projeto"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.8)",
              marginBottom: 14,
            }}
          >
            {projects[0]?.desc || "Adicione um arquivo para compartilhar com a comunidade."}
          </div>
          <Btn
            label={projects[0] ? "Ver projeto" : "Publicar projeto"}
            onClick={() =>
              projects[0]
                ? navigate("project-detail", projects[0])
                : navigate("publish")
            }
            small
          />
        </div>
      </div>

      {/* Categories */}
      <SectionTitle title="Categorias" />
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 20px 20px",
          overflowX: "auto",
        }}
      >
        {CATEGORIES.map(({ label, icon: Icon, color }) => (
          <div
            key={label}
            onClick={() => navigate("explore")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "12px 14px",
              cursor: "pointer",
              flexShrink: 0,
              minWidth: 68,
            }}
          >
            <div
              style={{
                background: color + "22",
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={18} color={color} />
            </div>
            <span
              style={{ fontSize: 10, color: C.text2, whiteSpace: "nowrap" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Popular */}
      <SectionTitle
        title="Projetos publicados"
        action={{ label: "Ver todos", onClick: () => navigate("explore") }}
      />
      <div
        style={{
          padding: "8px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading && <div style={{ color: C.text2 }}>Carregando projetos...</div>}
        {error && <div style={{ color: C.danger }}>{error}</div>}
        {!loading && !error && projects.length === 0 && (
          <div style={{ color: C.text2 }}>Ainda não há projetos publicados.</div>
        )}
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onPress={() => navigate("project-detail", p)}
          />
        ))}
      </div>

    </div>
  )
}

function SectionTitle({
  title,
  action,
}: {
  title: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div
      style={{
        padding: "0 20px 4px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
        {title}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: "none",
            border: "none",
            color: C.primary,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─── SCREEN: Explore ──────────────────────────────────────────────────────────
function ExploreScreen({
  navigate,
}: {
  navigate: (s: Screen, data?: unknown) => void
}) {
  const [activeFilter, setActiveFilter] = useState("Todos")
  const { projects, loading, error } = usePublicProjects()
  const filters = ["Todos", "Grátis", "Pagos"]
  const filteredProjects = projects.filter((project) => {
    if (activeFilter === "Grátis") return project.price === "Grátis"
    if (activeFilter === "Pagos") return project.price !== "Grátis"
    return true
  })
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      <Header
        title="Explorar"
        right={
          <button
            style={{
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 8,
              cursor: "pointer",
            }}
          >
            <Filter size={16} color={C.text2} />
          </button>
        }
      />

      {/* Search */}
      <div style={{ padding: "16px 20px 0" }}>
        <div
          onClick={() => navigate("search")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "12px 16px",
            cursor: "pointer",
          }}
        >
          <Search size={16} color={C.text3} />
          <span style={{ fontSize: 14, color: C.text3 }}>Pesquisar...</span>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "16px 20px",
          overflowX: "auto",
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: `1.5px solid ${
                activeFilter === f ? C.primary : C.border
              }`,
              background: activeFilter === f ? C.primary + "22" : "transparent",
              color: activeFilter === f ? C.primary : C.text2,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Categories grid */}
      <SectionTitle title="Categorias" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          padding: "8px 20px 20px",
        }}
      >
        {CATEGORIES.map(({ label, icon: Icon, color }) => (
          <div
            key={label}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "14px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                background: color + "22",
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} color={color} />
            </div>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Projects */}
      <SectionTitle title="Projetos publicados" />
      <div
        style={{
          padding: "8px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading && <div style={{ color: C.text2 }}>Carregando projetos...</div>}
        {error && <div style={{ color: C.danger }}>{error}</div>}
        {!loading && !error && filteredProjects.length === 0 && (
          <div style={{ color: C.text2 }}>Nenhum projeto encontrado.</div>
        )}
        {filteredProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onPress={() => navigate("project-detail", p)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── SCREEN: Search ───────────────────────────────────────────────────────────
function SearchScreen({
  navigate,
}: {
  navigate: (s: Screen, data?: unknown) => void
}) {
  const [query, setQuery] = useState("")
  const { projects, loading, error } = usePublicProjects()
  const results = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.desc.toLowerCase().includes(query.toLowerCase()),
  )
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          padding: "16px 20px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate("home")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: C.text,
          }}
        >
          <ArrowLeft size={22} color={C.text} />
        </button>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.surface2,
            border: `1.5px solid ${C.primary}`,
            borderRadius: 14,
            padding: "10px 14px",
          }}
        >
          <Search size={16} color={C.primary} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
            }}
            placeholder="Buscar..."
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                color: C.text3,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "0 20px 12px" }}>
        <span style={{ fontSize: 12, color: C.text2 }}>
          {results.length} resultado{results.length !== 1 ? "s" : ""} para "
          <span style={{ color: C.primary }}>{query}</span>"
        </span>
      </div>

      <div
        style={{
          padding: "0 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading ? (
          <div style={{ color: C.text2, textAlign: "center", padding: 24 }}>
            Carregando projetos...
          </div>
        ) : error ? (
          <div style={{ color: C.danger, textAlign: "center", padding: 24 }}>
            {error}
          </div>
        ) : results.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: C.text3 }}
          >
            <Search size={40} color={C.text3} style={{ marginBottom: 12 }} />
            <div>Nenhum resultado encontrado</div>
          </div>
        ) : (
          results.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate("project-detail", p)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 14,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                  {p.name}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.price === "Grátis" ? C.success : C.warning,
                  }}
                >
                  {p.price}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.text2,
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}
              >
                {p.desc}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Badge label={p.category} color={C.primary} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate("project-detail", p)
                  }}
                  style={{
                    background: C.primary,
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Ver projeto
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: Project Detail ───────────────────────────────────────────────────
function ProjectDetailScreen({
  project,
  navigate,
}: {
  project: Project
  navigate: (s: Screen, data?: unknown) => void
}) {
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 100,
      }}
    >
      <Header
        onBack={() => navigate("explore")}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Share2 size={20} color={C.text2} />
            </button>
            <button
              onClick={() => navigate("report")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Flag size={20} color={C.text2} />
            </button>
          </div>
        }
      />

      {/* Hero */}
      <div
        style={{
          margin: "0 20px 20px",
          height: 160,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${C.primary}33, ${C.accent}33)`,
          border: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Code2 size={56} color={C.primary} />
      </div>

      <div style={{ padding: "0 20px" }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: C.text,
            marginBottom: 4,
          }}
        >
          {project.name}
        </div>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 12 }}>
          por @{project.dev}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <Badge label={project.category} color={C.primary} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <Badge label={`Versão ${project.version}`} color={C.success} />
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 14,
            color: C.text2,
            lineHeight: 1.7,
            marginBottom: 20,
          }}
        >
          {project.desc}
        </div>

        <div style={{ fontSize: 12, color: C.text3, marginBottom: 20 }}>
          Atualizado em {project.updated}
        </div>

        {/* Security badge */}
        <div
          style={{
            background: C.success + "11",
            border: `1px solid ${C.success}44`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: C.success + "22",
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Shield size={18} color={C.success} />
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.success,
                marginBottom: 3,
              }}
            >
              Arquivo armazenado pelo dev.io
            </div>
            <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>
              Arquivos enviados não são executados no servidor. Testes no navegador
              usam um sandbox isolado e podem ser iniciados pelo proprietário.
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn
            label={
              project.fileName
                ? "Baixar projeto"
                : project.price === "Grátis"
                  ? "Baixar projeto"
                  : `Adquirir — ${project.price}`
            }
            onClick={() =>
              project.fileName
                ? startProjectDownload(String(project.id))
                : navigate("acquire", project)
            }
            full
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => navigate("donate", project)}
              style={{
                flex: 1,
                padding: "12px",
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                color: C.text,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Heart size={15} color={C.danger} /> Apoiar
            </button>
            <button
              style={{
                flex: 1,
                padding: "12px",
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                color: C.text,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Share2 size={15} color={C.primary} /> Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Acquire ─────────────────────────────────────────────────────────
function AcquireScreen({
  project,
  navigate,
}: {
  project: Project
  navigate: (s: Screen, data?: unknown) => void
}) {
  const isFree = project.price === "Grátis"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const acquire = async () => {
    setLoading(true)
    setError("")
    try {
      await addToLibrary(String(project.id))
      if (project.fileName) startProjectDownload(String(project.id))
      navigate("acquire-success", project)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível adicionar o projeto.",
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 32,
      }}
    >
      <Header
        title={isFree ? "Baixar projeto" : "Adquirir projeto"}
        onBack={() => navigate("project-detail", project)}
      />
      <div style={{ padding: "24px 20px" }}>
        {error && (
          <div style={{ color: C.danger, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {/* Project info */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Code2 size={24} color={C.primary} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
              {project.name}
            </div>
            <div style={{ fontSize: 12, color: C.text2 }}>@{project.dev}</div>
            <Badge label={project.category} color={C.primary} />
          </div>
        </div>

        {isFree ? (
          <>
            <div
              style={{
                background: C.success + "11",
                border: `1px solid ${C.success}33`,
                borderRadius: 14,
                padding: 20,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              <CheckCircle
                size={36}
                color={C.success}
                style={{ marginBottom: 8 }}
              />
              <div style={{ fontSize: 16, fontWeight: 700, color: C.success }}>
                Projeto gratuito
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>
                Este projeto está disponível gratuitamente.
              </div>
            </div>
            <Btn
              label={loading ? "Adicionando..." : "Baixar projeto"}
              onClick={acquire}
              full
            />
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: C.text,
                marginBottom: 12,
              }}
            >
              Resumo da aquisição
            </div>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, color: C.text2 }}>
                  {project.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {project.price}
                </span>
              </div>
              <div
                style={{ height: 1, background: C.border, margin: "12px 0" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                  Total
                </span>
                <span
                  style={{ fontSize: 16, fontWeight: 800, color: C.primary }}
                >
                  {project.price}
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.text,
                marginBottom: 12,
              }}
            >
              Forma de pagamento
            </div>
            {["Cartão de crédito", "PIX", "Boleto"].map((m, i) => (
              <div
                key={m}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: i === 0 ? C.primary + "11" : C.surface,
                  border: `1.5px solid ${i === 0 ? C.primary : C.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `2px solid ${i === 0 ? C.primary : C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i === 0 && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: C.primary,
                      }}
                    />
                  )}
                </div>
                <CreditCard size={15} color={i === 0 ? C.primary : C.text3} />
                <span
                  style={{ fontSize: 13, color: i === 0 ? C.text : C.text2 }}
                >
                  {m}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 24 }}>
              <Btn
                label={loading ? "Processando..." : "Confirmar aquisição"}
                onClick={acquire}
                full
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: Acquire Success ──────────────────────────────────────────────────
function AcquireSuccessScreen({
  project,
  navigate,
}: {
  project: Project
  navigate: (s: Screen, data?: unknown) => void
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: C.success + "22",
          border: `2px solid ${C.success}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <CheckCircle size={40} color={C.success} />
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: C.text,
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        Projeto adicionado à sua biblioteca!
      </div>
      <div
        style={{
          fontSize: 14,
          color: C.text2,
          textAlign: "center",
          marginBottom: 32,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: C.text }}>{project.name}</strong> está
        disponível na sua Biblioteca.
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
        }}
      >
        <Btn
          label="Ver na Biblioteca"
          onClick={() => navigate("library")}
          full
        />
        <Btn
          label="Continuar explorando"
          onClick={() => navigate("explore")}
          full
          variant="secondary"
        />
      </div>
    </div>
  )
}

// ─── SCREEN: Donate ───────────────────────────────────────────────────────────
function DonateScreen({
  project,
  navigate,
}: {
  project: Project
  navigate: (s: Screen, data?: unknown) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState("")
  const amounts = [5, 10, 20, 50]
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 32,
      }}
    >
      <Header
        title="Apoiar desenvolvedor"
        onBack={() => navigate("project-detail", project)}
      />
      <div style={{ padding: "24px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: C.danger + "22",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Heart size={26} color={C.danger} />
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.text,
              marginBottom: 4,
            }}
          >
            Apoie quem cria.
          </div>
          <div style={{ fontSize: 13, color: C.text2 }}>
            Sua contribuição ajuda{" "}
            <strong style={{ color: C.text }}>@{project.dev}</strong> a
            continuar desenvolvendo.
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.text,
            marginBottom: 12,
          }}
        >
          Escolha um valor
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {amounts.map((a) => (
            <button
              key={a}
              onClick={() => {
                setSelected(a)
                setCustom("")
              }}
              style={{
                padding: "14px",
                background: selected === a ? C.primary + "22" : C.surface,
                border: `1.5px solid ${selected === a ? C.primary : C.border}`,
                borderRadius: 12,
                color: selected === a ? C.primary : C.text,
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              R$ {a}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>
          Ou insira um valor personalizado
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: C.surface2,
            border: `1.5px solid ${custom ? C.primary : C.border}`,
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 28,
          }}
        >
          <span style={{ color: C.text2, fontSize: 14 }}>R$</span>
          <input
            type="number"
            placeholder="0,00"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value)
              setSelected(null)
            }}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>

        <Btn label="Enviar doação" onClick={() => navigate("home")} full />
      </div>
    </div>
  )
}

// ─── SCREEN: Library ──────────────────────────────────────────────────────────
function LibraryScreen({
  navigate,
}: {
  navigate: (s: Screen, data?: unknown) => void
}) {
  const [tab, setTab] = useState("Todos")
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const tabs = ["Todos", "Instalados", "Favoritos", "Atualizações"]
  useEffect(() => {
    getLibrary()
      .then((response) =>
        setMyProjects(
          response.projects.map(normalizeProject),
        ),
      )
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar a biblioteca.",
        ),
      )
      .finally(() => setLoading(false))
  }, [])
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      <Header title="Biblioteca" />

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          padding: "0 20px 8px",
          gap: 6,
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: `1.5px solid ${tab === t ? C.primary : C.border}`,
              background: tab === t ? C.primary + "22" : "transparent",
              color: tab === t ? C.primary : C.text2,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: "16px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {loading && (
          <div style={{ color: C.text2, fontSize: 13 }}>
            Carregando sua biblioteca...
          </div>
        )}
        {error && <div style={{ color: C.danger, fontSize: 13 }}>{error}</div>}
        {!loading && !error && myProjects.length === 0 && (
          <div style={{ color: C.text2, fontSize: 13 }}>
            Sua biblioteca ainda está vazia.
          </div>
        )}
        {myProjects.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate("project-detail", p)}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 14,
              cursor: "pointer",
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Code2 size={22} color={C.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {p.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: C.text3,
                  marginTop: 2,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                v{p.version}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 6,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: C.success,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: C.success,
                  }}
                >
                  Salvo na biblioteca
                </span>
              </div>
            </div>
            <ChevronRight size={16} color={C.text3} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SCREEN: Publish ──────────────────────────────────────────────────────────
function PublishScreen({
  navigate,
}: {
  navigate: (s: Screen, data?: unknown) => void
}) {
  const [form, setForm] = useState({
    name: "",
    desc: "",
    category: "",
    version: "",
    price: "",
  })
  const [acceptDonations, setAcceptDonations] = useState(false)
  const [sandboxType, setSandboxType] = useState<SandboxType>("auto")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }))
  const publish = async () => {
    if (!form.name || !form.category || !form.version || !file) {
      setError(
        "Informe nome, categoria, versão e selecione um arquivo.",
      )
      return
    }
    setUploading(true)
    setError("")
    try {
      const response = await uploadProject(
        {
          name: form.name,
          description: form.desc,
          category: form.category,
          version: form.version,
          price: form.price,
          sandboxType,
        },
        file,
      )
      navigate("security-check", response.project)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar o projeto.",
      )
    } finally {
      setUploading(false)
    }
  }
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 32,
      }}
    >
      <Header title="Publicar projeto" />
      <div style={{ padding: "16px 20px" }}>
        {error && (
          <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {/* Info banner */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: C.primary + "11",
            border: `1px solid ${C.primary}33`,
            borderRadius: 14,
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <Shield
            size={16}
            color={C.primary}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
            Arquivos ficam no armazenamento privado do Supabase. O dev.io não
            executa uploads no servidor; testes compatíveis rodam em um iframe
            isolado no seu navegador.
          </div>
        </div>

        <Input
          label="Nome do projeto"
          placeholder="Nome do projeto"
          value={form.name}
          onChange={set("name")}
        />

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: C.text2,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Descrição
          </div>
          <textarea
            value={form.desc}
            onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
            placeholder="Descreva o seu projeto..."
            rows={3}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: C.surface2,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              color: C.text,
              fontSize: 14,
              outline: "none",
              resize: "none",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: C.text2,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            Categoria
          </div>
          <select
            value={form.category}
            onChange={(e) => set("category")(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: C.surface2,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              color: form.category ? C.text : C.text3,
              fontSize: 14,
              outline: "none",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }}
          >
            <option value="" disabled>
              Selecionar categoria
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Versão"
          placeholder="1.0.0"
          value={form.version}
          onChange={set("version")}
        />

        <div
          style={{
            background: C.surface,
            border: `2px dashed ${C.border}`,
            borderRadius: 14,
            padding: "24px",
            textAlign: "center",
            marginBottom: 16,
            cursor: "pointer",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null
              setFile(nextFile)
              event.target.value = ""
            }}
          />
          <Upload size={28} color={C.text3} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: C.text2 }}>
            {file ? file.name : "Clique para enviar arquivo"}
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
            Qualquer tipo de arquivo — máx. 100 MB
          </div>
          {file && (
            <div style={{ fontSize: 11, color: C.primary, marginTop: 6 }}>
              {sandboxType === "auto"
                ? `Detectado: ${sandboxTypeLabel(detectSandboxType(file.name, file.type))}`
                : `Tipo selecionado: ${sandboxTypeLabel(sandboxType)}`}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="sandbox-type"
            style={{ display: "block", fontSize: 12, color: C.text2, marginBottom: 6 }}
          >
            Tipo para teste no sandbox
          </label>
          <select
            id="sandbox-type"
            value={sandboxType}
            onChange={(event) => setSandboxType(event.target.value as SandboxType)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: C.surface2,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              color: C.text,
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <option value="auto">Detectar automaticamente</option>
            <option value="html">HTML</option>
            <option value="javascript">JavaScript</option>
            <option value="css">CSS</option>
            <option value="source">Texto/código (somente leitura)</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input
            label="Preço (deixe em branco para gratuito)"
            placeholder="Ex: 9.90"
            value={form.price}
            onChange={set("price")}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setAcceptDonations(!acceptDonations)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: `2px solid ${acceptDonations ? C.primary : C.border}`,
              background: acceptDonations ? C.primary : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {acceptDonations && <Check size={12} color="white" />}
          </button>
          <span style={{ fontSize: 13, color: C.text2 }}>Aceitar doações</span>
        </div>

        <Btn
          label={uploading ? "Enviando arquivo..." : "Publicar projeto"}
          onClick={publish}
          full
        />
      </div>
    </div>
  )
}

function sandboxDocument(type: SandboxType, source: string) {
  const csp = (scripts: string, workers = "worker-src 'none'") =>
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${scripts}; ${workers}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; navigate-to 'none'">`

  if (type === "html") {
    const parsed = new DOMParser().parseFromString(source, "text/html")
    parsed
      .querySelectorAll("script, iframe, object, embed, form, base")
      .forEach((element) => element.remove())
    parsed.querySelectorAll("meta[http-equiv]").forEach((element) => {
      if (element.getAttribute("http-equiv")?.toLowerCase() === "refresh")
        element.remove()
    })
    parsed.querySelectorAll("a[href], area[href]").forEach((element) => {
      element.removeAttribute("href")
    })
    parsed.querySelectorAll("*").forEach((element) => {
      for (const attribute of Array.from(element.attributes)) {
        if (
          attribute.name.toLowerCase().startsWith("on") ||
          attribute.name.toLowerCase() === "srcdoc"
        ) {
          element.removeAttribute(attribute.name)
        }
      }
    })
    parsed.head.insertAdjacentHTML("afterbegin", csp("'none'"))
    return `<!doctype html>${parsed.documentElement.outerHTML}`
  }

  const encodedSource = JSON.stringify(source).replace(/</g, "\\u003c")
  const style = "body{font:14px sans-serif;padding:16px;color:#202030}"
  if (type === "javascript") {
    return `${csp("'unsafe-inline'", "worker-src blob:")}<style>${style}</style><pre id="output">JavaScript sandbox\n</pre><script>
      const source = ${encodedSource};
      const output = document.getElementById("output");
      const code = 'self.console.log=(...values)=>postMessage(values.map(String).join(" "));try{\\n' + source + '\\n}catch(error){postMessage(String(error))}';
      const workerUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
      const worker = new Worker(workerUrl);
      worker.onmessage = event => output.append(document.createTextNode(String(event.data) + "\\n"));
      worker.onerror = event => output.append(document.createTextNode(event.message + "\\n"));
      setTimeout(() => { worker.terminate(); URL.revokeObjectURL(workerUrl); output.append(document.createTextNode("Execução encerrada após 5 segundos.\\n")); }, 5000);
    </script>`
  }
  if (type === "css") {
    return `${csp("'none'")}<style>${style}\n${source}</style><main id="preview">Prévia de CSS</main>`
  }
  return ""
}

function ProjectSandboxScreen({
  project,
  navigate,
}: {
  project: Project
  navigate: (s: Screen, data?: unknown) => void
}) {
  const [storedFile, setStoredFile] = useState<{
    file: Blob | null
    fileName: string
    fileType: string
  } | null>(null)
  const [content, setContent] = useState("")
  const [type, setType] = useState<SandboxType>(() => {
    const requestedType = project.sandboxType as SandboxType | undefined
    return requestedType && requestedType !== "auto"
      ? requestedType
      : detectSandboxType(project.fileName || "", project.fileType)
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getProjectFile(project.id)
      .then((result) => {
        if (active) {
          setStoredFile(result)
          if (project.sandboxType === "auto")
            setType(detectSandboxType(result.fileName, result.fileType))
        }
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o arquivo.",
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [project.id])

  useEffect(() => {
    let active = true
    if (!storedFile || !storedFile.file) {
      setContent("")
      return
    }
    if (type === "unsupported") {
      setContent("")
      setError("")
      return
    }
    if (storedFile.file.size > 2 * 1024 * 1024) {
      setError("A prévia do sandbox é limitada a arquivos de até 2 MB.")
      setContent("")
      return
    }
    storedFile.file
      .text()
      .then((text) => {
        if (active) {
          setError("")
          setContent(text)
        }
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível ler o arquivo para o teste.",
          )
      })
    return () => {
      active = false
    }
  }, [storedFile, type])

  const iframeSource = ["html", "javascript", "css"].includes(type)
    ? sandboxDocument(type, content)
    : ""

  return (
    <div
      className="phone-scroll"
      style={{ width: "100%", height: "100%", background: C.bg, overflowY: "auto" }}
    >
      <Header title="Sandbox de teste" onBack={() => navigate("my-projects")} />
      <div style={{ padding: "20px" }}>
        <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>
          {project.name}
        </div>
        <div style={{ color: C.text2, fontSize: 12, margin: "4px 0 16px" }}>
          {storedFile?.fileName || project.fileName}
        </div>
        <label
          htmlFor="sandbox-preview-type"
          style={{ display: "block", color: C.text2, fontSize: 12, marginBottom: 6 }}
        >
          Tipo detectado (ou selecione manualmente)
        </label>
        <select
          id="sandbox-preview-type"
          value={type}
          onChange={(event) => setType(event.target.value as SandboxType)}
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: 16,
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            color: C.text,
            fontSize: 14,
          }}
        >
          <option value="html">HTML — executar prévia isolada</option>
          <option value="javascript">JavaScript — executar prévia isolada</option>
          <option value="css">CSS — aplicar à prévia isolada</option>
          <option value="source">Texto/código — somente leitura</option>
          <option value="unsupported">Tipo não reconhecido</option>
        </select>
        <div style={{ color: C.warning, fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
          O sandbox não permite acesso à origem da plataforma nem conexões de rede.
          Arquivos não web são exibidos como texto, sem execução.
        </div>
        {loading && <div style={{ color: C.text2 }}>Carregando arquivo...</div>}
        {error && <div style={{ color: C.danger, marginBottom: 12 }}>{error}</div>}
        {!loading && !error && type === "unsupported" && (
          <div style={{ color: C.text2 }}>
            Não foi possível identificar um formato de texto compatível. Você pode
            escolher o tipo manualmente.
          </div>
        )}
        {!loading && !error && type === "source" && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              color: C.text,
              padding: 16,
              maxHeight: "60vh",
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {content}
          </pre>
        )}
        {!loading && !error && iframeSource && (
          <iframe
            title={`Sandbox de ${project.name}`}
            srcDoc={iframeSource}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "60vh",
              background: "white",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: Security Check ───────────────────────────────────────────────────
function SecurityCheckScreen({
  navigate,
  blocked = false,
  project,
}: {
  navigate: (s: Screen, data?: unknown) => void
  blocked?: boolean
  project?: Project
}) {
  const steps = [
    { label: "Arquivo recebido", done: true },
    { label: "Arquivo salvo no Supabase Storage", done: true },
    { label: "Sandbox isolado disponível no navegador", done: true },
  ]
  const done = true
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        title="Arquivo enviado"
        onBack={() => navigate("publish")}
      />
      <div
        style={{
          flex: 1,
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Icon */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: done
                ? blocked
                  ? C.danger + "22"
                  : C.success + "22"
                : C.primary + "22",
              border: `2px solid ${
                done ? (blocked ? C.danger : C.success) : C.primary
              }44`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {done ? (
              blocked ? (
                <XCircle size={32} color={C.danger} />
              ) : (
                <CheckCircle size={32} color={C.success} />
              )
            ) : (
              <CheckCircle size={32} color={C.success} />
            )}
          </div>
        </div>
        {/* Steps */}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}
        >
          {steps.map((s, i) => (
            <div
              key={s.label}
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: s.done
                    ? blocked && i === 3
                      ? C.danger + "22"
                      : C.success + "22"
                    : C.surface2,
                  border: `2px solid ${
                    s.done
                      ? blocked && i === 3
                        ? C.danger
                        : C.success
                      : C.border
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {s.done ? (
                  blocked && i === 3 ? (
                    <X size={13} color={C.danger} />
                  ) : (
                    <Check size={13} color={C.success} />
                  )
                ) : (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.border,
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 14,
                  color: s.done ? C.text : C.text3,
                  fontWeight: s.done ? 500 : 400,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {done && (
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                background: blocked ? C.danger + "11" : C.success + "11",
                border: `1px solid ${blocked ? C.danger : C.success}33`,
                borderRadius: 14,
                padding: "16px",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: blocked ? C.danger : C.success,
                  marginBottom: 6,
                }}
              >
                {blocked ? "Arquivo bloqueado" : "Arquivo armazenado"}
              </div>
              <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
                {blocked
                  ? "O upload foi bloqueado."
                  : "Não foi executada uma análise antivírus. Teste o arquivo somente no sandbox isolado."}
              </div>
            </div>
            {blocked ? (
              <Btn
                label="Revisar arquivo"
                onClick={() => navigate("publish")}
                full
                variant="danger"
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {project && (
                  <Btn
                    label="Testar no sandbox"
                    onClick={() => navigate("sandbox", project)}
                    full
                  />
                )}
                <Btn
                  label="Meus projetos"
                  onClick={() => navigate("my-projects")}
                  full
                  variant="secondary"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: My Projects ──────────────────────────────────────────────────────
function MyProjectsScreen({
  navigate,
}: {
  navigate: (s: Screen, data?: unknown) => void
}) {
  const [tab, setTab] = useState("Todos")
  const tabs = ["Todos", "Enviados"]
  const [projects, setProjects] = useState<Project[]>([])
  const [editing, setEditing] = useState<Project | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    version: "",
    price: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getMyProjects()
      .then((response) =>
        setProjects(
          response.projects.map(normalizeProject),
        ),
      )
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar seus projetos.",
        ),
      )
      .finally(() => setLoading(false))
  }, [])
  const startEditing = (project: Project) => {
    setEditing(project)
    setEditForm({
      name: project.name,
      description: project.desc,
      category: project.category,
      version: project.version,
      price:
        project.price === "Grátis" ? "" : project.price.replace(/^R\$\s*/, ""),
    })
  }
  const saveEditing = async () => {
    if (!editing) return
    try {
      const response = await updateProject(String(editing.id), editForm)
      setProjects((current) =>
        current.map((project) =>
          project.id === editing.id
            ? normalizeProject(response.project)
            : project,
        ),
      )
      setEditing(null)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o projeto.",
      )
    }
  }
  const removeProject = async (project: Project) => {
    if (
      !window.confirm(
        `Excluir \"${project.name}\"? Esta ação remove também o arquivo enviado.`,
      )
    )
      return
    try {
      await deleteProject(String(project.id))
      setProjects((current) => current.filter((item) => item.id !== project.id))
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir o projeto.",
      )
    }
  }
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      <Header
        title="Meus Projetos"
        right={
          <button
            onClick={() => navigate("publish")}
            style={{
              background: C.primary,
              border: "none",
              borderRadius: 10,
              padding: "7px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Plus size={14} color="white" />
            <span
              style={{
                fontSize: 12,
                color: "white",
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Novo
            </span>
          </button>
        }
      />

      <div
        style={{
          display: "flex",
          padding: "16px 20px 8px",
          gap: 8,
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 14px",
              borderRadius: 20,
              border: `1.5px solid ${tab === t ? C.primary : C.border}`,
              background: tab === t ? C.primary + "22" : "transparent",
              color: tab === t ? C.primary : C.text2,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: "0 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {error && <div style={{ color: C.danger, fontSize: 13 }}>{error}</div>}
        {loading && (
          <div style={{ color: C.text2, fontSize: 13 }}>
            Carregando projetos...
          </div>
        )}
        {editing && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ color: C.text, fontWeight: 700, marginBottom: 12 }}>
              Editar projeto
            </div>
            <Input
              label="Nome"
              value={editForm.name}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, name: value }))
              }
            />
            <Input
              label="Descrição"
              value={editForm.description}
              onChange={(value) =>
                setEditForm((current) => ({ ...current, description: value }))
              }
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              <Input
                label="Categoria"
                value={editForm.category}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, category: value }))
                }
              />
              <Input
                label="Versão"
                value={editForm.version}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, version: value }))
                }
              />
              <Input
                label="Preço"
                value={editForm.price}
                onChange={(value) =>
                  setEditForm((current) => ({ ...current, price: value }))
                }
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn label="Salvar alterações" onClick={saveEditing} small />
              <Btn
                label="Cancelar"
                onClick={() => setEditing(null)}
                variant="secondary"
                small
              />
            </div>
          </div>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Code2 size={20} color={C.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.text3,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  v{p.version}
                </div>
              </div>
              <Badge label="Enviado" color={C.primary} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn
                label="Editar"
                onClick={() => startEditing(p)}
                variant="secondary"
                small
              />
              {p.fileName && (
                <>
                  <Btn
                    label="Testar"
                    onClick={() => navigate("sandbox", p)}
                    variant="secondary"
                    small
                  />
                  <Btn
                    label="Baixar"
                    onClick={() => startProjectDownload(String(p.id))}
                    small
                  />
                </>
              )}
              <Btn
                label="Excluir"
                onClick={() => removeProject(p)}
                variant="danger"
                small
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SCREEN: Profile ──────────────────────────────────────────────────────────
function ProfileScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [savedProjects, setSavedProjects] = useState<ApiProject[]>([])
  const [stats, setStats] = useState<{
    projectCount: number
    savedProjectCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then(async (response) => {
        if (!active) return
        setProfile(response.user)
        setStats(response.stats)
        if (response.user) {
          try {
            const library = await getLibrary()
            if (active) setSavedProjects(library.projects)
          } catch (reason) {
            if (active) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Não foi possível carregar sua biblioteca.",
              )
            }
          }
        }
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar seu perfil.",
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      <Header title="Meu perfil" right={profile ? <button
        onClick={() => navigate("settings")}
        aria-label="Configurações"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      ><Settings size={22} color={C.text2} /></button> : undefined} />
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: C.text2 }}>Carregando perfil...</div>
      ) : !profile ? (
        <div style={{ padding: "48px 28px", textAlign: "center" }}>
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ color: C.text2, marginBottom: 20 }}>Entre na sua conta para acessar seu perfil.</div>
          <Btn label="Entrar" onClick={() => navigate("login")} full />
        </div>
      ) : (
        <>
          <div style={{ padding: "24px 20px", textAlign: "center" }}>
            <div style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              margin: "0 auto 12px",
              overflow: "hidden",
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "white",
              border: `3px solid ${C.border}`,
            }}>
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={`Foto de ${profile.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : profile.name.trim().charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: C.primary }}>@{profile.username}</div>
            <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>{profile.email}</div>
            <div style={{ fontSize: 11, color: profile.emailVerified ? C.success : C.warning, marginTop: 4 }}>
              {profile.emailVerified ? "E-mail confirmado" : "E-mail aguardando confirmação"}
            </div>
            <div style={{ fontSize: 13, color: C.text2, marginTop: 10, lineHeight: 1.5 }}>
              {profile.bio || "Adicione uma biografia para contar sobre você."}
            </div>
            {error && <div style={{ color: C.danger, fontSize: 12, marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{stats?.projectCount ?? 0}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>Projetos</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{stats?.savedProjectCount ?? 0}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>Na biblioteca</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
              <Btn label="Editar perfil" onClick={() => navigate("profile-edit")} variant="secondary" small />
              <Btn label="Meus projetos" onClick={() => navigate("my-projects")} small />
            </div>
          </div>
          <div style={{ height: 1, background: C.border, margin: "0 20px" }} />
          <div style={{ padding: "20px 20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Minha biblioteca</div>
              <button onClick={() => navigate("library")} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                Ver tudo
              </button>
            </div>
            {savedProjects.length ? (
              savedProjects.slice(0, 5).map((project) => (
                <button key={project.id} onClick={() => navigate("library")} style={{
                  width: "100%",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "12px 0",
                  background: "none",
                  border: "none",
                  borderBottom: `1px solid ${C.border}`,
                  cursor: "pointer",
                  textAlign: "left",
                }}>
                  <Package size={18} color={C.primary} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13, color: C.text }}>{project.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: C.text3 }}>{project.category}</span>
                  </span>
                  <ChevronRight size={14} color={C.text3} />
                </button>
              ))
            ) : (
              <div style={{ color: C.text3, fontSize: 13, padding: "10px 0" }}>Sua biblioteca ainda está vazia.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ProfileEditScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [form, setForm] = useState({ name: "", username: "", email: "", bio: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const [error, setError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => {
        if (!user) {
          navigate("login")
          return
        }
        setProfile(user)
        setForm({ name: user.name, username: user.username, email: user.email, bio: user.bio })
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar o perfil."))
      .finally(() => setLoading(false))
  }, [])

  const updateField = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setPhotoError("Escolha uma imagem JPEG, PNG ou WebP de até 2 MB.")
      return
    }
    setPhotoError("")
    try {
      const response = await uploadAvatar(file)
      setProfile((current) => current ? { ...current, avatarUrl: response.avatarUrl } : current)
    } catch (reason) {
      setPhotoError(reason instanceof Error ? reason.message : "Não foi possível salvar a foto.")
    }
  }

  const clearPhoto = async () => {
    setPhotoError("")
    try {
      await removeAvatar()
      setProfile((current) => current ? { ...current, avatarUrl: null } : current)
    } catch (reason) {
      setPhotoError(reason instanceof Error ? reason.message : "Não foi possível remover a foto.")
    }
  }

  const save = async () => {
    if (!profile) return
    setSaving(true)
    setError("")
    try {
      const response = await updateProfile(form)
      if (response.user.email !== profile.email) {
        sessionStorage.setItem("devio_pending_email", response.user.email)
        sessionStorage.setItem("devio_confirmation_email_sent", String(response.emailSent))
        sessionStorage.setItem("devio_pending_email_change", "true")
        navigate("email-confirmation")
        return
      }
      navigate("profile")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o perfil.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="phone-scroll" style={{ width: "100%", height: "100%", background: C.bg, overflowY: "auto" }}>
      <Header title="Editar perfil" onBack={() => navigate("profile")} />
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: C.text2 }}>Carregando perfil...</div>
      ) : profile ? (
        <div style={{ padding: "24px 28px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", overflow: "hidden", background: C.surface2, display: "grid", placeItems: "center", marginBottom: 12 }}>
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={`Foto de ${profile.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <User size={36} color={C.text3} />}
            </div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} style={{ display: "none" }} />
            <Btn label="Adicionar ou alterar foto" onClick={() => fileInput.current?.click()} variant="secondary" small />
            {profile.avatarUrl && <button onClick={clearPhoto} style={{ marginTop: 10, border: "none", background: "none", color: C.danger, cursor: "pointer" }}>Remover foto</button>}
            {photoError && <div style={{ color: C.danger, fontSize: 12, marginTop: 10 }}>{photoError}</div>}
          </div>
          {error && <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>{error}</div>}
          <Input label="Nome" value={form.name} onChange={updateField("name")} />
          <Input label="Nome de usuário" value={form.username} onChange={updateField("username")} />
          <Input label="E-mail" type="email" value={form.email} onChange={updateField("email")} />
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: C.text2, marginBottom: 6 }}>Biografia</label>
            <textarea value={form.bio} maxLength={280} onChange={(event) => updateField("bio")(event.target.value)} rows={4} style={{
              width: "100%",
              padding: "12px 14px",
              background: C.surface2,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              color: C.text,
              fontSize: 14,
              outline: "none",
              resize: "vertical",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }} />
            <div style={{ textAlign: "right", color: C.text3, fontSize: 11 }}>{form.bio.length}/280</div>
          </div>
          <Btn label={saving ? "Salvando..." : "Salvar alterações"} onClick={save} full />
        </div>
      ) : (
        <div style={{ padding: 28, textAlign: "center", color: C.text2 }}>Faça login para editar seu perfil.</div>
      )}
    </div>
  )
}

// ─── SCREEN: Settings ────────────────────────────────────────────────────────
function SettingsScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [logoutError, setLogoutError] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckError, setAdminCheckError] = useState("")
  useEffect(() => {
    let active = true
    getCurrentUser()
      .then(({ user }) => {
        if (active) setIsAdmin(Boolean(user?.isAdmin))
      })
      .catch((reason) => {
        if (active)
          setAdminCheckError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível verificar as permissões administrativas.",
          )
      })
    return () => {
      active = false
    }
  }, [])
  const logout = async () => {
    setLogoutError("")
    setLoggingOut(true)
    try {
      await logoutAccount()
      navigate("login")
    } catch (reason) {
      setLogoutError(
        reason instanceof Error ? reason.message : "Não foi possível encerrar a sessão.",
      )
    } finally {
      setLoggingOut(false)
    }
  }
  const groups = [
    {
      title: "Conta",
      items: [
        { icon: User, label: "Informações pessoais" },
        { icon: Lock, label: "Segurança e senha" },
      ],
    },
    {
      title: "Preferências",
      items: [
        { icon: BellIcon, label: "Notificações" },
        { icon: Moon, label: "Aparência" },
        { icon: Globe, label: "Privacidade" },
      ],
    },
    {
      title: "Legal",
      items: [
        { icon: FileText, label: "Termos de uso" },
        { icon: Shield, label: "Política de privacidade" },
      ],
    },
  ]
  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      <Header title="Configurações" onBack={() => navigate("profile")} />
      <div style={{ padding: "16px 20px 24px" }}>
        {logoutError && <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>{logoutError}</div>}
        {adminCheckError && <div style={{ color: C.danger, fontSize: 12, marginBottom: 16 }}>{adminCheckError}</div>}
        {groups.map((g) => (
          <div key={g.title} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.text3,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {g.title}
            </div>

            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {g.items.map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderBottom:
                      i < g.items.length - 1 ? `1px solid ${C.border}` : "none",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    item.label === "Informações pessoais"
                      ? navigate("profile-edit")
                      : item.label === "Segurança e senha" &&
                        navigate("password-change")
                  }
                >
                  <item.icon size={18} color={C.text2} />
                  <span style={{ flex: 1, fontSize: 14, color: C.text }}>
                    {item.label}
                  </span>
                  <ChevronRight size={14} color={C.text3} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {isAdmin && (
          <button
            onClick={() => navigate("admin")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 16,
              padding: "14px 16px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              color: C.text,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              textAlign: "left",
            }}
          >
            <Shield size={18} color={C.primary} />
            <span style={{ flex: 1, fontSize: 14 }}>Painel administrativo</span>
            <ChevronRight size={14} color={C.text3} />
          </button>
        )}

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <button
            onClick={logout}
            disabled={loggingOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <LogOut size={18} color={C.danger} />
            <span
              style={{
                fontSize: 14,
                color: C.danger,
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {loggingOut ? "Saindo..." : "Sair da conta"}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [tab, setTab] = useState<"users" | "projects">("users")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [projectsHasMore, setProjectsHasMore] = useState(false)
  const [userPage, setUserPage] = useState(1)
  const [projectPage, setProjectPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    const request =
      tab === "users" ? getAdminUsers(userPage) : getAdminProjects(projectPage)
    request
      .then((response) => {
        if (!active) return
        if ("users" in response) {
          setUsers(response.users)
          setUsersHasMore(response.hasMore)
        } else {
          setProjects(response.projects)
          setProjectsHasMore(response.hasMore)
        }
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar os dados administrativos.",
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tab, userPage, projectPage, refreshKey])

  const toggleBlock = async (user: AdminUser) => {
    const action = user.blocked ? "desbloquear" : "bloquear"
    if (!window.confirm(`Deseja ${action} ${user.email}?`)) return
    setBusyId(user.id)
    setError("")
    try {
      await setAdminUserBlocked(user.id, !user.blocked)
      setRefreshKey((key) => key + 1)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível alterar o bloqueio.",
      )
    } finally {
      setBusyId("")
    }
  }

  const removeUser = async (user: AdminUser) => {
    if (
      !window.confirm(
        `Excluir ${user.email}? A conta, o perfil, as submissões, os arquivos e os itens da biblioteca serão removidos permanentemente.`,
      )
    )
      return
    setBusyId(user.id)
    setError("")
    try {
      await deleteAdminUser(user.id)
      setRefreshKey((key) => key + 1)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir o usuário.",
      )
    } finally {
      setBusyId("")
    }
  }

  const removeProject = async (project: AdminProject) => {
    if (
      !window.confirm(
        `Excluir a submissão “${project.name}” e o arquivo armazenado?`,
      )
    )
      return
    setBusyId(project.id)
    setError("")
    try {
      await deleteAdminProject(project.id)
      setRefreshKey((key) => key + 1)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir a submissão.",
      )
    } finally {
      setBusyId("")
    }
  }

  const toggleProjectBlock = async (project: AdminProject) => {
    const action = project.blocked ? "desbloquear" : "bloquear"
    if (!window.confirm(`Deseja ${action} a submissão “${project.name}”?`)) return
    setBusyId(project.id)
    setError("")
    try {
      await setAdminProjectBlocked(project.id, !project.blocked)
      setRefreshKey((key) => key + 1)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível alterar o bloqueio da submissão.",
      )
    } finally {
      setBusyId("")
    }
  }

  const page = tab === "users" ? userPage : projectPage
  const hasMore = tab === "users" ? usersHasMore : projectsHasMore
  const changePage = (direction: -1 | 1) => {
    if (tab === "users") setUserPage((value) => Math.max(1, value + direction))
    else setProjectPage((value) => Math.max(1, value + direction))
  }

  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 80,
      }}
    >
      <Header title="Administração" onBack={() => navigate("settings")} />
      <div style={{ padding: "20px 20px 32px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {(["users", "projects"] as const).map((value) => {
            const selected = tab === value
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                style={{
                  flex: 1,
                  padding: "11px 12px",
                  border: `1px solid ${selected ? C.primary : C.border}`,
                  borderRadius: 12,
                  background: selected ? C.primary + "22" : C.surface,
                  color: selected ? C.primary : C.text2,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {value === "users" ? "Usuários" : "Submissões"}
              </button>
            )
          })}
        </div>

        {error && (
          <div
            role="alert"
            style={{ color: C.danger, fontSize: 13, marginBottom: 16 }}
          >
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ color: C.text2, textAlign: "center", padding: 28 }}>
            Carregando...
          </div>
        ) : tab === "users" ? (
          users.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 15,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: C.text,
                          fontSize: 14,
                          fontWeight: 600,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {user.name || user.username || user.email}
                      </div>
                      <div
                        style={{
                          color: C.text2,
                          fontSize: 12,
                          marginTop: 4,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {user.email}
                      </div>
                      {user.username && (
                        <div style={{ color: C.text3, fontSize: 12, marginTop: 3 }}>
                          @{user.username}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        flexShrink: 0,
                        alignSelf: "flex-start",
                        color: user.isAdmin
                          ? C.primary
                          : user.blocked
                            ? C.danger
                            : C.success,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {user.isAdmin ? "ADMIN" : user.blocked ? "BLOQUEADO" : "ATIVO"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => toggleBlock(user)}
                      disabled={Boolean(busyId) || user.isAdmin}
                      style={{
                        flex: 1,
                        padding: "9px 10px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 9,
                        background: C.surface2,
                        color: C.text,
                        cursor: user.isAdmin ? "not-allowed" : "pointer",
                        opacity: user.isAdmin ? 0.5 : 1,
                        fontSize: 12,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {busyId === user.id
                        ? "Aguarde..."
                        : user.blocked
                          ? "Desbloquear"
                          : "Bloquear"}
                    </button>
                    <button
                      onClick={() => removeUser(user)}
                      disabled={Boolean(busyId) || user.isAdmin}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "9px 10px",
                        border: `1px solid ${C.danger}55`,
                        borderRadius: 9,
                        background: C.danger + "12",
                        color: C.danger,
                        cursor: user.isAdmin ? "not-allowed" : "pointer",
                        opacity: user.isAdmin ? 0.5 : 1,
                        fontSize: 12,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  </div>
                  <div style={{ color: C.text3, fontSize: 11, marginTop: 10 }}>
                    Cadastro: {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.text2, textAlign: "center", padding: 28 }}>
              Nenhum usuário nesta página.
            </div>
          )
        ) : projects.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: 15,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 600,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {project.name}
                  </div>
                  <div style={{ color: C.text2, fontSize: 12, marginTop: 4 }}>
                    {project.ownerName} · {project.category}
                    {project.blocked ? " · BLOQUEADA" : ""}
                  </div>
                  <div style={{ color: C.text3, fontSize: 11, marginTop: 4 }}>
                    {project.fileName} ·{" "}
                    {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div style={{ display: "flex", flexShrink: 0, gap: 7 }}>
                  <button
                    onClick={() => toggleProjectBlock(project)}
                    disabled={Boolean(busyId)}
                    style={{
                      padding: "8px 9px",
                      border: `1px solid ${C.border}`,
                      borderRadius: 9,
                      background: C.surface2,
                      color: C.text,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {busyId === project.id
                      ? "..."
                      : project.blocked
                        ? "Desbloquear"
                        : "Bloquear"}
                  </button>
                  <button
                    onClick={() => removeProject(project)}
                    disabled={Boolean(busyId)}
                    aria-label={`Excluir submissão ${project.name}`}
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      border: `1px solid ${C.danger}55`,
                      borderRadius: 10,
                      background: C.danger + "12",
                      color: C.danger,
                      cursor: "pointer",
                    }}
                  >
                    {busyId === project.id ? "…" : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: C.text2, textAlign: "center", padding: 28 }}>
            Nenhuma submissão nesta página.
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
            marginTop: 20,
          }}
        >
          <button
            onClick={() => changePage(-1)}
            disabled={page <= 1 || loading}
            style={{
              background: "none",
              border: "none",
              color: page <= 1 ? C.text3 : C.text,
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Anterior
          </button>
          <span style={{ color: C.text2, fontSize: 12 }}>Página {page}</span>
          <button
            onClick={() => changePage(1)}
            disabled={!hasMore || loading}
            style={{
              background: "none",
              border: "none",
              color: !hasMore ? C.text3 : C.text,
              cursor: !hasMore ? "not-allowed" : "pointer",
            }}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Report ───────────────────────────────────────────────────────────
function ReportScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [selected, setSelected] = useState("")
  const [desc, setDesc] = useState("")
  const [sent, setSent] = useState(false)
  const options = [
    "Conteúdo malicioso",
    "Violação de direitos",
    "Spam",
    "Conteúdo inadequado",
    "Outro",
  ]

  if (sent) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: C.success + "22",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <CheckCircle size={36} color={C.success} />
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Denúncia enviada!
        </div>
        <div
          style={{
            fontSize: 13,
            color: C.text2,
            textAlign: "center",
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Nossa equipe irá analisar o conteúdo em até 24h.
        </div>
        <Btn label="Voltar ao início" onClick={() => navigate("home")} full />
      </div>
    )
  }

  return (
    <div
      className="phone-scroll"
      style={{
        width: "100%",
        height: "100%",
        background: C.bg,
        overflowY: "auto",
        paddingBottom: 32,
      }}
    >
      <Header
        title="Reportar conteúdo"
        onBack={() => navigate("project-detail")}
      />
      <div style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>
          Selecione o motivo da denúncia:
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {options.map((o) => (
            <button
              key={o}
              onClick={() => setSelected(o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 16px",
                background: selected === o ? C.danger + "11" : C.surface,
                border: `1.5px solid ${selected === o ? C.danger : C.border}`,
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `2px solid ${selected === o ? C.danger : C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {selected === o && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.danger,
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: selected === o ? C.text : C.text2,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {o}
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              color: C.text2,
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            Descreva o problema
          </div>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descreva com detalhes..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: C.surface2,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              color: C.text,
              fontSize: 13,
              outline: "none",
              resize: "none",
              fontFamily: "Inter, sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>

        <Btn
          label="Enviar denúncia"
          onClick={() => setSent(true)}
          full
          variant="danger"
        />
      </div>
    </div>
  )
}

// ─── PRESENTATION COVER ───────────────────────────────────────────────────────
function CoverOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,14,0.92)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 28,
          maxWidth: 340,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
            width: 56,
            height: 56,
            borderRadius: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Code2 size={26} color="white" />
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.primary,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Plataforma para projetos digitais
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.text,
            marginBottom: 4,
          }}
        >
          dev<span style={{ color: C.primary }}>.io</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.text2,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          Compartilhe, valide e explore projetos em um só lugar.
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 16 }} />
        <div
          style={{
            fontSize: 13,
            color: C.text,
            fontWeight: 600,
            marginBottom: 2,
          }}
        >
          dev.io
        </div>
        <div style={{ fontSize: 12, color: C.text3 }}>
          Workspace de projetos
        </div>
        <div style={{ marginTop: 24 }}>
          <Btn label="Continuar" onClick={onClose} full />
        </div>
      </div>
    </div>
  )
}

// ─── Phone Shell ──────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const searchParams = new URLSearchParams(window.location.search)
    if (
      searchParams.has("confirmEmail") ||
      params.has("confirmEmail") ||
      params.get("type") === "signup" ||
      params.get("type") === "email_change"
    )
      return "email-confirmation"
    if (
      searchParams.has("resetPassword") ||
      params.has("resetPassword") ||
      params.get("type") === "recovery"
    )
      return "password-reset"
    return "splash"
  })
  const [history, setHistory] = useState<Screen[]>([])
  const [projectData, setProjectData] = useState<Project | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    let active = true
    hasActiveSession()
      .then((hasSession) => {
        if (!active) return
        if (hasSession && screen === "splash") setScreen("home")
        setAuthLoaded(true)
      })
      .catch((reason) => {
        if (!active) return
        setAuthError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível restaurar a sessão.",
        )
        setAuthLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  const navigate = (s: Screen, data?: unknown) => {
    setHistory((h) => [...h, screen])
    if (data && typeof data === "object")
      setProjectData(data as Project)
    setScreen(s)
  }

  const goBack = () => {
    const prev = history[history.length - 1]
    if (prev) {
      setHistory((h) => h.slice(0, -1))
      setScreen(prev)
    }
  }

  const mainTabs: Screen[] = [
    "home",
    "explore",
    "publish",
    "library",
    "profile",
  ]

  const renderScreen = () => {
    switch (screen) {
      case "splash":
        return (
          <SplashScreen
            navigate={navigate}
            authLoaded={authLoaded}
            error={authError}
          />
        )
      case "login":
        return <LoginScreen navigate={navigate} />
      case "register":
        return <RegisterScreen navigate={navigate} />
      case "email-confirmation":
        return <EmailConfirmationScreen navigate={navigate} />
      case "password-reset":
        return <PasswordResetScreen navigate={navigate} />
      case "password-change":
        return <PasswordChangeScreen navigate={navigate} />
      case "home":
        return <HomeScreen navigate={navigate} />
      case "explore":
        return <ExploreScreen navigate={navigate} />
      case "search":
        return <SearchScreen navigate={navigate} />
      case "project-detail":
        return projectData ? (
          <ProjectDetailScreen project={projectData} navigate={navigate} />
        ) : (
          <HomeScreen navigate={navigate} />
        )
      case "acquire":
        return projectData ? (
          <AcquireScreen project={projectData} navigate={navigate} />
        ) : (
          <HomeScreen navigate={navigate} />
        )
      case "acquire-success":
        return projectData ? (
          <AcquireSuccessScreen project={projectData} navigate={navigate} />
        ) : (
          <HomeScreen navigate={navigate} />
        )
      case "donate":
        return projectData ? (
          <DonateScreen project={projectData} navigate={navigate} />
        ) : (
          <HomeScreen navigate={navigate} />
        )
      case "library":
        return <LibraryScreen navigate={navigate} />
      case "publish":
        return <PublishScreen navigate={navigate} />
      case "security-check":
        return projectData ? (
          <SecurityCheckScreen navigate={navigate} project={projectData} />
        ) : (
          <HomeScreen navigate={navigate} />
        )
      case "security-blocked":
        return projectData ? (
          <SecurityCheckScreen
            navigate={navigate}
            blocked
            project={projectData}
          />
        ) : (
          <HomeScreen navigate={navigate} />
        )
      case "sandbox":
        return projectData ? (
          <ProjectSandboxScreen project={projectData} navigate={navigate} />
        ) : (
          <HomeScreen navigate={navigate} />
        )
      case "my-projects":
        return <MyProjectsScreen navigate={navigate} />
      case "profile":
        return <ProfileScreen navigate={navigate} />
      case "profile-edit":
        return <ProfileEditScreen navigate={navigate} />
      case "settings":
        return <SettingsScreen navigate={navigate} />
      case "admin":
        return <AdminScreen navigate={navigate} />
      case "report":
        return <ReportScreen navigate={navigate} />
      default:
        return <HomeScreen navigate={navigate} />
    }
  }

  const showBottomNav = mainTabs.includes(screen)
  const activeTab = mainTabs.includes(screen) ? screen : "home"

  return (
    <div className="desktop-app">
      {showBottomNav && (
        <aside className="desktop-sidebar">
          <div className="desktop-brand">
            <Code2 size={22} color={C.primary} />
            <span>
              dev<span style={{ color: C.primary }}>.io</span>
            </span>
          </div>
          <div className="desktop-nav-caption">Workspace</div>
          <BottomNav active={activeTab} navigate={navigate} />
        </aside>
      )}
      <main
        className={`desktop-content${
          showBottomNav ? "" : " desktop-content-auth"
        }`}
      >
        {renderScreen()}
      </main>
    </div>
  )
}
