'use strict';

const fetch = require('node-fetch');
const {parse} = require('node-html-parser');
const http = require('http');
const fs = require('fs');
const {distros} = require('./config.json')


const downloadFolder = './zippedData/';
let supportedDistros = {};


Object.keys(distros).forEach(async distro => {
    let releaseNamesRecords = await getRecords(distros[distro].repoURL + 'dists/');
    let releaseNames = releaseNamesRecords.filter(a => a.match(distros[distro].releaseNamesFilter.basicFilter) && !distros[distro].releaseNamesFilter.excludeFilter.includes(a));

    supportedDistros[distro] = {"releaseNames": []}
    releaseNames.forEach(releaseName => {
        let release = {};
        release[releaseName] = {"componets": []};
        supportedDistros[distro].releaseNames.push(release);
        //console.log(supportedDistros[distro].releaseNames.filter(a => a['buster/']))
        distros[distro].components.forEach(async componentName => {
            let componentLink = distros[distro].repoURL + 'dists/' + releaseName + componentName;
            let archsRecords = await getRecords(componentLink);
            let archsRecordsFiltered = archsRecords.filter(a => a.match(distros[distro].archsFilter));
            if (archsRecordsFiltered.length){
                let component = {};
                component[componentName] = {"archs": []};
                supportedDistros[distro].releaseNames.filter(rn => rn[releaseName])[0][releaseName].componets.push(component);

            }else return;

            archsRecordsFiltered.forEach(archRec =>{
                supportedDistros[distro].releaseNames.filter(rn => rn[releaseName])[0][releaseName].componets.filter(c => c[componentName])[0][componentName].archs.push(archRec);
                //downloadFile(componentLink + archRec, 'Packages.gz', `${distro}+${releaseName}+${componentName}+${archRec}`.replace(/\//g, ''))
            });


        });
    });



    console.log(supportedDistros)
});



async function getRecords(URL) {
    let response = await fetch(URL)
    if (response.status !== 200) {
        console.log("Bad response of " + URL);
        return [];
    }
    let repsonseContent = await response.text();
    return parse(repsonseContent)
        .querySelectorAll("tr")
        .map(tr => {
            let td = tr.querySelectorAll('td')[1];
            if (td && td.querySelectorAll('a')) return td.querySelectorAll('a')[0].innerHTML;
        })
        .filter(a => a !== undefined);
}

function downloadFile(URL, remoteFileName = 'Packages.gz', localFileName) {
    let linkName = URL + remoteFileName;

    let fileName = localFileName + "+" + remoteFileName;
    //console.log(fileName);
    const file = fs.createWriteStream(downloadFolder + fileName);
    const request = http.get(linkName, function (response) {
        response.pipe(file);
    });
}
