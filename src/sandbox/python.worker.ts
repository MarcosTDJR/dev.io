import { loadPyodide } from "pyodide"

type PythonRunMessage = { code: string }

type WorkerScope = {
  location: Location
  onmessage: ((event: MessageEvent<PythonRunMessage>) => void) | null
  postMessage(message: unknown): void
}

const scope = self as unknown as WorkerScope

scope.onmessage = async (event: MessageEvent<PythonRunMessage>) => {
  try {
    let outputLength = 0
    let outputLimitReported = false
    const sendOutput = (output: string) => {
      const remaining = 50_000 - outputLength
      if (remaining > 0) {
        const visibleOutput = output.slice(0, remaining)
        scope.postMessage({ type: "output", output: visibleOutput })
        outputLength += visibleOutput.length
      }
      if (output.length > remaining && !outputLimitReported) {
        outputLimitReported = true
        scope.postMessage({
          type: "output",
          output: "\nOutput limitado a 50 KB.\n",
        })
      }
    }

    const pyodide = await loadPyodide({
      indexURL: new URL("/pyodide/", scope.location.href).href,
      stdout: sendOutput,
      stderr: sendOutput,
    })

    const blockNetwork = () =>
      Promise.reject(new Error("A rede está desativada no sandbox Python."))
    Object.defineProperty(scope, "fetch", {
      configurable: false,
      value: blockNetwork,
      writable: false,
    })
    for (const api of [
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "importScripts",
    ]) {
      Object.defineProperty(scope, api, {
        configurable: false,
        value: undefined,
        writable: false,
      })
    }

    await pyodide.runPythonAsync(event.data.code)
    scope.postMessage({ type: "complete" })
  } catch (error) {
    scope.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
