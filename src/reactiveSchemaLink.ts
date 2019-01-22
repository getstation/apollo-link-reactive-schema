import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { GraphQLSchema } from 'graphql';
import { graphql } from 'reactive-graphql';

export namespace ReactiveSchemaLink {
  export type ResolverContextFunction<ContextType> = (
    operation: Operation,
  ) => ContextType;

  export interface Options<ContextType> {
    /**
     * The schema to generate responses from.
     */
    schema: GraphQLSchema;

    /**
     * A context to provide to resolvers declared within the schema.
     */
    context?: ResolverContextFunction<ContextType> | Record<string, any>;
  }
}

export class ReactiveSchemaLink<ContextType> extends ApolloLink {
  public schema: GraphQLSchema;
  public context: ReactiveSchemaLink.ResolverContextFunction<ContextType> | any;

  constructor({ schema, context }: ReactiveSchemaLink.Options<ContextType>) {
    super();

    this.schema = schema;
    this.context = context;
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return new Observable<FetchResult>(observer => {
      try {
        const context = typeof this.context === 'function' ? this.context(operation) : this.context || {};

        return graphql(
          this.schema,
            operation.query,
            null,
            context,
            operation.variables,
          // @ts-ignore issue with the typage of the `errors` key in reactive-graphql
          // https://github.com/mesosphere/reactive-graphql/pull/11/files#r249788225
        ).subscribe(observer);
      } catch(e) {
        observer.error(e);
      }
    });
  }
}

export default ReactiveSchemaLink;
