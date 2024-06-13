import * as core from '@actions/core'
import * as github from '@actions/github'
import { createNewAssetVersionAndUploadBinaryResponseType } from './types'


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

export async function isPullRequest(): Promise<true | null> {
  const context = github.context

  if (context.eventName !== 'pull_request') {
    core.info('This context does not belongs to a pull request.')
    return null
  }
  return true
}
async function getPRNumber(): Promise<number | null> {
  if (!(await isPullRequest())) {
    core.info('This context does not belongs to a pull request.')
    return null
  }
  const context = github.context
  const prNumber = context.payload.pull_request?.number

  if (!prNumber) {
    core.setFailed('Pull request number is missing.')
    return null
  }
  return prNumber
}

export async function generateComment(
  githubToken: string,
  assetVersionUrl: string
): Promise<void> {
  const PRNumber = await getPRNumber()
  const context = github.context
  if (PRNumber) {
    const octokit = github.getOctokit(githubToken)

    const commentBody = [
      `**Hello**, Finite State is analyzing your files! :rocket:. \n`,
      `Please, [click here](${assetVersionUrl}) to see the progress of the analysis.`,
      `<br />\n`,
      `[Finite State](https://platform.finitestate.io/)`
    ]

    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: PRNumber,
      body: commentBody.join()
    })

    core.info(`Commented on PR #${PRNumber}`)
  }
}

export async function generateAssetVersionUrl(params: {
  assetId: string
  version: string
}): Promise<string> {
  return `https://platform.finitestate.io/artifacts/${params.assetId}/versions/${params.version}`
}
