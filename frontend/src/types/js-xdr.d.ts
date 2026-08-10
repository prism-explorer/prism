declare module "@stellar/js-xdr" {
  export class XdrReader {
    constructor(buffer: Buffer | Uint8Array);
    eof: boolean;
  }
}
