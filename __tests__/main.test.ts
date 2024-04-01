/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */
import * as core from '@actions/core'
import { run } from '../src/main' // Assuming your main file is named 'main.ts'
import * as python from '../src/python'
jest.mock('@actions/core') // Mock the '@actions/core' module

jest.mock('../src/python')
const pythonMocked = jest.mocked(python)

const debugMock = jest.spyOn(core, 'debug').mockImplementation()

describe('Main Action', () => {
  beforeEach(() => {
    jest.clearAllMocks() // Clear mock calls before each test
  })

  it('should run the main function successfully', async () => {
    // Mock runPython to resolve successfully
    pythonMocked.runPython.mockResolvedValue([])
    await run()

    expect(core.debug).toHaveBeenCalledWith(
      expect.stringMatching(/^Starting execute python upload binary.*/)
    )
    expect(core.debug).toHaveBeenCalledWith(
      expect.stringMatching(/^Finish execute python upload binary.*/)
    )

    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should handle errors and fail the workflow', async () => {
    // Mock runPython to reject with an error
    pythonMocked.runPython.mockRejectedValue(
      new Error('Python execution failed')
    )
    await run()

    // Assert that core.debug was called with the expected error message
    expect(debugMock).toHaveBeenCalledWith(
      expect.stringContaining('Error executing python upload binary')
    )

    // Assert that core.setFailed was called with the correct error message
    expect(core.setFailed).toHaveBeenCalledWith('Python execution failed')
  })
})
