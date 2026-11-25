import type Configure from '@adonisjs/core/commands/configure'
import { EnvEditor } from '@adonisjs/core/env/editor'
import { stubsRoot } from './stubs/main.ts'

/** Scaffolds the application's configuration and registers the server middleware. */
export async function configure(command: Configure) {
  try {
    await command.app.import('@adonisjs/assembler/code_transformer')
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ERR_MODULE_NOT_FOUND' ||
      !error.message.startsWith("Cannot find package '@adonisjs/assembler'")
    ) {
      throw error
    }
    command.logger.error('Install @adonisjs/assembler in the application to configure Origin Guard')
    command.exitCode = 1
    return
  }

  const codemods = await command.createCodemods()

  await codemods.makeUsingStub(stubsRoot, 'config/origin_guard.stub', {})
  const variables = {
    ORIGIN_GUARD_PUBLIC_ORIGIN: 'Env.schema.string()',
    ORIGIN_GUARD_ALLOWED_ORIGINS: 'Env.schema.string.optional()',
  }
  await codemods.defineEnvValidations({ variables })

  // The environment codemod overwrites assignments, so only add entirely new keys.
  const envEditor = await EnvEditor.create(command.app.appRoot)
  const envFiles = envEditor.toJSON()
  const placeholders = Object.fromEntries(
    Object.keys(variables)
      .filter((key) => {
        const assignment = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`)
        return !envFiles.some(({ contents }) => contents.some((line) => assignment.test(line)))
      })
      .map((key) => [key, ''])
  )
  if (Object.keys(placeholders).length) await codemods.defineEnvVariables(placeholders)
  await codemods.registerMiddleware('server', [
    {
      name: 'originGuard',
      path: '@kevinjohn/adonisjs-origin-guard/origin_guard_middleware',
      position: 'before',
    },
  ])
}
