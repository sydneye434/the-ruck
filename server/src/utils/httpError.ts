export class HttpError extends Error {
  public statusCode: number;
  public code: string;

  constructor(opts: { statusCode: number; message: string; code: string }) {
    super(opts.message);
    this.statusCode = opts.statusCode;
    this.code = opts.code;
  }
}

