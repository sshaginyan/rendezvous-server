'use strict';

import { mask, packFrame, parseFrame } from "../frame.js";

import assert from 'assert';

function byteString(n) {
    if (n < 0 || n > 255 || n % 1 !== 0) {
        throw new Error(n + " does not fit in a byte");
    }
    return ("000000000" + n.toString(2)).substr(-8)
}

describe('frame.js', function() {
    describe('mask(buffer, maskingKey)', function() {
        it('masked -> unmasked', function() {
            const maskingKey = 1812913832;
            
            // 'Hello World 🤦'
            const data = Buffer.from([
                0x48, 0x65, 0x6c, 0x6c,
                0x6f, 0x20, 0x57, 0x6f,
                0x72, 0x6c, 0x64, 0x20,
                0xf0, 0x9f, 0xa4, 0xa6
            ]);

            const maskedData = Buffer.from([
                0x24, 0x6b, 0xb2, 0xc4,
                0x03, 0x2e, 0x89, 0xc7,
                0x1e, 0x62, 0xba, 0x88,
                0x9c, 0x91, 0x7a, 0x0e
            ]);
            
            assert.ok(0 === Buffer.compare(mask(data, maskingKey), maskedData));
        });
        it('unmask -> masked', function() {
            const maskingKey = 1812913832;
            
            // 'Hello World 🤦'
            const data = Buffer.from([
                0x48, 0x65, 0x6c, 0x6c,
                0x6f, 0x20, 0x57, 0x6f,
                0x72, 0x6c, 0x64, 0x20,
                0xf0, 0x9f, 0xa4, 0xa6
            ]);

            const maskedData = Buffer.from([
                0x24, 0x6b, 0xb2, 0xc4,
                0x03, 0x2e, 0x89, 0xc7,
                0x1e, 0x62, 0xba, 0x88,
                0x9c, 0x91, 0x7a, 0x0e
            ]);

            assert.ok(0 === Buffer.compare(mask(maskedData, maskingKey), data));
        });
        it('mask & mask', function() {
            const data = 'Hello World 🤦';
            const maskingKey = 1812913832;
            const buffer = Buffer.from(data);
            
            assert.strictEqual(data, mask(mask(buffer, maskingKey), maskingKey).toString());
        });
    });
    describe('packFrame(buffer)', function() {
        it('should return correct buffer for 0-125', function() {
            const data = 'Hello World 🤦';
            const dataBuffer = Buffer.from(data);
            const packFrameBuffer = packFrame(data);
            const maskingKey = packFrameBuffer.readUInt32BE(2);
            const maskedData = mask(dataBuffer, maskingKey);
            const frame1 = Buffer.from([0b10000001, 0b10010000,
                packFrameBuffer[2], packFrameBuffer[3],
                packFrameBuffer[4], packFrameBuffer[5]]);
            const finalFrame = Buffer.concat([frame1, maskedData]);
            assert.ok(0 === Buffer.compare(finalFrame, packFrameBuffer));
        });
        it('should return correct buffer for 126', function() {
            const data = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.`;
            const dataBuffer = Buffer.from(data);
            const dataBufferByteLength = dataBuffer.byteLength;
            const packFrameBuffer = packFrame(data);
            const payloadLength = packFrameBuffer.readUInt8(1);
            assert.strictEqual(payloadLength & 0b01111111, 126);
            
            const extPayloadLength = packFrameBuffer.readUInt16BE(2);
            assert.strictEqual(extPayloadLength, dataBufferByteLength);
            
            const maskingKey = packFrameBuffer.readUInt32BE(4);
            const maskedData = mask(dataBuffer, maskingKey);
            const maskedDataCall = packFrameBuffer.slice(8);
            assert.ok(0 === Buffer.compare(maskedData, maskedDataCall));
        });
        // Can't do this yet...
        //it('should return correct buffer for 127', function() {});
    });
    describe('parseFrame(buffer)', function() {
        it('should return correct object for 0-125', function() {
            const dataBuffer = Buffer.from([
                0b10000001, 0b10010000, 0b10000110, 0b00111111,
                0b00111100, 0b10100011, 0b11001110, 0b01011010,
                0b01010000, 0b11001111, 0b11101001, 0b00011111,
                0b01101011, 0b11001100, 0b11110100, 0b01010011,
                0b01011000, 0b10000011, 0b01110110, 0b10100000,
                0b10011000, 0b00000101
            ]);
            const frameObj = parseFrame(dataBuffer);

            const keys = ['fin', 'rsv1', 'rsv2', 'rsv3', 'opcode', 'mask', 'payloadLength', 'maskingKey', 'payload'];

            for(const key in frameObj) {
                assert.ok(keys.includes(key));
            }

            const data = Buffer.from([
                0x48, 0x65, 0x6c, 0x6c,
                0x6f, 0x20, 0x57, 0x6f,
                0x72, 0x6c, 0x64, 0x20,
                0xf0, 0x9f, 0xa4, 0xa6
            ]);

            assert.strictEqual(frameObj.fin, true);
            assert.strictEqual(frameObj.rsv1, false);
            assert.strictEqual(frameObj.rsv2, false);
            assert.strictEqual(frameObj.rsv3, false);
            assert.strictEqual(frameObj.opcode, 1);
            assert.strictEqual(frameObj.mask, true);
            assert.strictEqual(frameObj.payloadLength, 16);
            assert.strictEqual(frameObj.maskingKey, 2252291235);
            assert.ok(0 === Buffer.compare(frameObj.payload, data));
        });
        it('should return correct object for 126', function() {
            const data = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.`;
            const dataBuffer = Buffer.from([
                0b10000001, 0b11111110, 0b00000000, 0b10011000,
                0b00100111, 0b00010111, 0b00011111, 0b11101101, 
                0b01101011, 0b01111000, 0b01101101, 0b10001000,
                0b01001010, 0b00110111, 0b01010110, 0b10011101,
                0b01010100, 0b01100010, 0b01110010, 0b11001101,
                0b01001110, 0b01100100, 0b00111111, 0b10011110,
                0b01001110, 0b01111010, 0b01101111, 0b10000001,
                0b01011110, 0b00110111, 0b01111011, 0b10011000,
                0b01001010, 0b01111010, 0b01100110, 0b11001101,
                0b01010011, 0b01110010, 0b01100111, 0b10011001,
                0b00000111, 0b01111000, 0b01111001, 0b11001101,
                0b01010011, 0b01111111, 0b01111010, 0b11001101,
                0b01010111, 0b01100101, 0b01110110, 0b10000011,
                0b01010011, 0b01111110, 0b01110001, 0b10001010,
                0b00000111, 0b01110110, 0b01110001, 0b10001001,
                0b00000111, 0b01100011, 0b01100110, 0b10011101,
                0b01000010, 0b01100100, 0b01111010, 0b10011001,
                0b01010011, 0b01111110, 0b01110001, 0b10001010,
                0b00000111, 0b01111110, 0b01110001, 0b10001001,
                0b01010010, 0b01100100, 0b01101011, 0b10011111,
                0b01011110, 0b00111001, 0b00111111, 0b10100001,
                0b01001000, 0b01100101, 0b01111010, 0b10000000,
                0b00000111, 0b01011110, 0b01101111, 0b10011110,
                0b01010010, 0b01111010, 0b00111111, 0b10000101,
                0b01000110, 0b01100100, 0b00111111, 0b10001111,
                0b01000010, 0b01110010, 0b01110001, 0b11001101,
                0b01010011, 0b01111111, 0b01111010, 0b11001101,
                0b01001110, 0b01111001, 0b01111011, 0b10011000,
                0b01010100, 0b01100011, 0b01101101, 0b10010100,
                0b00000000, 0b01100100, 0b00111111, 0b10011110,
                0b01010011, 0b01110110, 0b01110001, 0b10001001,
                0b01000110, 0b01100101, 0b01111011, 0b11001101,
                0b01000011, 0b01100010, 0b01110010, 0b10000000,
                0b01011110, 0b00110111, 0b01101011, 0b10001000,
                0b01011111, 0b01100011, 0b00111111, 0b10001000,
                0b01010001, 0b01110010, 0b01101101, 0b11001101,
                0b01010100, 0b01111110, 0b01110001, 0b10001110,
                0b01000010, 0b00110111, 0b01101011, 0b10000101,
                0b01000010, 0b00110111, 0b00101110, 0b11011000,
                0b00010111, 0b00100111, 0b01101100, 0b11000011
            ]);
    
            const frameObj = parseFrame(dataBuffer);
    
            assert.strictEqual(data, frameObj.payload.toString());
            
        });
    });
});