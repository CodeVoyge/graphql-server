const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const DataLoader = require("dataloader");

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Ben", email: "ben@example.com" },
  { id: 3, name: "Chloe", email: "chloe@example.com" },
];

const posts = [
  { id: 1, userId: 1, title: "Getting started with Kafka" },
  { id: 2, userId: 1, title: "GraphQL vs REST" },
  { id: 3, userId: 2, title: "Docker-free dev setups" },
  { id: 4, userId: 3, title: "Event-driven architecture 101" },
];

const comments = [
  { id: 1, postId: 1, text: "Great intro!" },
  { id: 2, postId: 1, text: "Very helpful." },
  { id: 3, postId: 2, text: "Nice comparison." },
  { id: 4, postId: 3, text: "Saved my week." },
  { id: 5, postId: 4, text: "Clear explanation." },
  { id: 6, postId: 4, text: "More please!" },
];

let queryCount = 0;

const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    commentCount: Int!
  }

  type Query {
    users: [User!]!
  }
`;

const resolvers = {
  Query: {
    users: () => {
      queryCount++;
      return users;
    },
  },
  User: {
    // 👇 instead of fetching directly, we .load() from the batching loader
    posts: (parent, args, context) => {
      return context.postsLoader.load(parent.id);
    },
  },
  Post: {
    commentCount: (parent, args, context) => {
      return context.commentsLoader.load(parent.id).then((c) => c.length);
    },
  },
};

// 👇 batch function for posts: receives ALL requested userIds at once
function batchPostsByUserId(userIds) {
  queryCount++; // only ONE increment, no matter how many userIds came in
  return Promise.resolve(
    userIds.map((id) => posts.filter((p) => p.userId === id))
  );
}

// 👇 batch function for comments: same idea, keyed by postId
function batchCommentsByPostId(postIds) {
  queryCount++;
  return Promise.resolve(
    postIds.map((id) => comments.filter((c) => c.postId === id))
  );
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      async requestDidStart() {
        queryCount = 0;
        return {
          async willSendResponse() {
            console.log(`This request triggered ${queryCount} queries`);
          },
        };
      },
    },
  ],
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async () => ({
    // 👇 fresh loaders created PER REQUEST — important, explained below
    postsLoader: new DataLoader(batchPostsByUserId),
    commentsLoader: new DataLoader(batchCommentsByPostId),
  }),
}).then(({ url }) => {
  console.log(`GraphQL server running at ${url}`);
});