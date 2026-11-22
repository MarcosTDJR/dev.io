import "dotenv/config"
import crypto from "node:crypto"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import express from "express"
import multer from "multer"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dataDirectory = process.env.DEVIO_DATA_DIR || path.join(root, "data")
const storageDirectory =
  process.env.DEVIO_STORAGE_DIR || path.join(root, "storage", "projects")
const avatarDirectory = path.join(storageDirectory, "avatars")
const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ""
).trim()
if (supabaseUrl && !/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error(
    "Invalid SUPABASE_URL: use the Supabase Project URL, not an API key.",
  )
}
const supabaseSecret =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const adminSupabase =
  supabaseUrl && supabaseSecret
    ? createClient(supabaseUrl, supabaseSecret, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      })
    : null
fs.mkdirSync(dataDirectory, { recursive: true })
fs.mkdirSync(storageDirectory, { recursive: true })

const db = new DatabaseSync(path.join(dataDirectory, "devio.sqlite"))
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified INTEGER NOT NULL DEFAULT 0,
    confirmation_token_hash TEXT,
    confirmation_expires_at TEXT,
    password_reset_token_hash TEXT,
    password_reset_expires_at TEXT,
    password_changed_at TEXT,
    bio TEXT NOT NULL DEFAULT '',
    avatar_path TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    price TEXT NOT NULL DEFAULT 'Grátis',
    file_name TEXT,
    file_path TEXT,
    file_sha256 TEXT,
    scan_status TEXT NOT NULL DEFAULT 'approved',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS library (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    added_at TEXT NOT NULL,
    PRIMARY KEY (user_id, project_id)
  );
`)

const userColumns = db
  .prepare("PRAGMA table_info(users)")
  .all()
  .map((column) => column.name)
if (!userColumns.includes("confirmation_token_hash"))
  db.exec("ALTER TABLE users ADD COLUMN confirmation_token_hash TEXT")
if (!userColumns.includes("confirmation_expires_at"))
  db.exec("ALTER TABLE users ADD COLUMN confirmation_expires_at TEXT")
if (!userColumns.includes("google_sub"))
  db.exec("ALTER TABLE users ADD COLUMN google_sub TEXT")
if (!userColumns.includes("password_reset_token_hash"))
  db.exec("ALTER TABLE users ADD COLUMN password_reset_token_hash TEXT")
if (!userColumns.includes("password_reset_expires_at"))
  db.exec("ALTER TABLE users ADD COLUMN password_reset_expires_at TEXT")
if (!userColumns.includes("password_changed_at"))
  db.exec("ALTER TABLE users ADD COLUMN password_changed_at TEXT")
if (!userColumns.includes("bio"))
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''")
if (!userColumns.includes("avatar_path"))
  db.exec("ALTER TABLE users ADD COLUMN avatar_path TEXT")
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users(google_sub) WHERE google_sub IS NOT NULL",
)

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex")
const sessionCookie = "devio_session"

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${derived}`
}

function verifyPassword(password, stored) {
  const [, salt, expected] = String(stored || "").split("$")
  if (!salt || !expected || !/^[a-f0-9]{128}$/i.test(expected)) return false
  const actual = crypto.scryptSync(password, salt, 64).toString("hex")
  return crypto.timingSafeEqual(
    Buffer.from(actual, "hex"),
    Buffer.from(expected, "hex"),
  )
}

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || 587)
const mailer = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null
const mailConfigured = Boolean(mailer && process.env.SMTP_FROM)
const appUrl = (
  process.env.PUBLIC_APP_URL ||
  process.env.WEB_ORIGIN ||
  `http://localhost:${process.env.PORT || 8443}`
).replace(/\/+$/, "")
const passwordMaxAgeMs = 365 * 24 * 60 * 60 * 1000

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  )
}

function logEmailFailure(purpose, error) {
  console.error(
    JSON.stringify({
      timestamp: now(),
      event: "email.delivery_failed",
      purpose,
      code: error?.code || "UNKNOWN",
      command: error?.command || "unknown",
    }),
  )
}

async function sendActionEmail({ to, subject, text, html }) {
  if (!mailer || !process.env.SMTP_FROM) return false
  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  })
  return true
}

if (smtpHost && !process.env.SMTP_FROM) {
  console.error(
    JSON.stringify({
      timestamp: now(),
      event: "email.configuration_invalid",
      reason: "SMTP_FROM is required when SMTP_HOST is configured",
    }),
  )
}
if (process.env.NODE_ENV === "production" && !mailConfigured) {
  console.error(
    JSON.stringify({
      timestamp: now(),
      event: "email.configuration_missing",
      reason: "SMTP_HOST and SMTP_FROM are required for account email flows",
    }),
  )
}

function setSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
  db.prepare(
    "INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(hashToken(token), userId, expiresAt)
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
}

function currentUser(req) {
  const token = req.headers.cookie?.match(/(?:^|; )devio_session=([^;]+)/)?.[1]
  if (!token) return null
  return db
    .prepare(`
    SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.id_hash = ? AND sessions.expires_at > ?
  `)
    .get(hashToken(token), now())
}

function requireUser(req, res, next) {
  const user = currentUser(req)
  if (!user)
    return res.status(401).json({ error: "Faça login para continuar." })
  if (!user.email_verified)
    return res
      .status(403)
      .json({ error: "Confirme seu e-mail antes de continuar." })
  req.user = user
  next()
}

async function requireAdmin(req, res, next) {
  if (!adminSupabase) {
    return res.status(503).json({
      error: "A administração não está configurada no servidor.",
    })
  }
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token)
    return res.status(401).json({ error: "Faça login para continuar." })

  const { data, error } = await adminSupabase.auth.getUser(token)
  if (error || !data.user)
    return res.status(401).json({ error: "Sessão inválida ou expirada." })
  if (data.user.app_metadata?.role !== "admin")
    return res.status(403).json({ error: "Acesso restrito a administradores." })

  req.adminUser = data.user
  next()
}

function publicProject(row) {
  return {
    id: row.id,
    name: row.name,
    dev: row.username || "devio",
    category: row.category,
    price: row.price,
    version: row.version,
    updated: new Date(row.created_at).toLocaleDateString("pt-BR"),
    verified: row.scan_status === "approved",
    desc: row.description,
    scanStatus: row.scan_status,
    fileName: row.file_name,
    downloadUrl: row.file_name ? `/api/projects/${row.id}/download` : undefined,
  }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    bio: user.bio || "",
    avatarUrl: user.avatar_path
      ? `/api/auth/avatar?v=${encodeURIComponent(String(Date.now()))}`
      : null,
  }
}

function storedAvatarPath(value) {
  if (!value) return null
  const resolved = path.resolve(value)
  const directory = path.resolve(avatarDirectory)
  return resolved.startsWith(`${directory}${path.sep}`) ? resolved : null
}

function scanArchive(file) {
  const extension = path.extname(file.originalname).toLowerCase()
  const allowed = [".zip", ".gz", ".tgz"]
  if (
    !allowed.includes(extension) &&
    !file.originalname.toLowerCase().endsWith(".tar.gz")
  ) {
    return {
      approved: false,
      reason: "Apenas arquivos .zip e .tar.gz são aceitos.",
    }
  }
  const zipSignature = file.buffer
    .subarray(0, 2)
    .equals(Buffer.from([0x50, 0x4b]))
  const gzipSignature = file.buffer
    .subarray(0, 2)
    .equals(Buffer.from([0x1f, 0x8b]))
  if (
    (extension === ".zip" && !zipSignature) ||
    (extension !== ".zip" && !gzipSignature)
  ) {
    return {
      approved: false,
      reason: "A assinatura do arquivo não corresponde à extensão.",
    }
  }
  if (file.originalname.includes("..") || path.isAbsolute(file.originalname)) {
    return { approved: false, reason: "Nome de arquivo inválido." }
  }

  const temporaryPath = path.join(dataDirectory, `${id()}${extension}`)
  fs.writeFileSync(temporaryPath, file.buffer, { mode: 0o600 })
  try {
    const command = extension === ".zip" ? "unzip" : "tar"
    const args =
      extension === ".zip" ? ["-Z1", temporaryPath] : ["-tzf", temporaryPath]
    const listing = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 2 * 1024 * 1024,
    })
    const unsafeEntry = listing
      .split("\n")
      .find((entry) => entry.startsWith("/") || entry.split("/").includes(".."))
    if (unsafeEntry)
      return {
        approved: false,
        reason: "O arquivo contém caminho de extração inseguro.",
      }
    const entries = listing
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean)
    const hasPreview = entries.some(
      (entry) => entry === "index.html" || entry === "./index.html",
    )
    return { approved: true, hasPreview }
  } catch {
    return {
      approved: false,
      reason: "Não foi possível validar a integridade do arquivo.",
    }
  } finally {
    fs.rmSync(temporaryPath, { force: true })
  }
}

const app = express()
app.use(express.json({ limit: "1mb" }))
if (process.env.NODE_ENV === "production")
  app.use(express.static(path.join(root, "dist")))
const allowedWebOrigins = (
  process.env.WEB_ORIGIN || "http://localhost:8443"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (!origin || allowedWebOrigins.includes(origin))
    res.setHeader("Access-Control-Allow-Origin", origin || allowedWebOrigins[0])
  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type")
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  )
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})
app.use((req, res, next) => {
  const startedAt = Date.now()
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        timestamp: now(),
        event: "http.request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    )
  })
  next()
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
})
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
})

app.get("/api/health", (_req, res) => res.json({ status: "ok" }))

const paymentWebhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
const paymentClientId = process.env.MERCADOPAGO_CLIENT_ID
const paymentClientSecret = process.env.MERCADOPAGO_CLIENT_SECRET
const paymentRedirectUri = process.env.MERCADOPAGO_REDIRECT_URI
const paymentTokenEncryptionKey = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY
  ? Buffer.from(process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY, "base64")
  : null
if (paymentTokenEncryptionKey && paymentTokenEncryptionKey.length !== 32)
  throw new Error("MERCADOPAGO_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.")
const paymentApiUrl = (process.env.PUBLIC_API_URL || process.env.VITE_API_URL || "").replace(
  /\/+$/,
  "",
)
const publicAppUrl = (process.env.PUBLIC_APP_URL || "").replace(/\/+$/, "")

function encryptPaymentTokens(tokens) {
  if (!paymentTokenEncryptionKey)
    throw new Error("Mercado Pago token encryption is not configured.")
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", paymentTokenEncryptionKey, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(tokens), "utf8"),
    cipher.final(),
  ])
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

function decryptPaymentTokens(ciphertext) {
  if (!paymentTokenEncryptionKey)
    throw new Error("Mercado Pago token encryption is not configured.")
  const [iv, authTag, encrypted] = String(ciphertext).split(".")
  if (!iv || !authTag || !encrypted)
    throw new Error("Mercado Pago tokens have an invalid encrypted format.")
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    paymentTokenEncryptionKey,
    Buffer.from(iv, "base64url"),
  )
  decipher.setAuthTag(Buffer.from(authTag, "base64url"))
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8"),
  )
}

async function savePaymentTokens(userId, tokenResponse) {
  const expiresIn = Number(tokenResponse.expires_in)
  if (
    !tokenResponse.access_token ||
    !tokenResponse.refresh_token ||
    !tokenResponse.user_id ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  )
    throw new Error("Mercado Pago returned incomplete OAuth credentials.")
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  const { error } = await adminSupabase.from("mercadopago_accounts").upsert({
    user_id: userId,
    collector_id: String(tokenResponse.user_id),
    token_ciphertext: encryptPaymentTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    }),
    expires_at: expiresAt.toISOString(),
    updated_at: now(),
  })
  if (error) throw error
  return { collectorId: String(tokenResponse.user_id), expiresAt }
}

async function getPaymentSellerToken(userId) {
  if (!paymentTokenEncryptionKey || !paymentClientId || !paymentClientSecret)
    throw new Error("Mercado Pago OAuth is not configured.")
  const { data: account, error } = await adminSupabase
    .from("mercadopago_accounts")
    .select("collector_id, token_ciphertext, expires_at")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!account) throw new Error("O publicador ainda não conectou uma conta Mercado Pago.")
  let tokens = decryptPaymentTokens(account.token_ciphertext)
  if (new Date(account.expires_at).getTime() > Date.now() + 5 * 60 * 1000)
    return { accessToken: tokens.accessToken, collectorId: account.collector_id }

  const refreshResponse = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: paymentClientId,
      client_secret: paymentClientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  })
  const refreshed = await refreshResponse.json()
  if (
    !refreshResponse.ok ||
    !refreshed.access_token ||
    !refreshed.refresh_token ||
    String(refreshed.user_id) !== account.collector_id
  )
    throw new Error("A conexão do publicador com o Mercado Pago expirou. Reconecte a conta.")
  const saved = await savePaymentTokens(userId, refreshed)
  tokens = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
  }
  return { accessToken: tokens.accessToken, collectorId: saved.collectorId }
}

async function authenticatedSupabaseUser(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token || !adminSupabase)
    return res.status(401).json({ error: "Faça login para continuar." })
  const { data, error } = await adminSupabase.auth.getUser(token)
  if (error || !data.user?.email_confirmed_at)
    return res.status(401).json({ error: "Sessão inválida ou e-mail não confirmado." })
  req.paymentUser = data.user
  next()
}

function parseBrlAmount(value) {
  const raw = String(value || "")
    .replace(/^R\$\s*/i, "")
    .trim()
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function isValidPaymentWebhook(req, paymentId) {
  const signature = req.headers["x-signature"]
  const requestId = req.headers["x-request-id"]
  if (!paymentWebhookSecret || typeof signature !== "string" || typeof requestId !== "string")
    return false
  const parts = Object.fromEntries(
    signature.split(",").map((part) => part.trim().split("=", 2)),
  )
  if (!parts.ts || !parts.v1 || !/^[a-f0-9]{64}$/i.test(parts.v1)) return false
  const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`
  const expected = crypto
    .createHmac("sha256", paymentWebhookSecret)
    .update(manifest)
    .digest()
  const provided = Buffer.from(parts.v1, "hex")
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
}

function mercadoPagoOAuthConfigured() {
  return Boolean(
    paymentClientId &&
      paymentClientSecret &&
      paymentRedirectUri &&
      paymentWebhookSecret &&
      paymentApiUrl &&
      paymentTokenEncryptionKey &&
      /^https:\/\//i.test(paymentRedirectUri) &&
      /^https:\/\//i.test(publicAppUrl),
  )
}

app.get("/api/payments/account", authenticatedSupabaseUser, async (req, res) => {
  if (!adminSupabase)
    return res.status(503).json({ error: "Pagamentos não configurados." })
  const { data, error } = await adminSupabase
    .from("mercadopago_accounts")
    .select("collector_id, expires_at")
    .eq("user_id", req.paymentUser.id)
    .maybeSingle()
  if (error) return res.status(500).json({ error: "Não foi possível consultar a conta de recebimento." })
  return res.json({
    configured: mercadoPagoOAuthConfigured(),
    connected: Boolean(data),
    collectorId: data?.collector_id || null,
  })
})

app.post("/api/payments/account/connect", authenticatedSupabaseUser, async (req, res) => {
  if (!mercadoPagoOAuthConfigured())
    return res.status(503).json({ error: "A conexão de contas Mercado Pago não está configurada." })
  try {
    const state = crypto.randomBytes(32).toString("hex")
    await adminSupabase
      .from("payment_oauth_states")
      .delete()
      .lt("expires_at", now())
    const { error } = await adminSupabase.from("payment_oauth_states").insert({
      state_hash: hashToken(state),
      user_id: req.paymentUser.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    if (error) throw error
    const authorizationUrl = new URL("https://auth.mercadopago.com/authorization")
    authorizationUrl.search = new URLSearchParams({
      client_id: paymentClientId,
      response_type: "code",
      platform_id: "mp",
      state,
      redirect_uri: paymentRedirectUri,
      scope: "offline_access",
    }).toString()
    return res.json({ authorizationUrl: authorizationUrl.toString() })
  } catch (error) {
    console.error("Mercado Pago authorization start failed", error)
    return res.status(500).json({ error: "Não foi possível iniciar a conexão Mercado Pago." })
  }
})

app.get("/api/payments/mercadopago/oauth/callback", async (req, res) => {
  const redirectResult = (result) =>
    res.redirect(`${publicAppUrl}/?mp_connected=${encodeURIComponent(result)}`)
  if (!mercadoPagoOAuthConfigured())
    return res.status(503).send("Conexão com Mercado Pago não configurada.")
  const code = String(req.query.code || "")
  const state = String(req.query.state || "")
  if (!code || !state) return redirectResult("error")
  try {
    const { data: oauthState, error: stateError } = await adminSupabase
      .from("payment_oauth_states")
      .select("user_id, expires_at")
      .eq("state_hash", hashToken(state))
      .maybeSingle()
    if (stateError) throw stateError
    if (!oauthState || new Date(oauthState.expires_at).getTime() < Date.now())
      return redirectResult("error")
    const { error: deleteStateError } = await adminSupabase
      .from("payment_oauth_states")
      .delete()
      .eq("state_hash", hashToken(state))
    if (deleteStateError) throw deleteStateError

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: paymentClientId,
        client_secret: paymentClientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: paymentRedirectUri,
      }),
    })
    const tokens = await tokenResponse.json()
    if (
      !tokenResponse.ok ||
      !tokens.access_token ||
      !tokens.refresh_token ||
      !tokens.user_id
    ) {
      console.error("Mercado Pago OAuth token exchange failed", tokenResponse.status)
      return redirectResult("error")
    }
    await savePaymentTokens(oauthState.user_id, tokens)
    return redirectResult("success")
  } catch (error) {
    console.error("Mercado Pago OAuth callback failed", error)
    return redirectResult("error")
  }
})

app.post("/api/payments/checkout", authenticatedSupabaseUser, async (req, res) => {
  if (!adminSupabase || !paymentWebhookSecret || !mercadoPagoOAuthConfigured())
    return res.status(503).json({ error: "O checkout Mercado Pago não está configurado no servidor." })
  if (!paymentApiUrl)
    return res.status(503).json({ error: "Configure PUBLIC_API_URL para receber as confirmações de pagamento." })
  const { projectId, kind } = req.body || {}
  if (!uuidPattern.test(String(projectId || "")) || !["purchase", "donation"].includes(kind))
    return res.status(400).json({ error: "Dados de pagamento inválidos." })
  const amount = kind === "donation" ? Number(req.body.amount) : null
  if (
    kind === "donation" &&
    (!Number.isFinite(amount) ||
      amount < 1 ||
      amount > 1000 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8)
  )
    return res.status(400).json({ error: "A doação deve ser entre R$ 1 e R$ 1.000." })

  let orderId
  let preferenceCreated = false
  try {
    const [{ data: project, error: projectError }, { data: profile, error: profileError }] =
      await Promise.all([
        adminSupabase
          .from("projects")
          .select("id, owner_id, name, price, accept_donations, review_status, is_blocked")
          .eq("id", projectId)
          .maybeSingle(),
        adminSupabase
          .from("profiles")
          .select("is_blocked")
          .eq("id", req.paymentUser.id)
          .maybeSingle(),
      ])
    if (projectError) throw projectError
    if (profileError) throw profileError
    if (!project || project.review_status !== "approved" || project.is_blocked)
      return res.status(404).json({ error: "Este projeto não está disponível." })
    if (profile?.is_blocked)
      return res.status(403).json({ error: "Sua conta está bloqueada para pagamentos." })
    if (kind === "donation" && !project.accept_donations)
      return res.status(400).json({ error: "Este projeto não está aceitando doações." })

    const price = kind === "purchase" ? parseBrlAmount(project.price) : amount
    if (price === null || price < 1 || price > 1000000)
      return res.status(400).json({ error: "O preço deste projeto não é válido para pagamento." })
    if (project.owner_id === req.paymentUser.id)
      return res.status(400).json({ error: "Você não pode pagar pelo próprio projeto." })
    if (kind === "purchase") {
      const { data: existing, error: existingError } = await adminSupabase
        .from("library")
        .select("project_id")
        .eq("user_id", req.paymentUser.id)
        .eq("project_id", project.id)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) return res.status(409).json({ error: "Este projeto já está na sua biblioteca." })
    }

    let sellerToken
    try {
      sellerToken = await getPaymentSellerToken(project.owner_id)
    } catch (error) {
      return res.status(409).json({
        error: error instanceof Error
          ? error.message
          : "O publicador precisa conectar o Mercado Pago antes de receber pagamentos.",
      })
    }

    orderId = id()
    const { error: insertError } = await adminSupabase.from("payment_orders").insert({
      id: orderId,
      buyer_id: req.paymentUser.id,
      project_id: project.id,
      seller_id: project.owner_id,
      kind,
      amount: price,
    })
    if (insertError) throw insertError

    const appBaseUrl = (process.env.PUBLIC_APP_URL || process.env.WEB_ORIGIN || "").split(",")[0].replace(/\/+$/, "")
    if (!/^https:\/\//i.test(appBaseUrl)) {
      await adminSupabase.from("payment_orders").delete().eq("id", orderId)
      return res.status(503).json({ error: "Configure PUBLIC_APP_URL com a URL HTTPS pública do app." })
    }
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sellerToken.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": orderId,
      },
      body: JSON.stringify({
        items: [{
          id: project.id,
          title: kind === "donation" ? `Apoio a ${project.name}` : project.name,
          quantity: 1,
          currency_id: "BRL",
          unit_price: price,
        }],
        payer: req.paymentUser.email ? { email: req.paymentUser.email } : undefined,
        external_reference: orderId,
        back_urls: {
          success: `${appBaseUrl}/?payment=success&order_id=${orderId}`,
          pending: `${appBaseUrl}/?payment=pending&order_id=${orderId}`,
          failure: `${appBaseUrl}/?payment=failure&order_id=${orderId}`,
        },
        auto_return: "approved",
        notification_url: `${paymentApiUrl}/api/payments/webhook`,
      }),
    })
    const preference = await preferenceResponse.json()
    const checkoutUrl = sellerToken.accessToken.startsWith("TEST-")
      ? preference.sandbox_init_point || preference.init_point
      : preference.init_point
    if (!preferenceResponse.ok || !preference.id || !checkoutUrl) {
      await adminSupabase.from("payment_orders").delete().eq("id", orderId)
      console.error("Mercado Pago preference creation failed", preference.status || preferenceResponse.status)
      return res.status(502).json({ error: "O provedor não conseguiu iniciar o checkout. Tente novamente." })
    }
    preferenceCreated = true
    const { error: preferenceError } = await adminSupabase
      .from("payment_orders")
      .update({ preference_id: preference.id })
      .eq("id", orderId)
    if (preferenceError) throw preferenceError
    return res.json({ checkoutUrl, orderId })
  } catch (error) {
    if (orderId && !preferenceCreated)
      await adminSupabase.from("payment_orders").delete().eq("id", orderId)
    console.error("Payment checkout creation failed", error)
    return res.status(500).json({ error: "Não foi possível iniciar o pagamento." })
  }
})

app.get("/api/payments/orders/:id", authenticatedSupabaseUser, async (req, res) => {
  if (!adminSupabase) return res.status(503).json({ error: "Pagamentos não configurados." })
  if (!uuidPattern.test(req.params.id))
    return res.status(400).json({ error: "Pedido inválido." })
  const { data, error } = await adminSupabase
    .from("payment_orders")
    .select("id, kind, amount, status, project_id")
    .eq("id", req.params.id)
    .eq("buyer_id", req.paymentUser.id)
    .maybeSingle()
  if (error) return res.status(500).json({ error: "Não foi possível consultar o pagamento." })
  if (!data) return res.status(404).json({ error: "Pagamento não encontrado." })
  return res.json({ order: data })
})

app.post("/api/payments/webhook", async (req, res) => {
  const paymentId = String(
    req.query["data.id"] || req.query.data_id || req.body?.data?.id || "",
  )
  const topic = String(req.query.type || req.query.topic || req.body?.type || "")
  if (!paymentId || !["payment", "payments"].includes(topic))
    return res.sendStatus(200)
  if (!isValidPaymentWebhook(req, paymentId))
    return res.status(401).json({ error: "Assinatura do webhook inválida." })
  if (!paymentWebhookSecret || !adminSupabase || !mercadoPagoOAuthConfigured())
    return res.status(503).json({ error: "Processamento de pagamentos não configurado." })
  try {
    const collectorId = String(req.body?.user_id || req.query.user_id || "")
    if (!/^\d+$/.test(collectorId)) return res.sendStatus(200)
    const { data: connectedAccount, error: accountError } = await adminSupabase
      .from("mercadopago_accounts")
      .select("user_id, collector_id")
      .eq("collector_id", collectorId)
      .maybeSingle()
    if (accountError) throw accountError
    if (!connectedAccount) return res.sendStatus(200)
    const sellerToken = await getPaymentSellerToken(connectedAccount.user_id)
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${sellerToken.accessToken}` },
    })
    const payment = await response.json()
    if (!response.ok) throw new Error("Mercado Pago não retornou o pagamento.")
    if (String(payment.collector_id) !== sellerToken.collectorId)
      return res.status(422).json({ error: "A conta recebedora do pagamento não confere." })
    if (!uuidPattern.test(String(payment.external_reference || "")))
      return res.sendStatus(200)
    const { data: order, error: orderError } = await adminSupabase
      .from("payment_orders")
      .select("id, buyer_id, project_id, seller_id, kind, amount, status")
      .eq("id", payment.external_reference)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) return res.sendStatus(200)
    if (order.seller_id !== connectedAccount.user_id)
      return res.status(422).json({ error: "O publicador recebedor do pedido não confere." })
    if (payment.currency_id !== "BRL" || Number(payment.transaction_amount) !== Number(order.amount))
      return res.status(422).json({ error: "Valor ou moeda do pagamento não confere." })

    const status =
      payment.status === "charged_back"
        ? "refunded"
        : ["approved", "in_process", "rejected", "cancelled", "refunded"].includes(
              payment.status,
            )
          ? payment.status
          : "pending"
    const { error: transactionError } = await adminSupabase
      .from("payment_transactions")
      .upsert({
        payment_id: String(payment.id),
        order_id: order.id,
        status,
        payment_method_id: payment.payment_method_id || null,
        updated_at: now(),
      })
    if (transactionError) throw transactionError
    if (status === "approved" || status === "refunded" || order.status !== "approved") {
      const { error: updateError } = await adminSupabase
        .from("payment_orders")
        .update({ status, updated_at: now() })
        .eq("id", order.id)
      if (updateError) throw updateError
    }
    if (status === "approved" && order.kind === "purchase") {
      const { error: libraryError } = await adminSupabase.from("library").upsert(
        { user_id: order.buyer_id, project_id: order.project_id },
        { onConflict: "user_id,project_id", ignoreDuplicates: true },
      )
      if (libraryError) throw libraryError
    }
    return res.sendStatus(200)
  } catch (error) {
    console.error("Payment webhook processing failed", error)
    return res.status(500).json({ error: "Não foi possível processar a confirmação." })
  }
})

const adminPageSize = 30
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function adminPage(value) {
  const parsed = Number.parseInt(String(value || "1"), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

async function removeStorageFiles(bucket, files) {
  const paths = [...new Set(files.filter(Boolean))]
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await adminSupabase.storage
      .from(bucket)
      .remove(paths.slice(offset, offset + 100))
    if (error) return error
  }
  return null
}

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const page = adminPage(req.query.page)
  const { data, error } = await adminSupabase.auth.admin.listUsers({
    page,
    perPage: adminPageSize,
  })
  if (error)
    return res.status(502).json({ error: "Não foi possível carregar usuários." })

  const authUsers = data.users || []
  const userIds = authUsers.map((user) => user.id)
  const { data: profiles, error: profilesError } = userIds.length
    ? await adminSupabase
        .from("profiles")
        .select("id, username, display_name, is_blocked")
        .in("id", userIds)
    : { data: [], error: null }
  if (profilesError)
    return res.status(502).json({ error: "Não foi possível carregar perfis." })

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))
  return res.json({
    users: authUsers.map((user) => {
      const profile = profilesById.get(user.id)
      const banned = user.banned_until && Date.parse(user.banned_until) > Date.now()
      return {
        id: user.id,
        email: user.email || "",
        name: profile?.display_name || user.user_metadata?.display_name || "",
        username: profile?.username || user.user_metadata?.username || "",
        createdAt: user.created_at,
        blocked: Boolean(profile?.is_blocked || user.app_metadata?.blocked || banned),
        isAdmin: user.app_metadata?.role === "admin",
      }
    }),
    hasMore: authUsers.length === adminPageSize,
  })
})

app.get("/api/admin/projects", requireAdmin, async (req, res) => {
  const page = adminPage(req.query.page)
  const offset = (page - 1) * adminPageSize
  const status = req.query.status ?? "pending"
  if (!["pending", "approved", "rejected", "all"].includes(status))
    return res.status(400).json({ error: "Filtro de análise inválido." })

  let projectsQuery = adminSupabase
    .from("projects")
    .select(
      "id, name, owner_id, category, version, created_at, file_path, file_name, is_blocked, review_status, profiles!projects_owner_id_fkey(username, display_name)",
      { count: "exact" },
    )
  if (status !== "all") projectsQuery = projectsQuery.eq("review_status", status)
  const { data, error, count } = await projectsQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + adminPageSize - 1)
  if (error)
    return res.status(502).json({ error: "Não foi possível carregar submissões." })

  return res.json({
    projects: (data || []).map((project) => {
      const profile = Array.isArray(project.profiles)
        ? project.profiles[0]
        : project.profiles
      return {
        id: project.id,
        name: project.name,
        ownerId: project.owner_id,
        ownerName: profile?.display_name || profile?.username || "Conta removida",
        category: project.category,
        version: project.version,
        fileName: project.file_name,
        createdAt: project.created_at,
        blocked: Boolean(project.is_blocked),
        reviewStatus: project.review_status,
      }
    }),
    hasMore: offset + (data || []).length < (count || 0),
  })
})

app.patch("/api/admin/users/:id/block", requireAdmin, async (req, res) => {
  const userId = req.params.id
  if (!uuidPattern.test(userId))
    return res.status(400).json({ error: "Identificador de usuário inválido." })
  if (typeof req.body?.blocked !== "boolean")
    return res.status(400).json({ error: "Informe o estado do bloqueio." })

  const { data, error } = await adminSupabase.auth.admin.getUserById(userId)
  if (error || !data.user)
    return res.status(404).json({ error: "Usuário não encontrado." })
  if (data.user.app_metadata?.role === "admin")
    return res.status(403).json({ error: "Não é permitido bloquear um administrador." })

  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("is_blocked")
    .eq("id", userId)
    .maybeSingle()
  if (profileError || !profile)
    return res.status(404).json({ error: "Perfil não encontrado." })

  const { error: updateProfileError } = await adminSupabase
    .from("profiles")
    .update({ is_blocked: req.body.blocked })
    .eq("id", userId)
  if (updateProfileError)
    return res.status(502).json({ error: "Não foi possível atualizar o bloqueio." })

  const { error: updateAuthError } =
    await adminSupabase.auth.admin.updateUserById(userId, {
      ban_duration: req.body.blocked ? "876000h" : "none",
      app_metadata: {
        ...data.user.app_metadata,
        blocked: req.body.blocked,
      },
    })
  if (updateAuthError) {
    const { error: rollbackError } = await adminSupabase
      .from("profiles")
      .update({ is_blocked: profile.is_blocked })
      .eq("id", userId)
    if (rollbackError)
      console.error("Failed to roll back blocked profile state", rollbackError)
    return res.status(502).json({ error: "Não foi possível atualizar o bloqueio." })
  }

  return res.json({ ok: true, blocked: req.body.blocked })
})

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const userId = req.params.id
  if (!uuidPattern.test(userId))
    return res.status(400).json({ error: "Identificador de usuário inválido." })
  if (userId === req.adminUser.id)
    return res.status(403).json({ error: "Não é permitido excluir a própria conta." })

  const { data: authData, error: authLookupError } =
    await adminSupabase.auth.admin.getUserById(userId)
  if (authLookupError || !authData.user)
    return res.status(404).json({ error: "Usuário não encontrado." })
  if (authData.user.app_metadata?.role === "admin")
    return res.status(403).json({ error: "Não é permitido excluir outro administrador." })

  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle()
  if (profileError)
    return res.status(502).json({ error: "Não foi possível carregar o perfil." })

  const { data: projects, error: projectsError } = await adminSupabase
    .from("projects")
    .select("file_path")
    .eq("owner_id", userId)
  if (projectsError)
    return res.status(502).json({ error: "Não foi possível carregar submissões." })

  const projectFilesError = await removeStorageFiles(
    "devio-project-files",
    (projects || []).map((project) => project.file_path),
  )
  if (projectFilesError)
    return res.status(502).json({ error: "Não foi possível remover arquivos das submissões." })

  if (profile?.avatar_path) {
    const avatarError = await removeStorageFiles("devio-avatars", [
      profile.avatar_path,
    ])
    if (avatarError)
      return res.status(502).json({ error: "Não foi possível remover a foto do perfil." })
  }

  const { error: deleteError } =
    await adminSupabase.auth.admin.deleteUser(userId)
  if (deleteError)
    return res.status(502).json({
      error: "Os arquivos foram removidos, mas não foi possível excluir a conta.",
    })
  return res.json({ ok: true })
})

app.delete("/api/admin/projects/:id", requireAdmin, async (req, res) => {
  const projectId = req.params.id
  if (!uuidPattern.test(projectId))
    return res.status(400).json({ error: "Identificador de submissão inválido." })

  const { data: project, error: projectError } = await adminSupabase
    .from("projects")
    .select("file_path")
    .eq("id", projectId)
    .maybeSingle()
  if (projectError)
    return res.status(502).json({ error: "Não foi possível carregar a submissão." })
  if (!project)
    return res.status(404).json({ error: "Submissão não encontrada." })

  const storageError = await removeStorageFiles("devio-project-files", [
    project.file_path,
  ])
  if (storageError)
    return res.status(502).json({ error: "Não foi possível remover o arquivo da submissão." })

  const { error: deleteError } = await adminSupabase
    .from("projects")
    .delete()
    .eq("id", projectId)
  if (deleteError)
    return res.status(502).json({
      error: "O arquivo foi removido, mas não foi possível excluir a submissão.",
    })
  return res.json({ ok: true })
})

app.patch("/api/admin/projects/:id/block", requireAdmin, async (req, res) => {
  const projectId = req.params.id
  if (!uuidPattern.test(projectId))
    return res.status(400).json({ error: "Identificador de submissão inválido." })
  if (typeof req.body?.blocked !== "boolean")
    return res.status(400).json({ error: "Informe o estado do bloqueio." })

  const { data, error } = await adminSupabase
    .from("projects")
    .update({ is_blocked: req.body.blocked })
    .eq("id", projectId)
    .select("id")
    .maybeSingle()
  if (error)
    return res.status(502).json({ error: "Não foi possível alterar o bloqueio da submissão." })
  if (!data)
    return res.status(404).json({ error: "Submissão não encontrada." })
  return res.json({ ok: true, blocked: req.body.blocked })
})

app.patch("/api/admin/projects/:id/review", requireAdmin, async (req, res) => {
  const projectId = req.params.id
  const { status, note } = req.body || {}
  if (!uuidPattern.test(projectId))
    return res.status(400).json({ error: "Identificador de submissão inválido." })
  if (status !== "approved" && status !== "rejected")
    return res.status(400).json({ error: "Informe se a submissão foi aprovada ou recusada." })
  if (note !== undefined && (typeof note !== "string" || note.length > 1000))
    return res.status(400).json({ error: "O motivo da recusa deve ter até 1.000 caracteres." })

  const { data, error } = await adminSupabase
    .from("projects")
    .update({
      review_status: status,
      review_note: status === "rejected" ? (note || "").trim() : null,
    })
    .eq("id", projectId)
    .select("id, review_status")
    .maybeSingle()
  if (error)
    return res.status(502).json({ error: "Não foi possível registrar a decisão de análise." })
  if (!data)
    return res.status(404).json({ error: "Submissão não encontrada." })
  return res.json({ ok: true, reviewStatus: data.review_status })
})

app.post("/api/auth/register", async (req, res) => {
  const { name, username, email, password } = req.body || {}
  if (
    ![name, username, email, password].every(
      (value) => typeof value === "string" && value.trim(),
    ) ||
    password.length < 8 ||
    password.length > 128
  ) {
    return res.status(400).json({
      error:
        "Nome, usuário, e-mail e senha de 8 a 128 caracteres são obrigatórios.",
    })
  }
  const normalizedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase()
  if (
    !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
    !/^[a-z0-9_]{3,30}$/.test(normalizedUsername)
  ) {
    return res
      .status(400)
      .json({ error: "E-mail ou nome de usuário inválido." })
  }
  try {
    const userId = id()
    const confirmationToken = crypto.randomBytes(24).toString("hex")
    db.prepare(
      "INSERT INTO users (id, name, username, email, password_hash, confirmation_token_hash, confirmation_expires_at, password_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      userId,
      normalizedName,
      normalizedUsername,
      normalizedEmail,
      passwordHash(password),
      hashToken(confirmationToken),
      new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      now(),
      now(),
    )
    let emailSent = false
    try {
      const link = `${appUrl}/#confirmEmail=${encodeURIComponent(confirmationToken)}`
      emailSent = await sendActionEmail({
        to: normalizedEmail,
        subject: "Confirme seu e-mail — dev.io",
        text: `Olá, ${normalizedName}. Confirme sua conta no dev.io: ${link}\nO link expira em 30 minutos.`,
        html: `<p>Olá, ${escapeHtml(normalizedName)}.</p><p><a href="${link}">Confirme sua conta no dev.io</a>. Este link expira em 30 minutos.</p>`,
      })
    } catch (error) {
      logEmailFailure("confirmation", error)
    }
    res.status(201).json({
      user: {
        id: userId,
        name: normalizedName,
        username: normalizedUsername,
        email: normalizedEmail,
        emailVerified: false,
      },
      emailSent,
      confirmationToken:
        !mailConfigured && process.env.NODE_ENV !== "production"
          ? confirmationToken
          : undefined,
    })
  } catch (error) {
    const message = String(error).includes("UNIQUE")
      ? "E-mail ou usuário já cadastrado."
      : "Não foi possível criar a conta."
    res
      .status(String(error).includes("UNIQUE") ? 409 : 500)
      .json({ error: message })
  }
})

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {}
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    password.length > 128
  ) {
    return res.status(400).json({ error: "Informe seu e-mail e senha." })
  }
  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase())
  if (!user || !verifyPassword(password, user.password_hash))
    return res.status(401).json({ error: "E-mail ou senha inválidos." })
  if (!user.email_verified)
    return res
      .status(403)
      .json({ error: "Confirme seu e-mail antes de entrar." })
  setSession(res, user.id)
  const changedAt = Date.parse(
    user.password_changed_at || user.created_at || now(),
  )
  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      emailVerified: true,
    },
    passwordChangeRequired: Date.now() - changedAt >= passwordMaxAgeMs,
  })
})

app.post("/api/auth/resend-confirmation", async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : ""
  const user = email
    ? db
        .prepare(
          "SELECT id, name, email, email_verified FROM users WHERE email = ?",
        )
        .get(email)
    : null
  let confirmationToken
  let emailSent = false
  if (user && !user.email_verified) {
    confirmationToken = crypto.randomBytes(24).toString("hex")
    db.prepare(
      "UPDATE users SET confirmation_token_hash = ?, confirmation_expires_at = ? WHERE id = ?",
    ).run(
      hashToken(confirmationToken),
      new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      user.id,
    )
    try {
      const link = `${appUrl}/#confirmEmail=${encodeURIComponent(confirmationToken)}`
      emailSent = await sendActionEmail({
        to: email,
        subject: "Confirme seu e-mail — dev.io",
        text: `Olá, ${user.name}. Confirme sua conta no dev.io: ${link}\nO link expira em 30 minutos.`,
        html: `<p>Olá, ${escapeHtml(user.name)}.</p><p><a href="${link}">Confirme sua conta no dev.io</a>. Este link expira em 30 minutos.</p>`,
      })
    } catch (error) {
      logEmailFailure("confirmation", error)
    }
  }
  res.json({
    ok: true,
    confirmationToken:
      user && !mailConfigured && process.env.NODE_ENV !== "production"
        ? confirmationToken
        : undefined,
    emailSent,
  })
})

app.post("/api/auth/password-reset", async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : ""
  const user = email
    ? db
        .prepare(
          "SELECT id, name, email FROM users WHERE email = ? AND email_verified = 1",
        )
        .get(email)
    : null
  let resetToken
  let emailSent = false
  if (user) {
    resetToken = crypto.randomBytes(24).toString("hex")
    db.prepare(
      "UPDATE users SET password_reset_token_hash = ?, password_reset_expires_at = ? WHERE id = ?",
    ).run(
      hashToken(resetToken),
      new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      user.id,
    )
    try {
      const link = `${appUrl}/#resetPassword=${encodeURIComponent(resetToken)}`
      emailSent = await sendActionEmail({
        to: email,
        subject: "Redefina sua senha — dev.io",
        text: `Olá, ${user.name}. Redefina sua senha: ${link}\nO link expira em 30 minutos. Se você não solicitou esta alteração, ignore este e-mail.`,
        html: `<p>Olá, ${escapeHtml(user.name)}.</p><p><a href="${link}">Redefina sua senha no dev.io</a>. Este link expira em 30 minutos. Se você não solicitou esta alteração, ignore este e-mail.</p>`,
      })
    } catch (error) {
      logEmailFailure("password_reset", error)
    }
  }
  res.json({
    ok: true,
    resetToken:
      user && !mailConfigured && process.env.NODE_ENV !== "production"
        ? resetToken
        : undefined,
    emailSent,
  })
})

app.post("/api/auth/password-reset/complete", (req, res) => {
  const { token, password } = req.body || {}
  if (
    typeof token !== "string" ||
    !token ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return res.status(400).json({
      error: "Token e senha de 8 a 128 caracteres são obrigatórios.",
    })
  }
  const user = db
    .prepare(
      "SELECT id FROM users WHERE password_reset_token_hash = ? AND password_reset_expires_at > ?",
    )
    .get(hashToken(token), now())
  if (!user)
    return res
      .status(400)
      .json({ error: "Link de recuperação inválido ou expirado." })
  db.prepare(
    "UPDATE users SET password_hash = ?, password_changed_at = ?, password_reset_token_hash = NULL, password_reset_expires_at = NULL WHERE id = ?",
  ).run(passwordHash(password), now(), user.id)
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id)
  res.json({ ok: true })
})

app.put("/api/auth/password", requireUser, (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return res
      .status(400)
      .json({ error: "A nova senha deve ter de 8 a 128 caracteres." })
  }
  if (!verifyPassword(currentPassword, req.user.password_hash)) {
    return res.status(401).json({ error: "Senha atual incorreta." })
  }
  db.prepare(
    "UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?",
  ).run(passwordHash(newPassword), now(), req.user.id)
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(req.user.id)
  setSession(res, req.user.id)
  res.json({ ok: true })
})

app.post("/api/auth/google", async (req, res) => {
  const credential = String(req.body?.credential || "")
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId)
    return res
      .status(503)
      .json({ error: "Login Google não configurado no servidor." })
  if (!credential)
    return res.status(400).json({ error: "Credencial Google obrigatória." })
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    )
    const profile = await response.json()
    if (
      !response.ok ||
      profile.aud !== clientId ||
      profile.email_verified !== "true" ||
      !profile.email ||
      !profile.sub
    ) {
      return res
        .status(401)
        .json({ error: "Credencial Google inválida ou não verificada." })
    }
    const email = String(profile.email).trim().toLowerCase()
    let user = db
      .prepare("SELECT * FROM users WHERE google_sub = ? OR email = ?")
      .get(String(profile.sub), email)
    if (!user) {
      const baseUsername =
        email
          .split("@")[0]
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 24) || "google_user"
      let username = baseUsername
      let suffix = 1
      while (
        db.prepare("SELECT id FROM users WHERE username = ?").get(username)
      )
        username = `${baseUsername.slice(0, 25 - String(suffix).length)}${suffix++}`
      const userId = id()
      db.prepare(
        "INSERT INTO users (id, name, username, email, password_hash, email_verified, google_sub, password_changed_at, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)",
      ).run(
        userId,
        String(profile.name || username).trim(),
        username,
        email,
        passwordHash(crypto.randomBytes(32).toString("hex")),
        String(profile.sub),
        now(),
        now(),
      )
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId)
    } else if (!user.google_sub) {
      db.prepare(
        "UPDATE users SET google_sub = ?, email_verified = 1 WHERE id = ?",
      ).run(String(profile.sub), user.id)
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)
    }
    setSession(res, user.id)
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        emailVerified: true,
      },
    })
  } catch {
    return res
      .status(502)
      .json({ error: "Não foi possível validar a conta Google." })
  }
})

app.post("/api/auth/confirm-email", (req, res) => {
  if (typeof req.body?.token !== "string" || !req.body.token)
    return res.status(400).json({ error: "Token de confirmação obrigatório." })
  const user = db
    .prepare(
      "SELECT id, email_verified FROM users WHERE confirmation_token_hash = ? AND confirmation_expires_at > ?",
    )
    .get(hashToken(req.body.token), now())
  if (!user || user.email_verified) {
    return res
      .status(400)
      .json({ error: "Token de confirmação inválido ou expirado." })
  }
  db.prepare(
    "UPDATE users SET email_verified = 1, confirmation_token_hash = NULL, confirmation_expires_at = NULL WHERE id = ?",
  ).run(user.id)
  res.json({ ok: true })
})

app.get("/api/auth/me", (req, res) => {
  const user = currentUser(req)
  const stats = user
    ? db
        .prepare(
          "SELECT (SELECT COUNT(*) FROM projects WHERE owner_id = ?) AS projectCount, (SELECT COUNT(*) FROM library WHERE user_id = ?) AS savedProjectCount",
        )
        .get(user.id, user.id)
    : null
  res.json({
    user: user ? publicUser(user) : null,
    stats,
  })
})

app.put("/api/auth/profile", requireUser, async (req, res) => {
  const { name, username, email, bio = "" } = req.body || {}
  if (
    typeof name !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof bio !== "string"
  ) {
    return res.status(400).json({ error: "Preencha os campos de perfil corretamente." })
  }
  const normalizedName = name.trim()
  const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase()
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedBio = bio.trim()
  if (
    normalizedName.length < 2 ||
    normalizedName.length > 100 ||
    !/^[a-z0-9_]{3,30}$/.test(normalizedUsername) ||
    !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
    normalizedBio.length > 280
  ) {
    return res.status(400).json({
      error: "Nome, usuário, e-mail ou biografia inválidos. A biografia aceita até 280 caracteres.",
    })
  }

  const emailChanged = normalizedEmail !== req.user.email
  const confirmationToken = emailChanged
    ? crypto.randomBytes(24).toString("hex")
    : undefined
  try {
    db.prepare(
      "UPDATE users SET name = ?, username = ?, email = ?, bio = ?, email_verified = ?, confirmation_token_hash = ?, confirmation_expires_at = ? WHERE id = ?",
    ).run(
      normalizedName,
      normalizedUsername,
      normalizedEmail,
      normalizedBio,
      emailChanged ? 0 : 1,
      confirmationToken ? hashToken(confirmationToken) : null,
      confirmationToken
        ? new Date(Date.now() + 1000 * 60 * 30).toISOString()
        : null,
      req.user.id,
    )
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return res.status(409).json({ error: "E-mail ou nome de usuário já está em uso." })
    }
    throw error
  }

  let emailSent
  if (confirmationToken) {
    const link = `${appUrl}/#confirmEmail=${encodeURIComponent(confirmationToken)}`
    try {
      emailSent = await sendActionEmail({
        to: normalizedEmail,
        subject: "Confirme seu novo e-mail — dev.io",
        text: `Confirme o novo e-mail da sua conta dev.io: ${link}\nO link expira em 30 minutos.`,
        html: `<p><a href="${link}">Confirme seu novo e-mail no dev.io</a>. Este link expira em 30 minutos.</p>`,
      })
    } catch (error) {
      logEmailFailure("confirmation", error)
      emailSent = false
    }
  }

  const updatedUser = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.user.id)
  res.json({
    user: publicUser(updatedUser),
    emailSent,
    confirmationToken:
      confirmationToken && !mailConfigured && process.env.NODE_ENV !== "production"
        ? confirmationToken
        : undefined,
  })
})

app.post(
  "/api/auth/avatar",
  requireUser,
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (error) => {
      if (error) {
        return res.status(400).json({ error: "A foto deve ter no máximo 2 MB." })
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Selecione uma foto." })
    const data = req.file.buffer
    const formats = [
      {
        extension: ".jpg",
        mime: "image/jpeg",
        matches: data.length >= 3 && data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
      },
      {
        extension: ".png",
        mime: "image/png",
        matches: data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      },
      {
        extension: ".webp",
        mime: "image/webp",
        matches: data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP",
      },
    ]
    const format = formats.find((candidate) => candidate.mime === req.file.mimetype && candidate.matches)
    if (!format) {
      return res.status(415).json({ error: "Use uma imagem JPEG, PNG ou WebP válida." })
    }

    fs.mkdirSync(avatarDirectory, { recursive: true })
    const avatarPath = path.join(avatarDirectory, `${req.user.id}${format.extension}`)
    fs.writeFileSync(avatarPath, data, { mode: 0o600 })
    db.prepare("UPDATE users SET avatar_path = ? WHERE id = ?").run(avatarPath, req.user.id)
    const previousPath = storedAvatarPath(req.user.avatar_path)
    if (previousPath && previousPath !== avatarPath) {
      fs.rmSync(previousPath, { force: true })
    }
    res.json({ avatarUrl: `/api/auth/avatar?v=${Date.now()}` })
  },
)

app.get("/api/auth/avatar", requireUser, (req, res) => {
  const avatarPath = storedAvatarPath(req.user.avatar_path)
  if (!avatarPath || !fs.existsSync(avatarPath)) {
    return res.status(404).json({ error: "Foto de perfil não encontrada." })
  }
  res.setHeader("Cache-Control", "private, no-store")
  return res.sendFile(avatarPath)
})

app.delete("/api/auth/avatar", requireUser, (req, res) => {
  const avatarPath = storedAvatarPath(req.user.avatar_path)
  db.prepare("UPDATE users SET avatar_path = NULL WHERE id = ?").run(req.user.id)
  if (avatarPath) fs.rmSync(avatarPath, { force: true })
  res.json({ ok: true })
})

app.delete("/api/auth/session", (req, res) => {
  const token = req.headers.cookie?.match(/(?:^|; )devio_session=([^;]+)/)?.[1]
  if (token)
    db.prepare("DELETE FROM sessions WHERE id_hash = ?").run(hashToken(token))
  res.clearCookie(sessionCookie)
  res.status(204).end()
})

app.get("/api/projects", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT projects.*, users.username FROM projects LEFT JOIN users ON users.id = projects.owner_id WHERE scan_status = 'approved' ORDER BY created_at DESC",
    )
    .all()
  res.json({ projects: rows.map(publicProject) })
})

app.get("/api/projects/mine", requireUser, (req, res) => {
  const rows = db
    .prepare(
      "SELECT projects.*, users.username FROM projects LEFT JOIN users ON users.id = projects.owner_id WHERE projects.owner_id = ? ORDER BY created_at DESC",
    )
    .all(req.user.id)
  res.json({ projects: rows.map(publicProject) })
})

app.get("/api/projects/:id/sandbox", async (req, res) => {
  if (!adminSupabase)
    return res.status(503).json({
      error: "A prévia pública precisa ser configurada no servidor.",
    })
  if (!uuidPattern.test(req.params.id))
    return res.status(400).json({ error: "Identificador de projeto inválido." })

  let viewerId = null
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (token) {
    const { data: userData, error: userError } = await adminSupabase.auth.getUser(token)
    if (userError || !userData.user)
      return res.status(401).json({ error: "Sessão inválida ou expirada." })
    viewerId = userData.user.id
  }

  const { data: project, error } = await adminSupabase
    .from("projects")
    .select("owner_id, file_path, file_name, file_size, file_type, sandbox_type, price")
    .eq("id", req.params.id)
    .eq("is_blocked", false)
    .eq("review_status", "approved")
    .maybeSingle()
  if (error)
    return res.status(502).json({ error: "Não foi possível carregar o projeto." })
  if (!project)
    return res.status(404).json({ error: "Projeto não encontrado." })
  if (project.price !== "Grátis" && project.owner_id !== viewerId) {
    if (!viewerId)
      return res.status(401).json({ error: "Entre na conta que comprou este projeto." })
    const { data: order, error: orderError } = await adminSupabase
      .from("payment_orders")
      .select("id")
      .eq("project_id", req.params.id)
      .eq("buyer_id", viewerId)
      .eq("kind", "purchase")
      .eq("status", "approved")
      .limit(1)
      .maybeSingle()
    if (orderError)
      return res.status(502).json({ error: "Não foi possível verificar a compra." })
    if (!order)
      return res.status(403).json({ error: "Compre o projeto para abrir a prévia." })
  }
  const { data: profileIsPublic, error: privacyError } =
    await adminSupabase.rpc("is_profile_public", {
      target_user_id: project.owner_id,
    })
  if (privacyError)
    return res.status(502).json({ error: "Não foi possível verificar a privacidade do perfil." })
  if (!profileIsPublic)
    return res.status(404).json({ error: "Projeto não encontrado." })
  if (project.file_size > 25 * 1024 * 1024)
    return res.status(413).json({
      error: "A prévia do sandbox aceita arquivos de até 25 MB.",
    })

  const { data: signedFile, error: signedUrlError } =
    await adminSupabase.storage
      .from("devio-project-files")
      .createSignedUrl(project.file_path, 120)
  if (signedUrlError || !signedFile?.signedUrl)
    return res.status(502).json({
      error: "Não foi possível preparar a prévia pública.",
    })

  res.setHeader("Cache-Control", "no-store")
  return res.json({
    signedUrl: signedFile.signedUrl,
    fileName: project.file_name,
    fileType: project.file_type,
    sandboxType: project.sandbox_type,
  })
})

app.get("/api/projects/:id/download", (req, res) => {
  const project = db
    .prepare(
      "SELECT file_path, file_name FROM projects WHERE id = ? AND scan_status = 'approved'",
    )
    .get(req.params.id)
  if (!project?.file_path || !fs.existsSync(project.file_path))
    return res.status(404).json({ error: "Arquivo do projeto não encontrado." })
  return res.download(project.file_path, project.file_name || "projeto.zip")
})

app.get("/api/projects/:id/preview", (req, res) => {
  const project = db
    .prepare(
      "SELECT file_path, file_name FROM projects WHERE id = ? AND scan_status = 'approved'",
    )
    .get(req.params.id)
  if (!project?.file_path || !fs.existsSync(project.file_path))
    return res.status(404).json({ error: "Prévia indisponível." })

  const isZip = String(project.file_name).toLowerCase().endsWith(".zip")
  const command = isZip ? "unzip" : "tar"
  const args = isZip
    ? ["-p", project.file_path, "index.html"]
    : ["-xOf", project.file_path, "index.html"]
  try {
    const html = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 512 * 1024,
    })
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; font-src data:",
    )
    res.setHeader("X-Content-Type-Options", "nosniff")
    return res.send(html)
  } catch {
    return res.status(404).json({
      error: "Este projeto não possui um index.html compatível para prévia.",
    })
  }
})

app.get("/api/library", requireUser, (req, res) => {
  const rows = db
    .prepare(`
    SELECT projects.*, users.username FROM library
    JOIN projects ON projects.id = library.project_id
    LEFT JOIN users ON users.id = projects.owner_id
    WHERE library.user_id = ? ORDER BY library.added_at DESC
  `)
    .all(req.user.id)
  res.json({ projects: rows.map(publicProject) })
})

app.post("/api/library/:projectId", requireUser, (req, res) => {
  const project = db
    .prepare(
      "SELECT id FROM projects WHERE id = ? AND scan_status = 'approved'",
    )
    .get(req.params.projectId)
  if (!project)
    return res.status(404).json({ error: "Projeto não encontrado." })
  db.prepare(
    "INSERT OR IGNORE INTO library (user_id, project_id, added_at) VALUES (?, ?, ?)",
  ).run(req.user.id, project.id, now())
  return res.status(201).json({ ok: true })
})

app.delete("/api/library/:projectId", requireUser, (req, res) => {
  db.prepare("DELETE FROM library WHERE user_id = ? AND project_id = ?").run(
    req.user.id,
    req.params.projectId,
  )
  return res.status(204).end()
})

app.post("/api/projects", requireUser, upload.single("file"), (req, res) => {
  if (!req.file || !req.body.name || !req.body.category || !req.body.version)
    return res
      .status(400)
      .json({ error: "Projeto, categoria, versão e arquivo são obrigatórios." })
  const scan = scanArchive(req.file)
  if (!scan.approved)
    return res.status(422).json({ error: scan.reason, scanStatus: "blocked" })
  const projectId = id()
  const safeName = `${projectId}-${path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_")}`
  const filePath = path.join(storageDirectory, safeName)
  fs.writeFileSync(filePath, req.file.buffer, { mode: 0o600 })
  const checksum = crypto
    .createHash("sha256")
    .update(req.file.buffer)
    .digest("hex")
  db.prepare(
    `INSERT INTO projects (id, owner_id, name, description, category, version, price, file_name, file_path, file_sha256, scan_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
  ).run(
    projectId,
    req.user.id,
    String(req.body.name).trim(),
    String(req.body.description || ""),
    String(req.body.category),
    String(req.body.version),
    req.body.price ? `R$ ${req.body.price}` : "Grátis",
    req.file.originalname,
    filePath,
    checksum,
    now(),
  )
  db.prepare(
    "INSERT INTO library (user_id, project_id, added_at) VALUES (?, ?, ?)",
  ).run(req.user.id, projectId, now())
  res.status(201).json({
    project: {
      ...publicProject({
        ...req.body,
        id: projectId,
        username: req.user.username,
        price: req.body.price ? `R$ ${req.body.price}` : "Grátis",
        scan_status: "approved",
        created_at: now(),
        file_name: req.file.originalname,
        description: req.body.description || "",
      }),
      hasPreview: Boolean(scan.hasPreview),
    },
  })
})

class ProjectController {
  constructor(database) {
    this.database = database
  }

  update(req, res) {
    const project = this.database
      .prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?")
      .get(req.params.id, req.user.id)
    if (!project)
      return res.status(404).json({ error: "Projeto não encontrado." })

    const { name, description, category, version, price } = req.body || {}
    if (!name || !category || !version)
      return res
        .status(400)
        .json({ error: "Projeto, categoria e versão são obrigatórios." })
    this.database
      .prepare(
        "UPDATE projects SET name = ?, description = ?, category = ?, version = ?, price = ? WHERE id = ? AND owner_id = ?",
      )
      .run(
        String(name).trim(),
        String(description || "").trim(),
        String(category).trim(),
        String(version).trim(),
        price ? `R$ ${String(price).replace(/^R\$\s*/, "")}` : "Grátis",
        req.params.id,
        req.user.id,
      )
    const updated = this.database
      .prepare(
        "SELECT projects.*, users.username FROM projects LEFT JOIN users ON users.id = projects.owner_id WHERE projects.id = ?",
      )
      .get(req.params.id)
    return res.json({ project: publicProject(updated) })
  }

  remove(req, res) {
    const project = this.database
      .prepare("SELECT file_path FROM projects WHERE id = ? AND owner_id = ?")
      .get(req.params.id, req.user.id)
    if (!project)
      return res.status(404).json({ error: "Projeto não encontrado." })
    this.database
      .prepare("DELETE FROM projects WHERE id = ? AND owner_id = ?")
      .run(req.params.id, req.user.id)
    if (project.file_path) fs.rmSync(project.file_path, { force: true })
    return res.status(204).end()
  }
}

const projectController = new ProjectController(db)
app.put("/api/projects/:id", requireUser, (req, res) =>
  projectController.update(req, res),
)
app.delete("/api/projects/:id", requireUser, (req, res) =>
  projectController.remove(req, res),
)

const port = Number(process.env.API_PORT || 8787)
const server = app.listen(port, () =>
  console.log(`dev.io API listening on http://localhost:${port}`),
)
server.ref()
setInterval(() => {}, 60_000)
