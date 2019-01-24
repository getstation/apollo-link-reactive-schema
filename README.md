# apollo-link-reactive-schema
> Apollo Link that provides a [reactive-graphql execution environment](https://github.com/mesosphere/reactive-graphql) to perform operations on a provided reactive schema.

## Installation

`npm install apollo-link-reactive-schema --save`

## Usage

```js
import { ApolloClient } from 'apollo-client';
import { from } from 'rxjs';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ReactiveSchemaLink } from 'apollo-link-reactive-schema';
import { gql } from 'graphql-tag';

import schema from './path/to/your/schema';

const graphqlClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: new ReactiveSchemaLink({ schema }),
  // without this option watchQuery won't be streaming
  // see https://github.com/apollographql/apollo-client/issues/4322
  queryDeduplication: false
});

const query = gql`
  # don't forget the @live directive, otherwise you'll experience
  # difficulties with subscription>unsubscription>subscription
  query @live {
    someReactiveField
  }
`;

const $res = graphqlClient.watchQuery({ query });
$res.subscribe(res => console.log(res));
```

### Options

The `ReactiveSchemaLink` constructor can be called with an object with the following properties:

* `schema`: an executable graphql schema
* `context`: an object passed to the resolvers, following the [graphql specification](http://graphql.org/learn/execution/#root-fields-resolvers) or a function that accepts the operation and returns the resolver context.
