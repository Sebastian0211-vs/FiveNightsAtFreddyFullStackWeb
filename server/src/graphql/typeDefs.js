// GraphQL schema — shared contract between Person A (server) and Person B (client)
export const typeDefs = `#graphql
  type User {
    id: ID!
    username: String!
    email: String!
    furthestNight: Int!
  }

  type Score {
    id: ID!
    username: String!
    night: Int!
    survivedSeconds: Int!
    outcome: Outcome!
    createdAt: String!
  }

  enum Outcome {
    win
    jumpscare
  }

  type Query {
    me: User
    leaderboard(night: Int, limit: Int = 10): [Score!]!
    myScores: [Score!]!
  }

  type Mutation {
    updateProgress(night: Int!): User!
    resetProgress: User!
    submitScore(night: Int!, survivedSeconds: Int!, outcome: Outcome!): Score!
  }
`;
