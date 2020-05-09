const fetch = require('node-fetch');
const  { JSDOM } = require("jsdom");
const http = require('http');
const fs = require('fs');
const path = require('path');
const gunzip = require('gunzip-file');
const EventEmitter = require('events');

async function getRecords(URL) {
    let response = await fetch(URL)
    if (response.status !== 200) {
        console.log("Bad response of " + URL);
        return [];
    }
    let repsonseContent = await response.text();
    return [...new JSDOM(repsonseContent).window.document.querySelectorAll('a')]
        .map(a => a.href)
        .filter(a => a !== undefined);
}

function downloadFile(URL, downloadFolder, localFileName, remoteFileName = 'Packages.gz', unzip = true, unzipFolder) {
    return new Promise((resolve, reject) =>{
        if (URL === undefined) return {error: "URL is not specified"};
        if (downloadFolder === undefined || localFileName === undefined) return {error: "Download folder of Local filename is not specified"};
        if (unzip === true && unzipFolder === undefined) return {error: "Unzip folder is not specified"};
        let linkName = URL + remoteFileName;
        let fileName = localFileName + "+" + remoteFileName;
        console.log(fileName)
        const file = fs.createWriteStream(downloadFolder + fileName);
        const request = http.get(linkName, function (response) {
            response.pipe(file);
            file.on('close', () => {
                if (unzip){
                    unpack(downloadFolder, fileName, unzipFolder)
                        .on('uncompressed', (arg) => resolve({status: 'downloadedUncompressed', value: arg}));
                }else resolve({status: 'downloaded', value: file});
            });
        });
    })


}

function cleanDir(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
}

function unpack(sourceDataFolder, zippedFile, destinationDataFolder) {
    let unzipedFile = zippedFile.replace(/\.gz$/, '');
    let unpackEmitter = new EventEmitter();
    gunzip(sourceDataFolder + zippedFile, destinationDataFolder + unzipedFile, () => {
        //console.log(`gunzip of ${zippedFile} is done`);
        unpackEmitter.emit('uncompressed', {file: unzipedFile});
    });
    return unpackEmitter;
}

module.exports = {
    getRecords,
    downloadFile,
    cleanDir
}
