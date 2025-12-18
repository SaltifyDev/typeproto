import { CodedReader } from './CodedReader';
import { CodedWriter } from './CodedWriter';
import { ProtoDeserializer, ScalarDeserializerCompiler } from './ProtoDeserializer';
import {
    InferProtoSpec,
    InferProtoSpecInput,
    kTag,
    kTagLength,
    ProtoFieldModifier,
    ProtoFieldOptions,
    ProtoFieldType,
    ProtoSpec,
} from './ProtoSpec';
import { ProtoSerializer, ScalarSerializerCompiler } from './ProtoSerializer';
import { ScalarType, ScalarTypeDefaultValue } from './ScalarType';
import { ScalarSizeCalculatorCompiler, ProtoSizeCalculator, SizeOf } from './ProtoSizeCalculator';
import { WireType } from './WireType';
import { Converter } from './Converter';

export interface ProtoModel extends Record<string, ProtoSpec<ProtoFieldType, boolean, boolean>> {}

export type InferProtoModel<T extends ProtoModel | ProtoMessage<ProtoModel>> =
    T extends ProtoModel
    ? { [Key in keyof T]: InferProtoSpec<T[Key]> }
    : T extends ProtoMessage<infer M>
    ? InferProtoModel<M>
    : never;

export type InferProtoModelInput<T extends ProtoModel | ProtoMessage<ProtoModel>> =
    T extends ProtoModel
    ? Partial<{ [Key in keyof T]: InferProtoSpecInput<T[Key]> }>
    : T extends ProtoMessage<infer M>
    ? InferProtoModelInput<M>
    : never;

export class ProtoMessage<const T extends ProtoModel> {
    private static compiledMessages = new WeakMap<ProtoModel, ProtoMessage<ProtoModel>>();

    private readonly fieldSizeCalculators = new Map<string, ProtoSizeCalculator>();
    private readonly fieldSerializers = new Map<string, ProtoSerializer>();

    private readonly fieldDefaultValues: [string, any | (() => any)][] = [];
    private readonly fieldDeserializers = new Map<number, ProtoDeserializer>();

    private constructor(readonly model: T) {
        for (const key in model) {
            const spec = model[key];
            const type = spec.type;
            if (typeof type === 'function' || typeof type === 'object') {
                let modelOrLazy: ProtoModel | undefined;
                function resolveModel() {
                    if (modelOrLazy === undefined) {
                        if (typeof type === 'function') {
                            const modelOrMessage = type();
                            if (modelOrMessage instanceof ProtoMessage) {
                                modelOrLazy = modelOrMessage.model;
                            } else {
                                modelOrLazy = modelOrMessage;
                            }
                        } else if (typeof type === 'object') {
                            if (type instanceof ProtoMessage) {
                                modelOrLazy = type.model;
                            } else {
                                modelOrLazy = type;
                            }
                        } else {
                            throw new Error('Unexpected type');
                        }
                    }
                    return modelOrLazy;
                }
                if (spec.repeated) {
                    this.fieldSizeCalculators.set(key, (data, cache) => {
                        let size = spec[kTagLength] * data.length;
                        const message = ProtoMessage.of(resolveModel());
                        for (const item of data) {
                            const bodySize = message.calculateSerializedSize(item, cache);
                            cache.set(item, bodySize);
                            size += SizeOf.varint32(bodySize) + bodySize;
                        }
                        return size;
                    });
                    this.fieldSerializers.set(key, (data, writer, cache) => {
                        const message = ProtoMessage.of(resolveModel());
                        for (const item of data) {
                            const bodySize = cache.get(item)!;
                            writer.writeVarint(spec[kTag]);
                            writer.writeVarint(bodySize);
                            message.write(item, writer, cache);
                        }
                    });
                    this.fieldDefaultValues.push([key, () => []]);
                    this.fieldDeserializers.set(spec.fieldNumber, (draft, reader) => {
                        const message = ProtoMessage.of(resolveModel());
                        const item = message.createDraft();
                        const length = reader.readVarint();
                        const offset = reader.offset;
                        message.read(item, reader, offset + length);
                        draft[key].push(item);
                    });
                } else {
                    this.fieldSizeCalculators.set(key, (data, cache) => {
                        const message = ProtoMessage.of(resolveModel());
                        const bodySize = message.calculateSerializedSize(data, cache);
                        return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
                    });
                    this.fieldSerializers.set(key, (data, writer, cache) => {
                        const message = ProtoMessage.of(resolveModel());
                        const bodySize = cache.get(data)!;
                        writer.writeVarint(spec[kTag]);
                        writer.writeVarint(bodySize);
                        message.write(data, writer, cache);
                    });
                    if (spec.optional) {
                        this.fieldDefaultValues.push([key, undefined]);
                    } else {
                        this.fieldDefaultValues.push([key, () => {
                            const message = ProtoMessage.of(resolveModel());
                            return message.createDraft();
                        }]);
                    }
                    this.fieldDeserializers.set(spec.fieldNumber, (draft, reader) => {
                        const message = ProtoMessage.of(resolveModel());
                        const item = message.createDraft();
                        const length = reader.readVarint();
                        const offset = reader.offset;
                        message.read(item, reader, offset + length);
                        draft[key] = item;
                    });
                }
            } else {
                this.fieldSizeCalculators.set(key, ScalarSizeCalculatorCompiler[type](spec));
                this.fieldSerializers.set(key, ScalarSerializerCompiler[type](spec));
                if (spec.repeated) {
                    this.fieldDefaultValues.push([key, () => []]);
                } else if (spec.optional) {
                    this.fieldDefaultValues.push([key, undefined]);
                } else {
                    this.fieldDefaultValues.push([key, ScalarTypeDefaultValue[type]]);
                }
                this.fieldDeserializers.set(
                    spec.fieldNumber,
                    ScalarDeserializerCompiler[type](
                        key,
                        // @ts-ignore
                        spec
                    )
                );
            }
        }
    }

    private calculateSerializedSize(message: InferProtoModelInput<T>, cache: WeakMap<object, number>): number {
        let size = 0;
        for (const key in message) {
            const value = message[key];
            if (value === undefined) {
                continue;
            }
            const calculator = this.fieldSizeCalculators.get(key)!;
            const addSize = calculator(value, cache);
            size += addSize;
        }
        cache.set(message, size);
        return size;
    }

    private write(message: InferProtoModelInput<T>, writer: CodedWriter, cache: WeakMap<object, number>) {
        for (const key in message) {
            const value = message[key];
            if (value === undefined) {
                continue;
            }
            const serializer = this.fieldSerializers.get(key)!;
            serializer(
                // @ts-ignore
                value,
                writer,
                cache
            );
        }
    }

    private createDraft(): InferProtoModel<T> {
        const draft: any = {};
        for (const [key, valueOrSupplier] of this.fieldDefaultValues) {
            draft[key] = typeof valueOrSupplier === 'function' ? valueOrSupplier() : valueOrSupplier;
        }
        return draft;
    }

    private read(draft: InferProtoModel<T>, reader: CodedReader, limit: number = reader.length) {
        while (reader.offset < limit) {
            const { fieldNumber, wireType } = reader.readTag();
            if (!this.fieldDeserializers.has(fieldNumber)) {
                reader.skip(wireType);
                continue;
            }
            const deserializer = this.fieldDeserializers.get(fieldNumber)!;
            deserializer(draft, reader, wireType);
        }
    }

    encode(message: InferProtoModelInput<T>): Buffer {
        const cache = new WeakMap<object, number>();
        const size = this.calculateSerializedSize(message, cache);
        const writer = new CodedWriter(size);
        this.write(message, writer, cache);
        return writer.build();
    }

    decode(buffer: Buffer): InferProtoModel<T> {
        const reader = new CodedReader(buffer);
        const draft = this.createDraft();
        this.read(draft, reader);
        return draft;
    }

    static of<const T extends ProtoModel>(model: T): ProtoMessage<T> {
        let message = this.compiledMessages.get(model);
        if (message === undefined) {
            message = new ProtoMessage(model);
            this.compiledMessages.set(model, message);
        }
        return message as ProtoMessage<T>;
    }
}

const ScalarTypeToWireType: Record<ScalarType, WireType> = {
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

export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T
): ProtoSpec<T, false, false>;
export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T,
    modifier: 'optional'
): ProtoSpec<T, true, false>;
export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T,
    modifier: 'repeated',
    options?: ProtoFieldOptions<'repeated'>
): ProtoSpec<T, false, true>;
export function ProtoField<T extends ProtoFieldType>(
    fieldNumber: number,
    type: T,
    modifier?: ProtoFieldModifier,
    options?: ProtoFieldOptions
): ProtoSpec<T, boolean, boolean> {
    if (modifier === 'repeated' && options?.packed === undefined) {
        options = { ...options, packed: true };
    }
    const tag = Converter.tag(
        fieldNumber,
        typeof type === 'function' || typeof type === 'object'
            ? WireType.LengthDelimited
            : options?.packed
            ? WireType.LengthDelimited
            : ScalarTypeToWireType[type]
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
