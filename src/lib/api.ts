import { supabase } from "../utils/supabase"

export type ApiUser = {
  id: string
  name: string
  username: string
  email: string
  emailVerified: boolean
  isAdmin: boolean
  isBlocked: boolean
}

export type ProfileUser = ApiUser & {
  bio: string
  avatarUrl: string | null
}

export type ProfileStats = {
  projectCount: number
  savedProjectCount: number
}

export type AdminUser = {
  id: string
  name: string
  username: string
  email: string
  createdAt: string
  blocked: boolean
  isAdmin: boolean
}

export type AdminProject = {
  id: string
  name: string
  ownerId: string
  ownerName: string
  category: string
  version: string
  fileName: string
  createdAt: string
  blocked: boolean
}

export type ApiProject = {
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

type ProjectRow = {
  id: string
  owner_id: string
  name: string
  description: string
  category: string
  version: string
  price: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string | null
  sandbox_type: string | null
  created_at: string
  profiles?: { username: string } | { username: string }[] | null
}

type ProfileRow = {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_path: string | null
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function mapProject(row: ProjectRow): ApiProject {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.id,
    name: row.name,
    dev: profile?.username || "devio",
    category: row.category,
    price: row.price,
    version: row.version,
    updated: new Date(row.created_at).toLocaleDateString("pt-BR"),
    desc: row.description,
    fileName: row.file_name,
    fileType: row.file_type || undefined,
    sandboxType: row.sandbox_type || undefined,
  }
}

function mapUser(user: {
  id: string
  email?: string
  email_confirmed_at?: string | null
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}): ApiUser {
  const metadata = user.user_metadata || {}
  const appMetadata = user.app_metadata || {}
  return {
    id: user.id,
    name: typeof metadata.display_name === "string" ? metadata.display_name : "",
    username: typeof metadata.username === "string" ? metadata.username : "",
    email: user.email || "",
    emailVerified: Boolean(user.email_confirmed_at),
    isAdmin: appMetadata.role === "admin",
    isBlocked: appMetadata.blocked === true,
  }
}

async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data, error } = await supabase.auth.getSession()
  throwIfError(error)
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error("Faça login para continuar.")

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)
  if (init.body) headers.set("Content-Type", "application/json")
  const response = await fetch(`/api/admin${path}`, {
    ...init,
    headers,
  })
  const result = (await response.json()) as T & { error?: string }
  if (!response.ok)
    throw new Error(result.error || "Não foi possível concluir a ação administrativa.")
  return result
}

export function getAdminUsers(page: number) {
  return adminRequest<{ users: AdminUser[]; hasMore: boolean }>(
    `/users?page=${encodeURIComponent(String(page))}`,
  )
}

export function getAdminProjects(page: number) {
  return adminRequest<{ projects: AdminProject[]; hasMore: boolean }>(
    `/projects?page=${encodeURIComponent(String(page))}`,
  )
}

export function setAdminUserBlocked(userId: string, blocked: boolean) {
  return adminRequest<{ ok: boolean; blocked: boolean }>(
    `/users/${encodeURIComponent(userId)}/block`,
    {
      method: "PATCH",
      body: JSON.stringify({ blocked }),
    },
  )
}

export function deleteAdminUser(userId: string) {
  return adminRequest<{ ok: boolean }>(
    `/users/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  )
}

export function deleteAdminProject(projectId: string) {
  return adminRequest<{ ok: boolean }>(
    `/projects/${encodeURIComponent(projectId)}`,
    { method: "DELETE" },
  )
}

export function setAdminProjectBlocked(projectId: string, blocked: boolean) {
  return adminRequest<{ ok: boolean; blocked: boolean }>(
    `/projects/${encodeURIComponent(projectId)}/block`,
    {
      method: "PATCH",
      body: JSON.stringify({ blocked }),
    },
  )
}

async function getProfileRow(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_path")
    .eq("id", userId)
    .single()
  throwIfError(error)
  return data as ProfileRow
}

async function mapProfileUser(
  user: Parameters<typeof mapUser>[0],
): Promise<ProfileUser> {
  const profile = await getProfileRow(user.id)
  let avatarUrl: string | null = null
  if (profile.avatar_path) {
    const { data, error } = await supabase.storage
      .from("devio-avatars")
      .createSignedUrl(profile.avatar_path, 3600)
    throwIfError(error)
    if (!data) throw new Error("Não foi possível gerar o endereço da foto.")
    avatarUrl = data.signedUrl
  }
  return {
    ...mapUser(user),
    name: profile.display_name,
    username: profile.username,
    bio: profile.bio,
    avatarUrl,
  }
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()
  throwIfError(error)
  if (!data.user) throw new Error("Faça login para continuar.")
  return data.user
}

export async function hasActiveSession() {
  const { data, error } = await supabase.auth.getSession()
  throwIfError(error)
  return Boolean(data.session)
}

export async function registerAccount(payload: {
  name: string
  username: string
  email: string
  password: string
}) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: {
      data: {
        display_name: payload.name.trim(),
        username: payload.username.trim().replace(/^@/, "").toLowerCase(),
      },
      emailRedirectTo: `${window.location.origin}/?confirmEmail=1`,
    },
  })
  throwIfError(error)
  if (!data.user) throw new Error("O Supabase não retornou o usuário criado.")
  return {
    user: mapUser(data.user),
    emailSent: true,
  }
}

export async function loginAccount(payload: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  })
  throwIfError(error)
  if (!data.user) throw new Error("O Supabase não retornou o usuário.")
  return { user: mapUser(data.user), passwordChangeRequired: false }
}

export async function loginGoogle(credential: string) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
  })
  throwIfError(error)
  if (!data.user) throw new Error("O Supabase não retornou o usuário.")
  return { user: mapUser(data.user) }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  throwIfError(error)
  if (!data.user) return { user: null, stats: null }

  const [user, projectCount, savedProjectCount] = await Promise.all([
    mapProfileUser(data.user),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", data.user.id),
    supabase
      .from("library")
      .select("project_id", { count: "exact", head: true })
      .eq("user_id", data.user.id),
  ])
  throwIfError(projectCount.error)
  throwIfError(savedProjectCount.error)
  return {
    user,
    stats: {
      projectCount: projectCount.count || 0,
      savedProjectCount: savedProjectCount.count || 0,
    },
  }
}

export async function updateProfile(payload: {
  name: string
  username: string
  email: string
  bio: string
}) {
  const user = await getAuthenticatedUser()
  const username = payload.username.trim().replace(/^@/, "").toLowerCase()
  const email = payload.email.trim().toLowerCase()
  if (email !== (user.email || "").toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email })
    throwIfError(error)
  }
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: payload.name.trim(),
      username,
      bio: payload.bio.trim(),
    })
    .eq("id", user.id)
    .select("id, username, display_name, bio, avatar_path")
    .single()
  throwIfError(error)

  const updatedUser = {
    ...user,
    email: email === user.email ? user.email : email,
  }
  return {
    user: {
      ...mapUser(updatedUser),
      name: (data as ProfileRow).display_name,
      username: (data as ProfileRow).username,
      bio: (data as ProfileRow).bio,
      avatarUrl: null,
    },
    emailSent: email !== (user.email || "").toLowerCase(),
  }
}

export async function uploadAvatar(file: File) {
  const user = await getAuthenticatedUser()
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }
  const extension = extensions[file.type]
  if (!extension || file.size > 2 * 1024 * 1024)
    throw new Error("Escolha uma imagem JPEG, PNG ou WebP de até 2 MB.")
  const filePath = `${user.id}/avatar.${extension}`
  const { error: uploadError } = await supabase.storage
    .from("devio-avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type })
  throwIfError(uploadError)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: filePath })
    .eq("id", user.id)
  throwIfError(updateError)
  const { data, error } = await supabase.storage
    .from("devio-avatars")
    .createSignedUrl(filePath, 3600)
  throwIfError(error)
  if (!data) throw new Error("Não foi possível gerar o endereço da foto.")
  return { avatarUrl: data.signedUrl }
}

export async function removeAvatar() {
  const user = await getAuthenticatedUser()
  const profile = await getProfileRow(user.id)
  if (profile.avatar_path) {
    const { error } = await supabase.storage
      .from("devio-avatars")
      .remove([profile.avatar_path])
    throwIfError(error)
  }
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", user.id)
  throwIfError(error)
  return { ok: true }
}

export async function logoutAccount() {
  const { error } = await supabase.auth.signOut()
  throwIfError(error)
}

export async function downloadProject(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("file_path, file_name")
    .eq("id", projectId)
    .single()
  throwIfError(error)
  const project = data as Pick<ProjectRow, "file_path" | "file_name">
  const { data: signedUrl, error: storageError } = await supabase.storage
    .from("devio-project-files")
    .createSignedUrl(project.file_path, 120, { download: project.file_name })
  throwIfError(storageError)
  if (!signedUrl) throw new Error("Não foi possível preparar o download.")
  window.location.assign(signedUrl.signedUrl)
}

export async function getProjectFile(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("file_path, file_name, file_size, file_type, sandbox_type")
    .eq("id", projectId)
    .single()
  throwIfError(error)
  const project = data as Pick<
    ProjectRow,
    "file_path" | "file_name" | "file_size" | "file_type" | "sandbox_type"
  >
  if (project.file_size > 2 * 1024 * 1024)
    throw new Error("A prévia do sandbox é limitada a arquivos de até 2 MB.")
  const { data: file, error: downloadError } = await supabase.storage
    .from("devio-project-files")
    .download(project.file_path)
  throwIfError(downloadError)
  if (!file) throw new Error("O Supabase não retornou o arquivo.")
  if (file.size > 2 * 1024 * 1024)
    throw new Error("A prévia do sandbox é limitada a arquivos de até 2 MB.")
  return {
    file,
    fileName: project.file_name,
    fileType: project.file_type || "application/octet-stream",
    sandboxType: project.sandbox_type || "auto",
  }
}

export async function confirmEmail(token: string, expectedEmail?: string) {
  if (token) {
    const urlType =
      new URLSearchParams(window.location.search).get("type") ||
      new URLSearchParams(window.location.hash.slice(1)).get("type")
    const type =
      urlType === "signup" || urlType === "email_change"
        ? urlType
        : "email"
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type,
    })
    throwIfError(error)
    if (
      expectedEmail &&
      data.user?.email?.toLowerCase() !== expectedEmail.toLowerCase()
    )
      throw new Error("O e-mail confirmado não corresponde à conta atual.")
    return { ok: true }
  }
  const { data, error } = await supabase.auth.getUser()
  throwIfError(error)
  if (!data.user?.email_confirmed_at)
    throw new Error("Abra o link de confirmação enviado ao seu e-mail.")
  if (
    expectedEmail &&
    data.user.email?.toLowerCase() !== expectedEmail.toLowerCase()
  )
    throw new Error("O novo endereço ainda não foi confirmado.")
  return { ok: true }
}

export async function resendConfirmation(
  email: string,
  emailChange = false,
) {
  const { error } = await supabase.auth.resend({
    type: emailChange ? "email_change" : "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/?confirmEmail=1` },
  })
  throwIfError(error)
  return { ok: true, emailSent: true }
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/?resetPassword=1` },
  )
  throwIfError(error)
  return { ok: true, emailSent: true }
}

export async function completePasswordReset(_token: string, password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  throwIfError(error)
  return { ok: true }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const user = await getAuthenticatedUser()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email || "",
    password: currentPassword,
  })
  throwIfError(signInError)
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  throwIfError(error)
  return { ok: true }
}

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*, profiles(username)")
    .order("created_at", { ascending: false })
  throwIfError(error)
  return { projects: (data || []).map((row) => mapProject(row as ProjectRow)) }
}

export async function getLibrary() {
  const user = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from("library")
    .select("projects(*, profiles(username))")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })
  throwIfError(error)
  const projects = (data || [])
    .map((row) => row.projects as unknown as ProjectRow | null)
    .filter((project): project is ProjectRow => Boolean(project))
  return { projects: projects.map(mapProject) }
}

export async function addToLibrary(projectId: string) {
  const user = await getAuthenticatedUser()
  const { error } = await supabase
    .from("library")
    .upsert(
      { user_id: user.id, project_id: projectId },
      { onConflict: "user_id,project_id", ignoreDuplicates: true },
    )
  throwIfError(error)
  return { ok: true }
}

export async function removeFromLibrary(projectId: string) {
  const user = await getAuthenticatedUser()
  const { error } = await supabase
    .from("library")
    .delete()
    .eq("user_id", user.id)
    .eq("project_id", projectId)
  throwIfError(error)
}

export async function getMyProjects() {
  const user = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from("projects")
    .select("*, profiles(username)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
  throwIfError(error)
  return { projects: (data || []).map((row) => mapProject(row as ProjectRow)) }
}

export async function uploadProject(
  fields: Record<string, string>,
  file: File,
) {
  const user = await getAuthenticatedUser()
  if (!file.size) throw new Error("O arquivo está vazio.")
  if (file.size > 100 * 1024 * 1024)
    throw new Error("O tamanho máximo do arquivo é 100 MB.")
  const safeName = file.name.split(/[\\/]/).pop()?.replace(/[^\w.-]/g, "_")
  if (!safeName) throw new Error("Nome de arquivo inválido.")

  const projectId = crypto.randomUUID()
  const filePath = `${user.id}/${projectId}/${safeName}`
  const { error: uploadError } = await supabase.storage
    .from("devio-project-files")
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
  throwIfError(uploadError)

  const projectPayload = {
    id: projectId,
    owner_id: user.id,
    name: fields.name.trim(),
    description: fields.description.trim(),
    category: fields.category,
    version: fields.version.trim(),
    price: fields.price ? `R$ ${fields.price}` : "Grátis",
    file_name: safeName,
    file_path: filePath,
    file_size: file.size,
    file_type: file.type || "application/octet-stream",
    sandbox_type: fields.sandboxType || "auto",
  }
  const { data, error } = await supabase
    .from("projects")
    .insert(projectPayload)
    .select("*, profiles(username)")
    .single()
  if (error) {
    const { error: cleanupError } = await supabase.storage
      .from("devio-project-files")
      .remove([filePath])
    if (cleanupError)
      throw new Error(`${error.message}; também falhou a limpeza do arquivo: ${cleanupError.message}`)
    throw new Error(error.message)
  }

  const { error: libraryError } = await supabase
    .from("library")
    .upsert(
      { user_id: user.id, project_id: projectId },
      { onConflict: "user_id,project_id", ignoreDuplicates: true },
    )
  if (libraryError) {
    const { error: projectCleanupError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("owner_id", user.id)
    const { error: fileCleanupError } = await supabase.storage
      .from("devio-project-files")
      .remove([filePath])
    if (projectCleanupError || fileCleanupError) {
      throw new Error(
        `${libraryError.message}; falhou também a limpeza do projeto/arquivo.`,
      )
    }
    throw new Error(libraryError.message)
  }

  return { project: mapProject(data as ProjectRow) }
}

export async function updateProject(
  projectId: string,
  fields: {
    name: string
    description: string
    category: string
    version: string
    price?: string
  },
) {
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: fields.name.trim(),
      description: fields.description.trim(),
      category: fields.category.trim(),
      version: fields.version.trim(),
      price: fields.price ? `R$ ${fields.price.replace(/^R\$\s*/, "")}` : "Grátis",
    })
    .eq("id", projectId)
    .select("*, profiles(username)")
    .single()
  throwIfError(error)
  return { project: mapProject(data as ProjectRow) }
}

export async function deleteProject(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("file_path")
    .eq("id", projectId)
    .single()
  throwIfError(error)
  const filePath = (data as { file_path: string }).file_path
  const { error: storageError } = await supabase.storage
    .from("devio-project-files")
    .remove([filePath])
  throwIfError(storageError)
  const { error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
  throwIfError(deleteError)
}
