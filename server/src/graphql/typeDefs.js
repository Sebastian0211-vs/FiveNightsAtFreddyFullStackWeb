// GraphQL schema, shared contract between Person A (server) and Person B (client)
export const typeDefs = `#graphql
  type User {
    id: ID!
    username: String!
    email: String!
    furthestNight: Int!
    bestNight: Int!
    customNightBeaten: Boolean!
  }

  type Score {
    id: ID!
    username: String!
    night: Int!
    survivedSeconds: Int!
    outcome: Outcome!
    createdAt: String!
    country: String
    countryCode: String
    cameraFlicks: Int
    doorCloses: Int
    powerRemaining: Float
    isCustomNight: Boolean
    aiFreddy: Int
    aiBonnie: Int
    aiChica: Int
    aiFoxy: Int
  }

  enum Outcome {
    win
    jumpscare
  }

  # Server-issued, single-use token for one night attempt.
  type NightSessionToken {
    sessionId: ID!
    night: Int!
    startedAt: String!
  }

  type Query {
    me: User
    leaderboard(night: Int, limit: Int = 10): [Score!]!
    myScores: [Score!]!
  }

  type Mutation {
    updateProgress(night: Int!): User!
    resetProgress: User!
    startNight(night: Int!, isCustomNight: Boolean, aiFreddy: Int, aiBonnie: Int, aiChica: Int, aiFoxy: Int): NightSessionToken!
    submitScore(sessionId: ID!, night: Int!, survivedSeconds: Int!, outcome: Outcome!, cameraFlicks: Int, doorCloses: Int, powerRemaining: Float, isCustomNight: Boolean, aiFreddy: Int, aiBonnie: Int, aiChica: Int, aiFoxy: Int): Score!
  }
`;
