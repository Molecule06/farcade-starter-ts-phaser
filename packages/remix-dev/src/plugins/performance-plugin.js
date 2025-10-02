/**
 * Phaser Performance Plugin for Remix Development
 * This plugin collects detailed performance metrics from within the game loop
 * and sends them to the parent frame (RemixDevOverlay) for display
 */

// Plugin definition as a string that can be dynamically injected
window.RemixPerformancePluginCode = `
class RemixPerformancePlugin extends Phaser.Plugins.BasePlugin {
  constructor(pluginManager) {
    super(pluginManager);
    
    this.isActive = false;
    this.lastUpdateTime = 0;
    this.lastRenderTime = 0;
    this.frameCount = 0;
    this.lastReportTime = 0;
    this.reportInterval = 1000; // Report every second
    
    // Performance tracking
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.lastFrameTime = 0;
    this.wrappedScenes = new Set();
    this.drawCallCount = 0;
  }
  
  init() {
    // Only activate in development mode
    if (typeof window !== 'undefined' && window.parent !== window) {
      this.isActive = true;
      this.setupPerformanceTracking();
    }
  }
  
  start() {
    if (!this.isActive) return;
    
    // Hook into game events
    this.game.events.on('prestep', this.onPreStep, this);
    this.game.events.on('step', this.onStep, this);
    this.game.events.on('postrender', this.onPostRender, this);
    
    // Hook into renderer to count draw calls
    this.hookRenderer();
    
    // Start reporting loop
    this.startReporting();
  }
  
  hookRenderer() {
    if (this.game.renderer && this.game.renderer.type === Phaser.WEBGL) {
      const renderer = this.game.renderer;
      
      // Try to hook into pipeline flushes which are actual draw calls
      if (renderer.pipelines) {
        // Get the main pipeline (usually MultiPipeline for 2D rendering)
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
      
      // Fallback: Track blend mode changes
      if (renderer.setBlendMode) {
        const originalSetBlendMode = renderer.setBlendMode.bind(renderer);
        renderer.setBlendMode = (blendMode) => {
          // Only count if we haven't tracked pipeline flushes
          if (!renderer.pipelines || !renderer.pipelines.list) {
            this.drawCallCount++;
          }
          return originalSetBlendMode(blendMode);
        };
      }
    }
  }
  
  setupPerformanceTracking() {
    // Override scene update to track update time
    const self = this;
    
    // Keep track of which scenes we've already wrapped
    this.wrappedScenes = new Set();
    
    // Function to wrap a scene's update method
    const wrapSceneUpdate = (scene) => {
      if (!scene || !scene.update || typeof scene.update !== 'function') {
        return;
      }
      
      // Check if we've already wrapped this scene
      if (this.wrappedScenes.has(scene)) {
        return;
      }
      
      // Mark this scene as wrapped
      this.wrappedScenes.add(scene);
      
      // Store the original update method
      const originalUpdate = scene.update.bind(scene);
      
      // Replace with our wrapped version
      scene.update = function(time, delta) {
        const start = performance.now();
        // Call the original update method with the scene as context
        const result = originalUpdate(time, delta);
        self.lastUpdateTime = performance.now() - start;
        return result;
      };
    };
    
    // Initial setup for existing scenes
    setTimeout(() => {
      this.game.scene.scenes.forEach(wrapSceneUpdate);
    }, 100);
    
    // Also monitor for new scenes being added
    if (this.game.scene.events) {
      this.game.scene.events.on('start', (scene) => {
        // Small delay to ensure scene is fully initialized
        setTimeout(() => wrapSceneUpdate(scene), 10);
      });
    }
  }
  
  onPreStep() {
    const now = performance.now();
    
    // Reset draw call counter for this frame
    this.drawCallCount = 0;
    
    // Calculate frame time from last frame to this frame
    if (this.lastFrameTime) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimeHistory.push(frameTime);
      
      // Keep only recent frame times
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
    // Track render time (approximate)
    if (this.frameStartTime) {
      this.lastRenderTime = performance.now() - this.frameStartTime - this.lastUpdateTime;
    }
  }
  
  startReporting() {
    const report = () => {
      if (!this.isActive) return;
      
      const now = performance.now();
      
      // Only report every interval
      if (now - this.lastReportTime < this.reportInterval) {
        requestAnimationFrame(report);
        return;
      }
      
      const performanceData = this.collectPerformanceData();
      
      // Send data to parent frame
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'remix_performance_data',
          data: performanceData
        }, '*');
      }
      
      this.lastReportTime = now;
      this.frameCount = 0; // Reset frame counter
      
      requestAnimationFrame(report);
    };
    
    requestAnimationFrame(report);
  }
  
  collectPerformanceData() {
    const now = performance.now();
    const timeSinceLastReport = now - this.lastReportTime;
    
    // Calculate FPS from frame count
    const fps = timeSinceLastReport > 0 
      ? Math.round((this.frameCount * 1000) / timeSinceLastReport)
      : 0;
    
    // Calculate average frame time
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;
    
    // Collect memory information
    const memory = this.collectMemoryData();
    
    // Collect rendering information
    const rendering = this.collectRenderingData();
    
    return {
      timestamp: now,
      fps: Math.max(0, Math.min(fps, 120)), // Cap between 0-120
      frameTime: avgFrameTime,
      updateTime: this.lastUpdateTime,
      renderTime: Math.max(0, this.lastRenderTime),
      memory,
      rendering
    };
  }
  
  collectMemoryData() {
    const memory = { used: 0, total: 0 };
    
    // Get JS heap memory (Chrome only)
    if (performance.memory && performance.memory.usedJSHeapSize) {
      memory.used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
      memory.total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024); // MB
    }
    
    // Try to get texture memory (approximate)
    try {
      const textureManager = this.game.textures;
      if (textureManager && textureManager.list) {
        let textureMemory = 0;
        Object.values(textureManager.list).forEach(texture => {
          if (texture && texture.source) {
            texture.source.forEach(source => {
              if (source.image) {
                // Rough estimate: width * height * 4 bytes per pixel
                textureMemory += (source.width || 0) * (source.height || 0) * 4;
              }
            });
          }
        });
        memory.textureMemory = Math.round(textureMemory / 1024 / 1024); // Convert to MB
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
      // Count game objects first (needed for draw call estimation)
      this.game.scene.scenes.forEach(scene => {
        if (scene.sys.isActive()) {
          // Count display list objects
          if (scene.children && scene.children.list) {
            rendering.gameObjects += scene.children.list.length;
          }
        }
      });
      
      // Get draw calls from our counter or estimate
      if (this.drawCallCount > 0) {
        rendering.drawCalls = this.drawCallCount;
      } else if (rendering.gameObjects > 0) {
        // Estimate if we don't have actual draw calls
        // Circles and primitives typically can't batch well
        rendering.drawCalls = Math.max(1, Math.ceil(rendering.gameObjects / 5));
      }
      
      // Continue counting physics bodies for remaining scenes
      this.game.scene.scenes.forEach(scene => {
        if (scene.sys.isActive()) {
          // Count physics bodies
          if (scene.physics && scene.physics.world) {
            if (scene.physics.world.bodies) {
              rendering.physicsBodies += scene.physics.world.bodies.entries.length || 0;
            } else if (scene.physics.world.staticBodies) {
              // Matter.js physics
              rendering.physicsBodies += (scene.physics.world.localWorld?.bodies?.length || 0);
            }
          }
          
          // Count active tweens
          if (scene.tweens) {
            const tweens = scene.tweens.getAllTweens ? scene.tweens.getAllTweens() : [];
            rendering.activeTweens += tweens.filter(tween => tween.isPlaying()).length;
          }
        }
      });
      
      // Global tween manager
      if (this.game.tweens) {
        const globalTweens = this.game.tweens.getAllTweens ? this.game.tweens.getAllTweens() : [];
        rendering.activeTweens += globalTweens.filter(tween => tween.isPlaying()).length;
      }
      
    } catch (e) {
      // Ignore rendering data collection errors
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
    
    // Clean up scene event listener
    if (this.game && this.game.scene && this.game.scene.events) {
      this.game.scene.events.off('start');
    }
    
    // Clear wrapped scenes tracking
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
  // Create and install the plugin
  const game = window.game || (typeof phaserGame !== 'undefined' ? phaserGame : null);
  
  if (game && game.plugins) {
    const plugin = new RemixPerformancePlugin(game.plugins);
    game.plugins.install('RemixPerformance', RemixPerformancePlugin, true);
    plugin.init();
    plugin.start();
    
    // Store reference for cleanup
    window.__remixPerformancePlugin = plugin;
  }
}
`;

// Export the plugin code for dynamic loading
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.RemixPerformancePluginCode;
}