'use strict';

import * as constants from './constants.js';
import { packFrame, parseFrame } from './frame.js';

import http from 'http';
import crypto from 'crypto';

http.globalAgent.keepAlive = true;

function generateAcceptValue(acceptKey) {
    return crypto
    .createHash('sha1')
    .update(acceptKey + constants.MAGIC_GUID, 'binary')
    .digest('base64');
}

function byteString(n) {
    if (n < 0 || n > 255 || n % 1 !== 0) {
        throw new Error(n + " does not fit in a byte");
    }
    return ("000000000" + n.toString(2)).substr(-8)
}

const server = http.createServer();

// ===========#2
server.on('upgrade', (request, socket) => {
    if('websocket' !== request.headers['upgrade']) {
        socket.end('HTTP/1.1 400 Bad Request');
        return;
    }

    setInterval(() => {
        console.log(socket.readyState);
    }, 1000);
    
    // ===========#6
    socket.on('data', buffer => {
        for(let i = 0; i < buffer.length; i++) {
            console.log(byteString(buffer[i]));
        }
        const frame = parseFrame(buffer);
        console.log(frame.payload.toString());
        // ===========#7
        socket.write(packFrame(Buffer.from('This works!!!!')));
        // if(frame) {
        //     // For our convenience, so we can see what the client sent
        //     console.log(message);
        //     // We'll just send a hardcoded message in this example 
        //     socket.write(constructReply({ message: 'Hello from the server!' })); 
        // } else if (message === null) { 
        //     console.log('WebSocket connection closed by the client.'); 
        // }
    });
    
    const acceptKey = request.headers['sec-websocket-key']; 
    const hash = generateAcceptValue(acceptKey); 
    const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'upgrade: websocket',
        'connection: keep-alive, upgrade',
        `sec-websocket-accept: ${hash}`
    ];
    const protocol = request.headers['sec-websocket-protocol'];
    const protocols = !protocol ? [] : protocol.split(',').map(s => s.trim());
    // If protocol not specify, the server must send a failure response and close the connection
    if(protocols.includes('wormhole')) {
        responseHeaders.push(`sec-websocket-protocol: wormhole`);
    }
    // ===========#3
    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
    setInterval(() => {
        console.log(socket.readyState);
    }, 2000);
});

const port = 3210;
server.listen(port, () => console.log(`Server running at http://localhost:${port}`));