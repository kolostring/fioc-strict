# @fioc/strict

@fioc/strict is an extension of the FIOC (Functional Inversion Of Control) library, providing stricter type checking for dependency registration in JS/TS applications. It enhances `@fioc/core` by enforcing compile-time validation of dependency trees, ensuring robust and type-safe dependency injection.

## Features

- 🔒 **Stricter Type Safety**: Enforces compile-time validation for all dependency registrations
- 🛡️ **Error Detection in Compile Time**:
  - Type error if registering factories with unregistered dependencies
  - Type error if registering duplicate tokens for factories or dependencies
  - Type `never` if resolving unregistered dependencies
- 🎯 **No Type Casting**: Dependencies resolve to their correct types automatically
- 🏗️ **Builder Pattern**: Fluent API for strict dependency management
- 🔄 **Immutable**: Container state remains immutable for safe concurrent usage
- 🔌 **Universal**: Works in both front-end and back-end environments
- 🧩 **Modular Design**: Seamlessly integrates with `@fioc/core` containers
- 🔗 **Container Merging**: Merge strict containers while preserving type safety
- 🚪 **Escape Hatch**: Use `replace`, `replaceFactory`, or `replaceFactoryArray` for safe registration updates

[Jump to Basic Usage →](#basic-usage)

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Creating Tokens](#creating-tokens)
  - [Strict Registration & Resolving](#strict-registration--resolving)
- [Advanced Usage](#advanced-usage)
  - [Factories](#factories)
  - [Class Factories](#class-factories)
  - [Replacing Registrations](#replacing-registrations)
  - [Merging Containers](#merging-containers)

## Installation

Install the library using npm, pnpm, or yarn (requires `@fioc/core`):

```bash
npm install @fioc/core @fioc/strict
```

```bash
pnpm install @fioc/core @fioc/strict
```

```bash
yarn add @fioc/core @fioc/strict
```

## Basic Usage

### Creating Tokens

Create tokens using `@fioc/core`’s `createDIToken` function for type-safe dependency identification:

```ts
import { createDIToken } from "@fioc/core";

interface ApiService {
  getData: () => string;
}

const ApiServiceToken = createDIToken<ApiService>().as("ApiService");
```

### Strict Registration & Resolving

Use `buildStrictDIContainer` for stricter type checking during registration. Duplicate tokens or unregistered dependencies cause type errors, and resolving unregistered tokens returns type `never`:

```ts
import { buildStrictDIContainer } from "@fioc/strict";
import { ApiService, ApiServiceToken } from "./interfaces/ApiService";

const HttpApiService: ApiService = {
  getData: () => "Hello, World!",
};

// Register dependencies with strict validation
const container = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService) // Type error if token already registered
  .getResult();

// Resolve dependencies
const apiService = container.resolve(ApiServiceToken); // Type `never` if not registered, otherwise type is `ApiService`
apiService.getData(); // "Hello, World!"
```

## Advanced Usage

### Factories

Register factories with strict dependency validation. Unregistered dependencies or duplicate tokens trigger type errors:

```ts
import { buildStrictDIContainer } from "@fioc/strict";
import { ApiServiceToken } from "./interfaces/ApiService";

// Define a factory and its token
export const getDataUseCaseFactory =
  (apiService: ApiService) => (ids: string[]) =>
    apiService.getData(ids);

export const getDataUseCaseToken =
  createDIToken<ReturnType<typeof getDataUseCaseFactory>>().as(
    "getDataUseCase"
  );

// Register factory with strict dependency checking
const container = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory({
    dependencies: [ApiServiceToken], // Type error if dependencies not registered or don't match factory params
    token: getDataUseCaseToken, // Type error if token already registered
    factory: getDataUseCaseFactory,
  })
  .getResult();

// Resolve and use
const getDataUseCase = container.resolve(getDataUseCaseToken); // Type `never` if not registered, otherwise type is `(ids: string[]) => Promise<string>`
getDataUseCase(["id1", "id2"]);
```

### Class Factories

Use `constructorToFactory` from `@fioc/core` with strict container validation:

```ts
import { buildStrictDIContainer } from "@fioc/strict";
import { constructorToFactory } from "@fioc/core";

export class GetDataUseCase {
  constructor(private apiService: ApiService) {}
  execute = () => this.apiService.getData();
}

export const getDataUseCaseToken =
  createDIToken<GetDataUseCase>().as("getDataUseCase");

const container = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory({
    dependencies: [ApiServiceToken], // Type error if dependencies not registered
    token: getDataUseCaseToken, // Type error if token already registered
    factory: constructorToFactory(GetDataUseCase),
  })
  .getResult();
```

### Replacing Registrations

Safely replace existing registrations with `replace` or `replaceFactory` to avoid type errors from duplicate registrations:

```ts
import { buildStrictDIContainer } from "@fioc/strict";

const newImplementation: ApiService = {
  getData: () => "New Data!",
};

const container = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .replace(ApiServiceToken, newImplementation) // Safe replacement
  .replaceFactory({
    dependencies: [ApiServiceToken],
    token: getDataUseCaseToken,
    factory: getDataUseCaseFactory,
  })
  .getResult();
```

### Merging Containers

Merge strict containers while preserving type safety using the `merge` function:

```ts
import { buildStrictDIContainer } from "@fioc/strict";

const baseContainer = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .getResult();

const featureContainer = buildStrictDIContainer()
  .registerFactory({
    dependencies: [ApiServiceToken],
    token: getDataUseCaseToken,
    factory: getDataUseCaseFactory,
  })
  .getResult();

const combined = buildStrictDIContainer()
  .merge(baseContainer.getState()) // Merge base container state
  .merge(featureContainer.getState()) // Merge feature container state
  .getResult();
```

[Back to Top ↑](#fiocstrict)

## Contributing

Contributions are welcome! Open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc).

## License

Licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
