export class CreemDataFastError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class MissingTrackingError extends CreemDataFastError {}

export class InvalidCreemSignatureError extends CreemDataFastError {}

export class UnsupportedEventError extends CreemDataFastError {}

export class TrackingCollisionError extends CreemDataFastError {}

type DataFastRequestErrorOptions = {
  retryable: boolean;
  status?: number;
  requestId?: string;
  responseBody?: string;
  cause?: unknown;
};

export class DataFastRequestError extends CreemDataFastError {
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly responseBody?: string;

  constructor(message: string, options: DataFastRequestErrorOptions) {
    super(message, { cause: options.cause });
    this.retryable = options.retryable;
    this.status = options.status;
    this.requestId = options.requestId;
    this.responseBody = options.responseBody;
  }
}
