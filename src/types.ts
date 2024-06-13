export type createNewAssetVersionAndUploadBinaryResponseType = {
  launchBinaryUploadProcessing: {
    key: string
  }
}

export type githubInputParamsType = {
  inputFiniteStateClientId: string
  inputFiniteStateSecret: string
  inputFiniteStateOrganizationContext: string
  inputAssetId: string
  inputVersion: string
  inputFilePath: string
  inputQuickScan: string
  inputBusinessUnitId: string
  inputCreatedByUserId: string
  inputProductId: string
  inputArtifactDescription: string
  inputAutomaticComment: string
  inputGithubToken: string
}
