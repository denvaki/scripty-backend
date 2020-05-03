'use strict';

const {getRecords, downloadFile, cleanDir} = require('../utils/dataFilesUtils.js')
const {distros} = require('../config.json')
const fs = require('fs');
const downloadFolder = process.env.PROJECT_ROOT + process.env.DOWNLOAD_FOLDER || './zippedData/';
const unpackDataFolder = process.env.UNPACK_FOLDER || './output/';
const EventEmitter = require('events');


async function getData() {
    cleanDir(downloadFolder);
    cleanDir(unpackDataFolder);
    console.log('cleaned');
    const emitter = new EventEmitter();
    const distrosArray = Object.keys(distros);
    let data = await Promise.all(distrosArray.map(async (distro, idx) => {

            let releaseNamesRecords = await getRecords(distros[distro].repoURL + 'dists/');
            let releaseNames = releaseNamesRecords.filter(a => a.match(distros[distro].releaseNamesFilter.basicFilter) && !distros[distro].releaseNamesFilter.excludeFilter.includes(a));

            let releasesArray = await Promise.all(releaseNames.map(async (releaseName, idx) => {
                    const components = distros[distro].components;
                    let componentsArray = await Promise.all(components.map(async (componentName, idx) => {
                            let componentLink = distros[distro].repoURL + 'dists/' + releaseName + componentName;
                            let archsRecords = await getRecords(componentLink);
                            let archsRecordsFiltered = archsRecords.filter(a => a.match(distros[distro].archsFilter));
                            if (archsRecordsFiltered.length < 1) return;

                            archsRecordsFiltered.forEach((archRec, idx, archsRecordsFiltered) => {
                                downloadFile(componentLink + archRec, downloadFolder, `${distro}+${releaseName}+${componentName}+${archRec}`.replace(/\//g, ''), 'Packages.gz')
                                    .on('downloadedUncompressed', (arg) => emitter.emit("finished", arg));
                            });
                            let archs = archsRecordsFiltered.map(arch => arch.replace("binary-", "").replace('/', ''));
                            let component = componentName.replace('/', '');
                            return {"component": component, "archs": archs};
                        })
                    )
                    let release = releaseName.replace('/', '');

                    return {"release": release, "components": componentsArray}
                })
            );

            return {"distro": distro, "releaseName": releasesArray}
        })
    );
    fs.writeFile('supportedDistros.json', JSON.stringify(data), 'utf8', (error) => {
        error ?
            console.log('[write supportedDist]: ' + err) : console.log('[write supportedDist]: success');
    });

    return emitter;
}

module.exports.getData = getData


