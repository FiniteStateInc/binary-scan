import * as core from '@actions/core'
import { uploadBinary } from './upload_binary'
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug(
      `Starting execute upload binary ${new Date().toTimeString()}`
    )
    await uploadBinary()

    core.debug(
      `Finish execute upload binary ${new Date().toTimeString()}`
    )
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.debug(`Error executing upload binary ${JSON.stringify(error)}`)
    if (error instanceof Error) core.setFailed(error.message)
  }
}
