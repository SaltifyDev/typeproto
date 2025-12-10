# Typeproto

Fast, code-first protobuf serialization library for TypeScript.

**Important: The library uses `Buffer` API, which is only available in Node.js and recent versions of Deno. It is not compatible with browser environments.**

## Usage

The DSL is inspired by [`@napneko/nap-proto-core`](https://npmjs.com/package/@napneko/nap-proto-core), which uses `@protobuf-ts/runtime` as the backend. The DSL describes the model in an elegant way and is still valid TypeScript code, and can be used directly for type inference. This package fully adopted this style of model representation.

For example, a message can be defined as follows:

```typescript
import { ProtoField, ProtoMessage } from '@saltify/typeproto';

const TestMessage = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
    // The first boolean indicates whether the field is optional
    fixed32Field: ProtoField(2, 'fixed32', false),
    sint32Field: ProtoField(3, 'sint32', false),
    boolField: ProtoField(4, 'bool', false),
    stringField: ProtoField(5, 'string', false),
    // Define nested messages in a lambda
    nestedMessageField: ProtoField(6, () => ({
        nestedField: ProtoField(1, 'uint32'),
    }), false, false),
    // The second boolean indicates whether the field is repeated
    repeatedMessageField: ProtoField(7, () => ({
        nestedField: ProtoField(1, 'uint32'),
    }), false, true),
    // The third boolean indicates whether the repeated field is packed
    repeatedPackedField: ProtoField(8, 'uint32', false, true, true),
    repeatedNotPackedField: ProtoField(9, 'uint32', false, true, false),
});
```

... and serialized/deserialized as follows:

```typescript
// The type of message is inferred automatically
// If you break the structure, TypeScript will report compile-time errors
const encoded = TestMessage.encode({
    uint32Field: 1,
    fixed32Field: 2,
    sint32Field: -1,
    boolField: true,
    stringField: 'test',
    nestedMessageField: {
        nestedField: 1,
    },
    repeatedMessageField: [
        { nestedField: 1 },
        { nestedField: 2 },
    ],
    repeatedPackedField: [1, 2, 3],
    repeatedNotPackedField: [4, 5, 6],
});

// The decoded message also has the correct type
const decoded = TestMessage.decode(encoded);
```

## Performance

`@saltify/typeproto` is **3x faster** than unoptimized `@protobuf-ts/runtime` when serializing 100000 same messages in a row, and **1.4x faster** when deserializing, according to the benchmark test.

The efficiency of this package comes from the fact that it "compiles" the model written in TypeScript and tends to expand all the logic ahead of use, instead of determining which part of the logic to use at runtime with tons of `if` and `switch` statements. The latter approach is the one used by `@protobuf-ts/runtime`, which is a general-purpose library that can be used in any environment, but it is not optimized for the specific use case of this project. `protobuf-ts` can also optimize the code by expanding the logic, but only when compiling proto files. This project did not use raw proto files, but instead used DSL-like code to describe the model, so it cannot benefit from the optimizations of `protobuf-ts`.
