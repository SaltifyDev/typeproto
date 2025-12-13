# Typeproto

Fast, code-first protobuf serialization library for TypeScript.

**Important: The library uses `Buffer` API, which is only available in Node.js and recent versions of Deno. It is not compatible with browser environments.**

## Basic Usage

A message can be defined as follows:

```typescript
import { ProtoField, ProtoMessage } from '@saltify/typeproto';

const TestMessage = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
    fixed32Field: ProtoField(2, 'fixed32'),
    sint32Field: ProtoField(3, 'sint32'),
    boolField: ProtoField(4, 'bool'),
    stringField: ProtoField(5, 'string'),
    nestedMessageField: ProtoField(6, {
        nestedField: ProtoField(1, 'uint32'),
    }),
    repeatedMessageField: ProtoField(7, {
        nestedField: ProtoField(1, 'uint32'),
    }, 'repeated'),
    repeatedPackedField: ProtoField(8, 'uint32', 'repeated'),
    repeatedNotPackedField: ProtoField(9, 'uint32', 'repeated', { packed: false }),
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
        {}, // Even an empty object is valid
    ],
    repeatedPackedField: [1, 2, 3],
    repeatedNotPackedField: [4, 5, 6],
});

// The decoded message also has the correct type
const decoded = TestMessage.decode(encoded);
```

Note that all fields are not required when you pass an object to `encode`. If a non-optional field is not provided, it will be encoded as the default value (zero / empty string / false) of the field type.

### Reuse a message

You can define a message model and reuse it in multiple places:

```typescript
const TestMessageA = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
});

const TestMessageB = ProtoMessage.of({
    reusedField: ProtoField(1, TestMessageA),
});
```

You can also provide your model in a lambda:

```typescript
const TestMessageA = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
});

const TestMessageB = ProtoMessage.of({
    reusedField: ProtoField(1, () => TestMessageA),
});
```

This could be useful when you want to circularly reference a message model in another file.

## Advanced Usage

### The `model` property

The `ProtoMessage` class has a property `model`, which is the model object provided to the `of` method. You can use it to get the model object, which is useful for some advanced use cases.

For example, you can refer to this object to compile the model object to protobuf file or other formats:

```typescript
const TestMessage = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
});

for (const field in TestMessage.model) {
    // Do something with every field
}
```

### Utility types

`InferProtoModel` and `InferProtoModelInput` are the utility types that can be used to infer output and input types from the model object. When you pass an object to `ProtoMessage<T>.encode`, it will be checked against `InferProtoModelInput<T>`; and when you decode a buffer, the result will satisfy the type `InferProtoModel<T>`. This is useful when you want to use the model in a more generic way.

Assume that you defined a message model, and want to create a list which you can push objects of the model into. You then use the list to generate a list of encoded buffers:

```typescript
const TestMessage = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
});

const messages = InferProtoModelInput<typeof TestMessage>[];
// this is a shorthand for InferProtoModelInput<typeof TestMessage.model>

messages.push({ uint32Field: 1 });
messages.push({}); // All fields are optional, so this is also valid

const buffers = messages.map((msg) => TestMessage.encode(msg));
```

## Performance

`@saltify/typeproto` is **3x faster** than unoptimized `@protobuf-ts/runtime` when serializing 100000 same messages in a row, and **1.4x faster** when deserializing, according to the benchmark test.

The efficiency of this package comes from the fact that it "compiles" the model written in TypeScript and tends to expand all the logic ahead of use, instead of determining which part of the logic to use at runtime with tons of `if` and `switch` statements. The latter approach is the one used by `@protobuf-ts/runtime`, which is a general-purpose library that can be used in any environment, but it is not optimized for the specific use case of this project. `protobuf-ts` can also optimize the code by expanding the logic, but only when compiling proto files. This project did not use raw proto files, but instead used DSL-like code to describe the model, so it cannot benefit from the optimizations of `protobuf-ts`.

## Special Thanks

The DSL is inspired by [`@napneko/nap-proto-core`](https://npmjs.com/package/@napneko/nap-proto-core), which uses `@protobuf-ts/runtime` as the backend. The DSL describes the model in an elegant way and is still valid TypeScript code, and can be used directly for type inference. This package fully adopted this style of model representation.
