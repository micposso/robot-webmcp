const elements = {
  siteTitle: document.querySelector('#site-title'),
  siteOrigin: document.querySelector('#site-origin'),
  statusDot: document.querySelector('#status-dot'),
  statusText: document.querySelector('#status-text'),
  toolCount: document.querySelector('#tool-count'),
  toolList: document.querySelector('#tool-list'),
  emptyState: document.querySelector('#empty-state'),
  refresh: document.querySelector('#refresh'),
  executionPanel: document.querySelector('#execution-panel'),
  executionTitle: document.querySelector('#execution-title'),
  executionToolName: document.querySelector('#execution-tool-name'),
  inputSchema: document.querySelector('#input-schema'),
  argumentsJson: document.querySelector('#arguments-json'),
  actionConfirmation: document.querySelector('#action-confirmation'),
  confirmAction: document.querySelector('#confirm-action'),
  runTool: document.querySelector('#run-tool'),
  closeExecution: document.querySelector('#close-execution'),
  executionStatus: document.querySelector('#execution-status'),
  executionResult: document.querySelector('#execution-result'),
}

let currentState = null
let selectedTool = null

const statusCopy = {
  loading: 'Checking the active page…',
  ready: 'WebMCP is available on this page.',
  unsupported: 'This page or browser does not expose the WebMCP discovery API.',
  unavailable: 'WebMCP discovery is unavailable on this browser page.',
  error: 'The page returned an error while listing its tools.',
}

function toolCard(tool) {
  const article = document.createElement('article')
  article.className = 'tool-card'

  const header = document.createElement('header')
  const title = document.createElement('h3')
  title.textContent = tool.title
  header.append(title)

  if (tool.readOnly) {
    const badge = document.createElement('span')
    badge.className = 'read-only'
    badge.textContent = 'Read only'
    header.append(badge)
  }

  const name = document.createElement('p')
  name.className = 'tool-name'
  name.textContent = tool.name

  const description = document.createElement('p')
  description.className = 'tool-description'
  description.textContent = tool.description

  const actions = document.createElement('div')
  actions.className = 'tool-actions'
  const execute = document.createElement('button')
  execute.className = 'execute-button'
  execute.type = 'button'
  execute.textContent = 'Try tool'
  execute.addEventListener('click', () => openExecution(tool))
  actions.append(execute)

  article.append(header, name, description, actions)
  return article
}

function closeExecution() {
  selectedTool = null
  elements.executionPanel.hidden = true
  elements.executionStatus.textContent = ''
  elements.executionResult.hidden = true
  elements.confirmAction.checked = false
}

function openExecution(tool) {
  selectedTool = tool
  elements.executionTitle.textContent = tool.title
  elements.executionToolName.textContent = tool.name
  elements.inputSchema.textContent = JSON.stringify(tool.inputSchema, null, 2)
  elements.argumentsJson.value = '{}'
  elements.actionConfirmation.hidden = tool.readOnly
  elements.confirmAction.checked = false
  elements.executionStatus.className = 'execution-status'
  elements.executionStatus.textContent = tool.readOnly
    ? 'Review the arguments, then run this read-only tool.'
    : 'Confirmation is required because this tool may change website data.'
  elements.executionResult.hidden = true
  elements.executionPanel.hidden = false
  elements.executionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatResult(result) {
  if (result === null) return 'The tool completed and the page navigated.'
  if (typeof result !== 'string') return String(result)

  try {
    return JSON.stringify(JSON.parse(result), null, 2)
  } catch {
    return result
  }
}

function render(state) {
  if (!state) return

  const previousTabId = currentState?.tabId
  currentState = state
  const tools = Array.isArray(state.tools) ? state.tools : []
  elements.siteTitle.textContent = state.title || 'Untitled page'
  elements.siteOrigin.textContent = state.origin || state.url || 'Browser page'
  elements.statusText.textContent = state.error || statusCopy[state.status] || statusCopy.loading
  elements.statusDot.className = `status-dot ${state.status === 'ready' ? 'ready' : state.status === 'error' ? 'error' : ''}`
  elements.toolCount.textContent = String(tools.length)
  elements.toolList.replaceChildren(...tools.map(toolCard))
  elements.emptyState.hidden = tools.length > 0
  elements.emptyState.textContent = state.status === 'ready'
    ? 'This website currently exposes no WebMCP tools.'
    : 'No tools discovered yet.'

  if (selectedTool) {
    const refreshedTool = tools.find((tool) => tool.id === selectedTool.id)
    const selectionChanged = !refreshedTool
      || JSON.stringify(refreshedTool) !== JSON.stringify(selectedTool)

    if (previousTabId !== state.tabId || selectionChanged) closeExecution()
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'WEBMCP_DISCOVERY_STATE') render(message.state)
})

elements.refresh.addEventListener('click', () => {
  elements.statusText.textContent = statusCopy.loading
  void chrome.runtime.sendMessage({ type: 'WEBMCP_DISCOVERY_REFRESH' }).catch(() => {
    render({
      title: 'Extension unavailable',
      origin: '',
      status: 'error',
      tools: [],
      error: 'Reload the extension and reopen this panel.',
    })
  })
})

elements.closeExecution.addEventListener('click', closeExecution)

elements.runTool.addEventListener('click', () => {
  if (!selectedTool || !currentState?.tabId) return

  try {
    JSON.parse(elements.argumentsJson.value)
  } catch {
    elements.executionStatus.className = 'execution-status error'
    elements.executionStatus.textContent = 'Arguments must be valid JSON.'
    return
  }

  if (!selectedTool.readOnly && !elements.confirmAction.checked) {
    elements.executionStatus.className = 'execution-status error'
    elements.executionStatus.textContent = 'Confirm the website action before running this tool.'
    return
  }

  elements.runTool.disabled = true
  elements.executionStatus.className = 'execution-status'
  elements.executionStatus.textContent = `Running ${selectedTool.name}…`
  elements.executionResult.hidden = true

  void chrome.runtime.sendMessage({
    type: 'WEBMCP_EXECUTION_REQUEST',
    tabId: currentState.tabId,
    toolId: selectedTool.id,
    argumentsJson: elements.argumentsJson.value,
    confirmed: selectedTool.readOnly || elements.confirmAction.checked,
  }).then((response) => {
    if (!response) {
      throw new Error('The companion service worker did not answer. Reload the extension, reopen this panel, and try again.')
    }
    if (!response.ok) throw new Error(response.error || 'The tool did not return a result.')

    elements.executionStatus.textContent = 'Tool completed successfully.'
    elements.executionResult.textContent = formatResult(response.result)
    elements.executionResult.hidden = false
  }).catch((error) => {
    elements.executionStatus.className = 'execution-status error'
    elements.executionStatus.textContent = error instanceof Error ? error.message : String(error)
  }).finally(() => {
    elements.runTool.disabled = false
  })
})

void chrome.runtime.sendMessage({ type: 'WEBMCP_DISCOVERY_GET_ACTIVE' })
  .then(({ state }) => render(state))
  .catch(() => {
    render({
      title: 'Extension unavailable',
      origin: '',
      status: 'error',
      tools: [],
      error: 'Reload the extension and reopen this panel.',
    })
  })
