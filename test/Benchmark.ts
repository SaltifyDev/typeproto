import { ProtoField, ProtoMessage } from '../src';

const Message = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
    fixed32Field: ProtoField(2, 'fixed32'),
    sint32Field: ProtoField(3, 'sint32'),
    boolField: ProtoField(4, 'bool'),
    stringField: ProtoField(5, 'string'),
    nestedMessageField: ProtoField(6, () => ({
        nestedField: ProtoField(1, 'uint32'),
    })),
    repeatedMessageField: ProtoField(7, () => ({
        nestedField: ProtoField(1, 'uint32'),
    }), false, true),
    repeatedPackedField: ProtoField(8, 'uint32', false, true, true),
    repeatedNotPackedField: ProtoField(9, 'uint32', false, true, false),
});

const sample = {
    uint32Field: 1,
    fixed32Field: 2,
    sint32Field: -1,
    boolField: true,
    stringField: 'hello world',
    nestedMessageField: { nestedField: 42 },
    repeatedMessageField: [{ nestedField: 1 }, { nestedField: 2 }, { nestedField: 3 }],
    repeatedPackedField: [1, 2, 3, 4, 5],
    repeatedNotPackedField: [6, 7, 8, 9, 10],
};

function bench(label: string, iterations: number, fn: () => void) {
    // warmup
    fn();
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    console.log(`${label}: ${iterations} iterations -> ${ms.toFixed(2)}ms (${(iterations / ms * 1000).toFixed(0)} ops/sec)`);
}

const iterations = 1_000_000;
let lastBuffer: Buffer;
let checksum = 0;

bench('encode', iterations, () => {
    lastBuffer = Message.encode(sample);
    checksum ^= lastBuffer.length;
});

const bufferForDecode = Message.encode(sample);
bench('decode', iterations, () => {
    const decoded = Message.decode(bufferForDecode);
    // touch a field to keep property access hot
    checksum ^= decoded.uint32Field ?? 0;
});

// prevent dead-code elimination in V8
console.log('checksum', checksum, 'lastBufferLength', lastBuffer!.length);
