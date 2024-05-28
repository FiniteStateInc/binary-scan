import axios from 'axios';

export const sendGraphQLQuery = async (token: string, organizationContext: string, query: string, variables: Variables): Promise<ResponseData> => {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Organization-Context': organizationContext
    };

    const response = await axios.post('https://api.example.com/graphql', {
        query: query,
        variables: variables
    }, { headers: headers });

    if (response.status <200 || response.status>=300) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
};