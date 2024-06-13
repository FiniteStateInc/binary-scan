import axios from 'axios'

const AUDIENCE = 'https://platform.finitestate.io/api/v1/graphql'
const TOKEN_URL = 'https://platform.finitestate.io/api/v1/auth/token'

export async function getAuthToken(
  clientId: string,
  clientSecret: string,
  tokenUrl: string = TOKEN_URL,
  audience: string = AUDIENCE
): Promise<string> {
  /**
   * Get an auth token for use with the API using CLIENT_ID and CLIENT_SECRET
   *
   * @param clientId - CLIENT_ID as specified in the API documentation
   * @param clientSecret - CLIENT_SECRET as specified in the API documentation
   * @param tokenUrl - Token URL, by default TOKEN_URL
   * @param audience - Audience, by default AUDIENCE
   * @returns - Auth token. Use this token as the Authorization header in subsequent API calls.
   * @throws - If the response status code is not 200
   */

  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    audience: audience,
    grant_type: 'client_credentials'
  }

  const headers = {
    'Content-Type': 'application/json'
  }

  try {
    const response = await axios.post(tokenUrl, payload, { headers })
    if (response.status < 300 && response.status >= 200) {
      return response.data.access_token
    } else {
      throw new Error(`Error: ${response.status} - ${response.statusText}`)
    }
  } catch (error: any) {
    throw new Error(
      `Error: ${error.response.status} - ${error.response.statusText}`
    )
  }
}

export default getAuthToken
