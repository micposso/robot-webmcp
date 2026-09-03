(function installToolDataHelpers(scope) {
  function cleanString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback
  }

  function normalizeTools(tools) {
    if (!Array.isArray(tools)) return []

    return tools.flatMap((tool) => {
      if (!tool || typeof tool !== 'object') return []

      const name = cleanString(tool.name)
      if (!name) return []

      return [{
        name,
        title: cleanString(tool.title, name),
        description: cleanString(tool.description, 'No description provided.'),
        origin: cleanString(tool.origin),
        readOnly: tool.annotations?.readOnlyHint === true,
      }]
    })
  }

  scope.ReachyToolData = Object.freeze({ normalizeTools })
})(globalThis)
