import { ApolloLink, Operation, FetchResult, Observable } from 'apollo-link';
import { GraphQLSchema } from 'graphql';
import graphql from 'reactive-graphql';

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
     * The root value to use when generating responses.
     */
    rootValue?: any;

    /**
     * A context to provide to resolvers declared within the schema.
     */
    context?: ResolverContextFunction<ContextType> | Record<string, any>;
  }
}

// util
const intersect = (array1: any[], array2: any[]) => array1.filter(value => -1 !== array2.indexOf(value));

export class ReactiveSchemaLink<ContextType> extends ApolloLink {
  public schema: GraphQLSchema;
  public rootValue: any;
  public context: ReactiveSchemaLink.ResolverContextFunction<ContextType> | any;

  constructor({ schema, rootValue, context }: ReactiveSchemaLink.Options<ContextType>) {
    super();

    this.schema = schema;
    this.rootValue = rootValue;
    this.context = context;
  }

  public request(operation: Operation): Observable<FetchResult> | null {
    return new Observable<FetchResult>(observer => {
      try {
        const context = typeof this.context === 'function' ? this.context(operation) : this.context || {};

        // reactive-graphql mixes variables and context
        // see https://github.com/mesosphere/reactive-graphql/issues/6
        // we we need to merge the vaiables in the context
        // though let's throw an error if we end-up overiding a key
        // already present on context
        const { variables } = operation;
        if (variables) {
          const overridenKeys = intersect(Object.keys(variables), Object.keys(context));
          if(overridenKeys.length > 0) {
            throw new Error(`Variables overrides keys ${overridenKeys.map(k => `'${k}'`).join(',')} of context`);
          }
        }
        const contextAndAriables = { ...context, ...variables };

        return graphql(
            operation.query,
            this.schema,
            contextAndAriables,
        ).subscribe(observer);
      } catch(e) {
        observer.error(e);
      }
    });
  }
}

export default ReactiveSchemaLink;
