import * as http from '../http'
import staticFile from '../static_file'
import * as watcher from '../q_watcher'

if (process.properties.check) {
    include('trace').setup(__dirname + '/trace.log');
    include('trace').trace(watcher, 'watcher')
}

const static_file = staticFile(__dirname);

watcher.prefix = 't.trace';

const server = http.listen(8080, function (req) {
    console.log('handle', req.method, req.pathname);
    if (req.pathname === '/') {
        watcher.add('redirect');
        return http.Response.redirect('/index.html')
    }
    if (req.pathname === '/bar') {
        watcher.add('error');
        throw new Error('/bar will always throw')
    }
    if (req.method === 'POST' && req.pathname === '/foo') {
        const start = Date.now();
        co.yield(http.fetch('http://127.0.0.1:8080', {headers: {'user-agent': 'agentk'}}));
        watcher.add('request', Date.now() - start);
        co.yield(http.fetch('http://127.0.0.1:8080/test.json', {headers: {'user-agent': 'agentk'}}));
        co.yield(http.fetch('http://127.0.0.1:8080/bar', {headers: {'user-agent': 'agentk'}})); // trigger a error
        try {
            co.yield(http.fetch('http://127.0.0.1:8081/'))
        } catch (e) {
            watcher.add('error');
        }
        return http.Response.error(403, 'example response')
    }
    watcher.add('static_file', 1, true, false, null, {"foo": "bar", "pi": 3.14});
    return static_file(req);
});

console.log('server started at', server.address());