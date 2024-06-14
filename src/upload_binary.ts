import * as core from '@actions/core'
import getAuthToken from './lib/fs/fs_token'
import {
  UploadMethod,
  createNewAssetVersionAndUploadBinary,
  createNewAssetVersionAndUploadBinaryParams
} from './lib/fs/fs_main'
import {
  extractAssetVersion,
  generateAssetVersionUrl,
  sanitizeFilePath,
  sanitizeStringInput
} from './lib/utils/utils'
import {
  generateComment,
  githubInputParamsType,
  isPullRequest
} from './lib/utils/github_utils'
import { createNewAssetVersionAndUploadBinaryResponseType } from './lib/fs/types'

export async function getInputs(): Promise<githubInputParamsType> {
  return {
    inputFiniteStateClientId: sanitizeStringInput(
      core.getInput('FINITE-STATE-CLIENT-ID', {
        required: true
      })
    ),
    inputFiniteStateSecret: sanitizeStringInput(
      core.getInput('FINITE-STATE-SECRET', {
        required: true
      })
    ),
    inputFiniteStateOrganizationContext: sanitizeStringInput(
      core.getInput('FINITE-STATE-ORGANIZATION-CONTEXT', { required: true })
    ),
    inputAssetId: sanitizeStringInput(
      core.getInput('ASSET-ID', { required: true })
    ),
    inputVersion: sanitizeStringInput(
      core.getInput('VERSION', { required: true })
    ),
    inputFilePath: sanitizeFilePath(
      core.getInput('FILE-PATH', { required: true })
    ),
    inputQuickScan: core.getBooleanInput('QUICK-SCAN'),

    // non required parameters:
    inputBusinessUnitId: sanitizeStringInput(core.getInput('BUSINESS-UNIT-ID')),
    inputCreatedByUserId: sanitizeStringInput(
      core.getInput('CREATED-BY-USER-ID')
    ),
    inputProductId: sanitizeStringInput(core.getInput('PRODUCT-ID')),
    inputArtifactDescription: sanitizeStringInput(
      core.getInput('ARTIFACT-DESCRIPTION')
    ),
    inputAutomaticComment: core.getBooleanInput('AUTOMATIC-COMMENT'),
    inputGithubToken: sanitizeStringInput(core.getInput('GITHUB-TOKEN'))
  }
}

export async function uploadBinary(): Promise<
  createNewAssetVersionAndUploadBinaryResponseType | undefined
> {
  const inputVariables = await getInputs()
  core.setSecret('FINITE-STATE-CLIENT-ID')
  core.setSecret('FINITE-STATE-SECRET')
  core.setSecret('FINITE-STATE-ORGANIZATION-CONTEXT')

  const {
    inputFiniteStateClientId: clientId,
    inputFiniteStateSecret: clientSecret,
    inputFiniteStateOrganizationContext: organizationContext,
    inputAutomaticComment: automaticComment,
    inputGithubToken: githubToken,
    inputAssetId: assetId,
    inputVersion: version,
    inputFilePath: filePath,
    inputCreatedByUserId: createdByUserId,
    inputBusinessUnitId: businessUnitId,
    inputProductId: productId,
    inputArtifactDescription: artifactDescription,
    inputQuickScan: quickScan
  } = inputVariables

  const params: createNewAssetVersionAndUploadBinaryParams = {
    assetId,
    version,
    filePath,
    createdByUserId,
    businessUnitId,
    productId,
    artifactDescription,
    quickScan,
    uploadMethod: UploadMethod.GITHUB_INTEGRATION
  }
  console.log(params)
  core.info('Starting - Authentication')
  let token: string | undefined
  try {
    token = await getAuthToken(clientId, clientSecret)
  } catch (error) {
    core.setFailed(
      `Caught an exception trying to get and auth token on Finite State: ${error}`
    )
    core.setOutput('error', error)
  }
  if (token) {
    try {
      const response = await createNewAssetVersionAndUploadBinary(
        token,
        organizationContext,
        params
      )
      core.info('File uploaded')
      core.setOutput('response', response)

      const assetVersion = await extractAssetVersion(response)
      if (!assetVersion) {
        core.setFailed(`Response from Finite state API invalid: ${response}`)
        core.setOutput('error', assetVersion)
      }

      const assetVersionUrl = await generateAssetVersionUrl({
        assetId: params.assetId,
        version: assetVersion as string
      })
      core.setOutput('asset-version-url', response)
      core.info(`Asset version URL: ${assetVersionUrl}`)

      if (!automaticComment) {
        core.info('Automatic comment disabled')
      } else {
        if (await isPullRequest()) {
          core.info('Automatic comment enabled. Generating comment...')
          generateComment(githubToken, assetVersionUrl)
        } else {
          core.info(
            "Automatic comment enabled. But this isn't a pull request. Skip generating comment..."
          )
        }
      }
      return response
    } catch (error) {
      core.setOutput('error', error)
      core.setFailed(
        `Caught a ValueError trying to create new asset version and upload binary: ${error}`
      )
    }
  }
}
