export interface AssetFilter {
  id?: string
  group?: { id: string }
}

export interface GetAllAssetsVariables {
  filter: AssetFilter
  after: string | null
  first: number
}

export interface GetAllAssetsQueryResult {
  _cursor: string
  id: string
  name: string
  createdAt: string
  createdBy: {
    id: string
    email: string
    __typename: string
  }
  group: {
    id: string
    name: string
  }
  ctx: {
    asset: string
    businessUnits: string[]
    products: string[]
  }
  defaultVersion: {
    id: string
    name: string
    relativeRiskScore: number
  }
  versions: {
    id: string
    name: string
    relativeRiskScore: number
    testStatuses: string[]
    __typename: string
  }[]
  __typename: string
}

interface Variables {
  filter: Record<string, any>
  after: string | null
  first: number
}

function assetVariables(
  assetId: string | null = null,
  businessUnitId: string | null = null
): Variables {
  let variables: Variables = {
    filter: {},
    after: null,
    first: 100
  }

  if (assetId !== null) {
    variables.filter['id'] = assetId
  }

  if (businessUnitId !== null) {
    variables.filter['group'] = {
      id: businessUnitId
    }
  }

  return variables
}

export const ALL_ASSETS = {
  query: `
        query GetAllAssets(
            $filter: AssetFilter!,
            $after: String,
            $first: Int
            ) {
                allAssets(
                    filter: $filter,
                    after: $after,
                    first: $first
                ) {
                    _cursor
                    id
                    name
                    createdAt
                    createdBy {
                        id
                        email
                        __typename
                    }
                    group {
                        id
                        name
                    }
                    ctx {
                        asset
                        businessUnits
                        products
                    }
                    defaultVersion {
                        id
                        name
                        relativeRiskScore
                    }
                    versions {
                        id
                        name
                        relativeRiskScore
                        testStatuses
                        __typename
                    }
                    __typename
                }
            }
    `,
  variables: assetVariables
}

/*export function getAllAssetsVariables(assetId?: string, businessUnitId?: string): GetAllAssetsVariables {
    const variables: GetAllAssetsVariables = {
        filter: {},
        after: null,
        first: 100
    };

    if (assetId) {
        variables.filter.id = assetId;
    }

    if (businessUnitId) {
        variables.filter.group = { id: businessUnitId };
    }

    return variables;
}*/
