const fetch = require('node-fetch');
const { JSDOM } = require("jsdom");
const http = require('http');
const fs = require('fs');
const path = require('path');
const gunzip = require('gunzip-file');
const EventEmitter = require('events');

async function getLinks(URL) {
    let response = await fetch(URL)
    if (response.status !== 200) {
        console.error("Bad response of " + URL);
        return [];
    }
    let repsonseContent = await response.text();
    return [...new JSDOM(repsonseContent).window.document.querySelectorAll('a')]
        .map(a => a.href)
        .filter(a => a !== undefined);
}

function downloadFile(URL, downloadFolder, localFileName, remoteFileName = 'Packages.gz', unzip = true, unzipFolder) {
    return new Promise((resolve, reject) => {
        if (URL === undefined) return { error: "URL is not specified" };
        if (downloadFolder === undefined || localFileName === undefined) return { error: "Download folder of Local filename is not specified" };
        if (unzip === true && unzipFolder === undefined) return { error: "Unzip folder is not specified" };
        let linkName = URL + remoteFileName;
        let fileName = localFileName + "+" + remoteFileName;
        console.log(fileName)
        const file = fs.createWriteStream(downloadFolder + fileName);
        const request = http.get(linkName, function (response) {
            response.pipe(file);
            file.on('close', () => {
                if (unzip) {
                    unpack(downloadFolder, fileName, unzipFolder)
                        .on('uncompressed', (arg) => resolve({ status: 'downloadedUncompressed', value: arg }));
                } else resolve({ status: 'downloaded', value: file });
            });
        });
    })


}

function cleanDir(directory, filenames) {
    let files = fs.readdirSync(directory);
    if (!Array.isArray(filenames)) {
        files.forEach(f => fs.unlink(path.join(directory, f), (err) => {
            if (err) throw err;
        })

        );

    }
    else {
        filenames.forEach(filename => {
            if (filename && files.includes(filename)) {
                fs.unlink(path.join(directory, filename), (err) => { if (err) throw err })
            }
        })
    }


}

function unpack(sourceDataFolder, zippedFile, destinationDataFolder) {
    let unzipedFile = zippedFile.replace(/\.gz$/, '');
    let unpackEmitter = new EventEmitter();
    gunzip(sourceDataFolder + zippedFile, destinationDataFolder + unzipedFile, () => {
        //console.log(`gunzip of ${zippedFile} is done`);
        unpackEmitter.emit('uncompressed', { file: unzipedFile });
    });
    return unpackEmitter;
}

module.exports = {
    getLinks,
    downloadFile,
    cleanDir
}
