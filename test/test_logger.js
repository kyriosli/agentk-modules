import *  as logger from '../logger';
const assert = require('assert');

logger.format.info = '[$level] $datetime $0 $1 $method $filename $line $column\n';

const Writable = require('stream').Writable;

logger.output.info = new Writable();

let n = 0, written = 0;

logger.output.info._write = function (buf, encoding, callback) {
    assert(Buffer.isBuffer(buf));
    const regex = new RegExp('^\\[INFO\\] \\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d:\\d\\d hello world ' + n + ' test ' + __filename.replace(/\./g, '\\.') + ' 29 12\\n');
    assert(regex.test('' + buf));
    written++;
    callback();
};


for (let i = 0; i < 20; i++) {
    test();
    co.sleep(10);
}
assert(written === 20);


function test() {
    logger.info('hello world', ++n);
}