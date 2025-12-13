import { ProtoField, ProtoMessage } from '../src';

const TestMessage = ProtoMessage.of({
    uint32Field: ProtoField(1, 'uint32'),
    fixed32Field: ProtoField(2, 'fixed32'),
    sint32Field: ProtoField(3, 'sint32'),
    boolField: ProtoField(4, 'bool'),
    stringField: ProtoField(5, 'string'),
    nestedMessageField: ProtoField(6, {
        nestedField: ProtoField(1, 'uint32'),
    }),
    repeatedMessageField: ProtoField(7, {
        nestedField: ProtoField(1, 'uint32'),
    }, 'repeated'),
    repeatedPackedField: ProtoField(8, 'uint32', 'repeated'),
    repeatedNotPackedField: ProtoField(9, 'uint32', 'repeated', { packed: false }),
});

const encoded = TestMessage.encode({
    uint32Field: 1,
    fixed32Field: 2,
    sint32Field: -1,
    boolField: true,
    stringField: 'test',
    nestedMessageField: {
        nestedField: 1,
    },
    repeatedMessageField: [
        { nestedField: 1 },
        { nestedField: 2 },
    ],
    repeatedPackedField: [1, 2, 3],
    repeatedNotPackedField: [4, 5, 6],
});
console.log(encoded.toString('hex'));

const decoded = TestMessage.decode(encoded);
console.log(decoded);
