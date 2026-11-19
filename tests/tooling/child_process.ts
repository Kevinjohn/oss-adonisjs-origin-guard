import type { ChildProcess } from 'node:child_process'
import { readFile } from 'node:fs/promises'

/** Collect a child's stdout and stderr as it runs. */
export function captureChildOutput(
  child: ChildProcess
): Promise<{ code: number | null; signal: NodeJS.Signals | null; text: string }> {
  let output = ''
  child.stdout!.setEncoding('utf8').on('data', (chunk: string) => (output += chunk))
  child.stderr!.setEncoding('utf8').on('data', (chunk: string) => (output += chunk))
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal, text: output }))
  })
}

/** Whether a process is still running; a zombie counts as gone. */
export async function isAlive(pid: number): Promise<boolean> {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8')
    const state = stat.slice(stat.lastIndexOf(')') + 2, stat.lastIndexOf(')') + 3)
    return state !== 'Z'
  } catch {
    try {
      process.kill(pid, 0)
      return true
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== 'ESRCH'
    }
  }
}

/** Wait for a complete positive PID, never treating an empty file as process group zero. */
export async function waitForPid(filePath: string, timeoutMs = 5000): Promise<number> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const content = await readFile(filePath, 'utf8')
      const value = content.trim()
      if (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))) return Number(value)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`Timed out waiting for ${filePath}`)
}

/** Poll for a marker file written by a child. */
export async function waitForFile(filePath: string, timeoutMs = 5000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      return await readFile(filePath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`Timed out waiting for ${filePath}`)
}
