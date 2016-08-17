/**
 * A connection manager, using identity hash to manage connections.
 *
 * @example
 *
 *  import Pool from 'module/connection_pool';
 *
 *  // creates an connection pool that has two upstreams
 *  let pool = new Pool(['192.168.0.100:8080', '192.168.0.101:8080'], 10);
 *
 *  // gets an connection
 *  let conn = pool.getConnection('some_key');
 *  // do something and returns the connection
 *  conn._release();
 *  // update upstream list
 *  pool.update(['192.168.0.100:8080', '192.168.0.101:8080', '192.168.0.102:8080'])
 */

const _net = require('net');

export default class ConnectionPool {
    /**
     * @param {Array.<string>} hosts host list
     * @param {number} connections
     */
    constructor(hosts, connections = 10) {
        this.connections = connections | 0;
        this.serverMap = {};
        this.update(hosts);
    }

    /**
     * update host list
     * @param {Array.<string>} hosts new host list
     */
    update(hosts) {
        // console.log('update', hosts);
        const serverMap = this.serverMap;
        const servers = this.servers = [],
            newServerMap = this.serverMap = {};
        for (let host of hosts) {
            const server = host in serverMap ? serverMap[host] : Factory(host, this.connections);
            servers.push(newServerMap[host] = server);
        }
        for (let host in serverMap) {
            if (!(host in newServerMap)) {
                serverMap[host].dispose();
            }
        }
        servers.sort((a, b) => a.hash - b.hash);
    }

    /**
     * gets an connection. the upstream will be selected with the hash calculated by the `key`, a same key will always
     * be hashed to the same upstream, and even if the upstream list is changed, this still take effect for most keys.
     *
     * The connection is already connected
     *
     * @param {string} key identifier used to calculate the hash
     * @returns {node.net.class.net.socket}
     */
    getConnection(key) {
        return findServer(this.servers, key).factory();
    }
}

const crc_table = new Uint32Array(256);

for (var i = 0; i < 256; i++) {
    var c = i;
    for (var j = 0; j < 8; j++) {
        var cr = c & 1;
        c = c >> 1 & 0x7FFFFFFF;
        if (cr) {
            c ^= 0xedb88320;
        }
    }
    crc_table[i] = c;
}

function crc32(input) {
    var initial = -1;
    for (var i = 0, end = input.length; i < end; i++) {
        initial = crc_table[initial & 0xFF ^ input.charCodeAt(i)] ^ (initial >> 8 & 0xFFFFFF);
    }
    return initial;
}

// 二分查找
function findServer(servers, key) {
    if (!key) return servers[0];
    var hash = crc32(key);
    let a = 0, b = servers.length - 1;
    while (a <= b) {
        const mid = a + b >> 1, server = servers[mid], diff = server.hash - hash;
        if (diff === 0) {
            return server
        }
        if (diff < 0) {
            a = mid + 1;
        } else {
            b = mid - 1;
        }
    }
    return servers[a === servers.length ? 0 : a]
}

function Factory(host, connections) {
    const idx = host.lastIndexOf(':'),
        option = {host: host.substr(0, idx), port: +host.substr(idx + 1)};


    const frees = [];
    const defers = [];

    let conns = 0, connecting = 0;


    function autoConnect() {
        // console.log('autoConnect: defers %d free %d conns %d connecting %d', defers.length, frees.length, conns, connecting);
        while (defers.length && frees.length) {
            defers.shift().resolve(frees.shift())
        }
        while (defers.length && conns < connections && connecting < defers.length) {
            conns++; // total connections no more than pool size
            connecting++; // do not create connections more than defers requests
            // console.log('about to connect', option);
            _net.connect(option, onConnectSuccess).once('error', onConnectError);
        }
    }

    function release() {
        if (defers.length) {
            defers.shift().resolve(this);
        } else {
            frees.push(this);
        }
    }


    function onConnectSuccess() {
        connecting--;
        this.removeListener('error', onConnectError);
        this.once('error', Boolean);
        this.once('close', onSocketClose);
        this._release = release;
        this._release();

        // in case that the server is back to normal
        autoConnect();
    }

    function onConnectError(err) {
        // console.error('connection_pool::factory: error connecting to server', option, err.stack || err.message || err);
        connecting--;
        conns--; // handle
        if (!conns) {
            // no more connections, reject all defers requests
            for (let deferred of defers.splice(0)) {
                deferred.reject(err)
            }
        }
    }

    function onSocketClose() {
        for (let i = 0, L = frees.length; i < L; i++) {
            if (frees[i] === this) {
                frees.splice(i, 1);
                break;
            }
        }
        conns--;
        autoConnect();
    }

    return {
        hash: crc32(host),
        factory: function () {
            if (frees.length) {
                return frees.shift();
            } else {
                return co.promise(function (resolve, reject) {
                    defers.push({resolve, reject});
                    autoConnect();
                })
            }
        },
        dispose: function () {
            for (let free of frees) {
                free.destroy();
            }
            frees.length = 0;
            frees.push = function (socket) {
                socket.destroy()
            };
        }
    }
}