declare module 'sparql-http-client/SimpleClient.js' {
  interface SparqlClientOptions {
    endpointUrl: string;
  }

  interface SparqlResponse {
    results: {
      bindings: Record<string, { value: string }>[];
    };
  }

  interface SparqlQuery {
    select: (query: string) => Promise<{
      ok: boolean;
      status: number;
      text: () => Promise<string>;
      json: () => Promise<SparqlResponse>;
    }>;
  }

  export default class SparqlClient {
    constructor(options: SparqlClientOptions);
    query: SparqlQuery;
  }
}

declare module 'sparql-http-client' {
  export { default as SparqlClient } from 'sparql-http-client/SimpleClient.js';
}
