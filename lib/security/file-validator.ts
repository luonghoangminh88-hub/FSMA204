/**
 * File Upload Security Validator
 * Validates file type, size, and sanitizes filenames to prevent attacks
 */

export interface FileValidationConfig {
  maxSizeBytes: number
  allowedTypes: string[]
  allowedExtensions: string[]
}

export const FileValidationPresets = {
  DOCUMENTS: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
  },
  IMAGES: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  SPREADSHEETS: {
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    allowedTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
    allowedExtensions: [".xls", ".xlsx", ".csv"],
  },
} as const

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedFilename?: string
}

/**
 * Validates a file against security requirements
 */
export function validateFile(file: File, config: FileValidationConfig): FileValidationResult {
  // Check file size
  if (file.size > config.maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${config.maxSizeBytes / (1024 * 1024)}MB`,
    }
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${config.allowedExtensions.join(", ")}`,
    }
  }

  // Check file extension
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
  if (!config.allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `File extension ${fileExtension} is not allowed. Allowed extensions: ${config.allowedExtensions.join(", ")}`,
    }
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name)

  return {
    valid: true,
    sanitizedFilename,
  }
}

/**
 * Sanitizes a filename to prevent path traversal and injection attacks
 */
export function sanitizeFilename(filename: string): string {
  // Get the file extension
  const lastDotIndex = filename.lastIndexOf(".")
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : ""

  // Remove or replace dangerous characters
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace invalid chars with underscore
    .replace(/\.+/g, "_") // Replace multiple dots with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .substring(0, 100) // Limit filename length

  // Ensure filename is not empty
  const finalName = sanitizedName || "file"

  return finalName + extension
}

/**
 * Generates a secure storage path for uploaded files
 */
export function generateSecureStoragePath(
  organizationId: string,
  userId: string,
  folder: string,
  filename: string,
): string {
  const timestamp = Date.now()
  const sanitized = sanitizeFilename(filename)
  return `${organizationId}/${folder}/${timestamp}-${userId.substring(0, 8)}-${sanitized}`
}
