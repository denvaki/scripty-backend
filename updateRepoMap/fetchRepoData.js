require('dotenv').config();
const { getLinks, downloadFile, cleanDir } = require('../utils/dataFilesUtils.js')
const { distros } = require('../config.json')
const fs = require('fs');
const tmpDir = (process.env.PROJECT_ROOT || './') + process.env.TMP || './tmp/';
const EventEmitter = require('events');

async function getData() {
    const emitter = new EventEmitter();
    const distrosArray = Object.keys(distros);
    let data = await Promise.all(distrosArray.map(async (distro, idx) => {

        const releseAndDateArr = [];
        const { repoURL, rootFolder, components, releaseNamesFilter, archsFilter, type } = distros[distro];

        let releaseNames = await fileterRecords(repoURL + rootFolder, releaseNamesFilter.basicFilter, releaseNamesFilter.excludeFilter);

        let releasesArray = await Promise.all(releaseNames.map(async (releaseName, idx) => {

            let releaseFileData = await parseReleaseFile(repoURL + rootFolder + releaseName, releaseName.replace(/\//g, ''));
            releseAndDateArr.push({release: releaseName.replace(/\//g, ''), date: releaseFileData.date})
            let componentsArray = await Promise.all(components.map(async (componentName, idx) => {
                let componentLink = repoURL + rootFolder + releaseName + componentName;
                let archsRecordsFiltered = await fileterRecords(componentLink, archsFilter.basicFilter, archsFilter.excludeFilter);

                if (archsRecordsFiltered.length < 1) return;
                let archs = archsRecordsFiltered.map(arch => arch.replace("binary-", "").replace('/', ''));
                let component = componentName.replace('/', '');
                return { "component": component, "archs": archs };
            })
            )
            let release = releaseName.replace('/', '');

            
            return { "release": release, "version": releaseFileData.version, "components": componentsArray };
        })
        );

        let latestRelease = releseAndDateArr.reduce((a, b) => a.date > b.date ? a : b);
        return { distro, "baseURL": repoURL, type, "releaseNames": releasesArray, latestRelease,  rootFolder};
    })
    );
    fs.writeFile((process.env.PROJECT_ROOT || './') + 'repositoriesMap.json', JSON.stringify(data), 'utf8', (error) => {
        let emitArgs = {};
        if (error) {
            console.log('[FAIL]: ' + err);
            emitArgs.error = "cannot write data to repositoriesMap.json";
        } else {
            console.log('[SUCCESS]: write repositoriesMap');
            emitArgs.success = "repositories structure is written to repositoriesMap.json";
        }
        emitter.emit("finished", emitArgs);
    });
    return emitter;
}

async function fileterRecords(link, basicFilter, excludeFilter) {
    if (!link || !basicFilter) {
        return [];
    }
    let records = await getLinks(link);
    return records.filter(a => a.match(basicFilter) && !excludeFilter.includes(a));
}

async function parseReleaseFile(URL, filename) {
    let releaseFile = null;
    let version, components, date;

    let downloadStatus = await downloadFile(URL, tmpDir, filename, "Release", false);
    if (downloadStatus.status && downloadStatus.status === 'downloaded' && downloadStatus.value) {
        releaseFile = downloadStatus.value.path;
    }

    if (releaseFile != null) {
        let dataLines = fs.readFileSync(releaseFile, 'utf8').split('\n');

        //cause of Ubuntu, decided to not take architectures from Release file
        for(let line of dataLines) {
            if (version && components && date) break;
            
            if (line.startsWith("Version: ")) {
                version = line.split(": ")[1];
            }
            else if (line.startsWith("Components: ")) {
                components = line.split(": ")[1].split(" ");
            }
            else if (line.startsWith("Date: ")) {
                date = new Date(line.split(": ")[1]);
            }
        }
        cleanDir(tmpDir, [releaseFile.substring(releaseFile.lastIndexOf('/')+1)]);
    }
    
    return { version, components, date }
}

module.exports.getData = getData

