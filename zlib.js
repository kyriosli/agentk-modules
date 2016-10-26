const ozlib = require('zlib');

/**
 * convert a buffer into a gzipped buffer
 *
 * @method
 * @param {Buffer} buffer
 * @returns {Buffer}
 */
export const gzip = sync(ozlib.gzip);
export const gunzip = sync(ozlib.gunzip);
export const inflate = sync(ozlib.inflate);
export const inflateRaw = sync(ozlib.inflateRaw);
export const deflate = sync(ozlib.deflate);
export const deflateRaw = sync(ozlib.deflateRaw);


/**
 * transforms a stream into a gzipped stream
 *
 * @param {node.stream::stream.Readable} stream
 * @returns {node.stream::stream.Readable}
 */
export function gzipTransform(stream) {
    return stream.pipe(ozlib.createGzip());
}

/**
 * transforms a gzipped stream into an unzipped stream
 *
 * @param {node.stream::stream.Readable} stream
 * @returns {node.stream::stream.Readable}
 */
export function gunzipTransform(stream) {
    return stream.pipe(ozlib.createGunzip());
}


function sync(method) {
    return function (buffer, opts) {
        return co.promise(function (resolve, reject) {
            method(buffer, opts, function cb(err, result) {
                err ? reject(err) : resolve(result);
            })
        });
    }
}