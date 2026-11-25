import 'reflect-metadata'
import { createServer } from 'node:http'
import { Ignitor } from '@adonisjs/core'

const environment = process.argv[2] === 'console' ? 'console' : 'web'
const app = new Ignitor(new URL('./', import.meta.url), {
  importer: (file) => import(file),
}).createApp(environment)

await app.init()
await app.boot()
await app.start(async () => {
  if (environment === 'console') {
    console.log('CONSOLE_START_REACHED')
    return
  }
  const server = await app.container.make('server')
  await server.boot()
  const httpServer = createServer(server.handle.bind(server))
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(0, '127.0.0.1', resolve)
  })

  const address = httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Expected a local HTTP listener')
  console.log('HTTP_START_REACHED')
  try {
    const write = async (origin: string) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/write`, {
        method: 'POST',
        headers: { origin },
      })
      return { status: response.status, body: await response.text() }
    }
    console.log(
      'WRITE_RESULTS',
      JSON.stringify({
        foreign: await write('https://evil.example'),
        listed: await write('https://trusted.example'),
        public: await write('https://app.example'),
      })
    )
  } finally {
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve()))
    )
  }
})
await app.terminate()
