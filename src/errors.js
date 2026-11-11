export class HttpError extends Error {
  constructor(status, message, code, fields) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    const body = { message: error.message, code: error.code };
    if (error.fields) body.fields = error.fields;
    res.status(error.status).json(body);
    return;
  }

  if (error?.type === "entity.parse.failed") {
    res.status(400).json({
      message: "Request body must be JSON.",
      code: "invalid_json",
    });
    return;
  }

  if (error?.type === "entity.too.large" || error?.status === 413) {
    res.status(413).json({
      message: "Request body is too large.",
      code: "payload_too_large",
    });
    return;
  }

  if (
    error?.name === "MongoServerSelectionError" ||
    error?.name === "MongoNetworkTimeoutError" ||
    error?.name === "MongoNetworkError"
  ) {
    res.status(503).json({
      message: "Database unavailable. Start MongoDB and try again.",
      code: "unavailable",
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    message: "Something went wrong.",
    code: "internal_error",
  });
}
