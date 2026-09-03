const elements = {
  siteTitle: document.querySelector('#site-title'),
  siteOrigin: document.querySelector('#site-origin'),
  statusDot: document.querySelector('#status-dot'),
  statusText: document.querySelector('#status-text'),
  toolCount: document.querySelector('#tool-count'),
  toolList: document.querySelector('#tool-list'),
  emptyState: document.querySelector('#empty-state'),
  refresh: document.querySelector('#refresh'),
}

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

  article.append(header, name, description)
  return article
}

function render(state) {
  if (!state) return

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
