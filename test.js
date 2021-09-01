const buffer = Buffer.from('{"type":"Ping"}');
const payloadLength = 15;
const data = Buffer.alloc(15);
const maskingKey = 1780169557;
let byteOffset = 0;
// Loop through the source buffer one byte at a time, keeping track of which
// byte in the masking key to use in the next XOR calculation
for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
    // Extract the correct byte mask from the masking key
    const shift = j == 3 ? 0 : (3 - j) << 3; 
    // `& 0xFF` clearing everything out from maskingKey except last 8 bits
    const mask = (shift == 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF;
    // Read a byte from the source buffer 
    // XOR the source byte and write the result to the data 
    data.writeUInt8(mask ^ buffer[i], i);
}

console.log('========================================');

let j = 0;
let shift = j == 3 ? 0 : (3 - j) << 3; 
let mask = (shift == 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF;
console.log(data[0] ^ mask);
j = 1;
shift = j == 3 ? 0 : (3 - j) << 3; 
mask = (shift == 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF;
console.log(data[1] ^ mask);
j = 2;
shift = j == 3 ? 0 : (3 - j) << 3; 
mask = (shift == 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF;
console.log(data[2] ^ mask);



// const http = require('http');
// const crypto = require('crypto');

// // ================Client================

// const options = {
//     host: '127.0.0.1',
//     port: 8080,
//     headers: {
//         'upgrade': 'websocket',
//         'connection': 'upgrade',
//         'host': '127.0.0.1:3210',
//         'sec-websocket-version': '13',
//         'sec-websocket-key': crypto.randomBytes(16).toString('base64'),
//         'sec-websocket-protocol': 'json',
//         'sec-websocket-extensions': 'permessage-deflate; client_max_window_bits'
//     }
// };

// http.request(options)
// .on('response', response => {
//     console.log(response.headers);
// })
// .on('socket', socket => {
//     socket.emit('agentRemove');
//     socket.on('ready', () => {
//         setInterval(() => {
//             console.log('Client: ', socket.readyState);
//         }, 1000);
//         socket.on('data', data => {
//             console.log(data.toString());
//         });
//     });
// })
// .on('error', error => {
//     console.log(error);
// });

// // ================Server================

// const server = http.createServer()
// .on('upgrade', (response, socket, head) => {
//     const responseHeaders = [
//         'HTTP/1.1 101 Switching Protocols',
//         'upgrade: websocket',
//         'connection: upgrade',
//         `sec-websocket-accept: abc`
//     ];
//     setInterval(() => {
//         console.log('Server: ', response.socket.readyState);
//         //res.socket.write('Ping');
//     }, 1000);
//     response.socket.on('data', data => {
//         console.log(data);
//     });
//     socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
// })
// .listen('8080');

// server.keepAliveTimeout = 61 * 1000;
// server.headersTimeout = 65 * 1000;







//     //req.end();
//     // req.write('Ping', 'utf8', () => {
//     //     console.log('Write');
//     // });

// // (req, res) => {
    
// //     console.log('fwenfwk');

//     // setInterval(() => {
//     //     console.log('Server: ', res.socket.readyState);
//     //     //res.socket.write('Ping');
//     // }, 1000);
//     // res.socket.on('data', data => {
//     //     console.log(data);
//     // });
//     // res.write('Testing');
//     // // setInterval(() => {
//     // //     console.log('Server: ', res.socket.readyState);
//     // // }, 1000);
// }