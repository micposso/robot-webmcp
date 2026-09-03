import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionSource = path.join(projectRoot, 'extension')
const fixtureScript = path.join(projectRoot, 'tests', 'fixtures', 'webmcp-test-context.js')

async function createTestExtension(tempRoot) {
  const extensionPath = path.join(tempRoot, 'extension')
  await cp(extensionSource, extensionPath, { recursive: true })
  await cp(fixtureScript, path.join(extensionPath, 'webmcp-test-context.js'))

  const manifestPath = path.join(extensionPath, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.content_scripts[0].js.unshift('webmcp-test-context.js')
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return extensionPath
}

async function startFixtureServer() {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(`<!doctype html><title>${request.url === '/unsupported' ? 'Unsupported page' : 'WebMCP fixture'}</title><h1>Extension fixture</h1>`)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert(address && typeof address === 'object')
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  }
}

async function extensionIdFor(context) {
  let workers = context.serviceWorkers()
  if (workers.length === 0) workers = [await context.waitForEvent('serviceworker')]
  return new URL(workers[0].url()).host
}

test('Chrome companion discovers, executes, confirms, and refreshes tools', { timeout: 45_000 }, async (t) => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'reachy-webmcp-e2e-'))
  const extensionPath = await createTestExtension(tempRoot)
  const fixtureServer = await startFixtureServer()
  const context = await chromium.launchPersistentContext(path.join(tempRoot, 'profile'), {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })

  t.after(async () => {
    await context.close()
    await fixtureServer.close()
    await rm(tempRoot, { recursive: true, force: true })
  })

  const extensionId = await extensionIdFor(context)
  const website = await context.newPage()
  await website.goto(`${fixtureServer.origin}/tools`)

  const panel = await context.newPage()
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`)
  await website.bringToFront()

  await assert.doesNotReject(() => panel.locator('#status-text').getByText('WebMCP is available').waitFor())
  await assert.doesNotReject(() => panel.locator('.tool-card').nth(1).waitFor())
  assert.equal(await panel.locator('#tool-count').textContent(), '2')
  assert.deepEqual(await panel.locator('.tool-card .tool-name').allTextContents(), ['search_site', 'move_robot'])

  await panel.getByRole('button', { name: 'Try tool' }).first().click()
  await panel.locator('#arguments-json').fill('{"query":"reachy"}')
  await panel.locator('#run-tool').click()
  await panel.getByText('Tool completed successfully.').waitFor()
  assert.match(await panel.locator('#execution-result').textContent(), /"query": "reachy"/)

  await panel.locator('#close-execution').click()
  await panel.getByRole('button', { name: 'Try tool' }).nth(1).click()
  await panel.locator('#run-tool').click()
  await panel.getByText('Confirm the website action before running this tool.').waitFor()
  await panel.locator('#confirm-action').check()
  await panel.locator('#run-tool').click()
  await panel.getByText('Tool completed successfully.').waitFor()
  assert.match(await panel.locator('#execution-result').textContent(), /"tool": "move_robot"/)

  await website.goto(`${fixtureServer.origin}/toolchange`)
  await website.bringToFront()
  await assert.doesNotReject(() => panel.locator('.tool-card').nth(2).waitFor())
  assert.equal(await panel.locator('#tool-count').textContent(), '3')

  await website.goto(`${fixtureServer.origin}/unsupported`)
  await website.bringToFront()
  await panel.getByText('does not expose the WebMCP discovery API').waitFor()
  assert.equal(await panel.locator('#tool-count').textContent(), '0')
  assert.equal(await panel.locator('#execution-panel').isHidden(), true)
})
