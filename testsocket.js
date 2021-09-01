const net = require('net');
const http = require('http');
const crypto = require('crypto');

const { Headers, headersToString } = require('headers-utils');

// =========Client=========

const options = {
    host: '127.0.0.1',
    port: 8080
};

const requestHeaders = [
    'GET / HTTP/1.1',
    'upgrade: websocket',
    'connection: upgrade',
    'host: 127.0.0.1:3210',
    'sec-websocket-version: 13',
    'sec-websocket-protocol: json',
    `sec-websocket-key: ${crypto.randomBytes(16).toString('base64')}`,
    'sec-websocket-extensions: permessage-deflate; client_max_window_bits'
];

const client = net.createConnection(options, () => {
    client.write(requestHeaders.join('\r\n') + '\r\n\r\n');
    client.on('data', data => {
        console.log(data.toString());
        setTimeout(() => {
            client.write('Ping');
        }, 1000);
        
    });
});

setInterval(() => {
    console.log('Client: ', client.readyState);
}, 1000);

const server = http.createServer()
.on('upgrade', (response, socket, head) => {
    const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'upgrade: websocket',
        'connection: upgrade',
        `sec-websocket-accept: abc`
    ];
    setInterval(() => {
        console.log('Server: ', response.socket.readyState);
    }, 1000);
    response.socket.on('data', data => {
        console.log(data.toString());
        setTimeout(() => {
            socket.write('Pong');
        }, 1000);
    });
    socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
})
.listen('8080');