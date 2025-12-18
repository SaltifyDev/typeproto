const MAX_UINT64 = 2n ** 64n;
const MAX_INT64 = 2n ** 63n;

export namespace Converter {
    export function tag(fieldNumber: number, wireType: number): number {
        return (fieldNumber << 3) | wireType;
    }

    export function toSigned32(value: number): number {
        return value | 0;
    }

    export function toSigned64(value: bigint): bigint {
        return value >= MAX_INT64 ? value - MAX_UINT64 : value;
    }

    export function toUnsigned32(value: number): number {
        return value >>> 0;
    }

    export function toUnsigned64(value: bigint): bigint {
        return value < 0 ? value + MAX_UINT64 : value;
    }

    export function zigzagEncode32(n: number): number {
        return (n << 1) ^ (n >> 31);
    }

    export function zigzagEncode64(n: bigint): bigint {
        return (n << BigInt(1)) ^ (n >> BigInt(63));
    }

    export function zigzagDecode32(n: number): number {
        return (n >>> 1) ^ -(n & 1);
    }

    export function zigzagDecode64(n: bigint): bigint {
        return (n >> BigInt(1)) ^ -(n & BigInt(1));
    }
}
