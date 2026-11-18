export type ApiUser = {
  id: string
  name: string
  username: string
  email: string
  emailVerified: boolean
}

export type ProfileUser = ApiUser & {
  bio: string
  avatarUrl: string | null
}

export type ProfileStats = {
  projectCount: number
  savedProjectCount: number
}

export type ApiProject = {
  id: string
  name: string
  dev: string
  category: string
  price: string
  version: string
  updated: string
  verified: boolean
  desc: string
  scanStatus?: string
  fileName?: string
  downloadUrl?: string
  hasPreview?: boolean
}

type ApiResponse<T> = { data?: T; error?: string }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T> & T
  if (!response.ok)
    throw new Error(body.error || "Não foi possível concluir a operação.")
  return body as T
}

export function registerAccount(payload: {
  name: string
  username: string
  email: string
  password: string
}) {
  return request<{
    user: ApiUser
    confirmationToken?: string
    emailSent: boolean
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function loginAccount(payload: { email: string; password: string }) {
  return request<{ user: ApiUser; passwordChangeRequired: boolean }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  )
}

export function loginGoogle(credential: string) {
  return request<{ user: ApiUser }>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  })
}

export function getCurrentUser() {
  return request<{ user: ProfileUser | null; stats: ProfileStats | null }>(
    "/api/auth/me",
  )
}

export function updateProfile(payload: {
  name: string
  username: string
  email: string
  bio: string
}) {
  return request<{
    user: ProfileUser
    emailSent?: boolean
    confirmationToken?: string
  }>("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function uploadAvatar(file: File) {
  const body = new FormData()
  body.append("avatar", file)
  return request<{ avatarUrl: string }>("/api/auth/avatar", {
    method: "POST",
    body,
  })
}

export function removeAvatar() {
  return request<{ ok: boolean }>("/api/auth/avatar", { method: "DELETE" })
}

export function logoutAccount() {
  return request<void>("/api/auth/session", { method: "DELETE" })
}

export function downloadProject(projectId: string) {
  const link = document.createElement("a")
  link.href = `/api/projects/${encodeURIComponent(projectId)}/download`
  link.download = ""
  link.rel = "noreferrer"
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function confirmEmail(token: string) {
  return request<{ ok: boolean }>("/api/auth/confirm-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export function resendConfirmation(email: string) {
  return request<{
    ok: boolean
    confirmationToken?: string
    emailSent: boolean
  }>(
    "/api/auth/resend-confirmation",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  )
}

export function requestPasswordReset(email: string) {
  return request<{ ok: boolean; resetToken?: string; emailSent: boolean }>(
    "/api/auth/password-reset",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  )
}

export function completePasswordReset(token: string, password: string) {
  return request<{ ok: boolean }>("/api/auth/password-reset/complete", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ ok: boolean }>("/api/auth/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function getLibrary() {
  return request<{ projects: ApiProject[] }>("/api/library")
}

export function addToLibrary(projectId: string) {
  return request<{ ok: boolean }>(
    `/api/library/${encodeURIComponent(projectId)}`,
    { method: "POST" },
  )
}

export function removeFromLibrary(projectId: string) {
  return request<void>(`/api/library/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  })
}

export function getMyProjects() {
  return request<{ projects: ApiProject[] }>("/api/projects/mine")
}

export function uploadProject(fields: Record<string, string>, file: File) {
  const body = new FormData()
  Object.entries(fields).forEach(([key, value]) => body.append(key, value))
  body.append("file", file)
  return request<{ project: ApiProject }>("/api/projects", {
    method: "POST",
    body,
  })
}

export function updateProject(
  projectId: string,
  fields: {
    name: string
    description: string
    category: string
    version: string
    price?: string
  },
) {
  return request<{ project: ApiProject }>(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  })
}

export function deleteProject(projectId: string) {
  return request<void>(`/api/projects/${projectId}`, { method: "DELETE" })
}
