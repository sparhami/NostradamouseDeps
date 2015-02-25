#!/usr/bin/env node

var fs = require('fs'),
    dir = require('node-dir'),
    nmouseDeps = require('./nmouse-deps');

if(process.argv.length < 5) {
    console.warn('usage: nmousedeps.js <base path> <component path> <output file>');
    process.exit(1);
}

var basePath = process.argv[2],
    componentPath = process.argv[3],
    outputPath = process.argv[4];

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

        var mapping = nmouseDeps.generateMapping(basePath, files),
            output = nmouseDeps.generateOutput(mapping);

        fs.writeFile(outputPath, output, function(err) {
            if(err) {
                throw err;
            }
        });
    }
);
