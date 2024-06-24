import * as fs from 'fs'
import * as path from 'path'
import { createNewAssetVersionAndUploadBinaryResponseType } from '../fs/types'

export async function extractAssetVersion(
  inputString: createNewAssetVersionAndUploadBinaryResponseType
): Promise<string | null> {
  const str = inputString.launchBinaryUploadProcessing.key
  // Define a regular expression pattern to match the asset_version value
  const pattern = /asset_version=(\d+)/

  // Use pattern to find the first match in the input string
  const match = str.match(pattern)

  // Check if a match was found and extract the value
  if (match) {
    const assetVersionValue = match[1]
    return assetVersionValue
  } else {
    return null // Return null if asset version value is not found
  }
}

export async function generateAssetVersionUrl(params: {
  assetId: string
  version: string
}): Promise<string> {
  return `https://platform.finitestate.io/artifacts/${params.assetId}/versions/${params.version}`
}

/**
 * Validate and sanitize the file path to prevent directory traversal attacks.
 * @param {string} filePath - The file path to validate.
 * @returns {string} The sanitized and validated file path.
 * @throws Will throw an error if the file path is invalid.
 */
export function sanitizeFilePath(filePath: string): string {
  const resolvedPath = path.resolve(filePath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File path ${resolvedPath} does not exist.`)
  }
  return resolvedPath
}

export function sanitizeInput(input: any) {
  if (input === null || input === undefined) {
    return input // Return null or boolean undefined as-is
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input // Return number or boolean as-is
  }

  if (typeof input !== 'string') {
    return null // Reject inputs that are neither string nor number
  }

  // For string inputs:
  // Trim whitespace from both ends
  let sanitizedInput = input.trim()

  // Escape special characters that could interfere with commands or queries
  sanitizedInput = sanitizedInput.replace(/[;<>&|'"]/g, '')

  // Additional validation or whitelisting based on your specific requirements

  return sanitizedInput
}
