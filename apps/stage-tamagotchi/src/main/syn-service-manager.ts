/**
 * Service Manager for AIC-Assistant
 *
 * Manages external services:
 * - ML Backend (emotion detection + BFA) on port 8001
 * - Speaches (TTS + ASR) on port 8000
 *
 * Services auto-start when app launches and auto-kill when it closes.
 *
 * Usage:
 *   import { serviceManager } from './service-manager'
 *   await serviceManager.startAll()
 *   // On app exit:
 *   await serviceManager.stopAll()
 */

import type { ChildProcess } from 'node:child_process'

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface ServiceConfig {
  name: string
  command: string
  args: string[]
  cwd: string
  port: number
  healthEndpoint: string
  env?: Record<string, string>
}

interface ServiceStatus {
  name: string
  running: boolean
  pid?: number
  port: number
  error?: string
}

class SYNServiceManager {
  private services: Map<string, ChildProcess> = new Map()
  private configs: Map<string, ServiceConfig> = new Map()
  private isAvailable: boolean = false

  constructor() {
    // Check if services are available
    // __dirname is 'apps/stage-tamagotchi/out/main/' in compiled app
    // Need 4 levels up to reach project root: out/ -> stage-tamagotchi/ -> apps/ -> root
    const projectDir = join(__dirname, '../../../../')

    // ML Backend configuration
    const mlBackendDir = join(projectDir, 'services/syn-ml-backend')
    if (existsSync(mlBackendDir)) {
      this.configs.set('ml-backend', {
        name: 'ML Backend',
        command: 'python',
        args: ['launcher.py'],
        cwd: mlBackendDir,
        port: 8001,
        healthEndpoint: '/health',
        env: {
          PYTHONUNBUFFERED: '1',
          ML_BACKEND_PORT: '8001',
        },
      })
      this.isAvailable = true
    }

    // Speaches configuration
    const speachesDir = join(projectDir, 'services/syn-speaches')
    if (existsSync(speachesDir)) {
      this.configs.set('speaches', {
        name: 'Speaches TTS/ASR',
        command: 'bash',
        args: ['-c', '.venv/bin/uvicorn --factory --host 0.0.0.0 --port 8000 speaches.main:create_app'],
        cwd: speachesDir,
        port: 8000,
        healthEndpoint: '/health',
        env: {
          ALLOW_ORIGINS: '["http://localhost:5173"]',
          LD_LIBRARY_PATH: '.cuda-compat',
        },
      })
      this.isAvailable = true
    }

    if (!this.isAvailable) {
      console.log('[SYN] No custom services found - running base AIRI')
    }
  }

  hasServices(): boolean {
    return this.isAvailable && this.configs.size > 0
  }

  private async isServiceRunning(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000),
      })
      return response.ok
    }
    catch {
      return false
    }
  }

  private async waitForService(port: number, maxAttempts = 30, serviceName = 'Service'): Promise<boolean> {
    console.log(`[SYN] ${serviceName}: Waiting up to ${maxAttempts} seconds to start...`)
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isServiceRunning(port)) {
        return true
      }
      // Log progress every 30 seconds for long-running services
      if ((i + 1) % 30 === 0) {
        console.log(`[SYN] ${serviceName}: Still starting... (${i + 1}/${maxAttempts} seconds)`)
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return false
  }

  async startService(serviceId: string, maxWaitSeconds = 30): Promise<ServiceStatus> {
    const config = this.configs.get(serviceId)
    if (!config) {
      return { name: serviceId, running: false, port: 0, error: 'Unknown service' }
    }

    if (await this.isServiceRunning(config.port)) {
      console.log(`[SYN] ${config.name} is already running on port ${config.port}`)
      return { name: config.name, running: true, port: config.port }
    }

    if (!existsSync(config.cwd)) {
      return {
        name: config.name,
        running: false,
        port: config.port,
        error: `Directory not found: ${config.cwd}`,
      }
    }

    console.log(`[SYN] Starting ${config.name}...`)

    try {
      const child = spawn(config.command, config.args, {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        stdio: 'pipe',
        detached: false,
      })

      child.stdout?.on('data', (data) => {
        try {
          console.log(`[${config.name}] ${data.toString().trim()}`)
        }
        catch (e) {
          // Ignore EPIPE errors when child process closes
        }
      })

      child.stdout?.on('error', () => {
        // Ignore pipe errors
      })

      child.stderr?.on('data', (data) => {
        try {
          console.error(`[${config.name}] ${data.toString().trim()}`)
        }
        catch (e) {
          // Ignore EPIPE errors when child process closes
        }
      })

      child.stderr?.on('error', () => {
        // Ignore pipe errors
      })

      child.on('error', (error) => {
        console.error(`[SYN] ${config.name} error:`, error)
      })

      child.on('exit', (code) => {
        console.log(`[SYN] ${config.name} exited with code ${code}`)
        this.services.delete(serviceId)
      })

      this.services.set(serviceId, child)

      const isReady = await this.waitForService(config.port, maxWaitSeconds, config.name)

      if (isReady) {
        console.log(`[SYN] ✓ ${config.name} is ready on port ${config.port}`)
        return { name: config.name, running: true, pid: child.pid, port: config.port }
      }
      else {
        console.error(`[SYN] ✗ ${config.name} failed to start (timeout after ${maxWaitSeconds}s)`)
        child.kill()
        return { name: config.name, running: false, port: config.port, error: `Timeout waiting for service after ${maxWaitSeconds}s` }
      }
    }
    catch (error) {
      console.error(`[SYN] Failed to start ${config.name}:`, error)
      return { name: config.name, running: false, port: config.port, error: String(error) }
    }
  }

  async stopService(serviceId: string): Promise<void> {
    const child = this.services.get(serviceId)
    if (child) {
      const config = this.configs.get(serviceId)
      console.log(`[SYN] Stopping ${config?.name || serviceId}...`)

      child.kill('SIGTERM')

      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL')
        }
      }, 5000)

      this.services.delete(serviceId)
    }
  }

  async startAll(): Promise<ServiceStatus[]> {
    if (!this.hasServices()) {
      console.log('[SYN] No custom services configured - continuing with base AIRI')
      return []
    }

    console.log('[SYN] Starting all services (app will continue while services initialize)...')

    const results: ServiceStatus[] = []

    // Start ML Backend with extended timeout (600s = 10 minutes for model loading)
    // This runs asynchronously - app continues while model loads
    if (this.configs.has('ml-backend')) {
      console.log('[SYN] ML Backend: Starting with 600 second timeout (model loading may take several minutes)...')
      // Start ML Backend asynchronously so app doesn't block
      this.startService('ml-backend', 600).then((status) => {
        if (status.running) {
          console.log('[SYN] ✓ ML Backend is now ready (started in background)')
        }
        else {
          console.error('[SYN] ✗ ML Backend failed to start:', status.error)
        }
      }).catch((err) => {
        console.error('[SYN] ML Backend error:', err)
      })

      // Add pending status - will update asynchronously
      const mlConfig = this.configs.get('ml-backend')!
      results.push({
        name: mlConfig.name,
        running: false,
        port: mlConfig.port,
        error: 'Starting in background (may take 1-10 minutes for model loading)',
      })
    }

    // Start Speaches normally with standard timeout
    if (this.configs.has('speaches')) {
      results.push(await this.startService('speaches', 60))
    }

    const allRunning = results.every(r => r.running)
    if (allRunning) {
      console.log('[SYN] ✓ All services started successfully')
    }
    else {
      const pending = results.filter(r => r.error?.includes('background'))
      const failed = results.filter(r => !r.running && !r.error?.includes('background'))

      if (pending.length > 0) {
        console.log(`[SYN] ⏳ ${pending.length} service(s) starting in background (app is ready)`)
      }
      if (failed.length > 0) {
        console.error('[SYN] ✗ Some services failed:', failed.map(r => r.name).join(', '))
      }
    }

    return results
  }

  async stopAll(): Promise<void> {
    console.log('[SYN] Stopping all services...')

    for (const serviceId of this.services.keys()) {
      await this.stopService(serviceId)
    }

    console.log('[SYN] ✓ All services stopped')
  }

  async getStatus(): Promise<ServiceStatus[]> {
    const statuses: ServiceStatus[] = []

    for (const [id, config] of this.configs) {
      const running = await this.isServiceRunning(config.port)
      const child = this.services.get(id)
      statuses.push({
        name: config.name,
        running,
        pid: child?.pid,
        port: config.port,
      })
    }

    return statuses
  }
}

export const synServiceManager = new SYNServiceManager()
export default synServiceManager
