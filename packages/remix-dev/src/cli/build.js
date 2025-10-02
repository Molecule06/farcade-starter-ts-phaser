import * as esbuild from "esbuild"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import * as cheerio from "cheerio"

// Get the user's project root (where the command was run)
const rootDir = process.cwd()
const distDir = path.join(rootDir, "dist")
const srcDir = path.join(rootDir, "src")
const htmlTemplatePath = path.join(rootDir, "index.html")
const outputPath = path.join(distDir, "index.html")
const tempJsPath = path.join(distDir, "game-bundle.js")

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

async function buildGame() {
  try {
    // Read package.json to get multiplayer setting
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"))
    const isMultiplayer = packageJson.multiplayer || false
    
    // Step 1: Bundle the TypeScript code with esbuild
    const result = await esbuild.build({
      entryPoints: [path.join(srcDir, "main.ts")],
      bundle: true,
      external: ["phaser"],
      format: "esm", // Use ESM to support top-level await
      outfile: tempJsPath,
      sourcemap: false,
      minify: true,
      target: ["es2022"], // Updated to support top-level await
      pure: ["console.log"], // Temporarily disabled for debugging
      define: {
        'GAME_MULTIPLAYER_MODE': JSON.stringify(isMultiplayer),
        'process.env.NODE_ENV': JSON.stringify('production')
      },
      write: true,
      logLevel: "silent",
    })

    if (result.errors.length > 0) {
      process.exit(1)
    }

    // Step 2: Read the bundled JS and HTML template
    let jsCode = fs.readFileSync(tempJsPath, "utf8")
    const htmlTemplate = fs.readFileSync(htmlTemplatePath, "utf8")

    // Step 3: Process the HTML template with cheerio
    const $ = cheerio.load(htmlTemplate)

    // Step 4: Create the final bundle by adding the Phaser script if needed
    // and replacing the module import with using the global Phaser
    // Replace any remaining references to require('phaser') with window.Phaser
    jsCode = jsCode.replace(/require\(['"]phaser['"]\)/g, "window.Phaser")

    // Remove the development script tag and add our bundled code as a module
    $('script[type="module"]').remove()
    $("body").append(`<script type="module">${jsCode}</script>`)

    // Step 5: Process HTML but don't minify whitespace
    let htmlOutput = $.html()

    // Only remove HTML comments, preserve whitespace
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
      process.exit(1)
    }
  } catch (error) {
    process.exit(1)
  }
}

// Run the build process
buildGame()
