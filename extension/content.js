(function installWebMCPDiscovery() {
  const UPDATE_MESSAGE = 'WEBMCP_DISCOVERY_UPDATE'
  const SCAN_MESSAGE = 'WEBMCP_DISCOVERY_SCAN'
  const EXECUTE_MESSAGE = 'WEBMCP_EXECUTION_RUN'
  const retryDelays = [0, 250, 1000, 3000]

  let observedContext = null
  let lastPayloadSignature = ''
  let scanSequence = 0

  function pageDetails() {
    return {
      url: window.location.href,
      origin: window.location.origin,
      title: document.title,
    }
  }

  function sendUpdate(payload) {
    const signature = JSON.stringify(payload)
    if (signature === lastPayloadSignature) return
    lastPayloadSignature = signature

    void chrome.runtime.sendMessage({
      type: UPDATE_MESSAGE,
      payload,
    }).catch(() => {
      // The extension may have been reloaded while this page stayed open.
    })
  }

  async function scan() {
    const sequence = ++scanSequence
    const modelContext = document.modelContext

    if (!modelContext || typeof modelContext.getTools !== 'function') {
      sendUpdate({
        ...pageDetails(),
        status: 'unsupported',
        tools: [],
        error: null,
      })
      return
    }

    try {
      const registeredTools = await modelContext.getTools()
      if (sequence !== scanSequence) return

      sendUpdate({
        ...pageDetails(),
        status: 'ready',
        tools: globalThis.ReachyToolData.normalizeTools(registeredTools),
        error: null,
      })
    } catch (error) {
      if (sequence !== scanSequence) return

      sendUpdate({
        ...pageDetails(),
        status: 'error',
        tools: [],
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  function executionResult(value) {
    if (value === null || typeof value === 'string') return value

    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  async function executeTool(message) {
    const modelContext = document.modelContext
    if (!modelContext || typeof modelContext.getTools !== 'function') {
      throw new Error('WebMCP is no longer available on this page.')
    }
    if (typeof modelContext.executeTool !== 'function') {
      throw new Error('This browser does not expose WebMCP tool execution.')
    }

    const argumentsJson = typeof message.argumentsJson === 'string'
      ? message.argumentsJson
      : '{}'
    JSON.parse(argumentsJson)

    const registeredTools = await modelContext.getTools()
    const tool = registeredTools.find(
      (candidate) => globalThis.ReachyToolData.toolId(candidate) === message.toolId,
    )
    if (!tool) throw new Error('The selected tool is no longer registered on this page.')

    if (tool.annotations?.readOnlyHint !== true && message.confirmed !== true) {
      throw new Error('Confirmation is required before running a tool that may change data.')
    }

    const result = await modelContext.executeTool(tool, argumentsJson)
    void scan()
    return executionResult(result)
  }

  function handleToolChange() {
    void scan()
  }

  function attachToModelContext() {
    const nextContext = document.modelContext ?? null
    if (nextContext === observedContext) {
      void scan()
      return
    }

    observedContext?.removeEventListener('toolchange', handleToolChange)
    observedContext = nextContext
    observedContext?.addEventListener('toolchange', handleToolChange)
    void scan()
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === EXECUTE_MESSAGE) {
      void executeTool(message)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      return true
    }

    if (message?.type !== SCAN_MESSAGE) return false

    attachToModelContext()
    sendResponse({ ok: true })
    return false
  })

  window.addEventListener('pagehide', () => {
    observedContext?.removeEventListener('toolchange', handleToolChange)
    observedContext = null
  }, { once: true })

  retryDelays.forEach((delay) => window.setTimeout(attachToModelContext, delay))
})()
