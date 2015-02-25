var path = require('path'),
    fs = require('fs'),
    format = require("string-template"),
    htmlparser = require("htmlparser2");

function getDeps(filename) {
    var deps = [];

    var parser = new htmlparser.Parser({
        onopentag: function(name, attribs){
            if(name !== "link" || attribs.rel !== "import") {
                return;
            }

            deps.push(path.resolve(filename, "../" + attribs.href));
        }
    });

    parser.write(fs.readFileSync(filename));
    parser.end();

    return deps;
}

function processFiles(basePath, filenames, depsMap) {
    function getRelativePath(filename) {
        return path.relative(basePath, filename);
    }

    return filenames
        .filter(function(filename) {
            return !depsMap[filename];
        })
        .forEach(function(filename) {
            var deps = getDeps(filename);

            depsMap[getRelativePath(filename)] = deps.map(getRelativePath);

            processFiles(basePath, deps, depsMap);
        });
}

module.exports.generateMapping = function(basePath, filenames) {
    var depsMap = {},
        idMap = {};

    function getId(key) {
        return idMap[key];
    }

    processFiles(basePath, filenames, depsMap);

    Object.keys(depsMap)
        .forEach(function(key, index) {
            idMap[key] = index;
        });

    return Object.keys(depsMap)
        .map(function(key) {
            return {
                id: getId(key),
                src: key,
                deps: depsMap[key].map(getId).join(' ')
            };
        });
}

module.exports.generateOutput = function(mapping) {
    var template = '<nmouse-dep data-id="{id}" src="{src}" deps="{deps}"></nmouse-dep>',
        depNodes = mapping
            .map(function(item) {
                return format(template, item);
            });

    return []
        .concat('<nmouse-deps>')
        .concat(depNodes)
        .concat('</nmouse-deps>')
        .join('\n');
};
