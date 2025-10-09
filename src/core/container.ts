import { DIContainer, DIContainerState, DIFactory, DIToken } from "@fioc/core";
import { produce } from "immer";

type Merge<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type Registered<Token extends DIToken<T, Key>, T, Key extends string> = {
  [K in Token]: T;
};

type UnionToIntersection<U> = (U extends any ? (x: U) => any : never) extends (
  x: infer I
) => any
  ? I
  : never;

type StateFromFactories<T extends readonly unknown[]> = Merge<
  UnionToIntersection<
    {
      [K in keyof T]: T[K] extends DIFactory<any, infer R> & {
        token: DIToken<any, infer Key>;
      }
        ? Registered<DIToken<R, Key>, R, Key>
        : never;
    }[number]
  >
>;

/**
 * Builder interface for creating a strictly-typed DI container.
 * Provides compile-time validation of dependency registration and resolution.
 *
 * The strict builder ensures:
 * - No duplicate registrations
 * - All factory dependencies exist
 * - Type-safe dependency resolution
 *
 * @template DIState - The current state type of the container
 * @template D - The type of dependencies managed by the container
 *
 * @example
 * ```typescript
 * const container = buildStrictDIContainer()
 *   // Type error if ApiServiceToken is already registered
 *   .register(ApiServiceToken, new HttpApiService())
 *
 *   // Type error if dependencies are not registered
 *   .registerFactory({
 *     token: UseCaseToken,
 *     dependencies: [ApiServiceToken],
 *     factory: UseCaseFactory
 *   })
 *   .getResult();
 * ```
 */
export interface StrictDIContainerBuilder<
  DIState extends DIContainerState<D>,
  D = unknown
> {
  /**
   * Merges another container's state into this container.
   * Useful for combining multiple container configurations.
   *
   * @param containerState - The state to merge
   * @returns A new builder with the merged state
   *
   * @example
   * ```typescript
   * const combined = baseContainer
   *   .merge(featureContainer.getState())
   *   .getResult();
   * ```
   */
  merge<MD extends DIContainerState<any>>(
    containerState: MD
  ): StrictDIContainerBuilder<Merge<DIState & MD>>;

  /**
   * Registers a new value with strict type checking.
   * Will fail at compile-time if the token is already registered.
   *
   * @param token - The token to register (must not exist in container)
   * @param value - The value to register
   * @returns A new builder with the registered value
   * @throws Compile-time error if token is already registered
   *
   * @example
   * ```typescript
   * container.register(ApiServiceToken, HttpApiService)
   * // Error: Token already registered
   * container.register(ApiServiceToken, MockApiService)
   * ```
   */
  register<T, Key extends string>(
    token: DIToken<T, Key> extends keyof DIState
      ? "this token is already registered"
      : DIToken<T, Key>,
    value: T
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<T, Key>, T, Key>>
  >;

  /**
   * Safely replaces an existing registration.
   * Useful for testing or changing implementations at runtime.
   *
   * @param token - The token to replace
   * @param value - The new value
   * @returns A new builder with the replaced value
   *
   * @example
   * ```typescript
   * container.replace(ApiServiceToken, MockApiService)
   * ```
   */
  replace<T, Key extends string>(
    token: DIToken<T, Key>,
    value: T
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<T, Key>, T, Key>>
  >;

  /**
   * Registers a new factory with strict dependency checking.
   * Validates at compile-time that all dependencies exist.
   *
   * @param def - The factory definition
   * @returns A new builder with the registered factory
   * @throws Compile-time error if token exists or dependencies are missing
   *
   * @example
   * ```typescript
   * container.registerFactory({
   *   token: UseCaseToken,
   *   dependencies: [ApiServiceToken], // Type error if ApiServiceToken not registered or dependencies don't match factory params
   *   factory: UseCaseFactory
   * })
   * ```
   */
  registerFactory<
    Key extends string,
    Deps extends readonly any[],
    Return = unknown
  >(
    token: DIToken<Return, Key> extends keyof DIState
      ? "This token is already registered"
      : DIToken<Return, Key>,
    value: Exclude<
      DIToken<any, keyof DIState extends DIToken<any, infer K> ? K : never>,
      DIToken<
        any,
        keyof DIState extends DIToken<infer T, infer K>
          ? T extends Deps[number]
            ? K
            : never
          : never
      >
    > extends never
      ? DIFactory<Deps, Return>
      : "One or more dependencies are not registered in the container",
    scope?: "transient" | "singleton" | "scoped"
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<Return, Key>, Return, Key>>
  >;

  /**
   * Replaces an existing factory registration.
   * Useful for testing or changing factory implementations.
   *
   * @param def - The new factory definition
   * @returns A new builder with the replaced factory
   *
   * @example
   * ```typescript
   * container.replaceFactory({
   *   token: UseCaseToken,
   *   dependencies: [MockApiToken],
   *   factory: UseCaseFactory
   * })
   * ```
   */
  replaceFactory<
    Key extends string,
    Deps extends readonly any[],
    Return = unknown
  >(
    token: DIToken<Return, Key>,
    value: DIFactory<Deps, Return>,
    scope?: "transient" | "singleton" | "scoped"
  ): StrictDIContainerBuilder<
    Merge<DIState & Registered<DIToken<Return, Key>, Return, Key>>
  >;

  /**
   * Replaces multiple factories at once.
   * Useful for bulk updates of factory implementations.
   *
   * @param values - Array of factory definitions to replace
   * @returns A new builder with all factories replaced
   *
   * @example
   * ```typescript
   * container.replaceFactoryArray([
   *   {
   *     token: UseCaseToken,
   *     dependencies: [MockApiToken],
   *     factory: UseCaseFactory
   *   },
   *   {
   *     token: OtherUseCaseToken,
   *     dependencies: [MockApiToken],
   *     factory: OtherUseCaseFactory
   *   }
   * ])
   * ```
   */
  replaceFactoryArray<T extends readonly unknown[]>(values: {
    [K in keyof T]: T[K] extends DIFactory<infer D, infer R> & {
      token: DIToken<any, infer Key>;
    }
      ? T[K]
      : T[K] extends {
          token: DIToken<unknown, infer Key>;
          dependencies: unknown[];
          factory: (...args: infer Deps) => infer Res;
        }
      ? DIFactory<Deps, Res> & { token: DIToken<Res, Key> }
      : DIFactory & { token: DIToken<any, string> };
  }): StrictDIContainerBuilder<DIState & StateFromFactories<T>>;

  /**
   * Finalizes the builder and returns an immutable container.
   *
   * @returns A DIContainer instance with the registered dependencies
   *
   * @example
   * ```typescript
   * const container = builder.getResult();
   * const api = container.resolve(ApiServiceToken);
   * ```
   */
  getResult(): DIContainer<DIState>;
}

function defineSingleton<
  T extends (...args: Params) => any,
  Params extends any[]
>(fn: T) {
  let instance: ReturnType<T> | undefined;

  return (...args: Params) => {
    instance ??= fn(...args);
    return instance as ReturnType<T>;
  };
}

/**
 * Builder of a Strict Dependency Injection (DI) container.
 * The container allows registering and resolving dependencies
 * with full and strict typesafe support.
 *
 * @param containerState - The initial state of the container (optional).
 * @returns A DI container builder for registering dependencies and creating a static container.
 */
export function buildStrictDIContainer<State extends DIContainerState<T>, T>(
  containerState: State = {} as State
): StrictDIContainerBuilder<State> {
  const diContainer: StrictDIContainerBuilder<State> = {
    merge(stateToMerge) {
      return buildStrictDIContainer({
        ...containerState,
        ...stateToMerge,
      }) as any;
    },
    register(token, value) {
      if (token in containerState)
        throw new Error(
          `Token Symbol(${Symbol.keyFor(token as symbol)}) already registered`
        );

      return diContainer.replace(
        token as unknown as DIToken<T, string>,
        value as unknown
      );
    },
    replace(token, value) {
      const newState = produce(containerState, (draft: any) => {
        draft[token as DIToken<typeof value, string>] = value;
        return draft;
      });

      return buildStrictDIContainer(
        newState as State & { [K in typeof token]: typeof value }
      ) as unknown as ReturnType<StrictDIContainerBuilder<State>["register"]>;
    },
    registerFactory(token, value, scope = "transient") {
      if (typeof value !== "object" || !value) {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      const { dependencies } = value;

      if (token in containerState) {
        throw new Error(
          `Token Symbol(${Symbol.keyFor(token as symbol)}) already registered`
        );
      }

      // Verify all dependencies are registered
      for (const dep of dependencies) {
        if (!(dep in containerState)) {
          throw new Error(
            `Dependency Symbol(${Symbol.keyFor(dep as symbol)}) not registered`
          );
        }
      }

      return diContainer.replaceFactory(
        token as DIToken<any, string>,
        value,
        scope
      );
    },
    replaceFactory(token, value, scope = "transient") {
      if (typeof value !== "object") {
        throw new Error(`Factory must be an object. Got ${value} instead`);
      }

      const newState = produce(containerState, (draft: any) => {
        const val =
          scope === "singleton"
            ? { ...value, factory: defineSingleton(value.factory) }
            : value;

        draft[token] = {
          ...val,
          scope,
        };
        return draft;
      });

      return buildStrictDIContainer(newState) as unknown as any;
    },
    replaceFactoryArray(values) {
      const newState = produce(containerState, (draft: any) => {
        values.forEach((value) => {
          draft[value.token] = value;
        });
        return draft;
      });

      return buildStrictDIContainer(newState) as unknown as any;
    },
    getResult(): DIContainer<State> {
      const diContainer: DIContainer<State> = {
        getState: () => containerState,
        resolve: <T, Key extends string>(toResolve: DIToken<unknown, Key>) => {
          const token = toResolve;

          if (!(token in containerState))
            throw new Error(
              `Could not Resolve: Token Symbol(${Symbol.keyFor(
                token
              )}) not found`
            );
          const state = (containerState as any)[token];

          if (!(state as DIFactory).dependencies) {
            return state as T;
          }

          return (state as DIFactory).factory(
            ...(state as DIFactory).dependencies.map(
              (dep: DIToken<unknown, string>) => diContainer.resolve(dep)
            )
          ) as T;
        },
        createScope(callback) {
          const instances: { [key: DIToken<any>]: any } = {};
          const scopedResolve: (typeof diContainer)["resolve"] = (
            token: DIToken<any>
          ) => {
            if (token in instances) return instances[token];
            const resolved = diContainer.resolve(token);
            if ((diContainer.getState() as any)[token]?.["scope"] === "scoped")
              instances[token] = resolved;

            return resolved;
          };

          callback(scopedResolve);
        },
      };

      return diContainer;
    },
  };

  return diContainer;
}
