import * as core from '@actions/core'
import getAuthToken from './fs_token'
import {
  UploadMethod,
  createNewAssetVersionAndUploadBinary,
  createNewAssetVersionAndUploadBinaryParams
} from './fs_main'
import {
  extractAssetVersion,
  generateAssetVersionUrl,
  generateComment,
  isPullRequest
} from './utils'
import {
  createNewAssetVersionAndUploadBinaryResponseType,
  githubInputParamsType
} from './types'

export async function getInputs(): Promise<githubInputParamsType> {
  return {
    inputFiniteStateClientId: core.getInput('FINITE-STATE-CLIENT-ID', {
      required: true
    }),
    inputFiniteStateSecret: core.getInput('FINITE-STATE-SECRET', {
      required: true
    }),
    inputFiniteStateOrganizationContext: core.getInput(
      'FINITE-STATE-ORGANIZATION-CONTEXT',
      { required: true }
    ),
    inputAssetId: core.getInput('ASSET-ID', { required: true }),
    inputVersion: core.getInput('VERSION', { required: true }),
    inputFilePath: core.getInput('FILE-PATH', { required: true }),
    inputQuickScan: core.getInput('QUICK-SCAN'),

    // non required parameters:
    inputBusinessUnitId: core.getInput('BUSINESS-UNIT-ID'),
    inputCreatedByUserId: core.getInput('CREATED-BY-USER-ID'),
    inputProductId: core.getInput('PRODUCT-ID'),
    inputArtifactDescription: core.getInput('ARTIFACT-DESCRIPTION'),
    inputAutomaticComment: core.getInput('AUTOMATIC-COMMENT'),
    inputGithubToken: core.getInput('GITHUB-TOKEN')
  }
}

export async function uploadBinary(): Promise<
  createNewAssetVersionAndUploadBinaryResponseType | undefined
> {
  const envVariables = await getInputs()
  core.setSecret('FINITE-STATE-CLIENT-ID')
  core.setSecret('FINITE-STATE-SECRET')
  core.setSecret('FINITE-STATE-ORGANIZATION-CONTEXT')

  const clientId = envVariables.inputFiniteStateClientId
  const clientSecret = envVariables.inputFiniteStateSecret
  const organizationContext = envVariables.inputFiniteStateOrganizationContext
  const automaticComment = envVariables.inputAutomaticComment
  const githubToken = envVariables.inputGithubToken

  const params: createNewAssetVersionAndUploadBinaryParams = {
    assetId: envVariables.inputAssetId,
    version: envVariables.inputVersion,
    filePath: envVariables.inputFilePath,
    createdByUserId: envVariables.inputCreatedByUserId,
    businessUnitId: envVariables.inputBusinessUnitId,
    productId: envVariables.inputProductId,
    artifactDescription: envVariables.inputArtifactDescription,
    quickScan: envVariables.inputQuickScan ? true : false,
    uploadMethod: UploadMethod.GITHUB_INTEGRATION
  }
  core.info('Starting - Authentication')
  let token: string | undefined
  try {
    token = await getAuthToken(clientId, clientSecret)
  } catch (error) {
    core.setFailed(
      `Caught an exception trying to get and auth token on Finite State: ${error}`
    )
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
      }

      const assetVersionUrl = await generateAssetVersionUrl({assetId: params.assetId, version: assetVersion as string})
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
