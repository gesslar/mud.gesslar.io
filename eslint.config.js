import js from "@eslint/js"
import jsdoc from "eslint-plugin-jsdoc"
import uglify from "@gesslar/uglier"

export default [
  js.configs.recommended,
  jsdoc.configs["flat/recommended"],
  ...uglify({
    with: ["lints-js", "lints-jsdoc", "web"],
    overrides: {
      "lint-js": {files: "src/**/*.js"},
      "lint-jsdoc": {files: "src/**/*.js"},
      "browser": {files: "src/**/*.js"},
    }
  })
]
