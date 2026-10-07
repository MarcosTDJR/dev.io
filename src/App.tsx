import { useState, useEffect, useRef } from 'react'
import {
  Home, Compass, Upload, BookOpen, User,
  Search, Bell, ChevronRight, ChevronLeft, X,
  Star, Download, Heart, Share2, Shield,
  CheckCircle, XCircle, Clock, Code2, Package,
  Zap, Globe, Puzzle, Wrench, Gamepad2,
  ArrowLeft, MoreVertical, Settings, LogOut,
  Eye, EyeOff, Check, AlertTriangle, Info,
  Plus, Filter, SortAsc, Edit3, Trash2,
  FileCode, Lock, Bell as BellIcon, Moon,
  FileText, Flag, Send, DollarSign, CreditCard,
  Loader, RefreshCw, TrendingUp, Users, Archive,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen =
  | 'splash' | 'login' | 'register'
  | 'home' | 'explore' | 'search' | 'project-detail'
  | 'acquire' | 'acquire-success' | 'donate'
  | 'library' | 'publish' | 'security-check' | 'security-blocked'
  | 'my-projects' | 'profile' | 'settings' | 'report'

// ─── Shared colour tokens ─────────────────────────────────────────────────────
const C = {
  bg: '#08080e',
  surface: '#10101a',
  surface2: '#18182a',
  surface3: '#20203a',
  border: '#2a2a44',
  primary: '#4f6ef7',
  primaryDim: '#3a54d4',
  accent: '#7c3aed',
  cyan: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#f0f0ff',
  text2: '#9090b8',
  text3: '#55557a',
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const PROJECTS = [
  { id: 1, name: 'DevTools React', dev: 'marcos_dev', category: 'Ferramentas', price: 'Grátis', rating: 4.8, downloads: 12400, tech: ['React', 'TypeScript'], version: '2.1.0', updated: '12 set 2026', verified: true, desc: 'Suite completa de ferramentas de desenvolvimento para projetos React. Inclui debugger, profiler e muito mais.' },
  { id: 2, name: 'API Helper', dev: 'luisa_code', category: 'Bibliotecas', price: 'R$ 9,90', rating: 4.6, downloads: 8700, tech: ['Node.js', 'REST'], version: '1.4.2', updated: '5 set 2026', verified: true, desc: 'Biblioteca para construção e teste de APIs REST com facilidade.' },
  { id: 3, name: 'UI Components', dev: 'studio_pixel', category: 'Bibliotecas', price: 'Grátis', rating: 4.9, downloads: 31000, tech: ['Vue', 'CSS'], version: '3.0.1', updated: '1 set 2026', verified: true, desc: 'Componentes de UI modernos e acessíveis para Vue 3.' },
  { id: 4, name: 'CodeSnap', dev: 'rafael_ti', category: 'Aplicativos', price: 'Grátis', rating: 4.5, downloads: 5200, tech: ['Electron', 'JS'], version: '1.2.0', updated: '20 ago 2026', verified: true, desc: 'Gere screenshots bonitas do seu código para compartilhar.' },
  { id: 5, name: 'FluxDB', dev: 'ana_backend', category: 'Ferramentas', price: 'R$ 19,90', rating: 4.7, downloads: 9100, tech: ['Rust', 'SQL'], version: '0.9.5', updated: '15 ago 2026', verified: false, desc: 'Banco de dados embarcado ultrarrápido para aplicações desktop.' },
  { id: 6, name: 'GitFlow Plugin', dev: 'devstudio_br', category: 'Plugins', price: 'Grátis', rating: 4.4, downloads: 22000, tech: ['VS Code'], version: '1.8.3', updated: '10 ago 2026', verified: true, desc: 'Plugin para VS Code que automatiza fluxo GitFlow.' },
]

const CATEGORIES = [
  { label: 'Aplicativos', icon: Package, color: C.primary },
  { label: 'Websites', icon: Globe, color: C.cyan },
  { label: 'Bibliotecas', icon: BookOpen, color: C.accent },
  { label: 'Plugins', icon: Puzzle, color: '#f472b6' },
  { label: 'Ferramentas', icon: Wrench, color: C.warning },
  { label: 'Jogos', icon: Gamepad2, color: C.success },
  { label: 'APIs', icon: Code2, color: '#fb923c' },
  { label: 'Outros', icon: Archive, color: C.text3 },
]

// ─── Reusable micro-components ───────────────────────────────────────────────
function Btn({ label, onClick, variant = 'primary', full = false, small = false }: {
  label: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; full?: boolean; small?: boolean
}) {
  const base = `inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 cursor-pointer ${full ? 'w-full' : ''} ${small ? 'px-3 py-1.5 text-xs' : 'px-5 py-3 text-sm'}`
  const styles: Record<string, string> = {
    primary: `bg-[${C.primary}] text-white hover:opacity-90`,
    secondary: `bg-[${C.surface2}] text-[${C.text}] border border-[${C.border}] hover:bg-[${C.surface3}]`,
    ghost: `text-[${C.primary}] hover:bg-[${C.surface2}]`,
    danger: `bg-[${C.danger}] text-white hover:opacity-90`,
  }
  const inlineStyle: React.CSSProperties = {
    background: variant === 'primary' ? C.primary : variant === 'danger' ? C.danger : variant === 'secondary' ? C.surface2 : 'transparent',
    color: variant === 'ghost' ? C.primary : C.text,
    border: variant === 'secondary' ? `1px solid ${C.border}` : 'none',
    width: full ? '100%' : undefined,
    padding: small ? '6px 12px' : '12px 20px',
    fontSize: small ? '12px' : '14px',
    fontWeight: 600,
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
  }
  return <button style={inlineStyle} onClick={onClick} className={base}>{label}</button>
}

function Input({ label, type = 'text', placeholder, value, onChange, error }: {
  label?: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void; error?: string
}) {
  const [focused, setFocused] = useState(false)
  const [showPw, setShowPw] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontSize: 12, color: C.text2, marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        <input
          type={type === 'password' && showPw ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '13px 16px', paddingRight: type === 'password' ? 44 : 16,
            background: C.surface2, border: `1.5px solid ${error ? C.danger : focused ? C.primary : C.border}`,
            borderRadius: 12, color: C.text, fontSize: 14, outline: 'none',
            fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
          }}
        />
        {type === 'password' && (
          <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 4 }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{error}</div>}
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <Star size={12} fill={C.warning} color={C.warning} />
      <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{rating}</span>
    </span>
  )
}

function Badge({ label, color = C.primary }: { label: string; color?: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: color + '22', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.02em' }}>
      {label}
    </span>
  )
}

function ProjectCard({ project, onPress }: { project: typeof PROJECTS[0]; onPress: () => void }) {
  return (
    <div
      onClick={onPress}
      style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: 12, cursor: 'pointer', transition: 'border-color 0.2s',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${C.border}`,
      }}>
        <Code2 size={22} color={C.primary} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{project.name}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: project.price === 'Grátis' ? C.success : C.warning, whiteSpace: 'nowrap', marginLeft: 8 }}>{project.price}</span>
        </div>
        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>@{project.dev}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Badge label={project.category} color={C.primary} />
          <StarRating rating={project.rating} />
          {project.verified && <Shield size={11} color={C.success} />}
        </div>
      </div>
    </div>
  )
}

function BottomNav({ active, navigate }: { active: string; navigate: (s: Screen) => void }) {
  const items = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'explore', label: 'Explorar', icon: Compass },
    { id: 'publish', label: 'Publicar', icon: Upload },
    { id: 'library', label: 'Biblioteca', icon: BookOpen },
    { id: 'profile', label: 'Perfil', icon: User },
  ]
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 72,
      background: C.surface, borderTop: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      paddingBottom: 8,
    }}>
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => navigate(id as Screen)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 12px', borderRadius: 12, transition: 'all 0.15s',
            }}
          >
            {id === 'publish' ? (
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -12, boxShadow: `0 4px 16px ${C.primary}66`,
              }}>
                <Icon size={20} color="white" />
              </div>
            ) : (
              <Icon size={22} color={isActive ? C.primary : C.text3} strokeWidth={isActive ? 2 : 1.5} />
            )}
            {id !== 'publish' && (
              <span style={{ fontSize: 10, color: isActive ? C.primary : C.text3, fontWeight: isActive ? 600 : 400 }}>{label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div style={{
      padding: '16px 20px 12px', display: 'flex', alignItems: 'center',
      gap: 12, borderBottom: `1px solid ${C.border}`,
    }}>
      {onBack && (
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4, color: C.text }}>
          <ArrowLeft size={22} color={C.text} />
        </button>
      )}
      {title && <div style={{ fontSize: 17, fontWeight: 700, color: C.text, flex: 1 }}>{title}</div>}
      {right}
    </div>
  )
}

// ─── SCREEN: Splash ──────────────────────────────────────────────────────────
function SplashScreen({ navigate }: { navigate: (s: Screen) => void }) {
  useEffect(() => {
    const t = setTimeout(() => navigate('login'), 2600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* BG decoration */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${C.primary}22 0%, transparent 70%)` }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${C.accent}22 0%, transparent 70%)` }} />
      {/* Code lines decoration */}
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{
          position: 'absolute', left: 20 + Math.sin(i) * 10, top: 60 + i * 38,
          height: 1.5, width: 40 + i * 18, background: C.border, borderRadius: 1, opacity: 0.5,
        }} />
      ))}
      <div style={{ position: 'absolute', right: 24, top: 80 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ height: 1.5, width: 28 + i * 12, background: C.border, borderRadius: 1, marginBottom: 8, opacity: 0.4 }} />
        ))}
      </div>
      {/* Logo */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
        width: 80, height: 80, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 40px ${C.primary}55`, marginBottom: 20,
      }}>
        <Code2 size={38} color="white" />
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 8 }}>
        dev<span style={{ color: C.primary }}>.io</span>
      </div>
      <div style={{ fontSize: 14, color: C.text2, letterSpacing: '0.06em', marginBottom: 60 }}>
        Crie. Compartilhe. Desenvolva.
      </div>
      {/* Loader */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i === 1 ? C.primary : C.border,
            animation: `pulse 1.4s ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1.2)} }`}</style>
    </div>
  )
}

// ─── SCREEN: Login ───────────────────────────────────────────────────────────
function LoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = () => {
    if (!email || !password) { setError('Preencha todos os campos.'); return }
    navigate('home')
  }
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto' }}>
      <div style={{ padding: '48px 28px 32px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
            width: 64, height: 64, borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 24px ${C.primary}44`, marginBottom: 14,
          }}>
            <Code2 size={28} color="white" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>dev<span style={{ color: C.primary }}>.io</span></div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>Entre na sua conta</div>
        </div>

        {error && (
          <div style={{ background: C.danger + '22', border: `1px solid ${C.danger}44`, borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircle size={14} color={C.danger} />
            <span style={{ fontSize: 13, color: C.danger }}>{error}</span>
          </div>
        )}

        <Input label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={setEmail} />
        <Input label="Senha" type="password" placeholder="••••••••" value={password} onChange={setPassword} />

        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0, fontFamily: 'Inter, sans-serif' }}>
          Esqueci minha senha
        </button>

        <Btn label="Entrar" onClick={login} full />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.text3 }}>ou</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <button style={{
          width: '100%', padding: '12px 20px', background: C.surface2,
          border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          color: C.text, fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #4285F4, #EA4335, #FBBC05, #34A853)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>G</span>
          </div>
          Entrar com Google
        </button>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <span style={{ fontSize: 13, color: C.text2 }}>Não tem uma conta? </span>
          <button onClick={() => navigate('register')} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Criar conta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Register ────────────────────────────────────────────────────────
function RegisterScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm: '' })
  const [terms, setTerms] = useState(false)
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto' }}>
      <Header title="Criar conta" onBack={() => navigate('login')} />
      <div style={{ padding: '24px 28px 32px' }}>
        <Input label="Nome completo" placeholder="Marcos Dutra" value={form.name} onChange={set('name')} />
        <Input label="Nome de usuário" placeholder="@marcos_dev" value={form.username} onChange={set('username')} />
        <Input label="E-mail" type="email" placeholder="marcos@email.com" value={form.email} onChange={set('email')} />
        <Input label="Senha" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} />
        <Input label="Confirmar senha" type="password" placeholder="Repita a senha" value={form.confirm} onChange={set('confirm')} error={form.confirm && form.confirm !== form.password ? 'As senhas não coincidem' : undefined} />

        {/* Password strength */}
        {form.password && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 6 }}>Força da senha</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < Math.min(Math.floor(form.password.length / 3), 4) ? (i < 2 ? C.warning : C.success) : C.border }} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => setTerms(!terms)}
            style={{
              width: 20, height: 20, borderRadius: 6, border: `2px solid ${terms ? C.primary : C.border}`,
              background: terms ? C.primary : 'transparent', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
            }}
          >
            {terms && <Check size={11} color="white" />}
          </button>
          <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
            Concordo com os <span style={{ color: C.primary }}>Termos de Uso</span> e a <span style={{ color: C.primary }}>Política de Privacidade</span> do dev.io
          </span>
        </div>

        <Btn label="Criar conta" onClick={() => navigate('home')} full />
      </div>
    </div>
  )
}

// ─── SCREEN: Home ─────────────────────────────────────────────────────────────
function HomeScreen({ navigate }: { navigate: (s: Screen, data?: unknown) => void }) {
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>
      {/* Top bar */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: C.text2 }}>Olá, Marcos 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>dev<span style={{ color: C.primary }}>.io</span></div>
        </div>
        <button style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, cursor: 'pointer' }}>
          <Bell size={20} color={C.text2} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 20px' }}>
        <div
          onClick={() => navigate('search')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, background: C.surface2,
            border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 16px', cursor: 'pointer',
          }}
        >
          <Search size={16} color={C.text3} />
          <span style={{ fontSize: 14, color: C.text3 }}>Buscar projetos, ferramentas...</span>
        </div>
      </div>

      {/* Banner */}
      <div style={{ margin: '0 20px 24px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.primary}dd, ${C.accent}dd)`,
          borderRadius: 20, padding: '20px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', right: 20, bottom: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Destaque da semana</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>DevTools React v2.1</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>Suite completa para devs React</div>
          <Btn label="Ver projeto" onClick={() => navigate('project-detail', PROJECTS[0])} small />
        </div>
      </div>

      {/* Categories */}
      <SectionTitle title="Categorias" />
      <div style={{ display: 'flex', gap: 8, padding: '8px 20px 20px', overflowX: 'auto' }}>
        {CATEGORIES.map(({ label, icon: Icon, color }) => (
          <div key={label} onClick={() => navigate('explore')} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: '12px 14px', cursor: 'pointer', flexShrink: 0, minWidth: 68,
          }}>
            <div style={{ background: color + '22', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <span style={{ fontSize: 10, color: C.text2, whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Popular */}
      <SectionTitle title="Populares" action={{ label: 'Ver todos', onClick: () => navigate('explore') }} />
      <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PROJECTS.slice(0, 3).map(p => (
          <ProjectCard key={p.id} project={p} onPress={() => navigate('project-detail', p)} />
        ))}
      </div>

      {/* Recents */}
      <SectionTitle title="Novidades" action={{ label: 'Ver todos', onClick: () => navigate('explore') }} />
      <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PROJECTS.slice(3).map(p => (
          <ProjectCard key={p.id} project={p} onPress={() => navigate('project-detail', p)} />
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ padding: '0 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
      {action && <button onClick={action.onClick} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{action.label}</button>}
    </div>
  )
}

// ─── SCREEN: Explore ──────────────────────────────────────────────────────────
function ExploreScreen({ navigate }: { navigate: (s: Screen, data?: unknown) => void }) {
  const [activeFilter, setActiveFilter] = useState('Todos')
  const filters = ['Todos', 'Grátis', 'Pagos', 'Populares', 'Recentes']
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>
      <Header title="Explorar" right={
        <button style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, cursor: 'pointer' }}>
          <Filter size={16} color={C.text2} />
        </button>
      } />

      {/* Search */}
      <div style={{ padding: '16px 20px 0' }}>
        <div onClick={() => navigate('search')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 16px', cursor: 'pointer' }}>
          <Search size={16} color={C.text3} />
          <span style={{ fontSize: 14, color: C.text3 }}>Pesquisar...</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px', overflowX: 'auto' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} style={{
            padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${activeFilter === f ? C.primary : C.border}`,
            background: activeFilter === f ? C.primary + '22' : 'transparent',
            color: activeFilter === f ? C.primary : C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
          }}>{f}</button>
        ))}
      </div>

      {/* Categories grid */}
      <SectionTitle title="Categorias" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '8px 20px 20px' }}>
        {CATEGORIES.map(({ label, icon: Icon, color }) => (
          <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: color + '22', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Projects */}
      <SectionTitle title="Projetos" />
      <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PROJECTS.map(p => (
          <ProjectCard key={p.id} project={p} onPress={() => navigate('project-detail', p)} />
        ))}
      </div>
    </div>
  )
}

// ─── SCREEN: Search ───────────────────────────────────────────────────────────
function SearchScreen({ navigate }: { navigate: (s: Screen, data?: unknown) => void }) {
  const [query, setQuery] = useState('React')
  const results = PROJECTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.tech.some(t => t.toLowerCase().includes(query.toLowerCase())))
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.text }}>
          <ArrowLeft size={22} color={C.text} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: C.surface2, border: `1.5px solid ${C.primary}`, borderRadius: 14, padding: '10px 14px' }}>
          <Search size={16} color={C.primary} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14, fontFamily: 'Inter, sans-serif' }}
            placeholder="Buscar..."
          />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: C.text3 }}><X size={14} /></button>}
        </div>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <span style={{ fontSize: 12, color: C.text2 }}>
          {results.length} resultado{results.length !== 1 ? 's' : ''} para "<span style={{ color: C.primary }}>{query}</span>"
        </span>
      </div>

      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.text3 }}>
            <Search size={40} color={C.text3} style={{ marginBottom: 12 }} />
            <div>Nenhum resultado encontrado</div>
          </div>
        ) : results.map(p => (
          <div key={p.id} onClick={() => navigate('project-detail', p)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{p.name}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: p.price === 'Grátis' ? C.success : C.warning }}>{p.price}</span>
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 8, lineHeight: 1.5 }}>{p.desc}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={p.category} color={C.primary} />
              {p.tech.map(t => <Badge key={t} label={t} color={C.cyan} />)}
              <StarRating rating={p.rating} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <button onClick={e => { e.stopPropagation(); navigate('project-detail', p) }} style={{
                background: C.primary, color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>Ver projeto</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SCREEN: Project Detail ───────────────────────────────────────────────────
function ProjectDetailScreen({ project, navigate }: { project: typeof PROJECTS[0]; navigate: (s: Screen, data?: unknown) => void }) {
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 100 }}>
      <Header onBack={() => navigate('explore')} right={
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Share2 size={20} color={C.text2} /></button>
          <button onClick={() => navigate('report')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Flag size={20} color={C.text2} /></button>
        </div>
      } />

      {/* Hero */}
      <div style={{
        margin: '0 20px 20px', height: 160, borderRadius: 20,
        background: `linear-gradient(135deg, ${C.primary}33, ${C.accent}33)`,
        border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Code2 size={56} color={C.primary} />
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{project.name}</div>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 12 }}>por @{project.dev}</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Badge label={project.category} color={C.primary} />
          {project.tech.map(t => <Badge key={t} label={t} color={C.cyan} />)}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Avaliação', value: `★ ${project.rating}`, color: C.warning },
            { label: 'Downloads', value: project.downloads.toLocaleString('pt-BR'), color: C.primary },
            { label: 'Versão', value: `v${project.version}`, color: C.success },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>{project.desc}</div>

        <div style={{ fontSize: 12, color: C.text3, marginBottom: 20 }}>Atualizado em {project.updated}</div>

        {/* Security badge */}
        <div style={{
          background: C.success + '11', border: `1px solid ${C.success}44`, borderRadius: 14,
          padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24,
        }}>
          <div style={{ background: C.success + '22', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={18} color={C.success} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.success, marginBottom: 3 }}>✓ Verificado pelo dev.io</div>
            <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>Este arquivo passou pelo processo de verificação de segurança do dev.io.</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Btn label={project.price === 'Grátis' ? 'Baixar projeto' : `Adquirir — ${project.price}`} onClick={() => navigate('acquire', project)} full />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('donate', project)} style={{
              flex: 1, padding: '12px', background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 12, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
            }}>
              <Heart size={15} color={C.danger} /> Apoiar
            </button>
            <button style={{
              flex: 1, padding: '12px', background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 12, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
            }}>
              <Share2 size={15} color={C.primary} /> Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Acquire ─────────────────────────────────────────────────────────
function AcquireScreen({ project, navigate }: { project: typeof PROJECTS[0]; navigate: (s: Screen, data?: unknown) => void }) {
  const isFree = project.price === 'Grátis'
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 32 }}>
      <Header title={isFree ? 'Baixar projeto' : 'Adquirir projeto'} onBack={() => navigate('project-detail', project)} />
      <div style={{ padding: '24px 20px' }}>
        {/* Project info */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Code2 size={24} color={C.primary} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{project.name}</div>
            <div style={{ fontSize: 12, color: C.text2 }}>@{project.dev}</div>
            <Badge label={project.category} color={C.primary} />
          </div>
        </div>

        {isFree ? (
          <>
            <div style={{ background: C.success + '11', border: `1px solid ${C.success}33`, borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 24 }}>
              <CheckCircle size={36} color={C.success} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: C.success }}>Projeto gratuito</div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>Este projeto está disponível gratuitamente.</div>
            </div>
            <Btn label="Baixar projeto" onClick={() => navigate('acquire-success', project)} full />
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Resumo da aquisição</div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.text2 }}>{project.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{project.price}</span>
              </div>
              <div style={{ height: 1, background: C.border, margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Total</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{project.price}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Forma de pagamento</div>
            {['Cartão de crédito', 'PIX', 'Boleto'].map((m, i) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 12, background: i === 0 ? C.primary + '11' : C.surface, border: `1.5px solid ${i === 0 ? C.primary : C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${i === 0 ? C.primary : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i === 0 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.primary }} />}
                </div>
                <CreditCard size={15} color={i === 0 ? C.primary : C.text3} />
                <span style={{ fontSize: 13, color: i === 0 ? C.text : C.text2 }}>{m}</span>
              </div>
            ))}
            <div style={{ marginTop: 24 }}>
              <Btn label="Confirmar aquisição" onClick={() => navigate('acquire-success', project)} full />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: Acquire Success ──────────────────────────────────────────────────
function AcquireSuccessScreen({ project, navigate }: { project: typeof PROJECTS[0]; navigate: (s: Screen, data?: unknown) => void }) {
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.success + '22', border: `2px solid ${C.success}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <CheckCircle size={40} color={C.success} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, textAlign: 'center', marginBottom: 10 }}>Projeto adicionado à sua biblioteca!</div>
      <div style={{ fontSize: 14, color: C.text2, textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>
        <strong style={{ color: C.text }}>{project.name}</strong> está disponível na sua Biblioteca.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        <Btn label="Ver na Biblioteca" onClick={() => navigate('library')} full />
        <Btn label="Continuar explorando" onClick={() => navigate('explore')} full variant="secondary" />
      </div>
    </div>
  )
}

// ─── SCREEN: Donate ───────────────────────────────────────────────────────────
function DonateScreen({ project, navigate }: { project: typeof PROJECTS[0]; navigate: (s: Screen, data?: unknown) => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const amounts = [5, 10, 20, 50]
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 32 }}>
      <Header title="Apoiar desenvolvedor" onBack={() => navigate('project-detail', project)} />
      <div style={{ padding: '24px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.danger + '22', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Heart size={26} color={C.danger} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Apoie quem cria.</div>
          <div style={{ fontSize: 13, color: C.text2 }}>Sua contribuição ajuda <strong style={{ color: C.text }}>@{project.dev}</strong> a continuar desenvolvendo.</div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Escolha um valor</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {amounts.map(a => (
            <button key={a} onClick={() => { setSelected(a); setCustom('') }} style={{
              padding: '14px', background: selected === a ? C.primary + '22' : C.surface,
              border: `1.5px solid ${selected === a ? C.primary : C.border}`, borderRadius: 12,
              color: selected === a ? C.primary : C.text, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              R$ {a}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>Ou insira um valor personalizado</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.surface2, border: `1.5px solid ${custom ? C.primary : C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 28 }}>
          <span style={{ color: C.text2, fontSize: 14 }}>R$</span>
          <input
            type="number"
            placeholder="0,00"
            value={custom}
            onChange={e => { setCustom(e.target.value); setSelected(null) }}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        <Btn label="Enviar doação" onClick={() => navigate('home')} full />
      </div>
    </div>
  )
}

// ─── SCREEN: Library ──────────────────────────────────────────────────────────
function LibraryScreen({ navigate }: { navigate: (s: Screen, data?: unknown) => void }) {
  const [tab, setTab] = useState('Todos')
  const tabs = ['Todos', 'Instalados', 'Favoritos', 'Atualizações']
  const myProjects = PROJECTS.slice(0, 3)
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>
      <Header title="Biblioteca" />

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 20px 8px', gap: 6, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${tab === t ? C.primary : C.border}`,
            background: tab === t ? C.primary + '22' : 'transparent',
            color: tab === t ? C.primary : C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
          }}>
            {t === 'Atualizações' ? `${t} (1)` : t}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {myProjects.map(p => (
          <div key={p.id} onClick={() => navigate('project-detail', p)} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: 14, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Code2 size={22} color={C.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>v{p.version}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.id === 3 ? C.warning : C.success }} />
                <span style={{ fontSize: 11, color: p.id === 3 ? C.warning : C.success }}>
                  {p.id === 3 ? 'Atualização disponível' : 'Instalado'}
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
function PublishScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [form, setForm] = useState({ name: '', desc: '', category: '', version: '', price: '' })
  const [acceptDonations, setAcceptDonations] = useState(false)
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 32 }}>
      <Header title="Publicar projeto" />
      <div style={{ padding: '16px 20px' }}>
        {/* Info banner */}
        <div style={{ background: C.primary + '11', border: `1px solid ${C.primary}33`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
          <Shield size={16} color={C.primary} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
            Seu arquivo será analisado pelo <strong style={{ color: C.primary }}>sistema de segurança do dev.io</strong> antes de ser disponibilizado.
          </div>
        </div>

        <Input label="Nome do projeto" placeholder="Ex: DevTools React" value={form.name} onChange={set('name')} />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 6, fontWeight: 500 }}>Descrição</div>
          <textarea
            value={form.desc}
            onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
            placeholder="Descreva o seu projeto..."
            rows={3}
            style={{
              width: '100%', padding: '12px 14px', background: C.surface2,
              border: `1.5px solid ${C.border}`, borderRadius: 12,
              color: C.text, fontSize: 14, outline: 'none', resize: 'none',
              fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 6, fontWeight: 500 }}>Categoria</div>
          <select
            value={form.category}
            onChange={e => set('category')(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 12, color: form.category ? C.text : C.text3, fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
          >
            <option value="" disabled>Selecionar categoria</option>
            {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
          </select>
        </div>

        <Input label="Versão" placeholder="1.0.0" value={form.version} onChange={set('version')} />

        <div style={{ background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 14, padding: '24px', textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}>
          <Upload size={28} color={C.text3} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: C.text2 }}>Clique para enviar arquivo</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>.zip, .tar.gz — máx. 100MB</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Input label="Preço (deixe em branco para gratuito)" placeholder="Ex: 9.90" value={form.price} onChange={set('price')} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button onClick={() => setAcceptDonations(!acceptDonations)} style={{
            width: 22, height: 22, borderRadius: 6, border: `2px solid ${acceptDonations ? C.primary : C.border}`,
            background: acceptDonations ? C.primary : 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {acceptDonations && <Check size={12} color="white" />}
          </button>
          <span style={{ fontSize: 13, color: C.text2 }}>Aceitar doações</span>
        </div>

        <Btn label="Publicar projeto" onClick={() => navigate('security-check')} full />
      </div>
    </div>
  )
}

// ─── SCREEN: Security Check ───────────────────────────────────────────────────
function SecurityCheckScreen({ navigate, blocked = false }: { navigate: (s: Screen) => void; blocked?: boolean }) {
  const [step, setStep] = useState(0)
  const steps = [
    { label: 'Arquivo recebido', done: true },
    { label: 'Verificação de formato', done: step >= 1 },
    { label: 'Análise de integridade', done: step >= 2 },
    { label: 'Análise de segurança', done: step >= 3 },
    { label: 'Verificação concluída', done: step >= 4 },
  ]
  useEffect(() => {
    if (step < 4) {
      const t = setTimeout(() => setStep(s => s + 1), 700)
      return () => clearTimeout(t)
    }
  }, [step])
  const done = step >= 4
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <Header title="Verificação de segurança" onBack={() => navigate('publish')} />
      <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: done ? (blocked ? C.danger + '22' : C.success + '22') : C.primary + '22',
            border: `2px solid ${done ? (blocked ? C.danger : C.success) : C.primary}44`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {done
              ? (blocked ? <XCircle size={32} color={C.danger} /> : <CheckCircle size={32} color={C.success} />)
              : <Loader size={32} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>

        {/* Steps */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: s.done ? (blocked && i === 3 ? C.danger + '22' : C.success + '22') : C.surface2,
                border: `2px solid ${s.done ? (blocked && i === 3 ? C.danger : C.success) : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.done
                  ? (blocked && i === 3 ? <X size={13} color={C.danger} /> : <Check size={13} color={C.success} />)
                  : <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.border }} />}
              </div>
              <span style={{ fontSize: 14, color: s.done ? C.text : C.text3, fontWeight: s.done ? 500 : 400 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {done && (
          <div style={{ marginTop: 28 }}>
            <div style={{
              background: blocked ? C.danger + '11' : C.success + '11',
              border: `1px solid ${blocked ? C.danger : C.success}33`,
              borderRadius: 14, padding: '16px', textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: blocked ? C.danger : C.success, marginBottom: 6 }}>
                {blocked ? '⚠ Arquivo bloqueado' : '✓ Arquivo aprovado'}
              </div>
              <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
                {blocked
                  ? 'Foi identificado um problema de segurança. O projeto não poderá ser publicado até que o problema seja corrigido.'
                  : 'Seu projeto foi analisado e está apto para publicação.'}
              </div>
            </div>
            {blocked
              ? <Btn label="Revisar arquivo" onClick={() => navigate('publish')} full variant="danger" />
              : <Btn label="Publicar projeto" onClick={() => navigate('my-projects')} full />}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SCREEN: My Projects ──────────────────────────────────────────────────────
function MyProjectsScreen({ navigate }: { navigate: (s: Screen, data?: unknown) => void }) {
  const [tab, setTab] = useState('Publicados')
  const tabs = ['Publicados', 'Em análise', 'Bloqueados', 'Rascunhos']
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>
      <Header title="Meus Projetos" right={
        <button onClick={() => navigate('publish')} style={{ background: C.primary, border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={14} color="white" />
          <span style={{ fontSize: 12, color: 'white', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Novo</span>
        </button>
      } />

      <div style={{ display: 'flex', padding: '16px 20px 8px', gap: 8, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${tab === t ? C.primary : C.border}`,
            background: tab === t ? C.primary + '22' : 'transparent',
            color: tab === t ? C.primary : C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
          }}>{t}</button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '16px 20px' }}>
        {[
          { label: 'Downloads', value: '21.1k', icon: Download, color: C.primary },
          { label: 'Avaliação', value: '4.8★', icon: Star, color: C.warning },
          { label: 'Doações', value: 'R$142', icon: Heart, color: C.danger },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <s.icon size={16} color={s.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.text3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PROJECTS.slice(0, tab === 'Publicados' ? 3 : 1).map(p => (
          <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Code2 size={20} color={C.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.text3, fontFamily: 'JetBrains Mono, monospace' }}>v{p.version}</div>
              </div>
              <Badge label={tab === 'Publicados' ? '✓ Publicado' : tab === 'Em análise' ? '⏳ Análise' : '⚠ Bloqueado'} color={tab === 'Publicados' ? C.success : tab === 'Em análise' ? C.warning : C.danger} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Downloads', value: p.downloads.toLocaleString('pt-BR') },
                { label: 'Avaliação', value: `${p.rating}★` },
                { label: 'Doações', value: 'R$' + Math.floor(p.downloads / 100) },
              ].map(s => (
                <div key={s.label} style={{ background: C.surface2, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SCREEN: Profile ──────────────────────────────────────────────────────────
function ProfileScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('settings')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Settings size={22} color={C.text2} /></button>
      </div>

      {/* Avatar */}
      <div style={{ padding: '16px 20px 24px', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 800, color: 'white', border: `3px solid ${C.border}`,
        }}>
          M
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Marcos T. D. Júnior</div>
        <div style={{ fontSize: 13, color: C.primary }}>@marcos_dev</div>
        <div style={{ fontSize: 13, color: C.text2, marginTop: 8, lineHeight: 1.5 }}>Desenvolvedor Full Stack. Apaixonado por open source e inovação.</div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20 }}>
          {[
            { label: 'Projetos', value: '6' },
            { label: 'Seguidores', value: '248' },
            { label: 'Seguindo', value: '91' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <Btn label="Editar perfil" variant="secondary" small />
          <Btn label="Meus projetos" onClick={() => navigate('my-projects')} small />
        </div>
      </div>

      <div style={{ height: 1, background: C.border, margin: '0 20px' }} />

      {/* Acquired */}
      <div style={{ padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Projetos adquiridos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROJECTS.slice(0, 3).map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}44, ${C.accent}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Code2 size={18} color={C.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{p.category}</div>
              </div>
              <ChevronRight size={14} color={C.text3} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Settings ────────────────────────────────────────────────────────
function SettingsScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const groups = [
    { title: 'Conta', items: [
      { icon: User, label: 'Informações pessoais' },
      { icon: Lock, label: 'Segurança e senha' },
    ]},
    { title: 'Preferências', items: [
      { icon: BellIcon, label: 'Notificações' },
      { icon: Moon, label: 'Aparência' },
      { icon: Globe, label: 'Privacidade' },
    ]},
    { title: 'Legal', items: [
      { icon: FileText, label: 'Termos de uso' },
      { icon: Shield, label: 'Política de privacidade' },
    ]},
  ]
  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 80 }}>
      <Header title="Configurações" onBack={() => navigate('profile')} />
      <div style={{ padding: '16px 20px 24px' }}>
        {groups.map(g => (
          <div key={g.title} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{g.title}</div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              {g.items.map((item, i) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: i < g.items.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}>
                  <item.icon size={18} color={C.text2} />
                  <span style={{ flex: 1, fontSize: 14, color: C.text }}>{item.label}</span>
                  <ChevronRight size={14} color={C.text3} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <button onClick={() => navigate('login')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} color={C.danger} />
            <span style={{ fontSize: 14, color: C.danger, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>Sair da conta</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Report ───────────────────────────────────────────────────────────
function ReportScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [selected, setSelected] = useState('')
  const [desc, setDesc] = useState('')
  const [sent, setSent] = useState(false)
  const options = ['Conteúdo malicioso', 'Violação de direitos', 'Spam', 'Conteúdo inadequado', 'Outro']

  if (sent) {
    return (
      <div style={{ width: '100%', height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.success + '22', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle size={36} color={C.success} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 10 }}>Denúncia enviada!</div>
        <div style={{ fontSize: 13, color: C.text2, textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>Nossa equipe irá analisar o conteúdo em até 24h.</div>
        <Btn label="Voltar ao início" onClick={() => navigate('home')} full />
      </div>
    )
  }

  return (
    <div className="phone-scroll" style={{ width: '100%', height: '100%', background: C.bg, overflowY: 'auto', paddingBottom: 32 }}>
      <Header title="Reportar conteúdo" onBack={() => navigate('project-detail')} />
      <div style={{ padding: '24px 20px' }}>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>Selecione o motivo da denúncia:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {options.map(o => (
            <button key={o} onClick={() => setSelected(o)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
              background: selected === o ? C.danger + '11' : C.surface,
              border: `1.5px solid ${selected === o ? C.danger : C.border}`,
              borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === o ? C.danger : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected === o && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.danger }} />}
              </div>
              <span style={{ fontSize: 13, color: selected === o ? C.text : C.text2, fontFamily: 'Inter, sans-serif' }}>{o}</span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 8, fontWeight: 500 }}>Descreva o problema</div>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Descreva com detalhes..."
            rows={4}
            style={{ width: '100%', padding: '12px 14px', background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
          />
        </div>

        <Btn label="Enviar denúncia" onClick={() => setSent(true)} full variant="danger" />
      </div>
    </div>
  )
}

// ─── PRESENTATION COVER ───────────────────────────────────────────────────────
function CoverOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8,8,14,0.92)', backdropFilter: 'blur(8px)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 340, width: '100%', textAlign: 'center' }}>
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, width: 56, height: 56, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Code2 size={26} color="white" />
        </div>
        <div style={{ fontSize: 12, color: C.primary, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Artefato 4 — Telas do Aplicativo</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 4 }}>dev<span style={{ color: C.primary }}>.io</span></div>
        <div style={{ fontSize: 11, color: C.text2, marginBottom: 20, lineHeight: 1.6 }}>
          ODS 9 — Indústria, Inovação e Infraestrutura<br />
          Protótipo mobile Android — Alta Fidelidade
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 16 }} />
        <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 2 }}>Marcos Teixeira Dutra Júnior</div>
        <div style={{ fontSize: 12, color: C.text3 }}>FATEC Zona Leste — 2026</div>
        <div style={{ marginTop: 24 }}>
          <Btn label="Abrir protótipo" onClick={onClose} full />
        </div>
      </div>
    </div>
  )
}

// ─── Phone Shell ──────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [history, setHistory] = useState<Screen[]>([])
  const [projectData, setProjectData] = useState<typeof PROJECTS[0]>(PROJECTS[0])
  const [showCover, setShowCover] = useState(true)

  const navigate = (s: Screen, data?: unknown) => {
    setHistory(h => [...h, screen])
    if (data) setProjectData(data as typeof PROJECTS[0])
    setScreen(s)
  }

  const goBack = () => {
    const prev = history[history.length - 1]
    if (prev) {
      setHistory(h => h.slice(0, -1))
      setScreen(prev)
    }
  }

  const mainTabs: Screen[] = ['home', 'explore', 'publish', 'library', 'profile']

  const renderScreen = () => {
    switch (screen) {
      case 'splash': return <SplashScreen navigate={navigate} />
      case 'login': return <LoginScreen navigate={navigate} />
      case 'register': return <RegisterScreen navigate={navigate} />
      case 'home': return <HomeScreen navigate={navigate} />
      case 'explore': return <ExploreScreen navigate={navigate} />
      case 'search': return <SearchScreen navigate={navigate} />
      case 'project-detail': return <ProjectDetailScreen project={projectData} navigate={navigate} />
      case 'acquire': return <AcquireScreen project={projectData} navigate={navigate} />
      case 'acquire-success': return <AcquireSuccessScreen project={projectData} navigate={navigate} />
      case 'donate': return <DonateScreen project={projectData} navigate={navigate} />
      case 'library': return <LibraryScreen navigate={navigate} />
      case 'publish': return <PublishScreen navigate={navigate} />
      case 'security-check': return <SecurityCheckScreen navigate={navigate} />
      case 'security-blocked': return <SecurityCheckScreen navigate={navigate} blocked />
      case 'my-projects': return <MyProjectsScreen navigate={navigate} />
      case 'profile': return <ProfileScreen navigate={navigate} />
      case 'settings': return <SettingsScreen navigate={navigate} />
      case 'report': return <ReportScreen navigate={navigate} />
      default: return <HomeScreen navigate={navigate} />
    }
  }

  const showBottomNav = mainTabs.includes(screen)
  const activeTab = mainTabs.includes(screen) ? screen : 'home'

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 20%, #1a1a3a 0%, #08080e 70%)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {showCover && <CoverOverlay onClose={() => setShowCover(false)} />}

      {/* Phone frame */}
      <div style={{
        width: 393, height: 852,
        background: C.bg, borderRadius: 52,
        border: '8px solid #1c1c2e',
        boxShadow: '0 0 0 1px #2a2a44, 0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(79,110,247,0.1)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Status bar */}
        <div style={{
          height: 44, background: C.bg, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 24px 0 28px', flexShrink: 0,
          borderBottom: screen !== 'splash' ? `1px solid ${C.border}` : 'none',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>9:41</span>
          <div style={{ width: 100, height: 28, background: '#0a0a14', borderRadius: 20, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[3,2,1].map(i => <div key={i} style={{ width: 3, height: 3 + i * 2, background: C.text, borderRadius: 1, opacity: i === 1 ? 0.4 : 1 }} />)}
            </div>
            <Zap size={11} color={C.text} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>87%</span>
          </div>
        </div>

        {/* Screen content */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {renderScreen()}
          {showBottomNav && <BottomNav active={activeTab} navigate={navigate} />}
        </div>

        {/* Home indicator */}
        <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 100, height: 4, background: C.text2, borderRadius: 2, opacity: 0.3 }} />
        </div>
      </div>

      {/* Screen label */}
      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: C.text3, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 12px' }}>
          {screen.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </div>
      </div>
    </div>
  )
}
