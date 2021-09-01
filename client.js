'use strict';

import * as constants from './constants.js';
import { packFrame, parseFrame } from './frame.js';

import net from 'net';
import crypto from 'crypto';
import validUrl from 'valid-url';

function byteString(n) {
    if (n < 0 || n > 255 || n % 1 !== 0) {
        throw new Error(n + " does not fit in a byte");
    }
    return ("000000000" + n.toString(2)).substr(-8)
}

class WebSocket {

    static OPEN = constants.OPEN;
    static CLOSED = constants.CLOSED;
    static CLOSING = constants.CLOSING;
    static CONNECTING = constants.CONNECTING;

    #client = null;
    readyState = WebSocket.CONNECTING;

    constructor(wsUrl, protocols = []) {
        this.url = wsUrl;

        if(0 === arguments.length) {
            throw new TypeError(`Failed to construct 'WebSocket': 1 argument required, but only 0 present.`);
        }

        if(undefined === validUrl.isUri(this.url)) {
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

    send = (data, encoding = 'utf8', callback) => {
        return this.#client.write(packFrame(data), encoding, callback);
    }

    #onData(data) {
        // ===========#8
        console.log('Getting');
        console.log(parseFrame(data).payload.toString());
    }

    #genNonce() {
        return crypto.randomBytes(16).toString('base64');
    }

    #handshake(parsedURL, protocols) {
        const protocol = ('wss:' === parsedURL.protocol) ? 'https:' : 'http:';
        parsedURL.protocol = protocol;

        const options = {
            host: parsedURL.hostname,
            port: parsedURL.port
        };

        const requestHeaders = [
            'GET / HTTP/1.1',
            'upgrade: websocket',
            'connection: upgrade',
            'host: 127.0.0.1:3210', // Do we need this?
            'sec-websocket-version: 13',
            'sec-websocket-protocol: json',
            `sec-websocket-key: ${this.#genNonce()}`,
            // Don't support extensions yet...
            //'sec-websocket-extensions: permessage-deflate; client_max_window_bits'
        ];

        this.#client = net.createConnection(options, () => {
            this.readyState = this.OPEN;
        });
        // ===========#4
        this.#client.once('data', d => {
            console.log('===========#4');
            // validate d
            this.#client.on('data', this.#onData);
            // ===========#5
            this.send('Hello World How are you today?');
        });
        // ===========#1
        this.#client.write(requestHeaders.join('\r\n') + '\r\n\r\n');
    }
}

const x = new WebSocket('ws://127.0.0.1:3210', 'json');
x.send('Hello World');
