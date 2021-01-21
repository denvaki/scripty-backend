//'use strict';
require('dotenv').config();
const unpackDataFolder = process.env.ContentsDir || './contents/';
const downloadFolder = process.env.DOWNLOAD_FOLDER || './zippedData';
const { getData } = require('./updateRepoMap/fetchRepoData.js')
const fs = require('fs');
const { downloadFile, cleanDir } = require('./utils/dataFilesUtils');
const url = require('url');

async function main() {

    const dataPath = (process.env.PROJECT_ROOT || './') + "repositoriesMap.json";
    const repoMapArr = require(dataPath);

    for (const distRepo of repoMapArr) {
        const { baseURL, rootFolder, type } = distRepo;
        for (const releaseName of distRepo.releaseNames) {
            let URLs = [];
            let URL = `${baseURL}${rootFolder}${releaseName.release}/`;

            if (type === "debian-based") {

                releaseName.components.forEach(component => {
                    component.archs.forEach(arch => {
                        URLs.push(URL + component.component + '/' + `Contents-${arch}.gz`)
                    })
                });

            }

            else if(type === "ubuntu-based") {
                let allReleaseArchs = new Set();
                releaseName.components.forEach(component => {
                    component.archs.forEach(arch => {
                        allReleaseArchs.add(arch)
                    });
                });
                
                allReleaseArchs.forEach(arch => {
                    URLs.push(URL + `Contents-${arch}.gz`)
                })
                

            }

            const filenames = await downloadAll(URLs);

        }

    }
}

async function downloadAll(URLs) {
    if (!Array.isArray(URLs) || URLs.length === 0) return { error: "input parameter is not array or empty" }

    let filenames = [];
    for (const URL of URLs) {
        const urlPath = url.parse(URL).pathname;
        const localName = urlPath.substring(1, urlPath.length).replace(/\//g, '+');
        const downloadStatus = await downloadFile(URL, downloadFolder, localName, '', true, unpackDataFolder);
        
        if (downloadStatus.status && downloadStatus.status === 'downloadedUncompressed' && downloadStatus.value) {
            filenames.push(downloadStatus.value);
            cleanDir(downloadFolder, [downloadStatus.value.file + ".gz"]);
        }else {
            console.log(downloadStatus)
        }
        
    }

    return filenames
}


// (async () => {
//     let getDataEmit = await getData();
//     getDataEmit.on("finished", main) // update repoMap first
// })();

main();