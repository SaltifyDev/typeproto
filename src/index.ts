function hasBuffer(): boolean {
    return (
        typeof globalThis !== 'undefined' &&
        typeof globalThis.Buffer !== 'undefined' &&
        typeof globalThis.Buffer.from === 'function'
    );
}

if (!hasBuffer()) {
    throw new Error('Buffer is not available in this environment. TypeProto requires Buffer API support.');
}

export { ProtoMessage } from './ProtoMessage';
export { ProtoField } from './ProtoField';
export type { ScalarType } from './ScalarType';
export type { ProtoModel, InferProtoModel, InferProtoModelInput } from './ProtoMessage';
export type { ProtoSpec, InferProtoSpec, InferProtoSpecInput, ScalarTypeToTsType } from './ProtoField';
