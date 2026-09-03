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
    name: 'search_site',
    title: 'Search site',
    description: 'Search the current website.',
    origin: 'https://therobotage.com',
    readOnly: true,
  }])
  assert.equal('window' in tools[0], false)
  assert.equal('inputSchema' in tools[0], false)
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
})
