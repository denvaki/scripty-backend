//'use strict';
require('dotenv').config();
const unpackDataFolder = process.env.UNPACK_FOLDER || './output/';
const  downloadFolder = process.env.DOWNLOAD_FOLDER || './zippedData';
const {getData} = require('./updateData/fetchRepoData.js')
const fs = require('fs');
const {parsePackage} = require('./parsePackage.js')
const {Pool} = require('pg')
const insert = require('./db/crud.js');
const {downloadFile} = require('./utils/dataFilesUtils');
const url = require('url');
const DBConnect = require('./db/DBConnect.js');

function parse(file) {
    try {
        let data = fs.readFileSync(unpackDataFolder + file, 'utf8');
        let packages = data.split(/^\n/m);
        let fileNameParams = file.split('+');
        const databaseName = fileNameParams[0];
        const tableName = fileNameParams[2];
        const packageRecords = packages.filter(p => p !== '' && p !== undefined)
            .map(p => parsePackage(p, fileNameParams[2]).packageRecord)
            .filter(p => p.Package);
        return {databaseName, tableName, packageRecords};
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    const dataPath = (process.env.PROJECT_ROOT || './') + "repositoriesMap.json";
    const repoMapArr = require(dataPath);

    for (const distRepo of repoMapArr) {
        const {baseURL} = distRepo;
        const databaseName = distro = distRepo.distro;
        let dbConnect = new DBConnect(databaseName);
        for (const releaseName of distRepo.releaseNames) {
            const tableName = release = releaseName.release;
            let URLs = [];
            releaseName.components.forEach(component => component.archs.forEach(arch => URLs.push(`${baseURL}dists/${release}/${component.component}/binary-${arch}/`)));
            const filenames = await downloadAll(URLs);
            for (const filename of filenames){
                const  parseValues = parse(filename.file);

                if (parseValues.databaseName === databaseName && parseValues.tableName === tableName && parseValues.packageRecords.length !== 0){
                    let result = await insert(dbConnect  , parseValues.tableName, parseValues.packageRecords);
                    console.log(result)
                }
            }
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


main()
