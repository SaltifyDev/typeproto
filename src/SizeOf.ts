import { DoubleSize, Fixed32Size, Fixed64Size, FloatSize } from './Constants';
import { Converter } from './Converter';
import { kTagLength, ProtoFieldType, ProtoSpec } from './ProtoField';
import { ScalarType } from './ScalarType';

export class SizeOf {
    static varint32(value: number): number {
        let size = 1;
        while (value > 0x7f) {
            size++;
            value >>>= 7;
        }
        return size;
    }

    static varint64(value: bigint): number {
        let size = 1;
        while (value > BigInt(0x7f)) {
            size++;
            value >>= BigInt(7);
        }
        return size;
    }
}

export type SizeCalculator = (data: any, cache: WeakMap<object, number>) => number;

// Set cache for repeated, packed, varint fields
export const ScalarSizeCalculatorCompiler: {
    [K in ScalarType]: (spec: ProtoSpec<ProtoFieldType, boolean, boolean>) => SizeCalculator;
} = {
    double: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[]) => {
                const bodySize = data.length * DoubleSize;
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) => data.length * (DoubleSize + spec[kTagLength]) 
        : () => spec[kTagLength] + DoubleSize,

    float: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[]) => {
                const bodySize = data.length * FloatSize;
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) => data.length * (FloatSize + spec[kTagLength])
        : () => spec[kTagLength] + FloatSize,

    int64: (spec) => spec.repeated ?
        spec.packed
            ? (data: bigint[], cache) => {
                const bodySize = data.reduce((acc, item) => acc + SizeOf.varint64(Converter.toUnsigned64(item)), 0);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) =>
                data.reduce((acc, item) => acc + SizeOf.varint64(Converter.toUnsigned64(item)), 0)
                + spec[kTagLength] * data.length
        : (data: bigint) => spec[kTagLength] + SizeOf.varint64(Converter.toUnsigned64(data)),

    uint64: (spec) => spec.repeated ?
        spec.packed
            ? (data: bigint[], cache) => {
                const bodySize = data.reduce((acc, item) => acc + SizeOf.varint64(item), 0);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) =>
                data.reduce((acc, item) => acc + SizeOf.varint64(item), 0)
                + spec[kTagLength] * data.length
        : (data: bigint) => spec[kTagLength] + SizeOf.varint64(data),

    int32: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[], cache) => {
                const bodySize = data.reduce((acc, item) => acc + SizeOf.varint32(Converter.toUnsigned32(item)), 0);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) =>
                data.reduce((acc, item) => acc + SizeOf.varint32(Converter.toUnsigned32(item)), 0)
                + spec[kTagLength] * data.length
        : (data: number) => spec[kTagLength] + SizeOf.varint32(Converter.toUnsigned32(data)),

    fixed64: (spec) => spec.repeated ?
        spec.packed
            ? (data: bigint[]) => {
                const bodySize = data.length * Fixed64Size;
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) => data.length * (Fixed64Size + spec[kTagLength])
        : () => spec[kTagLength] + Fixed64Size,

    fixed32: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[]) => {
                const bodySize = data.length * Fixed32Size;
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) => data.length * (Fixed32Size + spec[kTagLength])
        : () => spec[kTagLength] + Fixed32Size,

    bool: (spec) => spec.repeated ?
        spec.packed
            ? (data: boolean[]) => {
                const bodySize = data.length;
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: boolean[]) => data.length * (1 + spec[kTagLength])
        : () => spec[kTagLength] + 1,

    string: (spec) => spec.repeated
        ? (data: string[]) => {
            const totalSize = data.reduce((acc, item) => {
                const itemSize = Buffer.byteLength(item);
                return acc + SizeOf.varint32(itemSize) + itemSize;
            }, 0);
            return totalSize + spec[kTagLength] * data.length;
        }
        : (data: string) => {
            const itemSize = Buffer.byteLength(data);
            return spec[kTagLength] + SizeOf.varint32(itemSize) + itemSize;
        },

    bytes: (spec) => spec.repeated
        ? (data: Buffer[]) => {
            const totalSize = data.reduce((acc, item) => {
                const itemSize = item.length;
                return acc + SizeOf.varint32(itemSize) + itemSize;
            }, 0);
            return totalSize + spec[kTagLength] * data.length;
        }
        : (data: Buffer) => {
            const itemSize = data.length;
            return spec[kTagLength] + SizeOf.varint32(itemSize) + itemSize;
        },

    uint32: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[], cache) => {
                const bodySize = data.reduce((acc, item) => acc + SizeOf.varint32(item), 0);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) =>
                data.reduce((acc, item) => acc + SizeOf.varint32(item), 0)
                + spec[kTagLength] * data.length
        : (data: number) => spec[kTagLength] + SizeOf.varint32(data),

    sfixed32: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[]) => {
                const bodySize = data.length * Fixed32Size;
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) => data.length * (Fixed32Size + spec[kTagLength])
        : () => spec[kTagLength] + Fixed32Size,
    
    sfixed64: (spec) => spec.repeated ?
        spec.packed
            ? (data: bigint[]) => {
                const bodySize = data.length * Fixed64Size;
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) => data.length * (Fixed64Size + spec[kTagLength])
        : () => spec[kTagLength] + Fixed64Size,

    sint32: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[], cache) => {
                const bodySize = data.reduce((acc, item) => acc + SizeOf.varint32(Converter.zigzagEncode32(item)), 0);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) =>
                data.reduce((acc, item) => acc + SizeOf.varint32(Converter.zigzagEncode32(item)), 0)
                + spec[kTagLength] * data.length
        : (data) => spec[kTagLength] + SizeOf.varint32(Converter.zigzagEncode32(data)),

    sint64: (spec) => spec.repeated ?
        spec.packed
            ? (data: bigint[], cache) => {
                const bodySize = data.reduce((acc, item) => acc + SizeOf.varint64(Converter.zigzagEncode64(item)), 0);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) =>
                data.reduce((acc, item) => acc + SizeOf.varint64(Converter.zigzagEncode64(item)), 0)
                + spec[kTagLength] * data.length
        : (data: bigint) => spec[kTagLength] + SizeOf.varint64(Converter.zigzagEncode64(data)),
};
