import { Errors } from "../constants";

export class CustomError extends Error {
  public code: Errors;
  public error: Error;

  constructor(error: Error, code: Errors, name?: string) {
    super();
    this.name = name || this.constructor.name;
    this.code = code;
    this.error = error;
    Error.captureStackTrace(this, this.constructor); // Captures the stack trace
  }
}

export default CustomError;
