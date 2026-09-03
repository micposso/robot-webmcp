import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

async function loadToolData() {
  const source = await readFile(new URL('../extension/tool-data.js', import.meta.url), 'utf8')
  const context = vm.createContext({})
  vm.runInContext(source, context)
  return context.ReachyToolData
}

async function loadContentBridge(tool) {
  const toolDataSource = await readFile(new URL('../extension/tool-data.js', import.meta.url), 'utf8')
  const contentSource = await readFile(new URL('../extension/content.js', import.meta.url), 'utf8')
  const messageListeners = []
  const executions = []
  const modelContext = {
    addEventListener() {},
    removeEventListener() {},
    async getTools() { return [tool] },
    async executeTool(selectedTool, argumentsJson) {
      executions.push({ selectedTool, argumentsJson })
      return JSON.stringify({ success: true })
    },
  }
  const context = vm.createContext({
    chrome: {
      runtime: {
        onMessage: { addListener(listener) { messageListeners.push(listener) } },
        sendMessage() { return Promise.resolve() },
      },
    },
    document: { modelContext, title: 'Test page' },
    window: {
      location: { href: 'https://example.com/', origin: 'https://example.com' },
      addEventListener() {},
      setTimeout() { return 0 },
    },
  })
  vm.runInContext(toolDataSource, context)
  vm.runInContext(contentSource, context)

  return {
    executions,
    toolId: context.ReachyToolData.toolId(tool),
    send(message) {
      return new Promise((resolve) => {
        const handledAsync = messageListeners[0](message, {}, resolve)
        assert.equal(handledAsync, true)
      })
    },
  }
}

test('normalizeTools keeps only serializable discovery metadata', async () => {
  const { normalizeTools } = await loadToolData()
  const windowReference = { cannotBeCloned: () => undefined }
  const tools = normalizeTools([{
    name: 'search_site',
    title: 'Search site',
    description: 'Search the current website.',
    origin: 'https://therobotage.com',
    window: windowReference,
    inputSchema: { type: 'object' },
    annotations: { readOnlyHint: true },
  }])

  assert.deepEqual(JSON.parse(JSON.stringify(tools)), [{
    id: '["https://therobotage.com","search_site"]',
    name: 'search_site',
    title: 'Search site',
    description: 'Search the current website.',
    origin: 'https://therobotage.com',
    readOnly: true,
    inputSchema: { type: 'object' },
  }])
  assert.equal('window' in tools[0], false)
})

test('normalizeTools rejects invalid entries and supplies display fallbacks', async () => {
  const { normalizeTools } = await loadToolData()
  const tools = normalizeTools([
    null,
    {},
    { name: '  get_status  ', title: '', description: '' },
  ])

  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, 'get_status')
  assert.equal(tools[0].title, 'get_status')
  assert.equal(tools[0].description, 'No description provided.')
  assert.equal(tools[0].readOnly, false)
  assert.deepEqual(JSON.parse(JSON.stringify(tools[0].inputSchema)), {
    type: 'object',
    properties: {},
  })
})

test('normalizeTools falls back when an input schema cannot be serialized', async () => {
  const { normalizeTools } = await loadToolData()
  const circularSchema = { type: 'object' }
  circularSchema.self = circularSchema

  const [tool] = normalizeTools([{ name: 'circular', inputSchema: circularSchema }])

  assert.deepEqual(JSON.parse(JSON.stringify(tool.inputSchema)), {
    type: 'object',
    properties: {},
  })
})

test('content bridge executes a read-only tool with JSON arguments', async () => {
  const tool = {
    name: 'search_site',
    origin: 'https://example.com',
    annotations: { readOnlyHint: true },
  }
  const bridge = await loadContentBridge(tool)
  const response = await bridge.send({
    type: 'WEBMCP_EXECUTION_RUN',
    toolId: bridge.toolId,
    argumentsJson: '{"query":"robots"}',
    confirmed: false,
  })

  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: true,
    result: '{"success":true}',
  })
  assert.equal(bridge.executions.length, 1)
  assert.equal(bridge.executions[0].argumentsJson, '{"query":"robots"}')
})

test('content bridge blocks an action tool until it is confirmed', async () => {
  const tool = {
    name: 'register_for_event',
    origin: 'https://example.com',
    annotations: { readOnlyHint: false },
  }
  const bridge = await loadContentBridge(tool)
  const blocked = await bridge.send({
    type: 'WEBMCP_EXECUTION_RUN',
    toolId: bridge.toolId,
    argumentsJson: '{}',
    confirmed: false,
  })

  assert.equal(blocked.ok, false)
  assert.match(blocked.error, /Confirmation is required/)
  assert.equal(bridge.executions.length, 0)

  const allowed = await bridge.send({
    type: 'WEBMCP_EXECUTION_RUN',
    toolId: bridge.toolId,
    argumentsJson: '{}',
    confirmed: true,
  })
  assert.equal(allowed.ok, true)
  assert.equal(bridge.executions.length, 1)
})
