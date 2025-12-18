import { ScalarType } from './ScalarType';
import { CodedReader } from './CodedReader';
import { ProtoSpec } from './ProtoSpec';
import { Converter } from './Converter';
import { WireType } from './WireType';
import { DoubleSize, Fixed32Size, Fixed64Size, FloatSize } from './Constants';

export type ProtoDeserializer = (draft: any, reader: CodedReader, wireType: WireType) => void;

export const ScalarDeserializerCompiler: {
    [K in ScalarType]: (key: string, spec: ProtoSpec<K, boolean, boolean>) => ProtoDeserializer;
} = {
    double: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const count = reader.readVarint() / DoubleSize;
                for (let i = 0; i < count; i++) {
                    draft[key].push(reader.readDouble());
                }
            } else {
                draft[key].push(reader.readDouble());
            }
        }
        : (draft, reader) => {
            draft[key] = reader.readDouble();
        },

    float: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const count = reader.readVarint() / FloatSize;
                for (let i = 0; i < count; i++) {
                    draft[key].push(reader.readFloat());
                }
            } else {
                draft[key].push(reader.readFloat());
            }
        }
        : (draft, reader) => {
            draft[key] = reader.readFloat();
        },

    int64: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const length = reader.readVarint();
                const endOffset = reader.offset + length;
                while (reader.offset < endOffset) {
                    draft[key].push(Converter.toSigned64(reader.readVarintToBigint()));
                }
            } else {
                draft[key].push(Converter.toSigned64(reader.readVarintToBigint()));
            }
        }
        : (draft, reader) => {
            draft[key] = Converter.toSigned64(reader.readVarintToBigint());
        },

    uint64: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const length = reader.readVarint();
                const endOffset = reader.offset + length;
                while (reader.offset < endOffset) {
                    draft[key].push(reader.readVarintToBigint());
                }
            } else {
                draft[key].push(reader.readVarintToBigint());
            }
        }
        : (draft, reader) => {
            draft[key] = reader.readVarintToBigint();
        },

    int32: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const length = reader.readVarint();
                const endOffset = reader.offset + length;
                while (reader.offset < endOffset) {
                    draft[key].push(Converter.toSigned32(reader.readVarint()));
                }
            } else {
                draft[key].push(Converter.toSigned32(reader.readVarint()));
            }
        }
        : (draft, reader) => {
            draft[key] = Converter.toSigned32(reader.readVarint());
        },

    fixed64: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const count = reader.readVarint() / Fixed64Size;
                for (let i = 0; i < count; i++) {
                    draft[key].push(reader.readFixed64());
                }
            } else {
                draft[key].push(reader.readFixed64());
            }
        }
        : (draft, reader) => {
            draft[key] = reader.readFixed64();
        },

    fixed32: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const count = reader.readVarint() / Fixed32Size;
                for (let i = 0; i < count; i++) {
                    draft[key].push(reader.readFixed32());
                }
            } else {
                draft[key].push(reader.readFixed32());
            }
        }
        : (draft, reader) => {
            draft[key] = reader.readFixed32();
        },

    bool: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const count = reader.readVarint();
                for (let i = 0; i < count; i++) {
                    draft[key].push(reader.readVarint() !== 0);
                }
            } else {
                draft[key].push(reader.readVarint() !== 0);
            }
        }
        : (draft, reader) => {
            draft[key] = reader.readVarint() !== 0;
        },
    
    string: (key, spec) => spec.repeated
        ? (draft, reader) => {
            draft[key].push(reader.readBytes(reader.readVarint()).toString());
        }
        : (draft, reader) => {
            draft[key] = reader.readBytes(reader.readVarint()).toString();
        },

    bytes: (key, spec) => spec.repeated
        ? (draft, reader) => {
            draft[key].push(reader.readBytes(reader.readVarint()));
        }
        : (draft, reader) => {
            draft[key] = reader.readBytes(reader.readVarint());
        },
    
    uint32: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const length = reader.readVarint();
                const endOffset = reader.offset + length;
                while (reader.offset < endOffset) {
                    draft[key].push(reader.readVarint());
                }
            } else {
                draft[key].push(reader.readVarint());
            }
        }
        : (draft, reader) => {
            draft[key] = reader.readVarint();
        },
    
    sfixed32: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const count = reader.readVarint() / Fixed32Size;
                for (let i = 0; i < count; i++) {
                    draft[key].push(Converter.zigzagDecode32(reader.readFixed32()));
                }
            } else {
                draft[key].push(Converter.zigzagDecode32(reader.readFixed32()));
            }
        }
        : (draft, reader) => {
            draft[key] = Converter.zigzagDecode32(reader.readFixed32());
        },

    sfixed64: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const count = reader.readVarint() / Fixed64Size;
                for (let i = 0; i < count; i++) {
                    draft[key].push(Converter.zigzagDecode64(reader.readFixed64()));
                }
            } else {
                draft[key].push(Converter.zigzagDecode64(reader.readFixed64()));
            }
        }
        : (draft, reader) => {
            draft[key] = Converter.zigzagDecode64(reader.readFixed64());
        },
    
    sint32: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const length = reader.readVarint();
                const endOffset = reader.offset + length;
                while (reader.offset < endOffset) {
                    draft[key].push(Converter.zigzagDecode32(reader.readVarint()));
                }
            } else {
                draft[key].push(Converter.zigzagDecode32(reader.readVarint()));
            }
        }
        : (draft, reader) => {
            draft[key] = Converter.zigzagDecode32(reader.readVarint());
        },
    
    sint64: (key, spec) => spec.repeated
        ? (draft, reader, wireType) => {
            if (wireType === WireType.LengthDelimited) { // packed
                const length = reader.readVarint();
                const endOffset = reader.offset + length;
                while (reader.offset < endOffset) {
                    draft[key].push(Converter.zigzagDecode64(reader.readVarintToBigint()));
                }
            } else {
                draft[key].push(Converter.zigzagDecode64(reader.readVarintToBigint()));
            }
        }
        : (draft, reader) => {
            draft[key] = Converter.zigzagDecode64(reader.readVarintToBigint());
        },
};