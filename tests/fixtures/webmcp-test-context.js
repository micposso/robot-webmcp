(function installTestModelContext() {
  if (window.location.pathname === '/unsupported') return

  const listeners = new Map()
  const tools = [
    {
      name: 'search_site',
      title: 'Search site',
      description: 'Search this test website.',
      origin: window.location.origin,
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'move_robot',
      title: 'Move robot',
      description: 'Run a simulated physical action.',
      origin: window.location.origin,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false },
    },
  ]

  document.modelContext = {
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) ?? new Set()
      typeListeners.add(listener)
      listeners.set(type, typeListeners)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    async getTools() {
      return tools
    },
    async executeTool(tool, argumentsJson) {
      return JSON.stringify({
        success: true,
        tool: tool.name,
        arguments: JSON.parse(argumentsJson),
      })
    },
  }

  if (window.location.pathname === '/toolchange') {
    window.setTimeout(() => {
      tools.push({
        name: 'late_tool',
        title: 'Late tool',
        description: 'Registered after the initial scan.',
        origin: window.location.origin,
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
      })
      for (const listener of listeners.get('toolchange') ?? []) listener()
    }, 500)
  }
})()
