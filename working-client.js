'use strict';

import net from 'net';
import crypto from 'crypto';
import validUrl from 'valid-url';

function constructReply (data) {
    // Convert the data to JSON and copy it into a buffer
    const json = JSON.stringify(data)
    const jsonByteLength = Buffer.byteLength(json);
    // Note: we're not supporting > 65535 byte payloads at this stage 
    const lengthByteCount = jsonByteLength < 126 ? 0 : 2; 
    const payloadLength = lengthByteCount === 0 ? jsonByteLength : 126; 
    const buffer = Buffer.alloc(2 + lengthByteCount + jsonByteLength); 
    // Write out the first byte, using opcode `1` to indicate that the message 
    // payload contains text data 
    buffer.writeUInt8(0b10000001, 0); 
    buffer.writeUInt8(payloadLength, 1); 
    // Write the length of the JSON payload to the second byte 
    let payloadOffset = 2; 
    if (lengthByteCount > 0) { 
      buffer.writeUInt16BE(jsonByteLength, 2); payloadOffset += lengthByteCount; 
    } 
    // Write the JSON data to the data buffer 
    buffer.write(json, payloadOffset); 
    return buffer;
  }

  function parseMessage(buffer) {
    let byteOffset = 0;
    const firstByte = buffer.readUInt8(byteOffset++);
    const isFinalFrame = Boolean(0b10000001 >>> 7 & 0b00000001);
    const opCode = firstByte & 0b00001111;

    /*
        Take the buffer and read the first 8 bits or first byte
        firstByte = buffer.readUInt8(0)
        
            >>> always results in non-negative
            returns an unsigned 32-bit integer

        Shift firstByte to the right by 7 bits
        firstByte (10000000) >>> 7 (00000111)

        We're only interested in the farthest
        right bit and therefore we are using a
        bitwise & with 1 to get the farthest
        right bit value

        10000000
        00001111
            
    */

    // Not used now, but place holder
    switch(opCode) {
        // denotes a continuation frame
        case 0x00:
            // Non-control
            console.log('continuation frame');
        break;
        // denotes a text frame
        case 0x01: // They have `opCode !== 0x01` for this
            // Non-control
            console.log('text frame');
        break;
        // denotes a binary frame
        case 0x02:
            // Non-control
            console.log('binary frame');
        break;
        // reserved for further non-control frames
        case 0x03: case 0x04: case 0x05: case 0x06: case 0x07:
            console.log('further non-control frames');
        break;
        // denotes a connection close
        case 0x08:
            // Control
            console.log('connection close');
            return null;
        break;
        // denotes a ping
        case 0x09:
            // Control
            console.log('ping');
        break;
        // denotes a pong
        case 0x0a:
            // Control
            console.log('pong');
        break;
        case 0x0b: case 0x0c: case 0x0d: case 0x0e: case 0x0f:
            // Reserved for further control frames.
            console.log('further non-control frames');
        break;
        default:
            return null;
    }

    const secondByte = buffer.readUInt8(byteOffset++);
    const isMasked = Boolean(secondByte >>> 7 & 0b00000001);
    let payloadLength = secondByte & 0b01111111;


    /*
        We are only interested in the Payload Length and
        therefore have a 0 for the MASK
        01111111 (0x7F -> 127)
    */

    if(126 === payloadLength) {
        payloadLength = buffer.readUInt16BE(byteOffset); // Don't know the need...
        // we were already reading data in a BE type of way from left to right. Why
        // didn't we do the same on line 47?
        byteOffset += 2;
    }

    if(127 === payloadLength) {
        const leftPart = BigInt(buffer.readUInt32BE(byteOffset));
        byteOffset = byteOffset += 4;
        const rightPart = BigInt(buffer.readUInt32BE(byteOffset));
        byteOffset = byteOffset += 4;
        payloadLength = leftPart << 32 | rightPart;
    }

    let maskingKey;
    const data = Buffer.alloc(payloadLength);
     // Only unmask the data if the masking bit was set to 1
    if(isMasked) {
        maskingKey = buffer.readUInt32BE(byteOffset);
        console.log(maskingKey); // 10100100110100010101110011111010 (2765184250)
        byteOffset += 4;
        // Loop through the source buffer one byte at a time, keeping track of which
        // byte in the masking key to use in the next XOR calculation
        for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
            // Extract the correct byte mask from the masking key
            const shift = j == 3 ? 0 : (3 - j) << 3; 
            // `& 0xFF` clearing everything out from maskingKey except last 8 bits
            const mask = (shift == 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF;
            // Read a byte from the source buffer 
            const source = buffer.readUInt8(byteOffset++); 
            // XOR the source byte and write the result to the data 
            data.writeUInt8(mask ^ source, i);
        }   
    } else {
        // Not masked - we can just read the data as-is
        buffer.copy(data, 0, byteOffset++);
    }

    const json = data.toString('utf8');
    return JSON.parse(json);
}

class WebSocket {
    constructor(wsUrl, protocols = []) {
        this._wsUrl = wsUrl;
        
        if(0 === arguments.length) {
            throw new TypeError(`Failed to construct 'WebSocket': 1 argument required, but only 0 present.`);
        }
    
        if(undefined === validUrl.isUri(this._wsUrl)) {
            throw new Error(`Failed to construct 'WebSocket': The URL '${this.url}' is invalid.`);
        }

        let parsedURL = null;
        try {
            parsedURL = new URL(this.url);
            const scheme = parsedURL.protocol;
            if(false === ['ws:', 'wss:'].includes(scheme)) {
                throw new Error(`Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${scheme}' is not allowed.`);
            }
        } catch(error) {
            throw new Error(`Failed to construct 'WebSocket': The URL '${this.url}' is invalid`)
        }

        if(Array.isArray(protocols)) {
            protocols = protocols.join(', ');
        }

        this.#handshake(parsedURL, protocols);
        
    }

    get url() {
        return this._wsUrl;
    }

    send() {

    }

    #genNonce() {
        return crypto.randomBytes(16).toString('base64');
    }

    #handshake(parsedURL, protocols) {
        const protocol = ('wss:' === parsedURL.protocol) ? 'https:' : 'http:';
        parsedURL.protocol = protocol;
        console.log(parsedURL);
        
        const options = {
            host: parsedURL.hostname,
            port: parsedURL.port
        };
        
        const requestHeaders = [
            'GET / HTTP/1.1',
            'upgrade: websocket',
            'connection: upgrade',
            'host: 127.0.0.1:3210',
            'sec-websocket-version: 13',
            'sec-websocket-protocol: json',
            `sec-websocket-key: ${this.#genNonce()}`,
            'sec-websocket-extensions: permessage-deflate; client_max_window_bits'
        ];
        
        const client = net.createConnection(options, () => {
            client.write(requestHeaders.join('\r\n') + '\r\n\r\n');
            client.on('data', data => {
                console.log(parseMessage(data));
                client.write(constructReply({type: 'Ping'}));
            });
        });
        
    }
}

const x = new WebSocket('ws://127.0.0.1:3210', 'json');
console.log(x);