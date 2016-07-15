import * as file from '../../src/module/file'
// import * as javascript from '../../src/module/javascript'


process.chdir(__dirname);

var module_source = '' + file.read('trace.js'),
    html = '' + file.read('_trace.html'),
    js = '' + file.read('_trace.js'),
    css = '' + file.read('_trace.css');
html = html.replace('<link rel="stylesheet" href="_trace.css">', '<style>' + uglify(css) + '</style>')
    .replace('<script src="_trace.js"></script>', '<script>' + uglify(js) + '</script>');

module_source = module_source.replace(/from '\.\.\/(\w+)'/g, "from '$1'")
    .replace("'DUMMY CODE'", JSON.stringify(html))
    .replace(/return new http\.Response\(fs\..+/, 'return home_resp');

file.write('../trace.js', module_source);

function uglify(code) {
    return code.replace(/\r\n\s*/g, '')
}