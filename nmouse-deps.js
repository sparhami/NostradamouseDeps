#!/usr/bin/env node

var path = require('path'),
    fs = require('fs'),

    format = require("string-template"),
    dir = require('node-dir'),
    htmlparser = require("htmlparser2");

if(process.argv.length < 5) {
    console.warn('usage: nmousedeps.js <base path> <component path> <output file>');
    process.exit(1);
}

var basePath = process.argv[2],
    componentPath = process.argv[3],
    outputPath = process.argv[4];

function getRelativePath(filename) {
    return path.relative(basePath, filename);
}

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

function processFiles(filenames, depsMap) {
    return filenames
        .filter(function(filename) {
            return !depsMap[filename];
        })
        .forEach(function(filename) {
            var deps = getDeps(filename);

            depsMap[getRelativePath(filename)] = deps.map(getRelativePath);

            processFiles(deps, depsMap);
        });
}

function generateMapping(filenames) {
    var depsMap = {},
        idMap = {};

    function getId(key) {
        return idMap[key];
    }

    processFiles(filenames, depsMap);

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

function generateOutput(mapping) {
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
}

dir.readFiles(
    basePath + '/' + componentPath,
    {
        match: /.html/,
        exclude: /^\./
    },
    function(err, content, next) {
        next();
    },
    function(err, files){
        if (err) {
            throw err;
        }

        var mapping = generateMapping(files),
            output = generateOutput(mapping);

        fs.writeFile(outputPath, output, function(err) {
            if(err) {
                throw err;
            }
        });
    }
);
