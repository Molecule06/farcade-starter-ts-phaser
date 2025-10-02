/**
 * Remix Development Utilities
 * Core utilities for Remix game development environment
 */

// Dev environment info interface
interface DevEnvironmentInfo {
  packageManager: string
  gameId: string
  lastUpdated: number
}

// Function to check if running inside the Remix iframe environment
export function isRemixEnvironment(): boolean {
  try {
    const hostname = window.location.hostname
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'

    if (isLocalhost) {
      return false
    }

    return true
  } catch (e) {
    return true
  }
}

// Function to get development environment information (only available in dev mode)
export function getDevEnvironmentInfo(): DevEnvironmentInfo | null {
  try {
    const devInfo = (window as any).__remixDevInfo
    return devInfo || null
  } catch (e) {
    return null
  }
}

// Initialize development features
export function initializeDevelopment(): void {
  // Listen for dev info messages from the overlay
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'remix_dev_info') {
      (window as any).__remixDevInfo = event.data.data
    }
  })

  // Load performance monitoring plugin after a short delay to ensure game is ready
  setTimeout(() => {
    loadRemixPerformancePlugin()
  }, 100)
}

// Load and inject the performance monitoring plugin
function loadRemixPerformancePlugin(): void {
  // Only load in development mode
  if (process.env.NODE_ENV === 'production') {
    return
  }

  try {
    // Import and execute the plugin code directly
    const script = document.createElement('script')
    script.textContent = getPerformancePluginCode()
    document.head.appendChild(script)

    // Clean up the script element
    setTimeout(() => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }, 100)
  } catch (error) {
    // Silently fail if plugin loading fails
    console.warn('Failed to load performance plugin:', error)
  }
}

// Performance plugin code bundled directly
function getPerformancePluginCode(): string {
  return `
class RemixPerformancePlugin extends Phaser.Plugins.BasePlugin {
  constructor(pluginManager) {
    super(pluginManager);

    this.isActive = false;
    this.lastUpdateTime = 0;
    this.lastRenderTime = 0;
    this.frameCount = 0;
    this.lastReportTime = 0;
    this.reportInterval = 1000;

    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.lastFrameTime = 0;
    this.wrappedScenes = new Set();
    this.drawCallCount = 0;
  }

  init() {
    if (typeof window !== 'undefined' && window.parent !== window) {
      this.isActive = true;
      this.setupPerformanceTracking();
    }
  }

  start() {
    if (!this.isActive) return;

    this.game.events.on('prestep', this.onPreStep, this);
    this.game.events.on('step', this.onStep, this);
    this.game.events.on('postrender', this.onPostRender, this);

    this.hookRenderer();
    this.startReporting();
  }

  hookRenderer() {
    if (this.game.renderer && this.game.renderer.type === Phaser.WEBGL) {
      const renderer = this.game.renderer;

      if (renderer.pipelines) {
        const pipelines = renderer.pipelines;
        if (pipelines.list) {
          Object.values(pipelines.list).forEach(pipeline => {
            if (pipeline && pipeline.flush) {
              const originalFlush = pipeline.flush.bind(pipeline);
              pipeline.flush = function(...args) {
                this.drawCallCount++;
                return originalFlush.apply(this, args);
              }.bind(this);
            }
          });
        }
      }

      if (renderer.setBlendMode) {
        const originalSetBlendMode = renderer.setBlendMode.bind(renderer);
        renderer.setBlendMode = (blendMode) => {
          if (!renderer.pipelines || !renderer.pipelines.list) {
            this.drawCallCount++;
          }
          return originalSetBlendMode(blendMode);
        };
      }
    }
  }

  setupPerformanceTracking() {
    const self = this;
    this.wrappedScenes = new Set();

    const wrapSceneUpdate = (scene) => {
      if (!scene || !scene.update || typeof scene.update !== 'function') {
        return;
      }

      if (this.wrappedScenes.has(scene)) {
        return;
      }

      this.wrappedScenes.add(scene);
      const originalUpdate = scene.update.bind(scene);

      scene.update = function(time, delta) {
        const start = performance.now();
        const result = originalUpdate(time, delta);
        self.lastUpdateTime = performance.now() - start;
        return result;
      };
    };

    setTimeout(() => {
      this.game.scene.scenes.forEach(wrapSceneUpdate);
    }, 100);

    if (this.game.scene.events) {
      this.game.scene.events.on('start', (scene) => {
        setTimeout(() => wrapSceneUpdate(scene), 10);
      });
    }
  }

  onPreStep() {
    const now = performance.now();
    this.drawCallCount = 0;

    if (this.lastFrameTime) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimeHistory.push(frameTime);

      if (this.frameTimeHistory.length > 60) {
        this.frameTimeHistory.shift();
      }
    }

    this.lastFrameTime = now;
    this.frameStartTime = now;
  }

  onStep() {
    this.frameCount++;
  }

  onPostRender() {
    if (this.frameStartTime) {
      this.lastRenderTime = performance.now() - this.frameStartTime - this.lastUpdateTime;
    }
  }

  startReporting() {
    const report = () => {
      if (!this.isActive) return;

      const now = performance.now();

      if (now - this.lastReportTime < this.reportInterval) {
        requestAnimationFrame(report);
        return;
      }

      const performanceData = this.collectPerformanceData();

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'remix_performance_data',
          data: performanceData
        }, '*');
      }

      this.lastReportTime = now;
      this.frameCount = 0;

      requestAnimationFrame(report);
    };

    requestAnimationFrame(report);
  }

  collectPerformanceData() {
    const now = performance.now();
    const timeSinceLastReport = now - this.lastReportTime;

    const fps = timeSinceLastReport > 0
      ? Math.round((this.frameCount * 1000) / timeSinceLastReport)
      : 0;

    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;

    const memory = this.collectMemoryData();
    const rendering = this.collectRenderingData();

    return {
      timestamp: now,
      fps: Math.max(0, Math.min(fps, 120)),
      frameTime: avgFrameTime,
      updateTime: this.lastUpdateTime,
      renderTime: Math.max(0, this.lastRenderTime),
      memory,
      rendering
    };
  }

  collectMemoryData() {
    const memory = { used: 0, total: 0 };

    if (performance.memory && performance.memory.usedJSHeapSize) {
      memory.used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      memory.total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
    }

    try {
      const textureManager = this.game.textures;
      if (textureManager && textureManager.list) {
        let textureMemory = 0;
        Object.values(textureManager.list).forEach(texture => {
          if (texture && texture.source) {
            texture.source.forEach(source => {
              if (source.image) {
                textureMemory += (source.width || 0) * (source.height || 0) * 4;
              }
            });
          }
        });
        memory.textureMemory = Math.round(textureMemory / 1024 / 1024);
      }
    } catch (e) {
      // Ignore texture memory calculation errors
    }

    return memory;
  }

  collectRenderingData() {
    const rendering = {
      drawCalls: 0,
      gameObjects: 0,
      physicsBodies: 0,
      activeTweens: 0
    };

    try {
      this.game.scene.scenes.forEach(scene => {
        if (scene.sys.isActive()) {
          if (scene.children && scene.children.list) {
            rendering.gameObjects += scene.children.list.length;
          }
        }
      });

      if (this.drawCallCount > 0) {
        rendering.drawCalls = this.drawCallCount;
      } else if (rendering.gameObjects > 0) {
        rendering.drawCalls = Math.max(1, Math.ceil(rendering.gameObjects / 5));
      }

      this.game.scene.scenes.forEach(scene => {
        if (scene.sys.isActive()) {
          if (scene.physics && scene.physics.world) {
            if (scene.physics.world.bodies) {
              rendering.physicsBodies += scene.physics.world.bodies.entries.length || 0;
            } else if (scene.physics.world.staticBodies) {
              rendering.physicsBodies += (scene.physics.world.localWorld?.bodies?.length || 0);
            }
          }

          if (scene.tweens) {
            const tweens = scene.tweens.getAllTweens ? scene.tweens.getAllTweens() : [];
            rendering.activeTweens += tweens.filter(tween => tween.isPlaying()).length;
          }
        }
      });

      if (this.game.tweens) {
        const globalTweens = this.game.tweens.getAllTweens ? this.game.tweens.getAllTweens() : [];
        rendering.activeTweens += globalTweens.filter(tween => tween.isPlaying()).length;
      }

    } catch (e) {
      console.warn('RemixPerformancePlugin: Error collecting rendering data:', e);
    }

    return rendering;
  }

  stop() {
    this.isActive = false;

    if (this.game && this.game.events) {
      this.game.events.off('prestep', this.onPreStep, this);
      this.game.events.off('step', this.onStep, this);
      this.game.events.off('postrender', this.onPostRender, this);
    }

    if (this.game && this.game.scene && this.game.scene.events) {
      this.game.scene.events.off('start');
    }

    if (this.wrappedScenes) {
      this.wrappedScenes.clear();
    }
  }

  destroy() {
    this.stop();
    super.destroy();
  }
}

// Auto-register the plugin if Phaser is available
if (typeof Phaser !== 'undefined' && Phaser.Plugins) {
  const game = window.game || (typeof phaserGame !== 'undefined' ? phaserGame : null);

  if (game && game.plugins) {
    const plugin = new RemixPerformancePlugin(game.plugins);
    game.plugins.install('RemixPerformance', RemixPerformancePlugin, true);
    plugin.init();
    plugin.start();

    window.__remixPerformancePlugin = plugin;
  }
}
`
}
