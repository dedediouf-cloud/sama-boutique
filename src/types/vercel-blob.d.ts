// Global ambient declaration for @vercel/blob
// This file exists to satisfy TypeScript during Vercel builds
// even when the package is installed but types are not immediately resolved.

declare module "@vercel/blob" {
  export interface PutBlobResult {
    url: string;
    pathname: string;
    contentType?: string;
    contentDisposition?: string;
  }

  export interface PutOptions {
    access: "public";
    contentType?: string;
    addRandomSuffix?: boolean;
    cacheControlMaxAge?: number;
  }

  export function put(
    pathname: string,
    body:
      | string
      | Buffer
      | ArrayBuffer
      | Uint8Array
      | Blob
      | File
      | NodeJS.ReadableStream,
    options: PutOptions
  ): Promise<PutBlobResult>;

  export const list: any;
  export const del: any;
  export const head: any;
}