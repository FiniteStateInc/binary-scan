import * as core from '@actions/core'
import { runPython } from './python'
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug(
      `Starting execute python upload binary ${new Date().toTimeString()}`
    )
    await runPython()

    core.debug(
      `Finish execute python upload binary ${new Date().toTimeString()}`
    )
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.debug(`Error executing python upload binary ${JSON.stringify(error)}`)
    if (error instanceof Error) core.setFailed(error.message)
  }
}
