import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const runtimeDirectory = path.join(root, "node_modules/pyodide")
const destination = path.join(root, "public/pyodide")
const runtimeFiles = [
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "pyodide-lock.json",
  "pyodide.js",
  "pyodide.mjs",
  "python_stdlib.zip",
]

fs.mkdirSync(destination, { recursive: true })
for (const file of runtimeFiles) {
  fs.copyFileSync(path.join(runtimeDirectory, file), path.join(destination, file))
}
