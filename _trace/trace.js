/**
 * @title Tracer for modern api invocation
 */

const start = process.hrtime;
const stop = function (obj) {
    var cost = start(obj);
    return cost[0] * 1e3 + cost[1] / 1e6
};

import * as http from '../http'
import * as channel from '../channel'
import * as ws from '../websocket'

export function setup(trace_file, options) {
    setup = function () {
        throw new Error('trace::setup has already been called')
    };
    const sockets = new Set();

    const fs = require('fs');

    const getRemoteAddress = options && options.getRemoteAddress || function (req) {
            return getAddress(req.request)
        };

    channel.registerListener('_trace', function (msg) {
        msg = new Buffer(msg, 'binary');
        for (let socket of sockets) {
            socket.send(msg, true)
        }
    });

    const $listen = http.listen, $fetch = http.fetch;

    const home_resp = new http.Response('DUMMY CODE', {headers: {'content-type': 'text/html'}});

    http.listen = function (_, callback) {
        arguments[1] = makeTracer(callback);

        const server = $listen.apply(http, arguments);

        ws.listen(server, function (req) {
            if (req.pathname !== '/_trace') return req.reject();
            let ws = req.accept();
            ws.on('close', function () {
                sockets.delete(this)
            });
            sockets.add(ws)
        });

        console.log('\x1b[36mTRACE\x1b[0m http server enabled, visit http://{your_host_name}/_trace\n      trace file saved to \x1b[32m' + trace_file + '\x1b[0m');
        return server;
    };


    http.fetch = function (url, options) {
        const fiber = co.Fiber.current, api_calls = fiber && fiber.api_calls;
        if (!api_calls) return $fetch.apply(this, arguments);
        const req = typeof url === 'object' && url instanceof http.Request ? url : new http.Request(url, options);
        const start = api_calls.time_start, time_start = stop(start);
        arguments[0] = req;
        const promise = $fetch.apply(this, arguments);
        promise.then(fulfill, fulfill.bind(null, null));
        return promise;

        function fulfill(res, err) {
            const time_end = stop(start);
            api_calls.push({
                time_start: time_start,
                time_end: time_end,
                remote: res ? getAddress(res._stream) : '-',
                request: req,
                response: [res, err]
            })
        }
    };
    function msgIterator() {
        const fd = fs.openSync(trace_file, 'r'), header = new Buffer(24);
        let pos = 0;

        const entry = {
            next: function () {
                if (!readAll(header, pos)) return {done: true};
                const len = parseInt(header.toString('binary', 0, 8), 16);

                const ret = {start: pos + 24, id: header.toString('binary', 8), length: len};
                pos += len + 26;
                return {done: false, value: ret}
            },
            read: function (msg) {
                const buf = new Buffer(msg.length);
                readAll(buf, msg.start);
                return buf
            },
            close: function () {
                co.removeResource(entry);
                this._close();
            },
            _close: function () {
                fs.closeSync(fd)
            }
        };
        entry[Symbol.iterator] = function () {
            return this
        };
        co.addResource(entry);
        return entry;

        function readAll(buf, pos) {
            let off = 0, length = buf.length;
            while (length) {
                const red = fs.readSync(fd, buf, off, length, pos);
                if (red === 0) {
                    entry.close();
                    return false
                }
                length -= red;
                off += red;
                pos += red;
            }
            return true
        }
    }

    function getMsg(id) {
        const iterator = msgIterator();
        for (let msg of iterator) {
            if (msg.id === id) {
                return iterator.read(msg)
            }
        }
    }

    function getHistory(req) {
        const query = req.query;
        switch (query.filter) {
            case 'failed':
                return filter(null, function (obj) {
                    return !!obj.response.error || obj.response.status > 399
                });
            case 'last':
                return filter().slice(-query.count);
            case 'by_ip':
                return filterByIp(query.ip);
            case 'by_type':
                var regexp = new RegExp(query.type, 'i');
                return filter(null, function (obj) {
                    return !obj.response.error && regexp.test(obj.response.type)
                });
            case 'this_ip':
                return filterByIp(getAddress(req.request));
            default:
                return filter();
        }


        function filterByIp(ip) {
            return filter(null, function (obj) {
                return obj.remote === ip
            });
        }

        function filter(pre, post) {
            const iterator = msgIterator(), ret = [];
            for (let msg of iterator) {
                if (!pre || pre(msg.id)) {
                    var obj = JSON.parse('' + iterator.read(msg))[0];
                    if (!post || post(obj)) ret.push({
                        id: msg.id,
                        remote: obj.remote, time_end: obj.time_end,
                        method: obj.request.method,
                        type: obj.response.type,
                        entry: obj.request.entry,
                        status: obj.response.error ? 999 : obj.response.status,
                        size: obj.response.error ? 0 : obj.response.payload.length
                    });

                }
            }
            return ret
        }
    }

    function getAddress(obj) {
        return obj.socket.remoteAddress.replace(/^::ffff:/, '')
    }

    function makeTracer(callback) {
        return function (req) {
            if (req.pathname === '/_trace') {
                if (req.query.action === 'fetch_msg') {
                    let gzip = require('zlib').createGzip();
                    gzip.write(getMsg(req.query.id));
                    gzip.end();
                    return new http.Response(gzip, {
                        headers: {
                            'content-type': 'application/json',
                            'content-encoding': 'gzip'
                        }
                    })
                }
                if (req.query.action === 'clear_history') {
                    fs.writeFileSync(trace_file, new Buffer(0));
                    return new http.Response()
                }
                if (req.query.action === 'history') {
                    return http.Response.json(getHistory(req))
                }
                return new http.Response(fs.readFileSync(__dirname + '/_trace.html'), {headers: {'content-type': 'text/html'}})
            }

            const timestamp = Date.now(), h = start();

            const api_calls = co.Fiber.current.api_calls = [];
            api_calls.time_start = h;
            var err, resp;
            try {
                resp = callback.apply(req, arguments);
            } catch ($) {
                err = $
            }
            const time_end = stop(h);


            const uuid = timestamp.toString(36) + Math.random().toString(36).slice(2, 10);
            const $request = detail({
                method: req.method,
                search: req.search.slice(1),
                entry: req.pathname
            }, req), $response = statResponse(resp, err);


            const arr = [{
                time: timestamp,
                remote: getRemoteAddress(req),
                time_end: time_end,
                request: $request,
                response: $response
            }];

            if (api_calls.length) for (let obj of api_calls) {
                arr.push(obj);
                if (!obj.request) continue;
                const req = obj.request, _res = obj.response;
                let url = req.url, idx = url.indexOf('?'), search = '';
                if (idx !== -1) {
                    search = url.slice(idx + 1);
                    url = url.slice(0, idx)
                }
                obj.request = detail({
                    method: req.method,
                    entry: url,
                    search: search
                }, req);
                obj.response = statResponse(_res[0], _res[1]);
            }
            const msg = JSON.stringify({
                id: uuid,
                remote: arr[0].remote,
                time_end: time_end,
                method: $request.method,
                entry: $request.entry,
                type: $response.type,
                status: resp ? $response.status : 999,
                size: resp ? $response.payload.length : 0
            });
            channel.dispatch('_trace', msg);

            const trace_msg = new Buffer('00000000' + uuid + JSON.stringify(arr) + '\r\n'),
                msg_len = (trace_msg.length - 26).toString(16);
            trace_msg.write(msg_len, 8 - msg_len.length);
            fs.appendFile(trace_file, trace_msg);

            if (err) throw err;
            else return resp;
        };

        function statResponse(resp, err) {
            return resp ? detail({
                status: resp.status,
                statusText: resp.statusText
            }, resp) : err ? {
                error: err.message || String(err) || 'error'
            } : {
                error: '<no response>'
            }
        }

        function detail(target, obj) {
            if (!obj) {
                target.headers = [];
                target.payload = '';
                return target;
            }
            const headers = [];
            for (let kv of obj.headers) {
                if (kv[0].toLowerCase() === 'content-type') target.type = kv[1];

                headers.push(kv[0] + ':' + kv[1])
            }
            target.headers = headers;
            target.payload = co.yield(obj.buffer()).toString('binary');
            return target;
        }
    }
}

function add(name, args) {
    const fiber = co.Fiber.current, api_calls = fiber && fiber.api_calls;
    if (!api_calls) return;
    api_calls.push({name, args, time_start: stop(api_calls.time_start)});
}


export function trace(module, prefix) {
    co.yield(module[loadProgress]);
    for (let key of Object.getOwnPropertyNames(module)) {
        let desc = Object.getOwnPropertyDescriptor(module, key);
        if ('set' in desc) {
            wrap(key)
        }
    }

    function wrap(key) {
        const method = module[key];
        if (typeof method === 'function' && Object.getOwnPropertyDescriptor(method, 'prototype').writable) {
            const api = prefix + '::' + key;
            module[key] = function () {
                add(api, Array.prototype.slice.call(arguments));
                return method.apply(this, arguments)
            }
        }
    }
}
