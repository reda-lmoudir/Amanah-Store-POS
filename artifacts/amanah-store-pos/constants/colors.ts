/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#10251B',
    tint: '#18B957',

    // Core surfaces
    background: '#F3F8F5',
    foreground: '#10251B',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#10251B',

    // Primary action color (buttons, links, active states)
    primary: '#18B957',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E9F2ED',
    secondaryForeground: '#10251B',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#E9F2ED',
    mutedForeground: '#6B7D73',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#DDF5E7',
    accentForeground: '#11773B',

    // Destructive actions (delete, error states)
    destructive: '#E95A5A',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DDE8E1',
    input: '#DDE8E1',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
