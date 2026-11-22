import { unzip, type Unzipped } from "fflate"

const maxArchiveEntries = 300
const maxArchiveBytes = 25 * 1024 * 1024
const maxEntryBytes = 12 * 1024 * 1024

export type ArchivePreview = {
  entry: "web" | "python" | "ruby" | "source" | "none"
  entryName?: string
  content?: string
  html?: string
  objectUrls?: string[]
  message: string
}

function safeArchivePath(value: string) {
  const path = value.replace(/\\/g, "/").replace(/^\.\/+/, "")
  if (
    !path ||
    path.startsWith("/") ||
    /^[a-z]:/i.test(path) ||
    path.split("/").some((segment) => segment === "..")
  )
    return null
  return path
}

function unzipProject(file: Blob): Promise<Unzipped> {
  return file.arrayBuffer().then(
    (buffer) =>
      new Promise<Unzipped>((resolve, reject) => {
        let entries = 0
        let uncompressedBytes = 0
        let validationError = ""
        const cancel = unzip(new Uint8Array(buffer), {
          filter: (entry) => {
            entries += 1
            const safePath = safeArchivePath(entry.name)
            if (!safePath) validationError = "O ZIP contém um caminho de arquivo inválido."
            if (entries > maxArchiveEntries)
              validationError = "O ZIP excede o limite de 300 arquivos."
            if (entry.originalSize > maxEntryBytes)
              validationError = "Um arquivo do ZIP excede o limite de 12 MB."
            uncompressedBytes += entry.originalSize
            if (uncompressedBytes > maxArchiveBytes)
              validationError = "O conteúdo extraído excede o limite de 25 MB."
            return Boolean(
              safePath &&
                entries <= maxArchiveEntries &&
                entry.originalSize <= maxEntryBytes &&
                uncompressedBytes <= maxArchiveBytes,
            )
          },
        }, (error, files) => {
          if (validationError) reject(new Error(validationError))
          else if (error) reject(new Error("Não foi possível abrir o arquivo ZIP."))
          else resolve(files)
        })
        if (file.size > maxArchiveBytes) {
          cancel()
          reject(new Error("O ZIP excede o limite de 25 MB."))
        }
      }),
  )
}

function mimeType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase()
  return (
    {
      css: "text/css",
      gif: "image/gif",
      html: "text/html",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      js: "text/javascript",
      json: "application/json",
      png: "image/png",
      svg: "image/svg+xml",
      txt: "text/plain",
      webp: "image/webp",
      woff: "font/woff",
      woff2: "font/woff2",
    }[extension || ""] || "application/octet-stream"
  )
}

function findProjectRoot(paths: string[]) {
  const rootFiles = new Set(paths.map((path) => path.split("/")[0]))
  if (rootFiles.has("index.html") || rootFiles.has("app.html")) return ""
  if (rootFiles.size === 1) {
    const root = [...rootFiles][0]
    if (paths.includes(`${root}/index.html`) || paths.includes(`${root}/app.html`))
      return `${root}/`
  }
  return ""
}

function resolveArchiveAsset(
  reference: string,
  currentFile: string,
  root: string,
  assetUrls: Map<string, string>,
) {
  if (
    !reference ||
    reference.startsWith("#") ||
    /^(?:data:|blob:|https?:|\/\/|javascript:|mailto:|tel:)/i.test(reference)
  )
    return null
  try {
    const url = new URL(reference, `https://archive.invalid/${currentFile}`)
    if (url.origin !== "https://archive.invalid") return null
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "")
    return assetUrls.get(path) || assetUrls.get(`${root}${path}`) || null
  } catch {
    return null
  }
}

function createWebPreview(
  files: Unzipped,
  paths: string[],
  entryName: string,
  root: string,
) {
  const assetUrls = new Map<string, string>()
  for (const name of paths) {
    assetUrls.set(
      name,
      URL.createObjectURL(
        new Blob([files[name]], { type: mimeType(name) }),
      ),
    )
  }

  const parsed = new DOMParser().parseFromString(
    new TextDecoder().decode(files[entryName]),
    "text/html",
  )
  parsed
    .querySelectorAll("iframe, object, embed, form, base")
    .forEach((element) => element.remove())
  parsed.querySelectorAll("meta[http-equiv]").forEach((element) => {
    if (element.getAttribute("http-equiv")?.toLowerCase() === "refresh")
      element.remove()
  })

  parsed.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith("on") || name === "srcdoc") {
        element.removeAttribute(attribute.name)
      } else if (["src", "poster", "href"].includes(name)) {
        if (element.tagName.toLowerCase() === "a") {
          element.removeAttribute(attribute.name)
          continue
        }
        const url = resolveArchiveAsset(
          attribute.value,
          entryName,
          root,
          assetUrls,
        )
        if (url) element.setAttribute(attribute.name, url)
        else if (name !== "href" || element.tagName.toLowerCase() !== "link")
          element.removeAttribute(attribute.name)
        else element.remove()
      }
    }

    if (element.tagName.toLowerCase() === "script") {
      const source = element.getAttribute("src")
      if (source && !source.startsWith("blob:")) element.remove()
    }
  })

  const policy = document.createElement("meta")
  policy.httpEquiv = "Content-Security-Policy"
  policy.content =
    "default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline' blob:; img-src data: blob:; font-src data: blob:; media-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none';"
  parsed.head.prepend(policy)
  const style = document.createElement("style")
  style.textContent =
    "body{font-family:system-ui,sans-serif;margin:0;padding:16px;color:#202030}"
  parsed.head.append(style)
  return {
    html: `<!doctype html>${parsed.documentElement.outerHTML}`,
    objectUrls: [...assetUrls.values()],
  }
}

export async function inspectProjectArchive(file: Blob): Promise<ArchivePreview> {
  if (file.size > maxArchiveBytes)
    throw new Error("O ZIP excede o limite de 25 MB para prévia.")
  const files = await unzipProject(file)
  const paths = Object.keys(files)
    .map(safeArchivePath)
    .filter(
      (name): name is string => name !== null && !name.endsWith("/"),
    )
  const root = findProjectRoot(paths)
  const candidates = paths.filter((path) => path.startsWith(root))
  const webEntry =
    candidates.find((path) => path === `${root}index.html`) ||
    candidates.find((path) => path === `${root}app.html`)

  if (webEntry) {
    const preview = createWebPreview(files, paths, webEntry, root)
    return {
      entry: "web",
      entryName: webEntry,
      html: preview.html,
      objectUrls: preview.objectUrls,
      message:
        "Prévia web executada dentro de iframe isolado. Dependências npm não são instaladas.",
    }
  }

  const pythonEntry = candidates.find((path) =>
    /^(?:main|app)\.py$/i.test(path.slice(root.length)),
  )
  if (pythonEntry) {
    return {
      entry: "python",
      entryName: pythonEntry,
      content: new TextDecoder().decode(files[pythonEntry]),
      message:
        "Projeto Python executado com Pyodide. Pacotes do requirements.txt não são instalados automaticamente.",
    }
  }

  const rubyEntry = candidates.find((path) =>
    /^(?:main|app)\.rb$/i.test(path.slice(root.length)),
  )
  if (rubyEntry) {
    return {
      entry: "ruby",
      entryName: rubyEntry,
      content: new TextDecoder().decode(files[rubyEntry]),
      message:
        "O entrypoint Ruby foi detectado. O runtime Ruby ainda não está disponível; o código será exibido sem execução.",
    }
  }

  const sourceEntry = candidates.find((path) =>
    /\.(?:py|rb|js|mjs|css|json|md|txt|ya?ml|xml|sql|sh)$/i.test(path),
  )
  if (sourceEntry) {
    return {
      entry: "source",
      entryName: sourceEntry,
      content: new TextDecoder().decode(files[sourceEntry]),
      message:
        "Nenhum index.html, main.py ou main.rb encontrado. O primeiro arquivo de código será exibido sem instalar dependências.",
    }
  }

  const hasPackageManifest = candidates.some((path) =>
    /(?:^|\/)package\.json$/i.test(path),
  )
  return {
    entry: "none",
    message: hasPackageManifest
      ? "O ZIP contém package.json, mas não tem index.html. Envie o build web gerado; o sandbox não executa npm install nem scripts do pacote."
      : "Não foi encontrado index.html ou um arquivo de código reconhecido no ZIP.",
  }
}
