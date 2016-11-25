import {parse, stringify} from '../yaml'

const assert = require('assert'), assertEqual = assert.strictEqual;

const it = new Test('yaml');

it.test('base', function () {
    assert.deepEqual(parse(`
foo: bar
foo2: "bar2"
foo3: "bar\\uabcd"
foo4:
  - 1
  - 2
  -
    a: b
  - 3
foo5: 1234
`), {
        foo: 'bar',
        foo2: 'bar2',
        foo3: 'bar\uabcd',
        foo4: {0: 1, 1: 2, 2: {a: "b"}, 3: 3, length: 4},
        foo5: 1234
    });

    assertEqual(parse('1234'), 1234)
});