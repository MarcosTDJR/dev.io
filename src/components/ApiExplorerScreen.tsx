import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle,
  CircleAlert,
  Play,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"
import {
  deleteProject,
  executeApiRequest,
  getMyProjects,
  updateProject,
  uploadProject,
} from "../lib/api"
import type { ApiProject } from "../lib/api"
import { apiRouteCatalog } from "../lib/apiCatalog"
import type { ApiMethod } from "../lib/apiCatalog"

const testProjectPrefix = "[API CRUD TEST]"

type Props = {
  onBack: () => void
}

type ResponseModal = {
  title: string
  content: string
  isError: boolean
}

function displayAvailability(availability: string) {
  if (availability === "vercel") return "Vercel Function"
  if (availability === "supabase") return "Supabase"
  return "Local legado"
}

export default function ApiExplorerScreen({ onBack }: Props) {
  const [query, setQuery] = useState("")
  const [selectedRouteId, setSelectedRouteId] = useState("health")
  const [requestMethod, setRequestMethod] = useState<ApiMethod>("GET")
  const [requestPath, setRequestPath] = useState("/api/health")
  const [requestBody, setRequestBody] = useState("")
  const [requestError, setRequestError] = useState("")
  const [runningRouteId, setRunningRouteId] = useState("")
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [crudError, setCrudError] = useState("")
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [crudBusy, setCrudBusy] = useState(false)
  const [responseModal, setResponseModal] = useState<ResponseModal | null>(null)

  const filteredRoutes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return apiRouteCatalog
    return apiRouteCatalog.filter((route) =>
      `${route.method} ${route.path} ${route.description} ${route.auth} ${displayAvailability(route.availability)}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [query])
  const selectedRoute = apiRouteCatalog.find(
    (route) => route.id === selectedRouteId,
  )

  useEffect(() => {
    if (!responseModal) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setResponseModal(null)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [responseModal])

  const refreshProjects = async (showReadResult = true) => {
    setCrudError("")
    try {
      const { projects: ownProjects } = await getMyProjects()
      const tests = ownProjects.filter((project) =>
        project.name.startsWith(testProjectPrefix),
      )
      setProjects(tests)
      setSelectedProjectId((current) =>
        tests.some((project) => project.id === current)
          ? current
          : String(tests[0]?.id || ""),
      )
      if (showReadResult)
        setResponseModal({
          title: "Resposta CRUD · READ",
          content: JSON.stringify(
            {
              operation: "READ",
              count: tests.length,
              projects: tests,
            },
            null,
            2,
          ),
          isError: false,
        })
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Entre na sua conta para testar o CRUD de projetos."
      setCrudError(message)
      if (showReadResult)
        setResponseModal({
          title: "Erro CRUD · READ",
          content: message,
          isError: true,
        })
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    void refreshProjects(false)
  }, [])

  const selectRoute = (routeId: string) => {
    const route = apiRouteCatalog.find((item) => item.id === routeId)
    if (!route) return
    setSelectedRouteId(route.id)
    setRequestMethod(route.method)
    setRequestPath(route.safeTestPath || route.path)
    setRequestBody(route.testBody || "")
    setRequestError("")
  }

  const runRouteTest = async () => {
    if (!selectedRoute || selectedRoute.availability !== "vercel") {
      setRequestError("Esta rota não está implantada como função Vercel.")
      return
    }
    if (!requestPath.startsWith("/api/") || requestPath.startsWith("//")) {
      setRequestError("Informe um caminho válido iniciado por /api/.")
      return
    }
    if (requestMethod !== "GET" && requestBody.trim()) {
      try {
        JSON.parse(requestBody)
      } catch {
        setRequestError("O body precisa ser um JSON válido.")
        return
      }
    }
    if (
      requestMethod !== "GET" &&
      !window.confirm(
        `Executar ${requestMethod} ${requestPath}? Esta chamada pode alterar dados reais ou iniciar um checkout.`,
      )
    )
      return

    setRunningRouteId(selectedRoute.id)
    setRequestError("")
    setResponseModal(null)
    try {
      const result = await executeApiRequest(
        requestMethod,
        requestPath,
        requestBody.trim() || undefined,
      )
      setResponseModal({
        title: `Resposta da API · ${requestMethod} ${requestPath}`,
        content: JSON.stringify(
          {
            method: requestMethod,
            path: requestPath,
            status: result.status,
            ok: result.ok,
            body: result.body,
          },
          null,
          2,
        ),
        isError: !result.ok,
      })
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Não foi possível testar a rota."
      setRequestError(message)
      setResponseModal({
        title: "Erro ao executar a rota",
        content: message,
        isError: true,
      })
    } finally {
      setRunningRouteId("")
    }
  }

  const createTestProject = async () => {
    setCrudBusy(true)
    setCrudError("")
    setResponseModal(null)
    try {
      const stamp = new Date().toISOString()
      const { project } = await uploadProject(
        {
          name: `${testProjectPrefix} ${stamp}`,
          description:
            "Projeto temporário criado pelo explorador CRUD do dev.io.",
          category: "Outros",
          version: "1.0.0",
          price: "",
          sandboxType: "source",
          acceptDonations: "false",
        },
        new File(["dev.io CRUD test"], "devio-api-crud-test.txt", {
          type: "text/plain",
        }),
      )
      await refreshProjects(false)
      setSelectedProjectId(String(project.id))
      setResponseModal({
        title: "Resposta CRUD · CREATE",
        content: JSON.stringify({ operation: "CREATE", project }, null, 2),
        isError: false,
      })
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar o projeto de teste."
      setCrudError(message)
      setResponseModal({
        title: "Erro CRUD · CREATE",
        content: message,
        isError: true,
      })
    } finally {
      setCrudBusy(false)
    }
  }

  const updateTestProject = async () => {
    const project = projects.find((item) => item.id === selectedProjectId)
    if (!project) {
      setCrudError("Crie ou selecione um projeto de teste antes de atualizar.")
      return
    }
    setCrudBusy(true)
    setCrudError("")
    setResponseModal(null)
    try {
      const { project: updated } = await updateProject(String(project.id), {
        name: `${testProjectPrefix} atualizado`,
        description: "Registro atualizado pelo explorador CRUD do dev.io.",
        category: project.category,
        version: "1.0.1",
        price: "",
      })
      await refreshProjects(false)
      setResponseModal({
        title: "Resposta CRUD · UPDATE",
        content: JSON.stringify(
          { operation: "UPDATE", project: updated },
          null,
          2,
        ),
        isError: false,
      })
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o projeto."
      setCrudError(message)
      setResponseModal({
        title: "Erro CRUD · UPDATE",
        content: message,
        isError: true,
      })
    } finally {
      setCrudBusy(false)
    }
  }

  const deleteTestProject = async () => {
    const project = projects.find((item) => item.id === selectedProjectId)
    if (!project) {
      setCrudError("Selecione um projeto de teste para excluir.")
      return
    }
    if (
      !window.confirm(
        `Excluir permanentemente o projeto de teste "${project.name}" e seu arquivo?`,
      )
    )
      return
    setCrudBusy(true)
    setCrudError("")
    setResponseModal(null)
    try {
      await deleteProject(String(project.id))
      await refreshProjects(false)
      setResponseModal({
        title: "Resposta CRUD · DELETE",
        content: JSON.stringify(
          { operation: "DELETE", ok: true, deletedProjectId: project.id },
          null,
          2,
        ),
        isError: false,
      })
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir o projeto."
      setCrudError(message)
      setResponseModal({
        title: "Erro CRUD · DELETE",
        content: message,
        isError: true,
      })
    } finally {
      setCrudBusy(false)
    }
  }

  return (
    <div className="phone-scroll settings-page api-explorer">
      <header className="api-explorer-header">
        <button type="button" className="api-explorer-back" onClick={onBack}>
          Voltar às configurações
        </button>
        <h1>Explorador de API</h1>
        <p>
          Catálogo das rotas do servidor e testes autenticados usando os dados
          reais do Supabase. Operações de escrita alteram sua conta.
        </p>
      </header>

      <div className="api-explorer-content">
        <section className="settings-section">
          <div className="api-section-heading">
            <div>
              <h2>CRUD real de projetos</h2>
              <p>
                Cria um projeto privado/pendente de teste na sua conta. Atualize
                e exclua esse registro para validar o ciclo completo.
              </p>
            </div>
            <button
              type="button"
              className="api-icon-button"
              onClick={() => void refreshProjects()}
              disabled={loadingProjects || crudBusy}
              aria-label="Atualizar projetos de teste"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="api-crud-controls">
            <button
              type="button"
              className="api-secondary-button"
              onClick={() => void refreshProjects()}
              disabled={loadingProjects || crudBusy}
            >
              <RefreshCw size={15} /> Ler projetos (READ)
            </button>
            <button
              type="button"
              className="api-primary-button"
              onClick={() => void createTestProject()}
              disabled={crudBusy || loadingProjects}
            >
              Criar projeto de teste (CREATE)
            </button>
            <select
              aria-label="Projeto de teste"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              disabled={loadingProjects || projects.length === 0 || crudBusy}
            >
              <option value="">
                {loadingProjects
                  ? "Carregando..."
                  : projects.length
                    ? "Selecione um projeto de teste"
                    : "Nenhum teste existente"}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="api-secondary-button"
              onClick={() => void updateTestProject()}
              disabled={crudBusy || !selectedProjectId}
            >
              Atualizar (UPDATE)
            </button>
            <button
              type="button"
              className="api-danger-button"
              onClick={() => void deleteTestProject()}
              disabled={crudBusy || !selectedProjectId}
            >
              <Trash2 size={15} /> Excluir (DELETE)
            </button>
          </div>
          {crudError && (
            <div className="api-feedback is-error" role="alert">
              <CircleAlert size={16} /> {crudError}
            </div>
          )}
          <div className="api-muted-note">
            CREATE/READ/UPDATE/DELETE executam as funções reais da aplicação.
            Projetos de teste são identificados pelo prefixo “
            {testProjectPrefix}”.
          </div>
        </section>

        <section className="settings-section">
          <div className="api-section-heading">
            <div>
              <h2>Rotas disponíveis</h2>
              <p>
                {apiRouteCatalog.length} rotas no catálogo;{" "}
                {
                  apiRouteCatalog.filter(
                    (route) => route.availability === "vercel",
                  ).length
                }{" "}
                executáveis no Vercel.
              </p>
            </div>
          </div>
          <label className="api-search-label">
            Filtrar rotas
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: pagamento, projetos, DELETE"
            />
          </label>
          <label className="api-search-label">
            Rota para testar
            <select
              value={selectedRouteId}
              onChange={(event) => selectRoute(event.target.value)}
            >
              {apiRouteCatalog.map((route) => (
                <option
                  key={route.id}
                  value={route.id}
                  disabled={route.availability !== "vercel"}
                >
                  {route.method} {route.path} —{" "}
                  {displayAvailability(route.availability)}
                </option>
              ))}
            </select>
          </label>
          <div className="api-request-grid">
            <label className="api-search-label">
              Método
              <select
                value={requestMethod}
                onChange={(event) =>
                  setRequestMethod(event.target.value as ApiMethod)
                }
              >
                {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map(
                  (method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="api-search-label">
              Caminho (edite os parâmetros :id)
              <input
                value={requestPath}
                onChange={(event) => setRequestPath(event.target.value)}
                placeholder="/api/projects/uuid/sandbox"
                spellCheck={false}
              />
            </label>
          </div>
          {requestMethod !== "GET" && (
            <label className="api-search-label">
              Body JSON (opcional)
              <textarea
                value={requestBody}
                onChange={(event) => setRequestBody(event.target.value)}
                placeholder={'{\n  "campo": "valor"\n}'}
                rows={6}
                spellCheck={false}
              />
            </label>
          )}
          <div className="api-execute-row">
            <button
              type="button"
              className="api-primary-button"
              onClick={() => void runRouteTest()}
              disabled={
                Boolean(runningRouteId) ||
                !selectedRoute ||
                selectedRoute.availability !== "vercel"
              }
            >
              <Play size={15} />
              {runningRouteId ? "Executando..." : `Executar ${requestMethod}`}
            </button>
            {selectedRoute && (
              <span>
                Autorização: {selectedRoute.auth}. Respostas exibem status HTTP
                e body retornado pelo servidor.
              </span>
            )}
          </div>
          {requestError && (
            <div className="api-feedback is-error" role="alert">
              <CircleAlert size={16} /> {requestError}
            </div>
          )}
          <div className="api-route-list">
            {filteredRoutes.map((route) => (
              <article className="api-route-card" key={route.id}>
                <div
                  className={`api-method-badge is-${route.method.toLowerCase()}`}
                >
                  {route.method}
                </div>
                <div className="api-route-copy">
                  <code>{route.path}</code>
                  <p>{route.description}</p>
                  <div className="api-route-meta">
                    <span>{route.auth}</span>
                    <span>{displayAvailability(route.availability)}</span>
                  </div>
                </div>
                {route.availability === "vercel" && (
                  <button
                    type="button"
                    className="api-secondary-button"
                    onClick={() => selectRoute(route.id)}
                    disabled={Boolean(runningRouteId)}
                  >
                    Selecionar
                  </button>
                )}
              </article>
            ))}
            {!filteredRoutes.length && (
              <div className="settings-empty">
                Nenhuma rota corresponde ao filtro.
              </div>
            )}
          </div>
          <div className="api-muted-note">
            Chamadas POST/PUT/PATCH/DELETE pedem confirmação antes de executar.
            Rotas administrativas exigem sessão de administrador. Rotas “Local
            legado” usam SQLite/arquivos locais e não são implantadas no Vercel.
          </div>
        </section>
      </div>
      {responseModal && (
        <div
          className="api-response-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setResponseModal(null)
          }}
        >
          <section
            className="api-response-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="api-response-title"
          >
            <header className="api-response-dialog-header">
              <div className={responseModal.isError ? "is-error" : "is-success"}>
                {responseModal.isError ? (
                  <CircleAlert size={18} />
                ) : (
                  <CheckCircle size={18} />
                )}
                <h2 id="api-response-title">{responseModal.title}</h2>
              </div>
              <button
                type="button"
                className="api-icon-button"
                onClick={() => setResponseModal(null)}
                aria-label="Fechar resposta"
                autoFocus
              >
                <X size={17} />
              </button>
            </header>
            <pre className="api-response" aria-live="polite">
              {responseModal.content}
            </pre>
            <footer className="api-response-dialog-footer">
              <button
                type="button"
                className="api-primary-button"
                onClick={() => setResponseModal(null)}
              >
                Fechar
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
