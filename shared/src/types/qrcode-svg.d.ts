declare module "qrcode-svg" {
  export interface QrCodeSvgOptions {
    content: string;
    padding?: number;
    width?: number;
    height?: number;
    typeNumber?: number;
    color?: string;
    background?: string;
    ecl?: "L" | "M" | "Q" | "H";
    join?: boolean;
    pretty?: boolean;
    container?: "svg-viewbox" | "svg" | "g" | "none";
    xmlDeclaration?: boolean;
  }

  export default class QRCode {
    constructor(options: QrCodeSvgOptions | string);
    svg(options?: Partial<QrCodeSvgOptions>): string;
  }
}
