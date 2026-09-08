export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);

    this.name = "ApiError";
  }
}

export function badRequest(message: string) {
  return new ApiError(400, message);
}

export function unauthorized(message = "Autentikasi diperlukan.") {
  return new ApiError(401, message);
}

export function forbidden(
  message = "Anda tidak memiliki izin untuk melakukan aksi ini.",
) {
  return new ApiError(403, message);
}

export function notFound(message: string) {
  return new ApiError(404, message);
}

export function conflict(message: string) {
  return new ApiError(409, message);
}
