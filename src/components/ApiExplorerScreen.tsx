import { useEffect, useMemo, useState } from "react"
import { CheckCircle, CircleAlert, Play, RefreshCw, Trash2 } from "lucide-react"
import {
  deleteProject,
  getMyProjects,
  testApiGet,
  updateProject,
  uploadProject,
} from "../lib/api"
import type { ApiProject } from "../lib/api"
import { apiRouteCatalog } from "../lib/apiCatalog"

const testProjectPrefix = "[API CRUD TEST]"

type Props = {
  onBack: () => void
}

function displayAvailability(availability: string) {
  if (availability === "vercel") return "Vercel Function"
  if (availability === "supabase") return "Supabase"
  return "Local legado"
}

export default function ApiExplorerScreen({ onBack }: Props) {
  const [query, setQuery] = useState("")
  const [idInput, setIdInput] = useState("")
  const [requestResult, setRequestResult] = useState("")
  const [requestError, setRequestError] = useState("")
  const [runningRouteId, setRunningRouteId] = useState("")
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [crudResult, setCrudResult] = useState("")
  const [crudError, setCrudError] = useState("")
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [crudBusy, setCrudBusy] = useState(false)

  const filteredRoutes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return apiRouteCatalog
    return apiRouteCatalog.filter((route) =>
      `${route.method} ${route.path} ${route.description} ${route.auth} ${displayAvailability(route.availability)}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [query])

  const refreshProjects = async (showReadResult = true) => {
    setCrudError("")
    try {
      const { projects: ownProjects } = await getMyProjects()
      const tests = ownProjects.filter((project) =>
        project.name.startsWith(testProjectPrefix),
      )
      setProjects(tests)
      if (showReadResult)
        setCrudResult(`READ concluído: ${tests.length} projeto(s) de teste.`)
      setSelectedProjectId((current) =>
        tests.some((project) => project.id === current)
          ? current
          : String(tests[0]?.id || ""),
      )
    } catch (reason) {
      setCrudError(
        reason instanceof Error
          ? reason.message
          : "Entre na sua conta para testar o CRUD de projetos.",
      )
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    void refreshProjects()
  }, [])

  const runRouteTest = async (routeId: string, safeTestPath: string) => {
    let path = safeTestPath
    if (path.includes(":id")) {
      if (!idInput.trim()) {
        setRequestError("Informe o ID solicitado para testar esta rota.")
        setRequestResult("")
        return
      }
      path = path.split(":id").join(encodeURIComponent(idInput.trim()))
    }
    setRunningRouteId(routeId)
    setRequestError("")
    setRequestResult("")
    try {
      const result = await testApiGet(path)
      setRequestResult(
        JSON.stringify(
          { method: "GET", path, status: result.status, body: result.body },
          null,
          2,
        ),
      )
    } catch (reason) {
      setRequestError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível testar a rota.",
      )
    } finally {
      setRunningRouteId("")
    }
  }

  const createTestProject = async () => {
    setCrudBusy(true)
    setCrudError("")
    setCrudResult("")
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
      setCrudResult(`CREATE concluído: projeto ${project.id}`)
    } catch (reason) {
      setCrudError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar o projeto de teste.",
      )
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
    try {
      const { project: updated } = await updateProject(String(project.id), {
        name: `${testProjectPrefix} atualizado`,
        description: "Registro atualizado pelo explorador CRUD do dev.io.",
        category: project.category,
        version: "1.0.1",
        price: "",
      })
      await refreshProjects(false)
      setCrudResult(`UPDATE concluído: projeto ${updated.id}`)
    } catch (reason) {
      setCrudError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o projeto.",
      )
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
    try {
      await deleteProject(String(project.id))
      await refreshProjects(false)
      setCrudResult(`DELETE concluído: projeto ${project.id}`)
    } catch (reason) {
      setCrudError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir o projeto.",
      )
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
          {crudResult && (
            <div className="api-feedback is-success" role="status">
              <CheckCircle size={16} /> {crudResult}
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
              <p>{apiRouteCatalog.length} rotas registradas no projeto.</p>
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
            ID de recurso para rotas com :id
            <input
              value={idInput}
              onChange={(event) => setIdInput(event.target.value)}
              placeholder="UUID do projeto ou pedido"
            />
          </label>
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
                {route.safeTestPath && (
                  <button
                    type="button"
                    className="api-icon-button"
                    onClick={() =>
                      void runRouteTest(route.id, route.safeTestPath!)
                    }
                    disabled={Boolean(runningRouteId)}
                    aria-label={`Testar ${route.method} ${route.path}`}
                  >
                    <Play size={15} />
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
          {requestError && (
            <div className="api-feedback is-error" role="alert">
              <CircleAlert size={16} /> {requestError}
            </div>
          )}
          {requestResult && (
            <pre className="api-response" aria-live="polite">
              {requestResult}
            </pre>
          )}
          <div className="api-muted-note">
            Rotas administrativas exigem a sessão de administrador. Rotas “Local
            legado” usam SQLite/arquivos locais e não são implantadas no Vercel;
            o app usa as operações Supabase equivalentes.
          </div>
        </section>
      </div>
    </div>
  )
}
