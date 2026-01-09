/**
 * Color utilities for terminal output
 * Uses ANSI escape codes for reliable cross-platform colored terminal output
 *
 * Note: Initially tried using Bun.color() API (https://bun.com/docs/runtime/color)
 * but the ANSI output format doesn't work reliably in Bun v1.3.0,
 * so we use direct ANSI codes instead for maximum compatibility.
 */

// ANSI color codes - reliable and universally supported
const ANSI_COLORS = {
  // Standard colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  grey: "\x1b[90m",

  // Bright colors
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  // Special
  reset: "\x1b[0m",
};

/**
 * Colorize text for terminal output
 * @param {string} text - The text to colorize
 * @param {string} colorName - Color name from ANSI_COLORS (e.g., "red", "blue", "cyan")
 * @returns {string} ANSI-colored text with reset code
 *
 * @example
 * console.log(colorize("Error!", "red"));
 * console.log(colorize("Success!", "green"));
 * console.log(colorize("Info:", "blue"), "some message");
 */
export function colorize(text, colorName) {
  const color = ANSI_COLORS[colorName] || ANSI_COLORS.reset;
  return color + text + ANSI_COLORS.reset;
}

/**
 * Common color shortcuts for consistent styling
 */
export const colors = {
  error: (text) => colorize(text, "red"),
  success: (text) => colorize(text, "green"),
  warning: (text) => colorize(text, "yellow"),
  info: (text) => colorize(text, "blue"),
  highlight: (text) => colorize(text, "cyan"),
  dim: (text) => colorize(text, "gray"),
};

/**
 * Format a header with separator lines
 * @param {string} message - Header text
 * @param {string} color - Color name (default: "cyan")
 * @param {string} separator - Separator character (default: "=")
 * @param {number} width - Width of separator line (default: 70)
 */
export function header(message, color = "cyan", separator = "=", width = 70) {
  console.log("");
  console.log(colorize(separator.repeat(width), color));
  console.log(colorize(`  ${message}`, color));
  console.log(colorize(separator.repeat(width), color));
  console.log("");
}

/**
 * Format a section with separator lines
 * @param {string} message - Section text
 * @param {string} color - Color name (default: "blue")
 * @param {string} separator - Separator character (default: "-")
 * @param {number} width - Width of separator line (default: 70)
 */
export function section(message, color = "blue", separator = "-", width = 70) {
  console.log("");
  console.log(colorize(separator.repeat(width), color));
  console.log(colorize(`  ${message}`, color));
  console.log(colorize(separator.repeat(width), color));
}
