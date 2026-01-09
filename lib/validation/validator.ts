import { type z, ZodError } from "zod"
import { NextResponse } from "next/server"

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  details?: Array<{ field: string; message: string }>
}

/**
 * Validate request body with Zod schema
 * Returns formatted validation result
 */
export function validateRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): ValidationResult<T> {
  try {
    const validatedData = schema.parse(body)
    return {
      success: true,
      data: validatedData,
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }))
      return {
        success: false,
        error: "Validation failed",
        details,
      }
    }
    return {
      success: false,
      error: "Invalid input data",
    }
  }
}

/**
 * Middleware-style validator that returns NextResponse on error
 * Usage: const result = await validateRequest(schema, body)
 *        if (result instanceof NextResponse) return result
 *        // Use result.data safely
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): Promise<ValidationResult<T> | NextResponse> {
  const result = validateRequestBody(schema, body)

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
        details: result.details,
      },
      { status: 400 },
    )
  }

  return result
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: URLSearchParams): ValidationResult<T> {
  const paramsObject = Object.fromEntries(params.entries())
  return validateRequestBody(schema, paramsObject)
}

/**
 * Sanitize error message for production
 * Prevents information disclosure through error messages
 */
export function sanitizeError(error: unknown): string {
  // In production, return generic error messages
  // In development, you can return more detailed errors
  if (process.env.NODE_ENV === "production") {
    return "An error occurred. Please try again."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unknown error occurred"
}
