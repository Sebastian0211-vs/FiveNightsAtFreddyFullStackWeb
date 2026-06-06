import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const uri = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3002/graphql';

export const apolloClient = new ApolloClient({
    link: new HttpLink({
        uri,
        credentials: 'include', // send the HttpOnly auth cookie
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
        watchQuery: { fetchPolicy: 'cache-and-network' },
    },
});
