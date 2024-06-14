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

/**
 * Validate and sanitize string inputs to prevent injection attacks.
 * @param {string} input - The input string to validate.
 * @returns {string} The sanitized input string.
 * @throws Will throw an error if the input is invalid.
 */
export function sanitizeStringInput(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error(`Invalid input: ${input}`)
  }
  return input.replace(/[^\w\s-]/gi, '') // Remove any non-alphanumeric, space, or hyphen characters
}
