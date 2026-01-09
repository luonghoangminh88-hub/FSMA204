/**
 * Secure Error Handler
 * Provides safe error responses that don't leak sensitive information to clients
 * while maintaining detailed logs for debugging
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_TOKEN = "INVALID_TOKEN",
  AUTH_REQUIRED = "AUTH_REQUIRED", // Add AUTH_REQUIRED alias for backwards compatibility with existing code

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Resource
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // Operations
  OPERATION_FAILED = "OPERATION_FAILED",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // File Upload
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",

  // Generic
  INTERNAL_ERROR = "INTERNAL_ERROR",
  BAD_REQUEST = "BAD_REQUEST",
}

interface ErrorResponse {
  error: string
  code?: ErrorCode
  details?: any
}

interface ErrorLogContext {
  userId?: string
  organizationId?: string
  endpoint?: string
  method?: string
  [key: string]: any
}

/**
 * Logs error with context for debugging while keeping sensitive data server-side
 */
export function logError(error: any, context?: ErrorLogContext): void {
  const timestamp = new Date().toISOString()
  const logPrefix = "[Security Error Handler]"

  // Build log message with context
  const contextStr = context ? JSON.stringify(context) : "No context"

  console.error(`${logPrefix} ${timestamp}`, {
    message: error.message,
    stack: error.stack,
    context: contextStr,
    errorType: error.constructor.name,
  })
}

/**
 * Handles errors safely and returns appropriate NextResponse
 */
export function handleError(error: any, context?: ErrorLogContext): NextResponse {
  // Log full error details server-side
  logError(error, context)

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: ErrorCode.VALIDATION_ERROR,
        details: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      } as ErrorResponse,
      { status: 400 },
    )
  }

  // Handle known application errors
  if (error.code && Object.values(ErrorCode).includes(error.code)) {
    const statusCode = getStatusCodeFromErrorCode(error.code)
    return NextResponse.json(
      {
        error: error.message || "An error occurred",
        code: error.code,
      } as ErrorResponse,
      { status: statusCode },
    )
  }

  // Handle Supabase/Postgres errors
  if (error.code && typeof error.code === "string") {
    // PostgreSQL error codes
    if (error.code.startsWith("23")) {
      // Integrity constraint violations
      return NextResponse.json(
        {
          error: "Data constraint violation",
          code: ErrorCode.CONFLICT,
        } as ErrorResponse,
        { status: 409 },
      )
    }
  }

  // Default: Return generic error without leaking details
  return NextResponse.json(
    {
      error: "An unexpected error occurred. Please try again later.",
      code: ErrorCode.INTERNAL_ERROR,
    } as ErrorResponse,
    { status: 500 },
  )
}

/**
 * Creates a custom application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode = 500,
  ) {
    super(message)
    this.name = "AppError"
  }
}

/**
 * Maps error codes to HTTP status codes
 */
function getStatusCodeFromErrorCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.INVALID_TOKEN]: 401,
    [ErrorCode.AUTH_REQUIRED]: 401, // Add AUTH_REQUIRED alias for backwards compatibility with existing code
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.ALREADY_EXISTS]: 409,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.OPERATION_FAILED]: 500,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [ErrorCode.FILE_TOO_LARGE]: 413,
    [ErrorCode.INVALID_FILE_TYPE]: 400,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.BAD_REQUEST]: 400,
  }

  return statusMap[code] || 500
}

/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: Partial<ErrorLogContext>,
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error: any) {
      const request = args[0] as Request
      const fullContext: ErrorLogContext = {
        ...context,
        endpoint: request.url,
        method: request.method,
      }
      return handleError(error, fullContext)
    }
  }) as T
}
