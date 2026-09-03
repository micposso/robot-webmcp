(function installToolDataHelpers(scope) {
  function cleanString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback
  }

  function toolId(tool) {
    return JSON.stringify([
      cleanString(tool?.origin),
      cleanString(tool?.name),
    ])
  }

  function cloneInputSchema(value) {
    const fallback = { type: 'object', properties: {} }
    if (!value || typeof value !== 'object') return fallback

    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return fallback
    }
  }

  function normalizeTools(tools) {
    if (!Array.isArray(tools)) return []

    return tools.flatMap((tool) => {
      if (!tool || typeof tool !== 'object') return []

      const name = cleanString(tool.name)
      if (!name) return []

      return [{
        id: toolId(tool),
        name,
        title: cleanString(tool.title, name),
        description: cleanString(tool.description, 'No description provided.'),
        origin: cleanString(tool.origin),
        readOnly: tool.annotations?.readOnlyHint === true,
        inputSchema: cloneInputSchema(tool.inputSchema),
      }]
    })
  }

  scope.ReachyToolData = Object.freeze({ normalizeTools, toolId })
})(globalThis)
