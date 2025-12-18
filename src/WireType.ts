export enum WireType {
    Varint = 0,
    Fixed64 = 1,
    LengthDelimited = 2,
    /** @deprecated */
    StartGroup = 3,
    /** @deprecated */
    EndGroup = 4,
    Fixed32 = 5,
}
