# introspective: any schema at your fingertips

You have disabled introspection in production, or your endpoint isn't reachable from your development machine.

This service lets your tools introspect by lifting the schema from Apollo Graph Manager.

Point your GraphQL tool, eg GraphiQL.app, to:

```
https://introspective.pcarrier.workers.dev/$GRAPH/$VARIANT?apiKey=[...]
```

To view the schema in GraphQL, head to:

```
https://introspective.pcarrier.workers.dev/$GRAPH/$VARIANT?doc=1&apiKey=[...]
```

## API key

After logging into [Graph Manager](https://engine.apollographql.com), your API key can be found in the `authtoken` cookie attached to [its backend domain](https://engine-graphql.apollographql.com/).

Service tokens are also supported.

## Contributors

- Adam Zionts <adam@apollographql.com>
- Pierre Carrier <pierre@apollographql.com>
