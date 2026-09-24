/**
 * Title screens of every game, in arcade order. Kept in a side-effect-free module (Arcade.tsx
 * preloads its models at import time) so the Fragments-only build can leave the arcade out.
 */
export const TITLE_URLS = /* @__PURE__ */ Object.values(import.meta.glob('../assets/titles/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default', query: '?url' })) as string[]
