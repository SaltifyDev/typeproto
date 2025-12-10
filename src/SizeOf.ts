import { DoubleSize, Fixed32Size, Fixed64Size, FloatSize } from './Constants';
import { Converter } from './Converter';
import { kTagLength, ProtoFieldType, ProtoSpec } from './ProtoField';
import { ScalarType } from './ScalarType';

const VARINT32_BYTE_2 = 0x80;
const VARINT32_BYTE_3 = 0x4000;
const VARINT32_BYTE_4 = 0x200000;
const VARINT32_BYTE_5 = 0x10000000;

const VARINT64_BYTE_2 = BigInt(1) << BigInt(7);
const VARINT64_BYTE_3 = BigInt(1) << BigInt(14);
const VARINT64_BYTE_4 = BigInt(1) << BigInt(21);
const VARINT64_BYTE_5 = BigInt(1) << BigInt(28);
const VARINT64_BYTE_6 = BigInt(1) << BigInt(35);
const VARINT64_BYTE_7 = BigInt(1) << BigInt(42);
const VARINT64_BYTE_8 = BigInt(1) << BigInt(49);
const VARINT64_BYTE_9 = BigInt(1) << BigInt(56);
const VARINT64_BYTE_10 = BigInt(1) << BigInt(63);

type NumberMapper = (value: number) => number;
type BigintMapper = (value: bigint) => bigint;

function sumVarint32Array(data: readonly number[], mapper?: NumberMapper): number {
    let total = 0;
    if (mapper) {
        for (let i = 0; i < data.length; i++) {
            total += SizeOf.varint32(mapper(data[i]));
        }
    } else {
        for (let i = 0; i < data.length; i++) {
            total += SizeOf.varint32(data[i]);
        }
    }
    return total;
}

function sumVarint64Array(data: readonly bigint[], mapper?: BigintMapper): number {
    let total = 0;
    if (mapper) {
        for (let i = 0; i < data.length; i++) {
            total += SizeOf.varint64(mapper(data[i]));
        }
    } else {
        for (let i = 0; i < data.length; i++) {
            total += SizeOf.varint64(data[i]);
        }
    }
    return total;
}

function sumLengthDelimited<T>(data: readonly T[], sizeOfItem: (item: T) => number): number {
    let total = 0;
    for (let i = 0; i < data.length; i++) {
        const itemSize = sizeOfItem(data[i]);
        total += SizeOf.varint32(itemSize) + itemSize;
    }
    return total;
}

export class SizeOf {
    static varint32(value: number): number {
        value >>>= 0;
        if (value < VARINT32_BYTE_2) return 1;
        if (value < VARINT32_BYTE_3) return 2;
        if (value < VARINT32_BYTE_4) return 3;
        if (value < VARINT32_BYTE_5) return 4;
        return 5;
    }

    static varint64(value: bigint): number {
        if (value < VARINT64_BYTE_2) return 1;
        if (value < VARINT64_BYTE_3) return 2;
        if (value < VARINT64_BYTE_4) return 3;
        if (value < VARINT64_BYTE_5) return 4;
        if (value < VARINT64_BYTE_6) return 5;
        if (value < VARINT64_BYTE_7) return 6;
        if (value < VARINT64_BYTE_8) return 7;
        if (value < VARINT64_BYTE_9) return 8;
        if (value < VARINT64_BYTE_10) return 9;
        return 10;
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
                const bodySize = sumVarint64Array(data, Converter.toUnsigned64);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) =>
                sumVarint64Array(data, Converter.toUnsigned64) + spec[kTagLength] * data.length
        : (data: bigint) => spec[kTagLength] + SizeOf.varint64(Converter.toUnsigned64(data)),

    uint64: (spec) => spec.repeated ?
        spec.packed
            ? (data: bigint[], cache) => {
                const bodySize = sumVarint64Array(data);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) =>
                sumVarint64Array(data) + spec[kTagLength] * data.length
        : (data: bigint) => spec[kTagLength] + SizeOf.varint64(data),

    int32: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[], cache) => {
                const bodySize = sumVarint32Array(data, Converter.toUnsigned32);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) =>
                sumVarint32Array(data, Converter.toUnsigned32) + spec[kTagLength] * data.length
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
            return sumLengthDelimited(data, (item) => Buffer.byteLength(item)) + spec[kTagLength] * data.length;
        }
        : (data: string) => {
            const itemSize = Buffer.byteLength(data);
            return spec[kTagLength] + SizeOf.varint32(itemSize) + itemSize;
        },

    bytes: (spec) => spec.repeated
        ? (data: Buffer[]) => {
            return sumLengthDelimited(data, (item) => item.length) + spec[kTagLength] * data.length;
        }
        : (data: Buffer) => {
            const itemSize = data.length;
            return spec[kTagLength] + SizeOf.varint32(itemSize) + itemSize;
        },

    uint32: (spec) => spec.repeated ?
        spec.packed
            ? (data: number[], cache) => {
                const bodySize = sumVarint32Array(data);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) =>
                sumVarint32Array(data) + spec[kTagLength] * data.length
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
                const bodySize = sumVarint32Array(data, Converter.zigzagEncode32);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: number[]) =>
                sumVarint32Array(data, Converter.zigzagEncode32) + spec[kTagLength] * data.length
        : (data) => spec[kTagLength] + SizeOf.varint32(Converter.zigzagEncode32(data)),

    sint64: (spec) => spec.repeated ?
        spec.packed
            ? (data: bigint[], cache) => {
                const bodySize = sumVarint64Array(data, Converter.zigzagEncode64);
                cache.set(data, bodySize);
                return spec[kTagLength] + SizeOf.varint32(bodySize) + bodySize;
            }
            : (data: bigint[]) =>
                sumVarint64Array(data, Converter.zigzagEncode64) + spec[kTagLength] * data.length
        : (data: bigint) => spec[kTagLength] + SizeOf.varint64(Converter.zigzagEncode64(data)),
};
