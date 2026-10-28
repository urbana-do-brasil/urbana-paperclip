import type { ApiErrorMessage } from "@paperclipai/shared/api-error-messages";

export class HttpError extends Error {
  status: number;
  details?: unknown;
  presentation?: ApiErrorMessage;

  constructor(status: number, message: string, details?: unknown, presentation?: ApiErrorMessage) {
    super(message);
    this.status = status;
    this.details = details;
    this.presentation = presentation;
  }
}

export function badRequest(message: string, details?: unknown) {
  return new HttpError(400, message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message);
}

export function forbidden(message = "Forbidden", details?: unknown) {
  return new HttpError(403, message, details);
}

export function notFound(message = "Not found", details?: unknown) {
  return new HttpError(404, message, details);
}

export function conflict(message: string, details?: unknown) {
  return new HttpError(409, message, details);
}

export function payloadTooLarge(message: string, details?: unknown) {
  return new HttpError(413, message, details);
}

export function unsupportedMediaType(message: string, details?: unknown) {
  return new HttpError(415, message, details);
}

export function unprocessable(message: string, details?: unknown) {
  return new HttpError(422, message, details);
}

export function tooManyRequests(message = "Too many requests", details?: unknown) {
  return new HttpError(429, message, details);
}
