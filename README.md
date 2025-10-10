# @fioc/strict

**@fioc/strict** is an extension of FIoC (Fluid Inversion Of Control) providing **stricter type checking and compile-time validation** for dependency injection in TypeScript/JavaScript applications. It enhances [@fioc/core](https://www.npmjs.com/package/@fioc/core) by enforcing safety rules to prevent runtime errors and type mismatches.

---

## 🔑 Key Advantages

- 🔒 **Compile-time validation**: Detect unregistered dependencies or duplicate tokens at compile time.
- 🛡️ **Safe resolution**: Resolving unregistered dependencies returns type `never`.
- 🚀 **Strict factory validation**: Ensure factory parameters match registered dependencies.
- 🧩 **Composable containers**: Merge strict containers while preserving type safety.
- 🛠️ **Controlled replacements**: Safely replace existing registrations with `replace` or `replaceFactory`.

> Unlike `@fioc/core`, @fioc/strict focuses solely on **compile-time guarantees** and validation.

---

## Installation

```bash
npm install @fioc/core @fioc/strict
# or
yarn add @fioc/core @fioc/strict
# or
pnpm add @fioc/core @fioc/strict
```

---

## Quick Example: Strict Registration & Resolving

```ts
import { buildStrictDIContainer } from "@fioc/strict";
import { createDIToken } from "@fioc/core";

interface ApiService {
  getData: () => string;
}

const ApiServiceToken = createDIToken<ApiService>().as("ApiService");

const HttpApiService: ApiService = { getData: () => "Hello, World!" };

const container = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .getResult();

const apiService = container.resolve(ApiServiceToken); // Type `never` if not registered
apiService.getData(); // "Hello, World!"
```

---

## Advanced Usage

### Factories with Strict Validation

```ts
import { buildStrictDIContainer } from "@fioc/strict";
import { createDIToken } from "@fioc/core";

export const getDataUseCaseToken =
  createDIToken<() => string>().as("getDataUseCase");

const getDataUseCaseFactory = (apiService: ApiService) => () =>
  apiService.getData();

const container = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .registerFactory(getDataUseCaseToken, {
    // Type error if the token is already registered
    dependencies: [ApiServiceToken], // Type error if not registered
    factory: getDataUseCaseFactory,
  })
  .getResult();

const useCase = container.resolve(getDataUseCaseToken); // Type `never` if not registered
useCase();
```

### Replacing Registrations Safely

```ts
const newImplementation: ApiService = { getData: () => "New Data!" };

const container = buildStrictDIContainer()
  .register(ApiServiceToken, HttpApiService)
  .replace(ApiServiceToken, newImplementation) // Won't give type error
  .replaceFactory(getDataUseCaseToken, {
    dependencies: [ApiServiceToken],
    factory: getDataUseCaseFactory,
  })
  .getResult();
```

---

## Contributing

Open issues or submit pull requests on [GitHub](https://github.com/kolostring/fioc). Include tests for behavioral changes.

## License

MIT License. See [LICENSE](./LICENSE).
