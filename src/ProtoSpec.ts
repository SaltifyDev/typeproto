import { InferProtoModel, InferProtoModelInput, ProtoMessage, ProtoModel } from './ProtoMessage';
import { ScalarType } from './ScalarType';

export type Supplier<T> = () => T;
export type ProtoFieldType =
    | ScalarType
    | ProtoModel
    | ProtoMessage<ProtoModel>
    | Supplier<ProtoModel | ProtoMessage<ProtoModel>>;

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
        : T extends ProtoModel | ProtoMessage<ProtoModel>
        ? InferProtoModel<T>
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
        : T extends ProtoModel | ProtoMessage<ProtoModel>
        ? InferProtoModelInput<T>
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
