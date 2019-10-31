import { buildClientSchema, graphql } from 'graphql';

const gql = String.raw,
  html = String.raw;
const hashPattern = new RegExp('^[0-9a-f]{128}$');

async function getSchema({
  graph,
  variant,
  hash,
  apiKey
}: {
  graph: string;
  variant: string | undefined;
  hash: string | undefined;
  apiKey: string;
}) {
  const response = await fetch('https://engine-graphql.apollographql.com/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      query: gql`
        query Introspective($graph: ID!, $variant: String, $hash: ID) {
          service(id: $graph) {
            schema(tag: $variant, hash: $hash) {
              introspection {
                queryType {
                  name
                }
                mutationType {
                  name
                }
                subscriptionType {
                  name
                }
                types {
                  ...FullType
                }
                directives {
                  name
                  locations
                  args {
                    ...InputValue
                  }
                }
              }
            }
          }
        }

        fragment FullType on IntrospectionType {
          kind
          name
          fields {
            name
            args {
              ...InputValue
            }
            type {
              ...TypeRef
            }
            isDeprecated
            deprecationReason
          }
          inputFields {
            ...InputValue
          }
          interfaces {
            ...TypeRef
          }
          enumValues(includeDeprecated: true) {
            name
            isDeprecated
            deprecationReason
          }
          possibleTypes {
            ...TypeRef
          }
        }

        fragment InputValue on IntrospectionInputValue {
          name
          type {
            ...TypeRef
          }
          defaultValue
        }

        fragment TypeRef on IntrospectionType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                      ofType {
                        kind
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        graph,
        variant,
        hash
      }
    })
  });
  if (response.status != 200) {
    throw new Error(
      `Graph Manager HTTP request failed (${response.status} ${response.statusText}, ${JSON.stringify(
        await response.text()
      )})`
    );
  }
  const body = await response.json();
  if (body.errors) {
    throw new Error(`Graph Manager GraphQL errors (${JSON.stringify(body.errors)})`);
  }

  const data = body.data;
  if (!data) throw Error('No data!?');
  const service_ = data.service;
  if (!service_) throw Error(`Could not find graph ${graph}.`);
  const schema = service_.schema;
  if (!schema) throw Error(`Could not find schema ${graph}:${variant}`);
  return buildClientSchema({
    __schema: schema.introspection
  });
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

async function handlePOST(request: Request) {
  try {
    const url = new URL(request.url);

    const urlParts = url.pathname.split('/');

    const graph = urlParts[1] || url.searchParams.get('graph') || url.searchParams.get('service');

    const specifier = urlParts[2];

    let hash, variant;
    if (specifier) {
      if (hashPattern.test(specifier)) {
        hash = specifier;
      } else {
        variant = specifier;
      }
    }

    hash = hash || url.searchParams.get('hash');
    variant = variant || url.searchParams.get('variant') || url.searchParams.get('tag');

    // Fall back to default variant if only graphID is specified
    if (!hash && !variant) {
      variant = 'current';
    }

    if (!graph) {
      throw Error('graph URL path or search parameter required.');
    }

    const apiKey = request.headers.get('X-API-Key') || url.searchParams.get('apiKey');
    if (!apiKey) {
      throw Error('X-API-Key header or apiKey search parameter required.');
    }

    const schema = await getSchema({ graph, variant, hash, apiKey });

    const requestBody = await request.json();

    const response = await graphql(schema, requestBody.query, null, null, requestBody.variables);

    return new Response(JSON.stringify(response), { headers });
  } catch (e) {
    return new Response(
      JSON.stringify({
        errors: [{ message: e.message, stack: e.stack.split('\n') }]
      }),
      { headers }
    );
  }
}

async function handleGET(request: Request) {
  return new Response(
    html`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="https://unpkg.com/graphiql@0.16/graphiql.css" />
          <style>
            body {
              height: 100%;
              margin: 0;
              width: 100%;
              overflow: hidden;
            }
            #graphiql {
              height: 100vh;
            }
          </style>
          <script src="https://unpkg.com/react@16/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@16/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/graphiql@0.16/graphiql.js"></script>
        </head>
        <body>
          <div id="graphiql">Loading&hellip;</div>
          <script>
            function fetcher(params) {
              return fetch(window.location.href, {
                method: 'post',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
              })
                .then(function(response) {
                  return response.text();
                })
                .then(function(responseBody) {
                  try {
                    return JSON.parse(responseBody);
                  } catch (error) {
                    return responseBody;
                  }
                });
            }

            ReactDOM.render(React.createElement(GraphiQL, { fetcher: fetcher }), document.getElementById('graphiql'));
          </script>
        </body>
      </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html'
      }
    }
  );
}

async function handleRequest(request: Request) {
  if (request.method == 'POST') {
    return handlePOST(request);
  } else {
    return handleGET(request);
  }
}

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});
