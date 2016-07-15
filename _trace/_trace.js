(function () {
    function Empty() {

    }

    Empty.prototype = Object.create(null);

    var ws_uri = 'ws://' + location.host + location.pathname;
    var requests = new Empty(), ul = document.getElementById('requests');
    var tzoff = new Date().getTimezoneOffset() * 60000;


    function beautifyJSON(obj, len) {
        return JSON.stringify(obj, null, len).replace(/"((?:[^"\\]|\\["\\nrt]|\\x..|\\u....)*)"(:)?|(\d*\.\d+|\d+(?:\.\d*)?)|(\w+)/g, function (m, string, key, num, id) {
            if (key) {
                return '<span class="key">&quot;' + escape(string) + '&quot;</span>:'
            } else if (typeof string === 'string') {
                return '<span class="string">&quot;' + escape(string) + '&quot;</span>'
            } else if (num) {
                return '<span class="num">' + num + '</span>'
            } else if (id) {
                return '<span class="' + id + '">' + id + '</span>'
            }
        });
    }

    function onButton(button) {
        var h2 = button.parentNode;
        var obj = requests[button.getAttribute('data-id')].arr[button.getAttribute('data-idx')][button.getAttribute('data-sub')];
        var replacement;
        if (button.hasAttribute('data-old-text')) {
            button.textContent = button.getAttribute('data-old-text');
            button.removeAttribute('data-old-text');
            replacement = makeCode(obj.payload);
        } else {
            switch (button.getAttribute('data-action')) {
                case 'format_json':
                    var beautified = beautifyJSON(JSON.parse(obj.payload.replace(/[\u00c7-\u00df].|[\u00e0-\u00ef]../g, function (m) {
                        return decodeURIComponent(window.escape(m))
                    })), 2);
                    replacement = '<code>' + beautified + '</code>';
                    break;
                case 'view_img':
                    replacement = '<img src="data:' + obj.content_type + ';base64,' + btoa(obj.payload) + '">';
                    break;
                case 'parse_query':
                    replacement = parseQuery(obj.payload);
                    break;
            }
            button.setAttribute('data-old-text', button.textContent);
            button.textContent = 'raw'
        }
        h2.parentNode.removeChild(h2.nextElementSibling);
        h2.insertAdjacentHTML('afterEnd', replacement);
    }

    function parseQuery(str) {
        var html = '<table class="pairs">';
        for (var kv of str.split('&')) {
            var _idx = kv.indexOf('='), value;
            if (_idx === -1) {
                value = ''
            } else {
                value = kv.substr(_idx + 1);
                kv = kv.substr(0, _idx);
            }
            html += '<tr><td>' + escape(decodeURIComponent(kv)) + '</td><td>' + escape(decodeURIComponent(value)) + '</td></tr>'
        }
        html += '</table>';
        return html;
    }

    function makeCode(str) {
        if (str.length > 1024) {
            return '<code>' + escape(str.slice(0, 1024)) + '...</code>'
        } else {
            return '<code>' + escape(str) + '</code>'
        }
    }

    function onSub(li, target) {
        if (li !== target && target.nodeName !== 'H1' && target.parentNode.nodeName !== 'H1' || li.classList.contains('error')) return;
        var id = li.getAttribute('data-id'), arr = requests[id].arr;
        var idx = li.getAttribute('data-idx'), sub = li.getAttribute('data-sub');
        var obj = arr[idx][sub];
        if (obj.opened) {
            li.classList.remove('opened');
            obj.opened = false;
            li.removeChild(li.lastElementChild);
            return
        }
        li.classList.add('opened');

        var desc_html = '<div>';
        if (obj.search) {
            desc_html += '<h2>Queries</h2>' + parseQuery(obj.search);
        }

        var content_type = '', cookie = null;
        if (obj.headers.length) {
            desc_html += '<h2>Headers</h2><table class="pairs">';
            for (var kv of obj.headers) {
                var split = kv.indexOf(':'), name = kv.slice(0, split), value = kv.slice(split + 1);

                if (name.toLowerCase() === 'content-type') {
                    content_type = value;
                } else if (name.toLowerCase() === 'cookie') {
                    cookie = value;
                    if (value.length > 128) value = value.slice(0, 127) + '...';
                }

                desc_html += '<tr><td>' + escape(name) + '</td><td>' + escape(value) + '</td></tr>';
            }
            desc_html += '</table>';
        }
        if (cookie) {
            desc_html += '<h2>Cookies</h2><table class="pairs">';
            for (var kv of cookie.split('; ')) {
                var split = kv.indexOf('=');
                desc_html += '<tr><td>' + escape(kv.slice(0, split)) + '</td><td>' + escape(kv.slice(split + 1)) + '</td></tr>';
            }
            desc_html += '</table>';
        }
        if (obj.payload) {
            desc_html += '<h2>Payload';
            if (content_type.slice(0, 16) === 'application/json') {
                desc_html += '<button data-action="format_json" data-id="' + id + '" data-idx="' + idx + '" data-sub="' + sub + '">format</button>'
            } else if (content_type === 'application/x-www-form-urlencoded') {
                desc_html += '<button data-action="parse_query" data-id="' + id + '" data-idx="' + idx + '" data-sub="' + sub + '">parse</button>'
            } else if (content_type.slice(0, 6) === 'image/') {
                obj.content_type = content_type;
                desc_html += '<button data-action="view_img" data-id="' + id + '" data-idx="' + idx + '" data-sub="' + sub + '">view image</button>'
            }
            desc_html += '</h2>' + makeCode(obj.payload);

        }

        desc_html += '</div>';
        li.insertAdjacentHTML('beforeEnd', desc_html);
        obj.opened = true;
    }

    function onRequest(li) {
        var id = li.getAttribute('data-id'), entry = requests[id];
        if (entry.opened) {
            li.parentNode.removeChild(li.nextElementSibling);
            entry.opened = false;
            return
        }
        fetchMsg(entry).then(function (arr) {
            if (entry.opened) return;
            var obj = arr[0];
            var detail_html = '<li class="detail"><ul><li class="title">Request</li><li class="sub" data-id="' + id
                + '" data-idx="0" data-sub="request">' + request_summary(obj) + '</li>';

            if (arr.length > 1) {
                detail_html += '<li class="title">API calls</li>';
                for (var i = 1, l = arr.length; i < l; i++) {
                    var api_call = arr[i];
                    if (!api_call.request) {
                        detail_html += '<li><h1 class="api">' + api_call.name + '(';
                        if (api_call.args.length > 1) {
                            detail_html += beautifyJSON(api_call.args, 0).slice(1, -1)
                        }
                        detail_html += ') <span class="extra">' + api_call.time_start.toFixed(2) + 'ms</span></h1></li>';
                        continue;
                    }
                    detail_html += '<li class="sub req" data-id="' + id + '" data-idx="' + i + '" data-sub="request">'
                        + request_summary(api_call) + '</li>';
                    if (api_call.response.error) {
                        detail_html += '<li class="sub res error">';
                    } else {
                        detail_html += '<li class="sub res" data-id="' + id + '" data-idx="' + i + '" data-sub="response">';
                    }
                    detail_html += '<h1>' + response_summary(api_call) + '</h1></li>';
                }
            }

            detail_html += '<li class="title">Response</li>';

            if (obj.response.error) {
                detail_html += '<li class="sub res error">';
            } else {
                detail_html += '<li class="sub" data-id="' + id + '" data-idx="0" data-sub="response">';
            }
            detail_html += response_summary(obj) + '</li></ul></li>';
            li.insertAdjacentHTML('afterEnd', detail_html);
            entry.opened = true;
        })
    }

    function fetchMsg(entry) {
        if (!entry.pending) {
            entry.pending = fetch('?action=fetch_msg&id=' + entry.id).then(function (req) {
                return req.json()
            });
            entry.pending.then(function (arr) {
                entry.arr = arr
            });
        }
        return entry.pending;
    }

    function request_summary(obj) {
        var req = obj.request;
        var res = obj.response;
        return '<h1>' + req.method + ' ' + req.entry + (req.search ? '?' + req.search : '')
            + (res.error ? '' : ' <span class="ip">' + obj.remote + '</span>')
            + (obj.time_start ? ' <span class="extra">' + obj.time_start.toFixed(2) + 'ms ~ ' + obj.time_end.toFixed(2) + 'ms</span>' : '')
            + '</h1>'
    }

    function response_summary(obj) {
        var res = obj.response;
        var ret;
        if (res.error) {
            ret = '<h1><span class="error">Error: ' + res.error + '</span>';
        } else {
            ret = '<h1><span class="' + (res.status > 399 ? 'error' : 'ok') + '">' + res.status + ' ' + res.statusText + '</span>';
            ret += ' <span class="extra">';
            if (res.type) ret += res.type + ', ';
            if (res.payload) ret += normalizeSize(res.payload.length);
            ret += '</span>'
        }
        ret += '</h1>';
        return ret;
    }

    var last_ip = '';
    document.getElementById('header').addEventListener('click', function (e) {
        var target = e.target;
        if (target.nodeName !== 'A') return;
        e.preventDefault();
        var href = target.getAttribute('href');
        switch (href.match(/action=(\w+)/)[1]) {
            case 'history':
                if (href.includes('filter=by_ip')) {
                    var ip = prompt('Enter remote IP', last_ip);
                    if (!ip) return;
                    href += '&ip=' + (last_ip = ip)
                }
                fetch(href).then(function (resp) {
                    return resp.json()
                }).then(function (arr) {
                    requests = new Empty();
                    ul.innerHTML = '';
                    if (arr.length) {
                        arr.forEach(onmessage);
                    } else {
                        alert('result is empty')
                    }
                });
                break;

            case 'clear_history':
                requests = new Empty();
                ul.innerHTML = '';
                fetch(target.href).then(function (resp) {
                    console.log(resp.status)
                }, function (err) {
                    console.error(err)
                });
                break;
        }
    });

    ul.addEventListener('click', function (e) {
        var target = e.target;
        if (target.nodeName === 'BUTTON') {
            return onButton(target);
        }
        var li = target.closest('li'), cls = li.className;

        if (cls === 'detail' || cls === 'title') return;
        if (li.classList.contains('sub')) {
            return onSub(li, target);
        } else if (li.parentNode === ul) {
            return onRequest(li);
        }
    });

    function escape(html) {
        return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    }

    function normalizeSize(size) {
        if (size > 1048576) {
            return (size / 1048576).toFixed(2) + 'MB'
        } else if (size > 1024) {
            return (size / 1024).toFixed(2) + 'KB'
        } else if (size) {
            return size + 'B'
        } else {
            return '-'
        }
    }

    var fields = {
        time: function (obj) {
            var s = new Date(parseInt(obj.id.slice(0, 8), 36) - tzoff).toJSON();
            return s.slice(0, 10) + ' ' + s.slice(11, -1)
        },
        method: function (obj) {
            return obj.method
        },
        pathname: function (obj) {
            return obj.entry
        },
        status: function (obj) {
            return obj.status === 999 ? 'error' : obj.status
        },
        size: function (obj) {
            if (obj.status === 999) return '-';
            return normalizeSize(obj.size)
        },
        duration: function (obj) {
            return obj.time_end.toFixed(2)
        },
        addr: function (obj) {
            return obj.remote
        },
        type: function (obj) {
            return obj.type || '-'
        }
    }, field_names = Object.keys(fields);

    function onmessage(obj) {
        var id = obj.id;
        requests[id] = obj;

        var html = '<li class="' + (obj.status > 399 ? 'error' : obj.status > 299 ? 'warning' : 'ok') + '" data-id="' + id + '">';

        for (var name of field_names) {
            html += '<i class="i-' + name + '">' + fields[name](obj) + '</i>'
        }
        html += '</li>';

        ul.insertAdjacentHTML('beforeEnd', html);
    }

    function connect() {
        console.log('websocket::%cconnecting to ' + ws_uri, 'color: #008080');
        var ws = new WebSocket(ws_uri);
        ws.onopen = function () {
            console.log('websocket::%cconnected', 'color: #008000');
            ws.onmessage = function (msg) {
                onmessage(JSON.parse(msg.data))
            };
            ws.onerror = null;
            ws.onclose = connect;
        };
        ws.onerror = function () {
            setTimeout(connect, 100);
        };
    }

    connect();
})();