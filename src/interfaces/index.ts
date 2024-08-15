import { Errors } from "../constants";

export class CustomError extends Error {
  public code: Errors;
  public error: Error;
  public extra: Record<any, any>;

  constructor(error: Error, code?: Errors, extra?: Record<any, any>) {
    super();
    this.error = error;
    this.code = code || Errors.UNKNOWN;
    this.extra = extra || {};
  }
}

export default CustomError;
