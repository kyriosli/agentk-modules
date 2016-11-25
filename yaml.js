export const parse = function (str) {
    if (str[str.length - 1] !== '\n')
        str += '\n';
    const rLine = /^(\s*)(?:([\w\-]+)\s*:|(-))\s*(.*)/,
        rJSON = /^(?:\d+(?:\.\d+)?|null|true|false|"(?:[^"\x00-\x19\\]|\\(?:[rnt"]|u[\da-fA-F]{4}))*")$/;
    var ret = accepts(0, -1);
    if (ret.index !== str.length) {
        throw new Error('unexpected residue content: ' + str.substr(ret.index))
    }
    return ret.value;

    function accepts(index, current_indent) {
        var first = true, isMap = false, value;
        while (1) {
            var lineEnd = str.indexOf('\n', index);
            if (lineEnd === -1) {
                if (first)
                    throw new Error('expected json or object or list: ' + line);
                return {value: value, index}
            }
            var line = str.slice(index, lineEnd);
            if (/^\s*$/.test(line)) { // empty line or comment
                index = lineEnd + 1;
                continue;
            }
            if (rJSON.exec(line)) {
                return {value: JSON.parse(line), index: lineEnd + 1}
            }
            var m = rLine.exec(line);
            if (!m)
                throw new Error('bad line: ' + line);

            var indent = m[1].length, name = m[2], val = m[4];
            if (indent <= current_indent) {
                if (first)
                    throw new Error('expected json or object or list: ' + line);
                return {value: value, index}
            }
            if (first) {
                first = false;
                isMap = !m[3];
                value = isMap ? {} : [];
            } else if (!m[3] !== isMap) {
                throw new Error('bad line: ' + line);
            }

            index = lineEnd + 1;
            if (!isMap) {
                name = value.length;
            }
            // console.log(indent, name, val);
            if (val) {
                value[name] = rJSON.test(val) ? JSON.parse(val) : val;
            } else {
                ({value: value[name], index} = accepts(index, indent));
            }
        }

    }
};

export const stringify = function (obj) {
    if (!obj || typeof obj !== 'object')
        throw new Error('');
    return stringify(obj, '');
    function stringify(obj, prefix) {
        switch (typeof obj) {
            case 'number':
        }

    }
};