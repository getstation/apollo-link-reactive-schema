import {  execute } from 'apollo-link';
import { from } from "rxjs";
import { makeExecutableSchema } from 'graphql-tools';
import gql from 'graphql-tag';

import { ReactiveSchemaLink } from '../reactiveSchemaLink';

const sampleQuery = gql`
  query SampleQuery {
    sampleQuery {
      id
    }
  }
`;

const SampleQueryWithArgs = gql`
  query SampleQueryWithArgs($foo: Int) {
    sampleQueryWithArgs(foo: $foo) {
      id
    }
  }
`;

const typeDefs = `
type Stub {
  id: String
}

type Query {
  sampleQuery: Stub
  sampleQueryWithArgs(foo: Int): Stub
}
`;

const schema = makeExecutableSchema({ typeDefs });

describe('ReactiveSchemaLink', () => {
  beforeEach(() => {
    const next = jest.fn();
    const error = jest.fn();
    const complete = jest.fn();
  });

  it('with static resolvers, calls next and then complete', done => {
    const next = jest.fn();
    const resolvers = {
      Query: {
        sampleQuery: (root, args, context) => {
          return { id: 'foo'}
        }
      }
    }
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })
    const link = new ReactiveSchemaLink({ schema });
    const observable = execute(link, {
      query: sampleQuery,
    });
    observable.subscribe({
      next,
      error: error => expect(false),
      complete: () => {
        expect(next).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });

  it('with observable resolvers, calls next with emits and then complete', done => {
    const next = jest.fn();
    const resolvers = {
      Query: {
        sampleQuery: (root, args, context) => {
          return from([
            { id: 'foo' },
            { id: 'bar' }
          ])
        }
      }
    }
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })
    const link = new ReactiveSchemaLink({ schema });
    const observable = execute(link, {
      query: sampleQuery,
    });
    observable.subscribe({
      next,
      error: error => expect(false),
      complete: () => {
        expect(next).toHaveBeenCalledTimes(2);
        done();
      },
    });
  });

  it('calls error when fetch fails', done => {
    const badTypeDefs = 'type Query {}';
    const badSchema = makeExecutableSchema({ typeDefs });

    const link = new ReactiveSchemaLink({ schema: badSchema });
    const observable = execute(link, {
      query: sampleQuery,
    });
    observable.subscribe(
      result => expect(false),
      error => {
        expect(error).toBeDefined();
        done();
      },
      () => {
        expect(false);
        done();
      },
    );
  });

  it('pass down variables', done => {
    const next = jest.fn();
    const sampleQueryWithArgsResolver = jest.fn()
    const resolvers = {
      Query: {
        sampleQueryWithArgs: (root, args, context) => {
          sampleQueryWithArgsResolver(args);
          return { id: 'foo' }
        }
      }
    }
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })
    const link = new ReactiveSchemaLink({ schema });
    const observable = execute(link, {
      query: SampleQueryWithArgs,
      variables: { foo: 1}
    });
    observable.subscribe({
      next,
      error: error => done(error),
      complete: () => {
        expect(sampleQueryWithArgsResolver).toHaveBeenCalledTimes(1);
        expect(sampleQueryWithArgsResolver).toBeCalledWith({ foo: 1 })
        done();
      },
    });
  });

  it('throws an error when context keys are being overriden by variables', done => {
    const next = jest.fn();
    const sampleQueryWithArgsResolver = jest.fn()
    const resolvers = {
      Query: {
        sampleQueryWithArgs: (root, args, context) => {
          sampleQueryWithArgsResolver(args);
          return { id: 'foo' }
        }
      }
    }
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })
    const link = new ReactiveSchemaLink({ schema, context: { foo: 2 } });
    const observable = execute(link, {
      query: SampleQueryWithArgs,
      variables: { foo: 1 }
    });
    observable.subscribe({
      next,
      error: error => {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/Variables overrides keys/);
        done();
      },
      complete: () => {
        done();
      },
    });
  });
});
