/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

declare module '*?progressive' {
  const value: Array<{
    src: string;
    width: number;
    height: number;
    format: string;
  }>;
  export default value;
}
