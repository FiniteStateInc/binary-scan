
import fetch from 'node-fetch';
import fs from 'fs';
import { ALL_ASSETS } from './fs_queries';

enum UploadMethod {
    WEB_APP_UI = "WEB_APP_UI",
    API = "API",
    GITHUB_INTEGRATION = "GITHUB_INTEGRATION",
    AZURE_DEVOPS_INTEGRATION = "AZURE_DEVOPS_INTEGRATION"
}

const API_URL = 'https://platform.finitestate.io/api/v1/graphql'
const AUDIENCE = "https://platform.finitestate.io/api/v1/graphql"
const TOKEN_URL = "https://platform.finitestate.io/api/v1/auth/token"

async function uploadFileForBinaryAnalysis(
    token: string,
    organizationContext: string,
    params: {testId: string,
    filePath: string,
    chunkSize?: number,
    quickScan?: boolean
}
): Promise<any> {
    const {testId,filePath,chunkSize= 1024 * 1024 * 1024 * 5,
        quickScan = false} = params;
    if (!testId) {
        throw new Error("Test ID is required");
    }
    if (!filePath) {
        throw new Error("File Path is required");
    }

    // Start Multi-part Upload
    const startMultipartUploadQuery = `
        mutation Start($testId: ID!) {
            startMultipartUploadV2(testId: $testId) {
                uploadId
                key
            }
        }
    `;
    const startVariables = {
        testId: testId
    };
    const startResponse = await sendGraphqlQuery(token, organizationContext, startMultipartUploadQuery, startVariables);

    const uploadId = startResponse.data.startMultipartUploadV2.uploadId;
    const uploadKey = startResponse.data.startMultipartUploadV2.key;

    // Upload file in chunks
    let i = 1;
    const partData = [];
    for await (const chunk of fileChunks(filePath, chunkSize)) {
        const generateUploadPartUrlQuery = `
            mutation GenerateUploadPartUrl($partNumber: Int!, $uploadId: ID!, $uploadKey: String!) {
                generateUploadPartUrlV2(partNumber: $partNumber, uploadId: $uploadId, uploadKey: $uploadKey) {
                    key
                    uploadUrl
                }
            }
        `;
        const generateUploadPartUrlVariables = {
            partNumber: i,
            uploadId: uploadId,
            uploadKey: uploadKey
        };
        const generateUrlResponse = await sendGraphqlQuery(token, organizationContext, generateUploadPartUrlQuery, generateUploadPartUrlVariables);
        const chunkUploadUrl = generateUrlResponse.data.generateUploadPartUrlV2.uploadUrl;

        // Upload the chunk
        const uploadResponse = await uploadBytesToUrl(chunkUploadUrl, chunk);
        
        partData.push({
            ETag: (uploadResponse.headers as any)['ETag'],
            PartNumber: i
        });
        i++;
    }

    // Complete Multipart Upload
    const completeMultipartUploadQuery = `
        mutation CompleteMultipartUpload($partData: [PartInput!]!, $uploadId: ID!, $uploadKey: String!) {
            completeMultipartUploadV2(partData: $partData, uploadId: $uploadId, uploadKey: $uploadKey) {
                key
            }
        }
    `;
    const completeVariables = {
        partData: partData,
        uploadId: uploadId,
        uploadKey: uploadKey
    };
    const completeResponse = await sendGraphqlQuery(token, organizationContext, completeMultipartUploadQuery, completeVariables);
    const key = completeResponse.data.completeMultipartUploadV2.key;

    // Launch Binary Upload Processing
    let launchQuery;
    const launchVariables: {key: string, testId: string, configurationOptions?: string[]} = {
        key: key,
        testId: testId,
    };
    if (quickScan) {
        launchQuery = `
            mutation LaunchBinaryUploadProcessing($key: String!, $testId: ID!, $configurationOptions: [BinaryAnalysisConfigurationOption]) {
                launchBinaryUploadProcessing(key: $key, testId: $testId, configurationOptions: $configurationOptions) {
                    key
                }
            }
        `;
        launchVariables['configurationOptions'] = ["QUICK_SCAN"];
    } else {
        launchQuery = `
            mutation LaunchBinaryUploadProcessing($key: String!, $testId: ID!) {
                launchBinaryUploadProcessing(key: $key, testId: $testId) {
                    key
                }
            }
        `;
    }
    const launchResponse = await sendGraphqlQuery(token, organizationContext, launchQuery, launchVariables);

    return launchResponse.data;
}

async function uploadBytesToUrl(url: string, bytes: Uint8Array): Promise<Response> {
    const response = await fetch(url, {
        method: 'PUT',
        body: bytes
    });

    if (response.status === 200) {
        return response;
    } else {
        throw new Error(`Error: ${response.status} - ${await response.text()}`);
    }
}


async function* fileChunks(file_path: string, chunk_size: number = 1024 * 1024 * 1024 * 5): AsyncGenerator<Uint8Array> {
    const fileStream = fs.createReadStream(file_path, { highWaterMark: chunk_size });
    for await (const chunk of fileStream) {
        yield chunk;
    }
}

async function sendGraphqlQuery(token: string, organizationContext: string, query: string, variables?: Record<string, any>): Promise<any> {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Organization-Context': organizationContext
    };
    const data = {
        query: query,
        variables: variables
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });

    if (response.status === 200) {
        const jsonResponse = await response.json();

        if (jsonResponse.errors) {
            throw new Error(`Error: ${JSON.stringify(jsonResponse.errors)}`);
        }

        return jsonResponse;
    } else {
        throw new Error(`Error: ${response.status} - ${await response.text()}`);
    }
}

async function createTestAsThirdPartyScanner(
    token: string,
    organizationContext: string,
    params : {businessUnitId: string,
    createdByUserId: string,
    assetId: string,
    artifactId: string,
    testName: string,
    testType: string,
    uploadMethod: UploadMethod,
    productId?: string}
): Promise<any> {
    const { businessUnitId, createdByUserId, assetId, artifactId, testName, testType, uploadMethod = UploadMethod.API, productId } = params;
    return createTest(
        token,
        organizationContext,
        { businessUnitId, createdByUserId, assetId, artifactId, testName, testType, uploadMethod, productId}
    );
}

async function createTest(
    token: string,
    organizationContext: string,
    params: {businessUnitId: string,
    createdByUserId: string,
    assetId: string,
    artifactId: string,
    testName: string,
    testType: string,
    tools?: any[],
    uploadMethod?: UploadMethod
    productId?: string}
): Promise<any> {
    const { businessUnitId, createdByUserId, assetId, artifactId, testName, testType, tools = [], uploadMethod = UploadMethod.API, productId } = params;
    if (!businessUnitId) {
        throw new Error("Business unit ID is required");
    }
    if (!createdByUserId) {
        throw new Error("Created by user ID is required");
    }
    if (!assetId) {
        throw new Error("Asset ID is required");
    }
    if (!artifactId) {
        throw new Error("Artifact ID is required");
    }
    if (!testName) {
        throw new Error("Test name is required");
    }
    if (!testType) {
        throw new Error("Test type is required");
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
    `;

    const variables: {input: {
        name: string,
        createdBy: string,
        artifactUnderTest: string,
        testResultFileFormat: string,
        ctx: {
            asset: string,
            businessUnits: string[],
            products?: string
        },
        tools: {name: string, description: string}[],
        uploadMethod: UploadMethod
    }} = {
        input: {
            name: testName,
            createdBy: createdByUserId,
            artifactUnderTest: artifactId,
            testResultFileFormat: testType,
            ctx: {
                asset: assetId,
                businessUnits: [businessUnitId],
            },
            tools: tools,
            uploadMethod: uploadMethod
        }
    };

    if (productId !== undefined) {
        variables.input.ctx['products'] = productId;
    }

    const response = await sendGraphqlQuery(token, organizationContext, graphqlQuery, variables);
    return response.data;
}

async function createTestAsBinaryAnalysis(
    token: string,
    organizationContext: string,
    params: {businessUnitId: string,
    createdByUserId: string,
    assetId: string,
    artifactId: string,
    testName: string,
    productId?: string,
    uploadMethod: UploadMethod}
): Promise<any> {
    const {businessUnitId,
        createdByUserId,
        assetId,
        artifactId,
        testName,
        productId,
        uploadMethod=UploadMethod.API} = params
    const tools = [
        {
            description: "SBOM and Vulnerability Analysis from Finite State Binary SCA and Binary SAST.",
            name: "Finite State Binary Analysis"
        }
    ];
    
    return await createTest(
        token,
        organizationContext,
        {businessUnitId,
            createdByUserId,
        assetId,
        artifactId,
        testName,
        testType: "finite_state_binary_analysis",
        tools,
        uploadMethod,
        productId}
    );
}


async function createArtifact(
    token: string,
    organizationContext: string,
    params: {businessUnitId: string,
    createdByUserId: string,
    assetVersionId: string,
    artifactName: string,
    productId?: string
}
): Promise<any> {
    const {businessUnitId,
        createdByUserId,
        assetVersionId,
        artifactName,
        productId}=params
    if (!businessUnitId) {
        throw new Error("Business unit ID is required");
    }
    if (!createdByUserId) {
        throw new Error("Created by user ID is required");
    }
    if (!assetVersionId) {
        throw new Error("Asset version ID is required");
    }
    if (!artifactName) {
        throw new Error("Artifact name is required");
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
    `;

    const variables:any = {
        input: {
            name: artifactName,
            createdBy: createdByUserId,
            assetVersion: assetVersionId,
            ctx: {
                asset: assetVersionId,
                businessUnits: [businessUnitId]
            }
        }
    };

    if (productId !== undefined) {
        variables.input.ctx.products = productId;
    }

    const response = await sendGraphqlQuery(token, organizationContext, graphqlQuery, variables);
    return response.data;
}

async function createAssetVersionOnAsset(
    token: string,
    organizationContext: string,
    params: {assetId: string,
    assetVersionName: string,
    createdByUserId?: string}
): Promise<any> {
    const {assetId,
        assetVersionName,
        createdByUserId} = params
    if (!assetId) {
        throw new Error("Asset ID is required");
    }
    if (!assetVersionName) {
        throw new Error("Asset version name is required");
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
    `;

    const variables: {assetVersionName: string, 
        assetId:string, createdByUserId?: string} = {
        assetVersionName: assetVersionName,
        assetId: assetId
    };

    if (createdByUserId) {
        variables.createdByUserId = createdByUserId;
    }

    const response = await sendGraphqlQuery(token, organizationContext, graphqlQuery, variables);
    return response.data;
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
        throw new Error("Error: field is required");
    }

    // Query the API for the first page of results
    let response = await sendGraphqlQuery(token, organizationContext, query, variables);

    // If there are no results, return an empty list
    if (!response.data) {
        return [];
    }

    // Create a list to store the results
    const results: any[] = [];

    // Add the first page of results to the list
    if (field in response.data) {
        results.push(...response.data[field]);
    } else {
        throw new Error(`Error: ${field} not in response JSON`);
    }

    let cursor = response.data[field].length > 0 ? response.data[field][response.data[field].length - 1]._cursor : null;

    while (cursor) {
        if (limit !== undefined && results.length >= limit) {
            break;
        }

        variables!.after = cursor;

        // Add the next page of results to the list
        response = await sendGraphqlQuery(token, organizationContext, query, variables);
        results.push(...response.data[field]);

        cursor = response.data[field].length > 0 ? response.data[field][response.data[field].length - 1]._cursor : null;
    }

    return results;
}

async function getAllAssets(
    token: string,
    organizationContext: string,
    assetId?: string,
    businessUnitId?: string
): Promise<any[]> {
    const variables: Record<string, any> = { filter: {} };

    if (assetId !== undefined) {
        variables.filter.id = assetId;
    }

    if (businessUnitId !== undefined) {
        variables.filter.group = { id: businessUnitId };
    }

    return getAllPaginatedResults(
        token,
        organizationContext,
        ALL_ASSETS.query,
        ALL_ASSETS.variables(assetId, businessUnitId),
        'allAssets'
    );
}

async function createNewAssetVersionArtifactAndTestForUpload(
    token: string,
    organizationContext: string,
    params: {businessUnitId?: string,
    createdByUserId?: string,
    assetId?: string,
    version?: string,
    productId?: string,
    testType: string,
    artifactDescription?: string,
    uploadMethod: UploadMethod
    }
): Promise<string> {
    const {
        assetId,
        version,
        productId,
        testType,
        uploadMethod= UploadMethod.API
    } = params;
    let {artifactDescription} = params
    let {businessUnitId, createdByUserId} = params;
    if (!assetId || !version) {
        throw new Error("Asset ID and Version are required");
    }

    const assets = await getAllAssets(token, organizationContext, assetId);
    const asset = assets[0];

    // Get asset name
    const assetName = asset.name;

    // Get existing asset product IDs
    const assetProductIds = asset.ctx.products;

    // Get asset product ID
    if (productId && !assetProductIds.includes(productId)) {
        assetProductIds.push(productId);
    }

    // If businessUnitId or createdByUserId are not provided, get from the existing asset
    if (!businessUnitId || !createdByUserId) {
        if (!businessUnitId) {
            businessUnitId = asset.group.id;
        }
        if (!createdByUserId) {
            createdByUserId = asset.createdBy.id;
        }

        if (!businessUnitId || !createdByUserId) {
            throw new Error("Business Unit ID and Created By User ID are required and could not be retrieved from the existing asset");
        }
    }

    // Create asset version
    const assetVersionResponse = await createAssetVersionOnAsset(
        token,
        organizationContext,
        {createdByUserId,
        assetId,
        assetVersionName: version}
    );
    const assetVersionId = assetVersionResponse.createNewAssetVersionOnAsset.assetVersion.id;

    // Create test
    let testId = '';
    if (testType === "finite_state_binary_analysis") {
        // Create artifact
        if (!artifactDescription) {
            artifactDescription = "Binary";
        }
        const binaryArtifactName = `${assetName} ${version} - ${artifactDescription}`;
        const artifactResponse = await createArtifact(
            token,
            organizationContext,
            {businessUnitId,
            createdByUserId,
            assetVersionId,
            artifactName: binaryArtifactName,
            productId: assetProductIds}
        );
        const binaryArtifactId = artifactResponse.createArtifact.id;

        // Create test
        const testName = `${assetName} ${version} - Finite State Binary Analysis`;
        const testResponse = await createTestAsBinaryAnalysis(
            token,
            organizationContext,
            {businessUnitId,
            createdByUserId,
            assetId,
            artifactId: binaryArtifactId,
            productId,
            testName,
            uploadMethod}
        );
        testId = testResponse.createTest.id;
    } else {
        // Create artifact
        if (!artifactDescription) {
            artifactDescription = "Unspecified Artifact";
        }
        const artifactName = `${assetName} ${version} - ${artifactDescription}`;
        const artifactResponse = await createArtifact(
            token,
            organizationContext,
            {
            businessUnitId,
            createdByUserId,
            assetVersionId,
            artifactName,
            productId}
        );
        const binaryArtifactId = artifactResponse.createArtifact.id;

        // Create test
        const testName = `${assetName} ${version} - ${testType}`;
        const testResponse = await createTestAsThirdPartyScanner(
            token,
            organizationContext,
            {businessUnitId,
            createdByUserId,
            assetId,
            artifactId: binaryArtifactId,
            productId: assetProductIds,
            testName,
            testType,
            uploadMethod}
        );
        testId = testResponse.createTest.id;
    }

    return testId;
}

async function createNewAssetVersionAndUploadBinary(
    token: string,
    organizationContext: string,
    params: {createdByUserId?: string,
        businessUnitId?: string,
    assetId?: string,
    version?: string,
    filePath?: string,
    productId?: string,
    artifactDescription?: string,
    quickScan?: boolean,
    uploadMethod?: UploadMethod
}
): Promise<any> {
    const {createdByUserId,
        businessUnitId,
    assetId,
    version,
    filePath,
    productId,    
    quickScan = false,
    uploadMethod = UploadMethod.API
} = params;
let {artifactDescription} = params;
    if (!assetId || !version || !filePath) {
        throw new Error("Asset ID, Version, and File path are required");
    }

    // Create the asset version and binary test
    if (!artifactDescription) {
        artifactDescription = "Firmware Binary";
    }
    const binaryTestId = await createNewAssetVersionArtifactAndTestForUpload(
        token,
        organizationContext,
        {businessUnitId,
        createdByUserId,
        assetId,
        version,
        productId,
        testType: "finite_state_binary_analysis",
        artifactDescription,
        uploadMethod}
    );

    // Upload file for binary test
    const response = await uploadFileForBinaryAnalysis(token, organizationContext, {testId: binaryTestId, filePath, quickScan});
    return response;
}
