import * as esbuild from "esbuild"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import * as cheerio from "cheerio"

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, "..")
const distDir = path.join(rootDir, "dist")
const srcDir = path.join(rootDir, "src")
const htmlTemplatePath = path.join(rootDir, "index.html")
const outputPath = path.join(distDir, "index.html")
const tempJsPath = path.join(distDir, "game-bundle.js")

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

// Check SDK integration status - simplified to match existing toolbar status
function checkSDKIntegration() {
  try {
    const checks = [];
    let passedChecks = 0;
    
    // Check if RemixUtils properly calls SDK functions
    const remixUtilsPath = path.join(srcDir, "utils", "RemixUtils.ts")
    if (!fs.existsSync(remixUtilsPath)) {
      return { 
        integrated: false, 
        reason: "RemixUtils.ts not found",
        checks: [],
        passedChecks: 0,
        totalChecks: 4
      }
    }
    
    const remixUtilsContent = fs.readFileSync(remixUtilsPath, "utf8")
    
    // Check for the 4 core SDK integration points (same as toolbar status)
    const hasReadyCall = remixUtilsContent.includes("FarcadeSDK.singlePlayer.actions.ready()")
    checks.push({ name: "ready", passed: hasReadyCall })
    if (hasReadyCall) passedChecks++
    
    const hasGameOverCall = remixUtilsContent.includes("FarcadeSDK.singlePlayer.actions.gameOver") ||
                            remixUtilsContent.includes("game_over") // Check for game over handling
    checks.push({ name: "game_over", passed: hasGameOverCall })
    if (hasGameOverCall) passedChecks++
    
    const hasPlayAgainHandler = remixUtilsContent.includes('FarcadeSDK.on("play_again"')
    checks.push({ name: "play_again", passed: hasPlayAgainHandler })
    if (hasPlayAgainHandler) passedChecks++
    
    const hasMuteHandler = remixUtilsContent.includes('FarcadeSDK.on("toggle_mute"')
    checks.push({ name: "toggle_mute", passed: hasMuteHandler })
    if (hasMuteHandler) passedChecks++
    
    const allChecksPass = hasReadyCall && hasGameOverCall && hasPlayAgainHandler && hasMuteHandler
    
    if (!allChecksPass) {
      const failedChecks = checks.filter(c => !c.passed).map(c => c.name)
      return { 
        integrated: false, 
        reason: `Missing SDK handlers: ${failedChecks.join(", ")}`,
        checks,
        passedChecks,
        totalChecks: 4
      }
    }
    
    return { 
      integrated: true, 
      reason: `All 4 SDK integration checks passed`,
      checks,
      passedChecks,
      totalChecks: 4
    }
  } catch (error) {
    return { 
      integrated: false, 
      reason: `Error checking SDK integration: ${error.message}`,
      checks: [],
      passedChecks: 0,
      totalChecks: 4
    }
  }
}

// Build game function - returns result object instead of exiting
export async function buildGame() {
  const startTime = Date.now()
  
  try {
    // Step 1: Bundle the TypeScript code with esbuild
    const result = await esbuild.build({
      entryPoints: [path.join(srcDir, "main.ts")],
      bundle: true,
      external: ["phaser"],
      format: "iife",
      globalName: "Game",
      outfile: tempJsPath,
      sourcemap: false,
      minify: true,
      target: ["es2020"],
      pure: ["console.log"],
      write: true,
      logLevel: "silent",
    })

    if (result.errors.length > 0) {
      return {
        success: false,
        error: "Build compilation failed",
        details: result.errors.map(err => ({
          text: err.text,
          location: err.location
        })),
        buildTime: Date.now() - startTime
      }
    }

    // Step 2: Read the bundled JS and HTML template
    let jsCode = fs.readFileSync(tempJsPath, "utf8")
    const htmlTemplate = fs.readFileSync(htmlTemplatePath, "utf8")

    // Step 3: Process the HTML template with cheerio
    const $ = cheerio.load(htmlTemplate)

    // Step 4: Create the final bundle
    jsCode = jsCode.replace(/require\(['"]phaser['"]\)/g, "window.Phaser")

    // Remove the development script tag and add our bundled code
    $('script[type="module"]').remove()
    $("body").append(`<script>${jsCode}</script>`)

    // Step 5: Process HTML but don't minify whitespace
    let htmlOutput = $.html()
    htmlOutput = htmlOutput.replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments

    // Step 6: Write the final HTML file
    fs.writeFileSync(outputPath, htmlOutput)

    // Step 7: Clean up temporary files
    if (fs.existsSync(tempJsPath)) {
      fs.unlinkSync(tempJsPath)
    }

    // Validate the output
    const htmlContent = fs.readFileSync(outputPath, "utf8")
    if (htmlContent.includes("__WEBPACK_EXTERNAL_MODULE_")) {
      return {
        success: false,
        error: "Build validation failed",
        details: [{ text: "Webpack external modules detected in output", location: null }],
        buildTime: Date.now() - startTime
      }
    }

    // Check SDK integration
    const sdkStatus = checkSDKIntegration()
    
    // Get file size
    const stats = fs.statSync(outputPath)
    
    return {
      success: true,
      code: htmlContent,
      buildTime: Date.now() - startTime,
      fileSize: stats.size,
      sdkIntegration: sdkStatus,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: [{ text: error.stack || error.message, location: null }],
      buildTime: Date.now() - startTime
    }
  }
}

// Export for use in other scripts
export { checkSDKIntegration }