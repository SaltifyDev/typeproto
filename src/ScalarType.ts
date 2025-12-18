import { ScalarTypeToTsType } from './ProtoSpec';

export type ScalarType =
    | 'double'
    | 'float'
    | 'int64'
    | 'uint64'
    | 'int32'
    | 'fixed64'
    | 'fixed32'
    | 'bool'
    | 'string'
    | 'bytes'
    | 'uint32'
    | 'sfixed32'
    | 'sfixed64'
    | 'sint32'
    | 'sint64';

export const ScalarTypeDefaultValue: {
    [K in ScalarType]: ScalarTypeToTsType<K> | (() => ScalarTypeToTsType<K>);
} = {
    double: 0,
    float: 0,
    int64: BigInt(0),
    uint64: BigInt(0),
    int32: 0,
    fixed64: BigInt(0),
    fixed32: 0,
    bool: false,
    string: '',
    bytes: () => Buffer.alloc(0),
    uint32: 0,
    sfixed32: 0,
    sfixed64: BigInt(0),
    sint32: 0,
    sint64: BigInt(0),
};
