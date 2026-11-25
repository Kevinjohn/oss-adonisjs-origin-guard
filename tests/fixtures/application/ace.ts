import { Ignitor } from '@adonisjs/core'

await new Ignitor(new URL('./', import.meta.url), {
  importer: (file) => import(file),
})
  .ace()
  .handle(process.argv.slice(2))
