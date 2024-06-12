import * as path from 'path'
import * as cp from 'child_process'
import * as core from '@actions/core'
import getAuthToken from './fs_token'
import { createNewAssetVersionAndUploadBinary } from './fs_main'

export async function getInputs(): Promise<any> {
  return {
    inputFiniteStateClientId: core.getInput('FINITE-STATE-CLIENT-ID'),
    inputFiniteStateSecret: core.getInput('FINITE-STATE-SECRET'),
    inputFiniteStateOrganizationContext: core.getInput(
      'FINITE-STATE-ORGANIZATION-CONTEXT'
    ),
    inputAssetId: core.getInput('ASSET-ID'),
    inputVersion: core.getInput('VERSION'),
    inputFilePath: core.getInput('FILE-PATH'),
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

export async function uploadBinary(): Promise<string[]> {
  const envVariables = await getInputs();

  const clientId = envVariables.inputFiniteStateClientId;
  const clientSecret = envVariables.inputFiniteStateSecret;
  const organizationContext = envVariables.inputFiniteStateOrganizationContext;

  const automaticComment = envVariables.inputAutomaticComment;
  const githubToken = envVariables.inputGithubToken;

  const params = {
    assetId: envVariables.inputAssetId,
    version: envVariables.inputVersion,
    filePath: envVariables.inputFilePath,
    createdByUserId: envVariables.inputCreatedByUserId,
    businessUnitId: envVariables.inputBusinessUnitId,
    productId: envVariables.inputProductId,
    artifactDescription: envVariables.inputArtifactDescription,
    quickScan: envVariables.inputQuickScan
  }

  const token = await getAuthToken(clientId, clientSecret)
  const response = await createNewAssetVersionAndUploadBinary(
    token,
    organizationContext,
    params
  )
  
  return response
}
