//'use strict';
require('dotenv').config();
const unpackDataFolder = process.env.UNPACK_FOLDER || './output/';
const downloadFolder = process.env.DOWNLOAD_FOLDER || './zippedData';
const { getData } = require('./updateRepoMap/fetchRepoData.js')
const fs = require('fs');
const readline = require('readline');
const { parsePackage } = require('./parsePackage.js')
const { Pool } = require('pg')
const Crud = require('./db/crud.js');
const { downloadFile } = require('./utils/dataFilesUtils');
const url = require('url');
const DBConnect = require('./db/DBConnect.js');
const fetch = require('node-fetch');
const { listenerCount } = require('process');

function parse(file) {
    try {
        let inputStream = fs.createReadStream(unpackDataFolder + file, 'utf8');
        let rl = readline.createInterface({
            input: inputStream,
            terminal: false
        });
        let records = [];
        rl.on('line', function (line) {
            let lastSpace = line.lastIndexOf(' ')
            if (lastSpace === -1 || line.length-1 === lastSpace) {
                console.error("File-package line has unsupported format");
                console.error(line);
                return;
            }
            console.log(line)

            let filename = line.substring(0, lastSpace).replace(/\s*$/);
            let lineRight = line.substring(line.lastIndexOf(' ')+1);
            
            let sectionPackageArr = lineRight.split(/\//g);
            section = sectionPackageArr[sectionPackageArr.length - 2];
            packageName = sectionPackageArr[sectionPackageArr.length - 1];

            records.push({ filename, packageName, section });
        })
        return new Promise((resolve, reject) =>{
            rl.on("close", () => resolve(records))
        
        })
        



    } catch (e) {
        console.error(e);
    }
}

async function main() {



    const dataPath = (process.env.PROJECT_ROOT || './') + "repositoriesMap.json";
    const repoMapArr = require(dataPath);

    for (const distRepo of repoMapArr) {
        const { baseURL } = distRepo;
        const databaseName = distRepo.distro;
        let dbConnect = new DBConnect(databaseName);
        let crud = new Crud(dbConnect);

        if (distRepo.latestRelease && distRepo.latestRelease.release) {

            let latestRelease = distRepo.latestRelease.release;

            let filteredByLatestRelease = distRepo.releaseNames.filter(releaseObj => releaseObj.release = latestRelease);

            let composedURL = distRepo.baseURL + distRepo.rootFolder + latestRelease + '/';
            let { type } = distRepo;
            if (filteredByLatestRelease.length) {
                if (type === 'ubuntu-based') {
                    let architectureToDownload = null;
                    let supportedArchitectures = [];
                    filteredByLatestRelease[0].components.forEach(component => {
                        supportedArchitectures.push(...component.archs);
                    })
                    supportedArchitectures = Array.from(new Set(supportedArchitectures));

                    if (supportedArchitectures.includes("amd64")) {
                        architectureToDownload = "amd64";
                    } else if (supportedArchitectures.includes("i386")) {
                        architectureToDownload = "i386";
                    } else {
                        architectureToDownload = supportedArchitectures[0];
                    }
                    const urlPath = url.parse(composedURL).pathname;
                    const localName = urlPath.substring(1, urlPath.length - 1).replace(/\//g, '+');
                    if (!checkURL(composedURL + 'Contents-' + architectureToDownload + '.gz')) continue;
                    const downloadStatus = await downloadFile(composedURL, downloadFolder, localName, 'Contents-' + architectureToDownload + '.gz', true, unpackDataFolder);
                    if (downloadStatus.status && downloadStatus.status === 'downloadedUncompressed' && downloadStatus.value) {
                        let parsedRecords = await parse(downloadStatus.value.file);
                        crud.insertContentsRecords(parsedRecords);
                    }


                }



            }

        }



        // for (const releaseName of distRepo.releaseNames) {
        //     const tableName = release = releaseName.release;
        //     let URLs = [];
        //     releaseName.components.forEach(component => component.archs.forEach(arch => URLs.push(`${baseURL}dists/${release}/${component.component}/binary-${arch}/`)));
        //     const filenames = await downloadAll(URLs);
        //     for (const filename of filenames) {
        //         const parseValues = parse(filename.file);

        //         if (parseValues.databaseName === databaseName && parseValues.tableName === tableName && parseValues.packageRecords.length !== 0) {
        //             let result = await crud.insert(parseValues.tableName, parseValues.packageRecords);
        //             console.log(result)
        //         }
        //     }
        // }
        dbConnect.close();
        delete crud;
        delete dbConnect;

    }
}

async function downloadAll(URLs) {
    if (!Array.isArray(URLs) || URLs.length === 0) return { error: "input parameter is not array or empty" }

    let filenames = [];
    for (const URL of URLs) {

    }
    return filenames
}

async function checkURL(URL) {
    return await fetch(URL).then(res => res.ok);
}

async function fileterRecords(link, basicFilter, excludeFilter) {
    if (!link || !basicFilter) {
        return [];
    }
    let records = await getRecords(link);
    return records.filter(a => a.match(basicFilter) && !excludeFilter.includes(a));
}

(async () => {
    let getDataEmit = await getData();
    getDataEmit.on("finished", main) // update repoMap first
})();


