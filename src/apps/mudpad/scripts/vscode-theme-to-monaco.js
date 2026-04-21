/**
 * Converts a VS Code color theme JSON object into a Monaco Editor
 * IStandaloneThemeData object suitable for monaco.editor.defineTheme().
 *
 * VS Code themes have three relevant sections:
 *   - `type`        — "dark" | "light" | "hc" → maps to Monaco `base`
 *   - `colors`      — flat object of editor UI color keys (e.g.
 *                      "editor.background", "editorCursor.foreground").
 *                      Monaco accepts these keys directly.
 *   - `tokenColors` — array of TextMate scope rules:
 *                      { scope: string|string[], settings: { foreground, fontStyle } }
 *                      Monaco wants these as `rules`:
 *                      { token: string, foreground: string, fontStyle: string }
 *                      Note: Monaco rules omit the leading "#" on hex colors.
 *
 * Usage with Monaco:
 * ```js
 * import {init} from "https://esm.sh/modern-monaco"
 * import {vsToMonaco} from "./vscode-theme-to-monaco.js"
 *
 * const monaco = await init()
 * const vscodeTheme = await fetch("/path/to/theme.color-theme.json")
 *   .then(r => r.json())
 *
 * const monacoTheme = vsToMonaco(vscodeTheme)
 * monaco.editor.defineTheme("my-theme", monacoTheme)
 *
 * // Then use it:
 * const editor = monaco.editor.create(container, { theme: "my-theme", ... })
 * // Or switch an existing editor:
 * monaco.editor.setTheme("my-theme")
 * ```
 *
 * Wiring this up in sassy:
 *   The conversion is purely structural — no color math needed since sassy
 *   already resolves all color functions at build time. A sassy output format
 *   would just need to:
 *     1. Compile the YAML to the VS Code JSON as usual
 *     2. Run it through this transform
 *     3. Write the result as a .monaco-theme.json
 *   The transform itself is ~30 lines, so it could live as a post-process
 *   step or a dedicated output formatter alongside the existing VS Code one.
 *
 * @param {object} vscodeTheme - A parsed VS Code .color-theme.json object
 * @param {object} [options]
 * @param {string} [options.name] - Theme name override (defaults to vscodeTheme.name)
 * @returns {object} Monaco IStandaloneThemeData
 */
export function vsToMonaco(vscodeTheme, _options = {}) {
  const baseMap = {
    light: "vs",
    dark: "vs-dark",
    hc: "hc-black",
    "hc-light": "hc-light",
  }

  const base = baseMap[vscodeTheme.type] || "vs-dark"

  // Convert tokenColors (TextMate scopes) → Monaco rules.
  // VS Code scope can be a comma-separated string or an array.
  // Monaco wants one rule per token, with foreground stripped of "#".
  const rules = (vscodeTheme.tokenColors || []).flatMap(entry => {
    const scopes = Array.isArray(entry.scope)
      ? entry.scope
      : (entry.scope || "").split(",").map(s => s.trim()).filter(Boolean)

    const settings = entry.settings || {}

    return scopes.map(scope => {
      const rule = {token: scope}
      if(settings.foreground)
        rule.foreground = settings.foreground.replace(/^#/, "")

      if(settings.background)
        rule.background = settings.background.replace(/^#/, "")

      if(settings.fontStyle)
        rule.fontStyle = settings.fontStyle

      return rule
    })
  })

  // Colors pass through directly — Monaco uses the same keys as VS Code
  // for the subset it supports (editor.background, editor.foreground, etc.)
  // Unsupported keys are simply ignored by Monaco.
  const colors = vscodeTheme.colors || {}

  return {
    base,
    inherit: true,
    rules,
    colors,
  }
}
