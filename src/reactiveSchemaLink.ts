import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { GraphQLSchema, GraphQLError } from 'graphql';
import { graphql } from 'reactive-graphql';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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

// will transform the errors of the execution results provided by
// reactive-graphql in proper GraphQLErrors
function normalizeErrorsField(results: {data?: object, errors?: string[]}): FetchResult<object> {
  const _results: FetchResult<object> = {};
  _results.data = results.data;
  if (results.errors) {
    _results.errors = results.errors.map(message => {
      // @ts-ignore just to be sure, message could be an instance of error
      if (typeof message.message === 'string') {
        // @ts-ignore 
        return new GraphQLError(message.message);
      }
      return new GraphQLError(message);
    });
  }
  return _results;
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
        )
        // reactive-graphql does not necessarely leverage the errors key (https://github.com/mesosphere/reactive-graphql/issues/13)
        // so we do it ourself
        .pipe(catchError((error: Error) => of({errors: [new GraphQLError(error.message)] })))
        .pipe(map(normalizeErrorsField))
        .subscribe(observer);
      } catch(e) {
        observer.next({ errors: [new GraphQLError(e.mesage)]});
      }
    });
  }
}

export default ReactiveSchemaLink;
