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

import { spawn, type ChildProcess } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

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
    const projectDir = join(__dirname, '../../../../../..')
    
    // ML Backend configuration
    const mlBackendDir = join(projectDir, 'airi-mods/services/ml-backend')
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
          ML_BACKEND_PORT: '8001'
        }
      })
      this.isAvailable = true
    }

    // Speaches configuration
    const speachesDir = join(projectDir, 'speaches-server')
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
          LD_LIBRARY_PATH: '.cuda-compat'
        }
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
        signal: AbortSignal.timeout(1000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async waitForService(port: number, maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isServiceRunning(port)) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return false
  }

  async startService(serviceId: string): Promise<ServiceStatus> {
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
        error: `Directory not found: ${config.cwd}` 
      }
    }

    console.log(`[SYN] Starting ${config.name}...`)

    try {
      const child = spawn(config.command, config.args, {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        stdio: 'pipe',
        detached: false
      })

      child.stdout?.on('data', (data) => {
        console.log(`[${config.name}] ${data.toString().trim()}`)
      })

      child.stderr?.on('data', (data) => {
        console.error(`[${config.name}] ${data.toString().trim()}`)
      })

      child.on('error', (error) => {
        console.error(`[SYN] ${config.name} error:`, error)
      })

      child.on('exit', (code) => {
        console.log(`[SYN] ${config.name} exited with code ${code}`)
        this.services.delete(serviceId)
      })

      this.services.set(serviceId, child)

      const isReady = await this.waitForService(config.port)
      
      if (isReady) {
        console.log(`[SYN] ✓ ${config.name} is ready on port ${config.port}`)
        return { name: config.name, running: true, pid: child.pid, port: config.port }
      } else {
        console.error(`[SYN] ✗ ${config.name} failed to start`)
        child.kill()
        return { name: config.name, running: false, port: config.port, error: 'Timeout waiting for service' }
      }
    } catch (error) {
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

    console.log('[SYN] Starting all services...')
    
    const results: ServiceStatus[] = []
    
    if (this.configs.has('ml-backend')) {
      results.push(await this.startService('ml-backend'))
    }
    
    if (this.configs.has('speaches')) {
      results.push(await this.startService('speaches'))
    }
    
    const allRunning = results.every(r => r.running)
    if (allRunning) {
      console.log('[SYN] ✓ All services started successfully')
    } else {
      console.error('[SYN] ✗ Some services failed to start')
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
        port: config.port
      })
    }
    
    return statuses
  }
}

export const synServiceManager = new SYNServiceManager()
export default serviceManager
