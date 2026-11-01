/** Side-effect stylesheet import used only by the web preview. */
declare module '*.css';

/** Bundled font files (assets/fonts), resolved by Metro to an asset module id. */
declare module '*.ttf' {
  const module: number;
  export default module;
}
