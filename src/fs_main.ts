import { ALL_ASSETS } from './fs_queries'
import axios, { AxiosResponse } from 'axios'
import * as fs from 'fs'

export enum UploadMethod {
  WEB_APP_UI = 'WEB_APP_UI',
  API = 'API',
  GITHUB_INTEGRATION = 'GITHUB_INTEGRATION',
  AZURE_DEVOPS_INTEGRATION = 'AZURE_DEVOPS_INTEGRATION'
}

const API_URL = 'https://platform.finitestate.io/api/v1/graphql'
const AUDIENCE = 'https://platform.finitestate.io/api/v1/graphql'
const TOKEN_URL = 'https://platform.finitestate.io/api/v1/auth/token'

async function uploadFileForBinaryAnalysis(
  token: string,
  organizationContext: string,
  params: {
    testId: string | null
    filePath: string | null
    chunkSize?: number
    quickScan?: boolean
  }
): Promise<any> {
  const {
    chunkSize = 1024 * 1024 * 64,
    quickScan = false,
    testId = null,
    filePath = null
  } = params
  if (!testId) {
    throw new Error('Test Id is required')
  }
  if (!filePath) {
    throw new Error('File Path is required')
  }

  const startQuery = `
    mutation Start($testId: ID!) {
        startMultipartUploadV2(testId: $testId) {
            uploadId
            key
        }
    }
    `

  let response = await sendGraphqlQuery(
    token,
    organizationContext,
    startQuery,
    { testId }
  )

  const uploadId = response.data.startMultipartUploadV2.uploadId
  const uploadKey = response.data.startMultipartUploadV2.key

  let i = 1
  const partData: { ETag: string; PartNumber: number }[] = []
  for await (const chunk of fileChunks(filePath, chunkSize)) {
    const partQuery = `
        mutation GenerateUploadPartUrl($partNumber: Int!, $uploadId: ID!, $uploadKey: String!) {
            generateUploadPartUrlV2(partNumber: $partNumber, uploadId: $uploadId, uploadKey: $uploadKey) {
                key
                uploadUrl
            }
        }
        `

    response = await sendGraphqlQuery(token, organizationContext, partQuery, {
      partNumber: i,
      uploadId,
      uploadKey
    })

    const chunkUploadUrl = response.data.generateUploadPartUrlV2.uploadUrl

    response = await uploadBytesToUrl(chunkUploadUrl, chunk)

    partData.push({
      ETag: response.headers.etag,
      PartNumber: i
    })

    i++
  }

  const completeQuery = `
    mutation CompleteMultipartUpload($partData: [PartInput!]!, $uploadId: ID!, $uploadKey: String!) {
        completeMultipartUploadV2(partData: $partData, uploadId: $uploadId, uploadKey: $uploadKey) {
            key
        }
    }
    `

  response = await sendGraphqlQuery(token, organizationContext, completeQuery, {
    partData,
    uploadId,
    uploadKey
  })

  const key = response.data.completeMultipartUploadV2.key

  let launchQuery = `
    mutation LaunchBinaryUploadProcessing($key: String!, $testId: ID!) {
        launchBinaryUploadProcessing(key: $key, testId: $testId) {
            key
        }
    }
    `

  const variables: any = { key, testId }
  if (quickScan) {
    launchQuery = `
        mutation LaunchBinaryUploadProcessing($key: String!, $testId: ID!, $configurationOptions: [BinaryAnalysisConfigurationOption]) {
            launchBinaryUploadProcessing(key: $key, testId: $testId, configurationOptions: $configurationOptions) {
                key
            }
        }
        `
    variables.configurationOptions = ['QUICK_SCAN']
  }

  response = await sendGraphqlQuery(
    token,
    organizationContext,
    launchQuery,
    variables
  )

  return response.data
}

async function uploadBytesToUrl(
  url: string,
  bytes: Buffer
): Promise<AxiosResponse> {
  const response = await axios.put(url, bytes)

  if (response.status === 200) {
    return response
  } else {
    throw new Error(`Error: ${response.status} - ${response.statusText}`)
  }
}
/*async function uploadBytesToUrl(url: string, chunk: Buffer): Promise<any> {
    try {
        const response = await axios.put(url, chunk, {
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        });

        return response;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(`Upload to URL failed: ${error.response.statusText}`);
        } else {
            throw new Error(`Upload to URL failed: ${error.message}`);
        }
    }
}*/

async function* fileChunks(
  filePath: string,
  chunkSize: number = 1024 * 1024 * 64
): AsyncGenerator<Buffer> {
  const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize })

  try {
    for await (const chunk of fileStream) {
      yield chunk
    }
  } catch (error: any) {
    // Handle or propagate the error
    throw new Error(`Error reading file: ${error.message}`)
  }
}

async function sendGraphqlQuery(
  token: string,
  organizationContext: string,
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  /**
   * Send a GraphQL query to the API
   *
   * @param token - Auth token. This is the token returned by getAuthToken(). Just the token, do not include "Bearer" in this string, that is handled inside the method.
   * @param organizationContext - Organization context. This is provided by the Finite State API management. It looks like "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
   * @param query - The GraphQL query string
   * @param variables - Variables to be used in the GraphQL query, by default null
   * @returns - Response JSON
   * @throws - If the response status code is not 200
   */
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'Organization-Context': organizationContext
  }

  const data = {
    query: query,
    variables: variables
  }

  try {
    const response: AxiosResponse = await axios.post(API_URL, data, { headers })

    if (response.status === 200) {
      const responseData = response.data

      if (responseData.errors) {
        throw new Error(`Error: ${responseData.errors}`)
      }

      return responseData
    } else {
      throw new Error(`Error: ${response.status} - ${response.statusText}`)
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Error: ${error.response?.status} - ${error.response?.statusText}`
      )
    } else {
      throw error
    }
  }
}

async function createTestAsThirdPartyScanner(
  token: string,
  organizationContext: string,
  params: {
    businessUnitId: string
    createdByUserId: string
    assetId: string
    artifactId: string
    testName: string
    testType: string
    uploadMethod: UploadMethod
    productId?: string
  }
): Promise<any> {
  const {
    businessUnitId,
    createdByUserId,
    assetId,
    artifactId,
    testName,
    testType,
    uploadMethod = UploadMethod.API,
    productId
  } = params
  return createTest(token, organizationContext, {
    businessUnitId,
    createdByUserId,
    assetId,
    artifactId,
    testName,
    testType,
    uploadMethod,
    productId
  })
}

async function createTest(
  token: string,
  organizationContext: string,
  params: {
    businessUnitId: string
    createdByUserId: string
    assetId: string
    artifactId: string
    testName: string
    testType: string
    tools?: any[]
    uploadMethod?: UploadMethod
    productId?: string
  }
): Promise<any> {
  const {
    businessUnitId,
    createdByUserId,
    assetId,
    artifactId,
    testName,
    testType,
    tools = [],
    uploadMethod = UploadMethod.API,
    productId
  } = params
  if (!businessUnitId) {
    throw new Error('Business unit ID is required')
  }
  if (!createdByUserId) {
    throw new Error('Created by user ID is required')
  }
  if (!assetId) {
    throw new Error('Asset ID is required')
  }
  if (!artifactId) {
    throw new Error('Artifact ID is required')
  }
  if (!testName) {
    throw new Error('Test name is required')
  }
  if (!testType) {
    throw new Error('Test type is required')
  }

  const graphqlQuery = `
        mutation CreateTestMutation($input: CreateTestInput!) {
            createTest(input: $input) {
                id
                name
                artifactUnderTest {
                    id
                    name
                    assetVersion {
                        id
                        name
                        asset {
                            id
                            name
                            dependentProducts {
                                id
                                name
                            }
                        }
                    }
                }
                createdBy {
                    id
                    email
                }
                ctx {
                    asset
                    products
                    businessUnits
                }
                uploadMethod
            }
        }
    `

  const variables: {
    input: {
      name: string
      createdBy: string
      artifactUnderTest: string
      testResultFileFormat: string
      ctx: {
        asset: string
        businessUnits: string[]
        products?: string
      }
      tools: { name: string; description: string }[]
      uploadMethod: UploadMethod
    }
  } = {
    input: {
      name: testName,
      createdBy: createdByUserId,
      artifactUnderTest: artifactId,
      testResultFileFormat: testType,
      ctx: {
        asset: assetId,
        businessUnits: [businessUnitId]
      },
      tools: tools,
      uploadMethod: uploadMethod
    }
  }

  if (productId !== undefined) {
    variables.input.ctx['products'] = productId
  }

  const response = await sendGraphqlQuery(
    token,
    organizationContext,
    graphqlQuery,
    variables
  )
  return response.data
}

async function createTestAsBinaryAnalysis(
  token: string,
  organizationContext: string,
  params: {
    businessUnitId: string
    createdByUserId: string
    assetId: string
    artifactId: string
    testName: string
    productId?: string
    uploadMethod: UploadMethod
  }
): Promise<any> {
  const {
    businessUnitId,
    createdByUserId,
    assetId,
    artifactId,
    testName,
    productId,
    uploadMethod = UploadMethod.API
  } = params
  const tools = [
    {
      description:
        'SBOM and Vulnerability Analysis from Finite State Binary SCA and Binary SAST.',
      name: 'Finite State Binary Analysis'
    }
  ]

  return await createTest(token, organizationContext, {
    businessUnitId,
    createdByUserId,
    assetId,
    artifactId,
    testName,
    testType: 'finite_state_binary_analysis',
    tools,
    uploadMethod,
    productId
  })
}

async function createArtifact(
  token: string,
  organizationContext: string,
  params: {
    businessUnitId: string
    createdByUserId: string
    assetVersionId: string
    artifactName: string
    productId?: string
  }
): Promise<any> {
  const {
    businessUnitId,
    createdByUserId,
    assetVersionId,
    artifactName,
    productId
  } = params
  if (!businessUnitId) {
    throw new Error('Business unit ID is required')
  }
  if (!createdByUserId) {
    throw new Error('Created by user ID is required')
  }
  if (!assetVersionId) {
    throw new Error('Asset version ID is required')
  }
  if (!artifactName) {
    throw new Error('Artifact name is required')
  }

  const graphqlQuery = `
        mutation CreateArtifactMutation($input: CreateArtifactInput!) {
            createArtifact(input: $input) {
                id
                name
                assetVersion {
                    id
                    name
                    asset {
                        id
                        name
                    }
                }
                createdBy {
                    id
                    email
                }
                ctx {
                    asset
                    products
                    businessUnits
                }
            }
        }
    `

  const variables: any = {
    input: {
      name: artifactName,
      createdBy: createdByUserId,
      assetVersion: assetVersionId,
      ctx: {
        asset: assetVersionId,
        businessUnits: [businessUnitId]
      }
    }
  }

  if (productId !== undefined) {
    variables.input.ctx.products = productId
  }

  const response = await sendGraphqlQuery(
    token,
    organizationContext,
    graphqlQuery,
    variables
  )
  return response.data
}

async function createAssetVersionOnAsset(
  token: string,
  organizationContext: string,
  params: {
    assetId: string
    assetVersionName: string
    createdByUserId?: string
  }
): Promise<any> {
  const { assetId, assetVersionName, createdByUserId } = params
  if (!assetId) {
    throw new Error('Asset ID is required')
  }
  if (!assetVersionName) {
    throw new Error('Asset version name is required')
  }

  const graphqlQuery = `
        mutation BapiCreateAssetVersion($assetVersionName: String!, $assetId: ID!, $createdByUserId: ID) {
            createNewAssetVersionOnAsset(assetVersionName: $assetVersionName, assetId: $assetId, createdByUserId: $createdByUserId) {
                id
                assetVersion {
                    id
                }
            }
        }
    `

  const variables: {
    assetVersionName: string
    assetId: string
    createdByUserId?: string
  } = {
    assetVersionName: assetVersionName,
    assetId: assetId
  }

  if (createdByUserId) {
    variables.createdByUserId = createdByUserId
  }

  const response = await sendGraphqlQuery(
    token,
    organizationContext,
    graphqlQuery,
    variables
  )
  return response.data
}

async function getAllPaginatedResults(
  token: string,
  organizationContext: string,
  query: string,
  variables?: Record<string, any>,
  field?: string,
  limit?: number
): Promise<any[]> {
  if (!field) {
    throw new Error('Error: field is required')
  }

  // Query the API for the first page of results
  let response = await sendGraphqlQuery(
    token,
    organizationContext,
    query,
    variables
  )

  // If there are no results, return an empty list
  if (!response.data) {
    return []
  }

  // Create a list to store the results
  const results: any[] = []

  // Add the first page of results to the list
  if (field in response.data) {
    results.push(...response.data[field])
  } else {
    throw new Error(`Error: ${field} not in response JSON`)
  }

  let cursor =
    response.data[field].length > 0
      ? response.data[field][response.data[field].length - 1]._cursor
      : null

  while (cursor) {
    if (limit !== undefined && results.length >= limit) {
      break
    }

    variables!.after = cursor

    // Add the next page of results to the list
    response = await sendGraphqlQuery(
      token,
      organizationContext,
      query,
      variables
    )
    results.push(...response.data[field])

    cursor =
      response.data[field].length > 0
        ? response.data[field][response.data[field].length - 1]._cursor
        : null
  }

  return results
}

async function getAllAssets(
  token: string,
  organizationContext: string,
  assetId?: string,
  businessUnitId?: string
): Promise<any[]> {
  const variables: Record<string, any> = { filter: {} }

  if (assetId !== undefined) {
    variables.filter.id = assetId
  }

  if (businessUnitId !== undefined) {
    variables.filter.group = { id: businessUnitId }
  }

  return getAllPaginatedResults(
    token,
    organizationContext,
    ALL_ASSETS.query,
    ALL_ASSETS.variables(assetId, businessUnitId),
    'allAssets'
  )
}

async function createNewAssetVersionArtifactAndTestForUpload(
  token: string,
  organizationContext: string,
  params: {
    businessUnitId?: string
    createdByUserId?: string
    assetId?: string
    version?: string
    productId?: string
    testType: string
    artifactDescription?: string
    uploadMethod: UploadMethod
  }
): Promise<string> {
  const {
    assetId,
    version,
    productId,
    testType,
    uploadMethod = UploadMethod.API
  } = params
  let { artifactDescription } = params
  let { businessUnitId, createdByUserId } = params
  if (!assetId || !version) {
    throw new Error('Asset ID and Version are required')
  }

  const assets = await getAllAssets(token, organizationContext, assetId)
  const asset = assets[0]

  // Get asset name
  const assetName = asset.name

  // Get existing asset product IDs
  const assetProductIds = asset.ctx.products

  // Get asset product ID
  if (productId && !assetProductIds.includes(productId)) {
    assetProductIds.push(productId)
  }

  // If businessUnitId or createdByUserId are not provided, get from the existing asset
  if (!businessUnitId || !createdByUserId) {
    if (!businessUnitId) {
      businessUnitId = asset.group.id
    }
    if (!createdByUserId) {
      createdByUserId = asset.createdBy.id
    }

    if (!businessUnitId || !createdByUserId) {
      throw new Error(
        'Business Unit ID and Created By User ID are required and could not be retrieved from the existing asset'
      )
    }
  }

  // Create asset version
  const assetVersionResponse = await createAssetVersionOnAsset(
    token,
    organizationContext,
    { createdByUserId, assetId, assetVersionName: version }
  )
  const assetVersionId =
    assetVersionResponse.createNewAssetVersionOnAsset.assetVersion.id

  // Create test
  let testId = ''
  if (testType === 'finite_state_binary_analysis') {
    // Create artifact
    if (!artifactDescription) {
      artifactDescription = 'Binary'
    }
    const binaryArtifactName = `${assetName} ${version} - ${artifactDescription}`
    const artifactResponse = await createArtifact(token, organizationContext, {
      businessUnitId,
      createdByUserId,
      assetVersionId,
      artifactName: binaryArtifactName,
      productId: assetProductIds
    })
    const binaryArtifactId = artifactResponse.createArtifact.id

    // Create test
    const testName = `${assetName} ${version} - Finite State Binary Analysis`
    const testResponse = await createTestAsBinaryAnalysis(
      token,
      organizationContext,
      {
        businessUnitId,
        createdByUserId,
        assetId,
        artifactId: binaryArtifactId,
        productId,
        testName,
        uploadMethod
      }
    )
    testId = testResponse.createTest.id
  } else {
    // Create artifact
    if (!artifactDescription) {
      artifactDescription = 'Unspecified Artifact'
    }
    const artifactName = `${assetName} ${version} - ${artifactDescription}`
    const artifactResponse = await createArtifact(token, organizationContext, {
      businessUnitId,
      createdByUserId,
      assetVersionId,
      artifactName,
      productId
    })
    const binaryArtifactId = artifactResponse.createArtifact.id

    // Create test
    const testName = `${assetName} ${version} - ${testType}`
    const testResponse = await createTestAsThirdPartyScanner(
      token,
      organizationContext,
      {
        businessUnitId,
        createdByUserId,
        assetId,
        artifactId: binaryArtifactId,
        productId: assetProductIds,
        testName,
        testType,
        uploadMethod
      }
    )
    testId = testResponse.createTest.id
  }

  return testId
}

export type createNewAssetVersionAndUploadBinaryParams = {
  assetId: string
  version: string
  filePath: string
  createdByUserId?: string
  businessUnitId?: string
  productId?: string
  artifactDescription?: string
  quickScan?: boolean
  uploadMethod?: UploadMethod
}
export async function createNewAssetVersionAndUploadBinary(
  token: string,
  organizationContext: string,
  params: createNewAssetVersionAndUploadBinaryParams
): Promise<any> {
  const {
    createdByUserId,
    businessUnitId,
    assetId,
    version,
    filePath,
    productId,
    quickScan = false,
    uploadMethod = UploadMethod.API
  } = params
  let { artifactDescription } = params
  if (!assetId || !version || !filePath) {
    throw new Error('Asset ID, Version, and File path are required')
  }

  // Create the asset version and binary test
  if (!artifactDescription) {
    artifactDescription = 'Firmware Binary'
  }
  const binaryTestId = await createNewAssetVersionArtifactAndTestForUpload(
    token,
    organizationContext,
    {
      businessUnitId,
      createdByUserId,
      assetId,
      version,
      productId,
      testType: 'finite_state_binary_analysis',
      artifactDescription,
      uploadMethod
    }
  )

  // Upload file for binary test
  const response = await uploadFileForBinaryAnalysis(
    token,
    organizationContext,
    { testId: binaryTestId, filePath, quickScan }
  )
  return response
}
