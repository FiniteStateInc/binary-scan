import cp from 'child_process'
import { runPython } from '../src/python'

jest.mock('child_process')
jest.mock('../src/python', () => {
  return {
    ...jest.requireActual('../src/python'),
    getInputs: jest.fn().mockResolvedValue({
      INPUT_FINITE_STATE_CLIENT_ID: 'client_id',
      INPUT_FINITE_STATE_SECRET: 'client_secret',
      INPUT_FINITE_STATE_ORGANIZATION_CONTEXT: 'org_context',
      INPUT_ASSET_ID: 'asset_id',
      INPUT_VERSION: 'version',
      INPUT_FILE_PATH: 'file_path',
      INPUT_QUICK_SCAN: true,

      // non required parameters:
      INPUT_BUSINESS_UNIT_ID: 'business_unit',
      INPUT_CREATED_BY_USER_ID: 'created_by_user_id',
      INPUT_PRODUCT_ID: 'product_id',
      INPUT_ARTIFACT_DESCRIPTION: 'artifact_description',
      INPUT_AUTOMATIC_COMMENT: 'automatic_comment',
      INPUT_GITHUB_TOKEN: 'github_token'
    })
  }
})

describe('main', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should execute Python script correctly', async () => {
    // Mock stdout and stderr event emitters

    const mockStdoutOn = jest
      .fn()
      .mockImplementation(
        (event: string, callback: (data: unknown) => void) => {
          if (event === 'data') {
            callback('Mock stdout data')
          }
        }
      )
    const mockStderrOn = jest
      .fn()
      .mockImplementation(
        (event: string, callback: (data: unknown) => void) => {
          if (event === 'data') {
            callback('Mock stderr data')
          }
        }
      )

    // Mock spawn to return a mock ChildProcess with mocked stdout and stderr
    const mockSpawn = jest.spyOn(cp, 'spawn').mockReturnValue({
      stdout: { on: mockStdoutOn },
      stderr: { on: mockStderrOn }
    } as unknown as cp.ChildProcess) // Cast to ChildProcess

    await runPython()
    expect(mockSpawn).toHaveBeenCalledWith(
      'python',
      expect.arrayContaining([expect.stringContaining('upload_binary.py')]),
      expect.objectContaining({
        shell: true,
        env: expect.any(Object) // Adjust as needed for your test
      })
    )

    expect(mockStdoutOn).toHaveBeenCalled()
    expect(mockStderrOn).toHaveBeenCalled()
  })
})
