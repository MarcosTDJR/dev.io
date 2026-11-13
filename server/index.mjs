import crypto from "node:crypto"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import express from "express"
import multer from "multer"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dataDirectory = process.env.DEVIO_DATA_DIR || path.join(root, "data")
const storageDirectory = process.env.DEVIO_STORAGE_DIR || path.join(root, "storage", "projects")
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

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name)
if (!userColumns.includes("confirmation_token_hash")) db.exec("ALTER TABLE users ADD COLUMN confirmation_token_hash TEXT")
if (!userColumns.includes("confirmation_expires_at")) db.exec("ALTER TABLE users ADD COLUMN confirmation_expires_at TEXT")
if (!userColumns.includes("google_sub")) db.exec("ALTER TABLE users ADD COLUMN google_sub TEXT")
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users(google_sub) WHERE google_sub IS NOT NULL")

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex")
const sessionCookie = "devio_session"

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${derived}`
}

function verifyPassword(password, stored) {
  const [, salt, expected] = stored.split("$")
  const actual = crypto.scryptSync(password, salt, 64).toString("hex")
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
}

function setSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
  db.prepare("INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)").run(hashToken(token), userId, expiresAt)
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
  return db.prepare(`
    SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.id_hash = ? AND sessions.expires_at > ?
  `).get(hashToken(token), now())
}

function requireUser(req, res, next) {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: "Faça login para continuar." })
  req.user = user
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

function scanArchive(file) {
  const extension = path.extname(file.originalname).toLowerCase()
  const allowed = [".zip", ".gz", ".tgz"]
  if (!allowed.includes(extension) && !file.originalname.toLowerCase().endsWith(".tar.gz")) {
    return { approved: false, reason: "Apenas arquivos .zip e .tar.gz são aceitos." }
  }
  const zipSignature = file.buffer.subarray(0, 2).equals(Buffer.from([0x50, 0x4b]))
  const gzipSignature = file.buffer.subarray(0, 2).equals(Buffer.from([0x1f, 0x8b]))
  if ((extension === ".zip" && !zipSignature) || (extension !== ".zip" && !gzipSignature)) {
    return { approved: false, reason: "A assinatura do arquivo não corresponde à extensão." }
  }
  if (file.originalname.includes("..") || path.isAbsolute(file.originalname)) {
    return { approved: false, reason: "Nome de arquivo inválido." }
  }

  const temporaryPath = path.join(dataDirectory, `${id()}${extension}`)
  fs.writeFileSync(temporaryPath, file.buffer, { mode: 0o600 })
  try {
    const command = extension === ".zip" ? "unzip" : "tar"
    const args = extension === ".zip" ? ["-Z1", temporaryPath] : ["-tzf", temporaryPath]
    const listing = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 2 * 1024 * 1024 })
    const unsafeEntry = listing.split("\n").find((entry) => entry.startsWith("/") || entry.split("/").includes(".."))
    if (unsafeEntry) return { approved: false, reason: "O arquivo contém caminho de extração inseguro." }
    const entries = listing.split("\n").map((entry) => entry.trim()).filter(Boolean)
    const hasPreview = entries.some((entry) => entry === "index.html" || entry === "./index.html")
    return { approved: true, hasPreview }
  } catch {
    return { approved: false, reason: "Não foi possível validar a integridade do arquivo." }
  } finally {
    fs.rmSync(temporaryPath, { force: true })
  }
}

const app = express()
app.use(express.json({ limit: "1mb" }))
if (process.env.NODE_ENV === "production") app.use(express.static(path.join(root, "dist")))
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.WEB_ORIGIN || "http://localhost:8443")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
})

app.get("/api/health", (_req, res) => res.json({ status: "ok" }))

app.post("/api/auth/register", (req, res) => {
  const { name, username, email, password } = req.body || {}
  if (!name || !username || !email || !password || password.length < 8) {
    return res.status(400).json({ error: "Nome, usuário, e-mail e senha com 8 caracteres são obrigatórios." })
  }
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedUsername = String(username).trim().replace(/^@/, "").toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
    return res.status(400).json({ error: "E-mail ou nome de usuário inválido." })
  }
  try {
    const userId = id()
    const confirmationToken = crypto.randomBytes(24).toString("hex")
    db.prepare("INSERT INTO users (id, name, username, email, password_hash, confirmation_token_hash, confirmation_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(userId, String(name).trim(), normalizedUsername, normalizedEmail, passwordHash(password), hashToken(confirmationToken), new Date(Date.now() + 1000 * 60 * 30).toISOString(), now())
    setSession(res, userId)
    res.status(201).json({ user: { id: userId, name, username: normalizedUsername, email: normalizedEmail, emailVerified: false }, confirmationToken: process.env.NODE_ENV === "production" ? undefined : confirmationToken })
  } catch (error) {
    const message = String(error).includes("UNIQUE") ? "E-mail ou usuário já cadastrado." : "Não foi possível criar a conta."
    res.status(409).json({ error: message })
  }
})

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {}
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").trim().toLowerCase())
  if (!user || !verifyPassword(String(password || ""), user.password_hash)) return res.status(401).json({ error: "E-mail ou senha inválidos." })
  if (!user.email_verified) return res.status(403).json({ error: "Confirme seu e-mail antes de entrar." })
  setSession(res, user.id)
  res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, emailVerified: true } })
})

app.post("/api/auth/google", async (req, res) => {
  const credential = String(req.body?.credential || "")
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return res.status(503).json({ error: "Login Google não configurado no servidor." })
  if (!credential) return res.status(400).json({ error: "Credencial Google obrigatória." })
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
    const profile = await response.json()
    if (!response.ok || profile.aud !== clientId || profile.email_verified !== "true" || !profile.email || !profile.sub) {
      return res.status(401).json({ error: "Credencial Google inválida ou não verificada." })
    }
    const email = String(profile.email).trim().toLowerCase()
    let user = db.prepare("SELECT * FROM users WHERE google_sub = ? OR email = ?").get(String(profile.sub), email)
    if (!user) {
      const baseUsername = email.split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, 24) || "google_user"
      let username = baseUsername
      let suffix = 1
      while (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) username = `${baseUsername.slice(0, 25 - String(suffix).length)}${suffix++}`
      const userId = id()
      db.prepare("INSERT INTO users (id, name, username, email, password_hash, email_verified, google_sub, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)").run(userId, String(profile.name || username).trim(), username, email, passwordHash(crypto.randomBytes(32).toString("hex")), String(profile.sub), now())
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId)
    } else if (!user.google_sub) {
      db.prepare("UPDATE users SET google_sub = ?, email_verified = 1 WHERE id = ?").run(String(profile.sub), user.id)
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)
    }
    setSession(res, user.id)
    return res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email, emailVerified: true } })
  } catch {
    return res.status(502).json({ error: "Não foi possível validar a conta Google." })
  }
})

app.post("/api/auth/confirm-email", (req, res) => {
  if (!req.body?.token) return res.status(400).json({ error: "Token de confirmação obrigatório." })
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: "Sessão de cadastro expirada." })
  if (user.email_verified || user.confirmation_token_hash !== hashToken(String(req.body.token)) || user.confirmation_expires_at <= now()) {
    return res.status(400).json({ error: "Token de confirmação inválido ou expirado." })
  }
  db.prepare("UPDATE users SET email_verified = 1, confirmation_token_hash = NULL, confirmation_expires_at = NULL WHERE id = ?").run(user.id)
  res.json({ ok: true })
})

app.get("/api/auth/me", (req, res) => {
  const user = currentUser(req)
  res.json({ user: user ? { id: user.id, name: user.name, username: user.username, email: user.email, emailVerified: Boolean(user.email_verified) } : null })
})

app.delete("/api/auth/session", (req, res) => {
  const token = req.headers.cookie?.match(/(?:^|; )devio_session=([^;]+)/)?.[1]
  if (token) db.prepare("DELETE FROM sessions WHERE id_hash = ?").run(hashToken(token))
  res.clearCookie(sessionCookie)
  res.status(204).end()
})

app.get("/api/projects", (_req, res) => {
  const rows = db.prepare("SELECT projects.*, users.username FROM projects LEFT JOIN users ON users.id = projects.owner_id WHERE scan_status = 'approved' ORDER BY created_at DESC").all()
  res.json({ projects: rows.map(publicProject) })
})

app.get("/api/projects/mine", requireUser, (req, res) => {
  const rows = db.prepare("SELECT projects.*, users.username FROM projects LEFT JOIN users ON users.id = projects.owner_id WHERE projects.owner_id = ? ORDER BY created_at DESC").all(req.user.id)
  res.json({ projects: rows.map(publicProject) })
})

app.get("/api/projects/:id/download", (req, res) => {
  const project = db.prepare("SELECT file_path, file_name FROM projects WHERE id = ? AND scan_status = 'approved'").get(req.params.id)
  if (!project?.file_path || !fs.existsSync(project.file_path)) return res.status(404).json({ error: "Arquivo do projeto não encontrado." })
  return res.download(project.file_path, project.file_name || "projeto.zip")
})

app.get("/api/projects/:id/preview", (req, res) => {
  const project = db.prepare("SELECT file_path, file_name FROM projects WHERE id = ? AND scan_status = 'approved'").get(req.params.id)
  if (!project?.file_path || !fs.existsSync(project.file_path)) return res.status(404).json({ error: "Prévia indisponível." })

  const isZip = String(project.file_name).toLowerCase().endsWith(".zip")
  const command = isZip ? "unzip" : "tar"
  const args = isZip ? ["-p", project.file_path, "index.html"] : ["-xOf", project.file_path, "index.html"]
  try {
    const html = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 512 * 1024 })
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; font-src data:")
    res.setHeader("X-Content-Type-Options", "nosniff")
    return res.send(html)
  } catch {
    return res.status(404).json({ error: "Este projeto não possui um index.html compatível para prévia." })
  }
})

app.get("/api/library", requireUser, (req, res) => {
  const rows = db.prepare(`
    SELECT projects.*, users.username FROM library
    JOIN projects ON projects.id = library.project_id
    LEFT JOIN users ON users.id = projects.owner_id
    WHERE library.user_id = ? ORDER BY library.added_at DESC
  `).all(req.user.id)
  res.json({ projects: rows.map(publicProject) })
})

app.post("/api/library/:projectId", requireUser, (req, res) => {
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND scan_status = 'approved'").get(req.params.projectId)
  if (!project) return res.status(404).json({ error: "Projeto não encontrado." })
  db.prepare("INSERT OR IGNORE INTO library (user_id, project_id, added_at) VALUES (?, ?, ?)").run(req.user.id, project.id, now())
  return res.status(201).json({ ok: true })
})

app.delete("/api/library/:projectId", requireUser, (req, res) => {
  db.prepare("DELETE FROM library WHERE user_id = ? AND project_id = ?").run(req.user.id, req.params.projectId)
  return res.status(204).end()
})

app.post("/api/projects", requireUser, upload.single("file"), (req, res) => {
  if (!req.file || !req.body.name || !req.body.category || !req.body.version) return res.status(400).json({ error: "Projeto, categoria, versão e arquivo são obrigatórios." })
  const scan = scanArchive(req.file)
  if (!scan.approved) return res.status(422).json({ error: scan.reason, scanStatus: "blocked" })
  const projectId = id()
  const safeName = `${projectId}-${path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_")}`
  const filePath = path.join(storageDirectory, safeName)
  fs.writeFileSync(filePath, req.file.buffer, { mode: 0o600 })
  const checksum = crypto.createHash("sha256").update(req.file.buffer).digest("hex")
  db.prepare(`INSERT INTO projects (id, owner_id, name, description, category, version, price, file_name, file_path, file_sha256, scan_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`).run(projectId, req.user.id, String(req.body.name).trim(), String(req.body.description || ""), String(req.body.category), String(req.body.version), req.body.price ? `R$ ${req.body.price}` : "Grátis", req.file.originalname, filePath, checksum, now())
  db.prepare("INSERT INTO library (user_id, project_id, added_at) VALUES (?, ?, ?)").run(req.user.id, projectId, now())
  res.status(201).json({ project: { ...publicProject({ ...req.body, id: projectId, username: req.user.username, price: req.body.price ? `R$ ${req.body.price}` : "Grátis", scan_status: "approved", created_at: now(), file_name: req.file.originalname, description: req.body.description || "" }), hasPreview: Boolean(scan.hasPreview) } })
})

class ProjectController {
  constructor(database) {
    this.database = database
  }

  update(req, res) {
    const project = this.database.prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?").get(req.params.id, req.user.id)
    if (!project) return res.status(404).json({ error: "Projeto não encontrado." })

    const { name, description, category, version, price } = req.body || {}
    if (!name || !category || !version) return res.status(400).json({ error: "Projeto, categoria e versão são obrigatórios." })
    this.database.prepare("UPDATE projects SET name = ?, description = ?, category = ?, version = ?, price = ? WHERE id = ? AND owner_id = ?").run(
      String(name).trim(),
      String(description || "").trim(),
      String(category).trim(),
      String(version).trim(),
      price ? `R$ ${String(price).replace(/^R\$\s*/, "")}` : "Grátis",
      req.params.id,
      req.user.id,
    )
    const updated = this.database.prepare("SELECT projects.*, users.username FROM projects LEFT JOIN users ON users.id = projects.owner_id WHERE projects.id = ?").get(req.params.id)
    return res.json({ project: publicProject(updated) })
  }

  remove(req, res) {
    const project = this.database.prepare("SELECT file_path FROM projects WHERE id = ? AND owner_id = ?").get(req.params.id, req.user.id)
    if (!project) return res.status(404).json({ error: "Projeto não encontrado." })
    this.database.prepare("DELETE FROM projects WHERE id = ? AND owner_id = ?").run(req.params.id, req.user.id)
    if (project.file_path) fs.rmSync(project.file_path, { force: true })
    return res.status(204).end()
  }
}

const projectController = new ProjectController(db)
app.put("/api/projects/:id", requireUser, (req, res) => projectController.update(req, res))
app.delete("/api/projects/:id", requireUser, (req, res) => projectController.remove(req, res))

const port = Number(process.env.API_PORT || 8787)
const server = app.listen(port, () => console.log(`dev.io API listening on http://localhost:${port}`))
server.ref()
setInterval(() => {}, 60_000)