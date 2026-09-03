(function installWebMCPDiscovery() {
  const UPDATE_MESSAGE = 'WEBMCP_DISCOVERY_UPDATE'
  const SCAN_MESSAGE = 'WEBMCP_DISCOVERY_SCAN'
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
