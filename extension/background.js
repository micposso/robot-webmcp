const UPDATE_MESSAGE = 'WEBMCP_DISCOVERY_UPDATE'
const SCAN_MESSAGE = 'WEBMCP_DISCOVERY_SCAN'
const STATE_MESSAGE = 'WEBMCP_DISCOVERY_STATE'
const EXECUTE_MESSAGE = 'WEBMCP_EXECUTION_RUN'

const stateByTab = new Map()

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

function isDiscoverableUrl(url = '') {
  return url.startsWith('https://') || url.startsWith('http://')
}

function pendingState(tab, status = 'loading') {
  const origin = (() => {
    try {
      return tab.url ? new URL(tab.url).origin : ''
    } catch {
      return ''
    }
  })()

  return {
    tabId: tab.id,
    url: tab.url ?? '',
    origin,
    title: tab.title ?? '',
    status,
    tools: [],
    error: status === 'unavailable'
      ? 'WebMCP discovery is unavailable on this browser page.'
      : null,
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

async function broadcast(state) {
  await chrome.runtime.sendMessage({ type: STATE_MESSAGE, state }).catch(() => {
    // The side panel is not open.
  })
}

function isCompanionUiSender(sender) {
  if (sender.id !== chrome.runtime.id) return false

  return !sender.tab || sender.url === chrome.runtime.getURL('sidepanel.html')
}

async function scanTab(tab) {
  if (!tab?.id) return

  if (!isDiscoverableUrl(tab.url)) {
    const state = pendingState(tab, 'unavailable')
    stateByTab.set(tab.id, state)
    await broadcast(state)
    return
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: SCAN_MESSAGE })
  } catch {
    const state = pendingState(tab, 'unavailable')
    state.error = 'The page is still loading or does not allow extension access.'
    stateByTab.set(tab.id, state)
    await broadcast(state)
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === UPDATE_MESSAGE && sender.tab?.id) {
    const state = { tabId: sender.tab.id, ...message.payload }
    stateByTab.set(sender.tab.id, state)

    void activeTab().then((tab) => {
      if (tab?.id === sender.tab.id) return broadcast(state)
    })
    sendResponse({ ok: true })
    return false
  }

  if (message?.type === 'WEBMCP_DISCOVERY_GET_ACTIVE') {
    void activeTab().then(async (tab) => {
      if (!tab?.id) {
        sendResponse({ state: null })
        return
      }

      const cached = stateByTab.get(tab.id)
      const state = cached?.url === tab.url ? cached : pendingState(tab)
      sendResponse({ state })
      await scanTab(tab)
    })
    return true
  }

  if (message?.type === 'WEBMCP_DISCOVERY_REFRESH') {
    void activeTab().then(async (tab) => {
      await scanTab(tab)
      sendResponse({ ok: true })
    })
    return true
  }

  if (
    message?.type === 'WEBMCP_EXECUTION_REQUEST'
    && isCompanionUiSender(sender)
  ) {
    void activeTab().then(async (tab) => {
      if (!tab?.id || tab.id !== message.tabId) {
        sendResponse({
          ok: false,
          error: 'The active tab changed. Select the tool again on the current page.',
        })
        return
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: EXECUTE_MESSAGE,
          toolId: message.toolId,
          argumentsJson: message.argumentsJson,
          confirmed: message.confirmed === true,
        })
        sendResponse(response)
      } catch {
        sendResponse({
          ok: false,
          error: 'Tool execution was interrupted. The page may have navigated or reloaded.',
        })
      }
    })
    return true
  }

  return false
})

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chrome.tabs.get(tabId).then(async (tab) => {
    const state = stateByTab.get(tabId) ?? pendingState(tab)
    await broadcast(state)
    await scanTab(tab)
  })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    const state = pendingState(tab)
    stateByTab.set(tabId, state)
    if (tab.active) void broadcast(state)
  }

  if (changeInfo.status === 'complete' && tab.active) void scanTab(tab)
})

chrome.tabs.onRemoved.addListener((tabId) => stateByTab.delete(tabId))
