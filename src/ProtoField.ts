import { Converter } from './Converter';
import { InferProtoModel, InferProtoModelInput, ProtoMessage, ProtoModel } from './ProtoMessage';
import { ScalarType } from './ScalarType';
import { SizeOf } from './SizeOf';
import { WireType } from './WireType';

export type Supplier<T> = () => T;
export type ProtoFieldType = ScalarType | Supplier<ProtoModel | ProtoMessage<ProtoModel>>;

export const kTag = Symbol('Cached Tag');
export const kTagLength = Symbol('Cached Tag Length');

export interface ProtoSpec<
    T extends ProtoFieldType,
    O extends boolean, // optional
    R extends boolean // repeated
> {
    fieldNumber: number;
    type: T;
    optional: O;
    repeated: R;
    packed?: boolean;
    [kTag]: number;
    [kTagLength]: number;
}

export type ProtoFieldModifier = 'optional' | 'repeated';

export type ProtoFieldOptions<M extends ProtoFieldModifier = ProtoFieldModifier> = M extends 'repeated' ? {
    packed?: boolean;
} : never;

export type InferProtoSpec<Spec> = Spec extends ProtoSpec<infer T, infer O, infer R>
    ? R extends true
        ? O extends true
            ? never
            : Array<InferProtoSpec<ProtoSpec<T, O, false>>>
        : O extends true
        ? InferProtoSpec<ProtoSpec<T, false, false>> | undefined
        : T extends ScalarType
        ? ScalarTypeToTsType<T>
        : T extends Supplier<infer S extends ProtoModel | ProtoMessage<ProtoModel>>
        ? InferProtoModel<S>
        : never
    : never;

export type InferProtoSpecInput<Spec> = Spec extends ProtoSpec<infer T, infer O, infer R>
    ? R extends true
        ? O extends true
            ? never
            : Array<InferProtoSpecInput<ProtoSpec<T, O, false>>>
        : T extends ScalarType
        ? ScalarTypeToTsType<T>
        : T extends Supplier<infer S extends ProtoModel | ProtoMessage<ProtoModel>>
        ? InferProtoModelInput<S>
        : never
    : never;

export type ScalarTypeToTsType<T extends ScalarType> = T extends
    | 'double'
    | 'float'
    | 'int32'
    | 'fixed32'
    | 'uint32'
    | 'sfixed32'
    | 'sint32'
    ? number
    : T extends
    | 'int64'
    | 'uint64'
    | 'fixed64'
    | 'sfixed64'
    | 'sint64'
    ? bigint
    : T extends 'bool'
    ? boolean
    : T extends 'string'
    ? string
    : T extends 'bytes'
    ? Buffer
    : never;

const ScalarTypeToWireType: {
    [K in ScalarType]: WireType;
} = {
    double: WireType.Fixed64,
    float: WireType.Fixed32,
    int64: WireType.Varint,
    uint64: WireType.Varint,
    int32: WireType.Varint,
    fixed64: WireType.Fixed64,
    fixed32: WireType.Fixed32,
    bool: WireType.Varint,
    string: WireType.LengthDelimited,
    bytes: WireType.LengthDelimited,
    uint32: WireType.Varint,
    sfixed32: WireType.Fixed32,
    sfixed64: WireType.Fixed64,
    sint32: WireType.Varint,
    sint64: WireType.Varint,
};

// Signature overloads, for better IntelliSense experience
export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T,
): ProtoSpec<T, false, false>;
export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T,
    modifier: 'optional',
): ProtoSpec<T, true, false>;
export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T,
    modifier: 'repeated',
    options?: ProtoFieldOptions<'repeated'>,
): ProtoSpec<T, false, true>;

export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T,
    modifier?: ProtoFieldModifier,
    options?: ProtoFieldOptions,
): ProtoSpec<T, boolean, boolean> {
    if (modifier === 'repeated' && options?.packed === undefined) {
        options = { ...options, packed: true };
    }

    const tag = Converter.tag(
        fieldNumber,
        typeof type === 'function' ? WireType.LengthDelimited :
            options?.packed ? WireType.LengthDelimited : ScalarTypeToWireType[type]
    );

    return {
        fieldNumber,
        type,
        optional: modifier === 'optional',
        repeated: modifier === 'repeated',
        packed: options?.packed,
        [kTag]: tag,
        [kTagLength]: SizeOf.varint32(tag),
    };
}
