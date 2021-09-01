import crypto from 'crypto';

export function mask(dataBuffer, maskingKey) {
    let byteOffset = 0;
    const payload_data = Buffer.alloc(dataBuffer.byteLength);
    
    // Loop through the source buffer one byte at a time, keeping track of which
    // byte in the masking key to use in the next XOR calculation
    for (let i = 0, j = 0; i < dataBuffer.byteLength; ++i, j = i % 4) {
        // Extract the correct byte mask from the masking key
        const shift = j == 3 ? 0 : (3 - j) << 3; 
        // `& 0xFF` clearing everything out from maskingKey except last 8 bits
        const mask = (shift == 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF;
        // Read a byte from the source buffer 
        const source = dataBuffer.readUInt8(byteOffset++); 
        // XOR the source byte and write the result to the data 
        //console.log(mask ^ source, mask, source);
        payload_data.writeUInt8(mask ^ source, i);
    }
    
    return payload_data;
}

export function packFrame(data) {
    // This could be a bigint...
    const payloadLength = Buffer.byteLength(data);
    
    // FIN = 1 & opcode = 1 - for text
    const fin_rsv_opcode = Buffer.alloc(1);
    fin_rsv_opcode.writeUInt8(0b10000001, 0);

    let mask_payloadlength = null;

    // Mutually exclusive
    if(125 >= payloadLength) {
        mask_payloadlength = Buffer.alloc(1);
        mask_payloadlength.writeUInt8(0b10000000 + payloadLength, 0);
    } else if(126 <= payloadLength && 65535 >= payloadLength) {
        mask_payloadlength = Buffer.alloc(3);
        mask_payloadlength.writeUInt8(0b11111110, 0);
        mask_payloadlength.writeUInt16BE(payloadLength, 1);
    }

    // Mutually exclusive
    // Let's not do this now. BigInt issues...
    // if(127 <= payloadLength && 9223372036854775807n <= payloadLength) {
    //     buffer.writeUInt8(0b11111111, byteOffset);
    //     byteOffset += 1;
    //     buffer.writeUInt32BE(payloadLength, byteOffset);
    //     byteOffset += 4;
    //     byteOffset += 4;
    // }

    const mkey = crypto.randomBytes(4).readUInt32BE(0, true);
    const masking_key = Buffer.alloc(4);
    masking_key.writeUInt32BE(mkey, 0);
    
    const payload_data = mask(Buffer.from(data), mkey);

    return Buffer.concat([fin_rsv_opcode, mask_payloadlength, masking_key, payload_data]);
}

export function parseFrame(buffer) {
    const frame = {};
    let byteOffset = 0;
    
    const firstByte = buffer.readUInt8(byteOffset);
    byteOffset += 1;
    frame.fin = Boolean(firstByte >>> 7 & 0b00000001);
    frame.rsv1 = Boolean(firstByte >>> 6 & 0b00000001);
    frame.rsv2 = Boolean(firstByte >>> 5 & 0b00000001);
    frame.rsv3 = Boolean(firstByte >>> 4 & 0b00000001);
    frame.opcode = Number(firstByte & 0b00001111);

    const secondByte = buffer.readUInt8(byteOffset);
    byteOffset += 1;
    frame.mask = Boolean(secondByte >>> 7 & 0b00000001);
    frame.payloadLength = Number(secondByte & 0b01111111);
    
    if(126 === frame.payloadLength) {
        frame.payloadLength = buffer.readUInt16BE(byteOffset);
        byteOffset += 2;
    }

    if(127 === frame.payloadLength) {
        const leftPart = BigInt(buffer.readUInt32BE(byteOffset));
        byteOffset = byteOffset += 4;
        const rightPart = BigInt(buffer.readUInt32BE(byteOffset));
        byteOffset = byteOffset += 4;
        frame.payloadLength = leftPart << 32n | rightPart;
    }

    frame.maskingKey = undefined;

     frame.payload = Buffer.alloc(frame.payloadLength);
     if(frame.mask) {
        frame.maskingKey = buffer.readUInt32BE(byteOffset);
        byteOffset += 4;
        frame.payload = mask(buffer.slice(byteOffset), frame.maskingKey);
    } else {
        // Not masked - we can just read the data as-is
        buffer.copy(frame.payload, 0, byteOffset);
        byteOffset += 1;
    }

    return frame;
}