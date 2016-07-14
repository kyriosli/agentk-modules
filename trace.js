/**
 * @title Tracer for modern api invocation
 */

const start = process.hrtime;
const stop = function (obj) {
    var cost = start(obj);
    return cost[0] * 1e3 + cost[1] / 1e6
};

import * as http from 'http'
import * as channel from 'channel'
import * as ws from 'websocket'

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

    const home_resp = new http.Response("<!doctype html>\r\n<html style=\"height: 100%\">\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <title>trace</title>\r\n    <style>body {background: -webkit-linear-gradient(top, #eaeaea, #e7e7e7);overflow-y: scroll;}ul {list-style: none;margin: 0;padding: 0;}body > ul {color: #333;overflow: hidden;font: normal 12px/26px Tahoma, 'sans-serif';box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);}body > ul > li {display: flex;border-bottom: 1px solid #eee;background: #fff;}body > ul > li > i {display: block;font-style: normal;padding: 0 8px;border-right: 1px solid #eee;}#header i {border-right-color: #3e3e3e}body > ul > li > i, .detail h1 {white-space: nowrap;overflow: hidden;text-overflow: ellipsis;}#header {position: fixed;width: 100%;top: 0;z-index: 1000}#header > li {background: #4c4c4c;color: #fff;box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);position: relative;z-index: 1;border-bottom: none;}#header a {color: #81d4fa;margin: 0 2px;}.i-time {width: 12em;}.i-method {width: 3em;}.i-pathname {flex: 1}.i-status {width: 2.5em;}.i-size {width: 5em;}.i-duration {width: 5em;}.i-addr {width: 8em;}.i-type {width: 10em}#requests {padding-top: 26px}#requests > li:hover {background: #f3f3f3}#requests > li.ok {color: #689f38;}#requests > li.warning {color: #26c6da;}#requests > li.error {color: #ff6f00;}#requests > li.detail {background: #ededed;box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.2);margin: -1px -20px 0;padding: 0 28px 16px;border-bottom: none;}.detail ul {width: 100%;}.detail li.title {background: transparent;font-size: 12px;line-height: 22px;color: #2196f3;}.detail h1 {margin: 0;font: normal 12px/26px Tahoma, 'sans-serif';}.detail h1 .extra {color: #aaa;}.detail h1 .error {color: #ff5722;}.detail li.sub {position: relative;background: #fff;padding: 0 12px 0 24px;border: 1px solid #ececec;margin-left: 6px;}.detail li.sub::before {content: '';display: block;position: absolute;left: 6px;top: 9px;width: 6px;height: 6px;border: 2px #ccc;border-style: solid solid none none;-webkit-transform: rotate(45deg);-webkit-transition: -webkit-transform 0.2s;}.detail li.sub.opened::before {-webkit-transform: rotate(135deg);}.detail li.sub.error::before {display: none;}.detail .sub.req {border-radius: 4px 4px 0 0;}.detail .sub.res {border-radius: 0 0 4px 4px;border-top: none;}.detail .sub.res + .sub.req {margin-top: 12px;}.detail h2 {font: normal 12px/26px Tahoma, 'sans-serif';border-bottom: 1px solid #ddd;padding-left: 8px;margin: 0;}.detail button {font-size: 12px;line-height: 17px;margin: 1px 12px;background: #eee;border: 1px solid #ccc;border-radius: 2px;}.detail .pairs, .detail code, .detail img {margin: 12px;}.detail .pairs {font-size: 12px;line-height: 18px;padding: 0 12px;background: #f3f3f3;}.detail .pairs td:first-child {text-align: right;color: #666;font-weight: bold;padding-right: 12px;}.detail code {display: block;background: #02181F;color: #00bcd4;white-space: pre-wrap;word-break: break-all;overflow: hidden;font-size: 12px;font-family: Monaco, consolas, Monospace, sans-serif;padding: 0 12px;}.detail code .key {color: #ffeb3b;}.detail code .string {color: #48fffa;}.detail code .num {color: #f473ff;}.detail code .true, .false {color: #81ff57;}.detail code .null {color: #ff5722;}</style>\r\n</head>\r\n<body style=\"margin:0; height: 100%\">\r\n<ul id=\"header\">\r\n    <li>\r\n        <i class=\"i-time\">\r\n            <a href=\"?action=history&filter=all\">all</a>\r\n            <a href=\"?action=history&filter=last&count=10\">last 10</a>\r\n            <a href=\"?action=history&filter=last&count=50\">last 50</a>\r\n            <a href=\"?action=clear_history\" style=\"color: #ffcc80\">clear</a>\r\n        </i>\r\n        <i class=\"i-method\">TYPE</i>\r\n        <i class=\"i-pathname\">\r\n            <span style=\"float:right\">\r\n                <a href=\"?action=history&filter=failed\">failed</a>\r\n            </span>\r\n            pathname</i>\r\n        <i class=\"i-status\">code\r\n        </i>\r\n        <i class=\"i-size\">size</i>\r\n        <i class=\"i-duration\">duration</i>\r\n        <i class=\"i-addr\">IP\r\n            <a href=\"?action=history&filter=this_ip\">this ip</a>\r\n            <a href=\"?action=history&filter=by_ip\">filter</a>\r\n        </i>\r\n        <i class=\"i-type\">\r\n            <a href=\"?action=history&filter=by_type&type=html\">html</a>\r\n            <a href=\"?action=history&filter=by_type&type=javascript\">js</a>\r\n            <a href=\"?action=history&filter=by_type&type=json\">json</a>\r\n            <a href=\"?action=history&filter=by_type&type=image\">image</a>\r\n        </i>\r\n    </li>\r\n</ul>\r\n<ul id=\"requests\"></ul>\r\n\r\n<script>(function () {function Empty() {}Empty.prototype = Object.create(null);var ws_uri = 'ws://' + location.host + location.pathname;var requests = new Empty(), ul = document.getElementById('requests');var tzoff = new Date().getTimezoneOffset() * 60000;function onButton(button) {var h2 = button.parentNode;var obj = requests[button.getAttribute('data-id')].arr[button.getAttribute('data-idx')][button.getAttribute('data-sub')];var replacement;if (button.hasAttribute('data-old-text')) {button.textContent = button.getAttribute('data-old-text');button.removeAttribute('data-old-text');replacement = makeCode(obj.payload);} else {switch (button.getAttribute('data-action')) {case 'format_json':var beautified = JSON.stringify(JSON.parse(obj.payload.replace(/[\\u00c7-\\u00df].|[\\u00e0-\\u00ef]../g, function (m) {return decodeURIComponent(window.escape(m))})), null, 2).replace(/\"((?:[^\"\\\\]|\\\\[\"\\\\nrt]|\\\\x..|\\\\u....)*)\"(:)?|(\\d*\\.\\d+|\\d+(?:\\.\\d*)?)|(\\w+)/g, function (m, string, key, num, id) {if (key) {return '<span class=\"key\">&quot;' + escape(string) + '&quot;</span>:'} else if (typeof string === 'string') {return '<span class=\"string\">&quot;' + escape(string) + '&quot;</span>'} else if (num) {return '<span class=\"num\">' + num + '</span>'} else if (id) {return '<span class=\"' + id + '\">' + id + '</span>'}});replacement = '<code>' + beautified + '</code>';break;case 'view_img':replacement = '<img src=\"data:' + obj.content_type + ';base64,' + btoa(obj.payload) + '\">';break;case 'parse_query':replacement = parseQuery(obj.payload);break;}button.setAttribute('data-old-text', button.textContent);button.textContent = 'raw'}h2.parentNode.removeChild(h2.nextElementSibling);h2.insertAdjacentHTML('afterEnd', replacement);}function parseQuery(str) {var html = '<table class=\"pairs\">';for (var kv of str.split('&')) {var _idx = kv.indexOf('='), value;if (_idx === -1) {value = ''} else {value = kv.substr(_idx + 1);kv = kv.substr(0, _idx);}html += '<tr><td>' + escape(decodeURIComponent(kv)) + '</td><td>' + escape(decodeURIComponent(value)) + '</td></tr>'}html += '</table>';return html;}function makeCode(str) {if (str.length > 1024) {return '<code>' + escape(str.slice(0, 1024)) + '...</code>'} else {return '<code>' + escape(str) + '</code>'}}function onSub(li, target) {if (li !== target && target.nodeName !== 'H1' && target.parentNode.nodeName !== 'H1' || li.classList.contains('error')) return;var id = li.getAttribute('data-id'), arr = requests[id].arr;var idx = li.getAttribute('data-idx'), sub = li.getAttribute('data-sub');var obj = arr[idx][sub];if (obj.opened) {li.classList.remove('opened');obj.opened = false;li.removeChild(li.lastElementChild);return}li.classList.add('opened');var desc_html = '<div>';if (obj.search) {desc_html += '<h2>Queries</h2>' + parseQuery(obj.search);}var content_type = '', cookie = null;if (obj.headers.length) {desc_html += '<h2>Headers</h2><table class=\"pairs\">';for (var kv of obj.headers) {var split = kv.indexOf(':'), name = kv.slice(0, split), value = kv.slice(split + 1);if (name.toLowerCase() === 'content-type') {content_type = value;} else if (name.toLowerCase() === 'cookie') {cookie = value;if (value.length > 128) value = value.slice(0, 127) + '...';}desc_html += '<tr><td>' + escape(name) + '</td><td>' + escape(value) + '</td></tr>';}desc_html += '</table>';}if (cookie) {desc_html += '<h2>Cookies</h2><table class=\"pairs\">';for (var kv of cookie.split('; ')) {var split = kv.indexOf('=');desc_html += '<tr><td>' + escape(kv.slice(0, split)) + '</td><td>' + escape(kv.slice(split + 1)) + '</td></tr>';}desc_html += '</table>';}if (obj.payload) {desc_html += '<h2>Payload';if (content_type.slice(0, 16) === 'application/json') {desc_html += '<button data-action=\"format_json\" data-id=\"' + id + '\" data-idx=\"' + idx + '\" data-sub=\"' + sub + '\">format</button>'} else if (content_type === 'application/x-www-form-urlencoded') {desc_html += '<button data-action=\"parse_query\" data-id=\"' + id + '\" data-idx=\"' + idx + '\" data-sub=\"' + sub + '\">parse</button>'} else if (content_type.slice(0, 6) === 'image/') {obj.content_type = content_type;desc_html += '<button data-action=\"view_img\" data-id=\"' + id + '\" data-idx=\"' + idx + '\" data-sub=\"' + sub + '\">view image</button>'}desc_html += '</h2>' + makeCode(obj.payload);}desc_html += '</div>';li.insertAdjacentHTML('beforeEnd', desc_html);obj.opened = true;}function onRequest(li) {var id = li.getAttribute('data-id'), entry = requests[id];if (entry.opened) {li.parentNode.removeChild(li.nextElementSibling);entry.opened = false;return}fetchMsg(entry).then(function (arr) {if (entry.opened) return;var obj = arr[0];var detail_html = '<li class=\"detail\"><ul><li class=\"title\">Request</li><li class=\"sub\" data-id=\"' + id+ '\" data-idx=\"0\" data-sub=\"request\">' + request_summary(obj) + '</li>';if (arr.length > 1) {detail_html += '<li class=\"title\">API calls</li>';for (var i = 1, l = arr.length; i < l; i++) {var api_call = arr[i];detail_html += '<li class=\"sub req\" data-id=\"' + id + '\" data-idx=\"' + i + '\" data-sub=\"request\">'+ request_summary(api_call) + '</li>';if (api_call.response.error) {detail_html += '<li class=\"sub res error\">';} else {detail_html += '<li class=\"sub res\" data-id=\"' + id + '\" data-idx=\"' + i + '\" data-sub=\"response\">';}detail_html += '<h1>' + response_summary(api_call) + '</h1></li>';}}detail_html += '<li class=\"title\">Response</li>';if (obj.response.error) {detail_html += '<li class=\"sub res error\">';} else {detail_html += '<li class=\"sub\" data-id=\"' + id + '\" data-idx=\"0\" data-sub=\"response\">';}detail_html += response_summary(obj) + '</li></ul></li>';li.insertAdjacentHTML('afterEnd', detail_html);entry.opened = true;})}function fetchMsg(entry) {if (!entry.pending) {entry.pending = fetch('?action=fetch_msg&id=' + entry.id).then(function (req) {return req.json()});entry.pending.then(function (arr) {entry.arr = arr});}return entry.pending;}function request_summary(obj) {var req = obj.request;return '<h1>' + req.method + ' ' + req.entry + (req.search ? '?' + req.search : '') + '</h1>'}function response_summary(obj) {var res = obj.response;var ret;if (res.error) {ret = '<h1><span class=\"error\">Error: ' + res.error + '</span>';} else {ret = '<h1><span class=\"' + (res.status > 399 ? 'error' : 'ok') + '\">' + res.status + ' ' + res.statusText + '</span>';ret += ' <span class=\"extra\">' + obj.remote + ', ';if (res.type) ret += res.type + ', ';if (res.payload) ret += normalizeSize(res.payload.length) + ', ';ret += '</span>'}ret += ' <span class=\"extra\">' + obj.duration.toFixed(2) + 'ms</span></h1>';return ret;}var last_ip = '';document.getElementById('header').addEventListener('click', function (e) {var target = e.target;if (target.nodeName !== 'A') return;e.preventDefault();var href = target.getAttribute('href');switch (href.match(/action=(\\w+)/)[1]) {case 'history':if (href.includes('filter=by_ip')) {var ip = prompt('Enter remote IP', last_ip);if (!ip) return;href += '&ip=' + (last_ip = ip)}fetch(href).then(function (resp) {return resp.json()}).then(function (arr) {requests = new Empty();ul.innerHTML = '';if (arr.length) {arr.forEach(onmessage);} else {alert('result is empty')}});break;case 'clear_history':requests = new Empty();ul.innerHTML = '';fetch(target.href).then(function (resp) {console.log(resp.status)}, function (err) {console.error(err)});break;}});ul.addEventListener('click', function (e) {var target = e.target;if (target.nodeName === 'BUTTON') {return onButton(target);}var li = target.closest('li'), cls = li.className;if (cls === 'detail' || cls === 'title') return;if (li.classList.contains('sub')) {return onSub(li, target);} else {return onRequest(li);}});function escape(html) {return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;')}function normalizeSize(size) {if (size > 1048576) {return (size / 1048576).toFixed(2) + 'MB'} else if (size > 1024) {return (size / 1024).toFixed(2) + 'KB'} else if (size) {return size + 'B'} else {return '-'}}var fields = {time: function (obj) {var s = new Date(parseInt(obj.id.slice(0, 8), 36) - tzoff).toJSON();return s.slice(0, 10) + ' ' + s.slice(11, -1)},method: function (obj) {return obj.method},pathname: function (obj) {return obj.entry},status: function (obj) {return obj.status === 999 ? 'error' : obj.status},size: function (obj) {if (obj.status === 999) return '-';return normalizeSize(obj.size)},duration: function (obj) {return obj.duration.toFixed(2)},addr: function (obj) {return obj.remote},type: function (obj) {return obj.type || '-'}}, field_names = Object.keys(fields);function onmessage(obj) {var id = obj.id;requests[id] = obj;var html = '<li class=\"' + (obj.status > 399 ? 'error' : obj.status > 299 ? 'warning' : 'ok') + '\" data-id=\"' + id + '\">';for (var name of field_names) {html += '<i class=\"i-' + name + '\">' + fields[name](obj) + '</i>'}html += '</li>';ul.insertAdjacentHTML('beforeEnd', html);}function connect() {console.log('websocket::%cconnecting to ' + ws_uri, 'color: #008080');var ws = new WebSocket(ws_uri);ws.onopen = function () {console.log('websocket::%cconnected', 'color: #008000');ws.onmessage = function (msg) {onmessage(JSON.parse(msg.data))};ws.onerror = null;ws.onclose = connect;};ws.onerror = function () {setTimeout(connect, 100);};}connect();})();</script>\r\n</body>\r\n</html>", {headers: {'content-type': 'text/html'}});

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
        const timestamp = Date.now(), h = start();
        arguments[0] = req;
        const promise = $fetch.apply(this, arguments);
        promise.then(fulfill, fulfill.bind(null, null));
        return promise;

        function fulfill(res, err) {
            const duration = stop(h);
            api_calls.push({
                time: timestamp,
                duration: duration,
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
                        remote: obj.remote, duration: obj.duration,
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
                return home_resp
            }

            const api_calls = co.Fiber.current.api_calls = [];
            const timestamp = Date.now(), h = start();
            var err, resp;
            try {
                resp = callback.apply(req, arguments);
            } catch ($) {
                err = $
            }
            const duration = stop(h);


            const uuid = timestamp.toString(36) + Math.random().toString(36).slice(2, 10);
            const $request = detail({
                method: req.method,
                search: req.search.slice(1),
                entry: req.pathname
            }, req), $response = statResponse(resp, err);


            const arr = [{
                time: timestamp,
                remote: getRemoteAddress(req),
                duration: duration,
                request: $request,
                response: $response
            }];

            if (api_calls.length) for (let obj of api_calls) {
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
                arr.push(obj);
            }
            const msg = JSON.stringify({
                id: uuid,
                remote: arr[0].remote,
                duration: duration,
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


