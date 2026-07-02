# GraphQL API — Users, Posts & Comments

A GraphQL API built with Apollo Server, demonstrating schema/resolver
design and the N+1 query problem — including measuring it directly and
fixing it with DataLoader.

Built as part of a hands-on REST vs GraphQL comparison —
see the companion REST implementation: https://github.com/CodeVoyge/rest-vs-graphql

## Schema

```graphql
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
```

## Running it

```bash
npm install
npm start
```

Server runs at `http://localhost:4001`.

## Try it

```bash
curl -X POST http://localhost:4001/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users { name posts { title commentCount } } }"}'
```

Try asking for less data too — same endpoint, different shape:
```bash
curl -X POST http://localhost:4001/ \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users { name } }"}'
```

## The N+1 problem — measured, not theoretical

A naive resolver implementation fetches related data separately for
every parent object. Querying 3 users, each with posts and comment
counts, triggered:

- **8 separate queries** with naive resolvers
  (1 for users, 3 for posts — one per user, 4 for comment counts —
  one per post)
- **3 queries** after adding DataLoader, which batches all `.load()`
  calls issued in the same tick into one combined fetch

Same query, same result, 8 → 3 — this is why production GraphQL APIs
use DataLoader (or equivalent batching) as standard practice, not an
optional optimization.