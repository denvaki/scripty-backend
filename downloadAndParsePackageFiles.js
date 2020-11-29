//'use strict';
require('dotenv').config();
const unpackDataFolder = process.env.PackagesDir || './packages/';
const  downloadFolder = process.env.DOWNLOAD_FOLDER || './zippedData';
const {getData} = require('./updateRepoMap/fetchRepoData.js')
const fs = require('fs');
const {downloadFile} = require('./utils/dataFilesUtils');
const url = require('url');


async function main() {

    const dataPath = (process.env.PROJECT_ROOT || './') + "repositoriesMap.json";
    const repoMapArr = require(dataPath);

    for (const distRepo of repoMapArr) {
        const {baseURL} = distRepo;
        for (const releaseName of distRepo.releaseNames) {
            let URLs = [];
            releaseName.components.forEach(component => component.archs.forEach(arch => URLs.push(`${baseURL}dists/${releaseName.release}/${component.component}/binary-${arch}/`)));
            const filenames = await downloadAll(URLs);
        }

    }
}

async function downloadAll(URLs) {
    if (!Array.isArray(URLs) || URLs.length === 0) return {error: "input parameter is not array or empty"}

    let filenames = [];
    for (const URL of URLs) {
        const urlPath  = url.parse(URL).pathname;
        const localName = urlPath.substring(1, urlPath.length-1).replace(/\//g, '+');
        const downloadStatus = await downloadFile(URL, downloadFolder, localName, 'Packages.gz', true, unpackDataFolder);
        if (downloadStatus.status && downloadStatus.status === 'downloadedUncompressed' && downloadStatus.value){
            filenames.push(downloadStatus.value);
        }
    }
    return filenames
}


(async () => {
    let getDataEmit = await getData();
    getDataEmit.on("finished", main) // update repoMap first
})();
