export class AppError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status = 400,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = 'AppError';
  }
}
