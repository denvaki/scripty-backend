'use strict';

const fetch = require('node-fetch');
const  { JSDOM } = require("jsdom");
var urlParser = require('url');
var supportedLibraries = {
    "http:": require('http'),
    "https:": require('https')
};
const fs = require('fs');

const downloadFolder = './zippedData/';



async function getDataFromExternal(repoUrl, releaseName, component, architecture) {
    if (repoUrl === undefined || releaseName === undefined || component === undefined) return {error: "Repository URL, distribution release or section was not specified."};
    if (!repoUrl.match(/^http(s)?:\/\/.*/)) return {error: "URL should start from http/https protocol"};
    if (!repoUrl.endsWith('/')) repoUrl = repoUrl + '/';

    let checkBaseUrl = await checkStatus(repoUrl);
    if (!checkBaseUrl) return { error: "Base Url do not respond"};

    let checkDistLink = repoUrl + 'dists';
    let checkDist = await checkStatus(checkDistLink);
    if (!checkDist) return {error: "Specified URL endpoint is not repository or has unsupported filesystem structure."}

    let checkReleaseLink = checkDistLink + '/' + releaseName
    let checkRelease = await checkStatus(checkReleaseLink);
    if (!checkRelease) {
        let releaseRecords = await getRecords(checkDistLink);
        console.log(checkDistLink)
        let possibleValues = releaseRecords.filter(a => a.endsWith('/')).map(a => a.replace('/', ''));
        return  possibleValues.length
            ? { error: "Release name not found. Possible release names are:", possibleValues: possibleValues} :
            { error: "No release names found"};
    }

    let checkComponentLink = checkReleaseLink + '/' + component;
    let checkComponent = await checkStatus(checkComponentLink);
    if(!checkComponent){
        let componentRecords = await getRecords(checkReleaseLink);
        let possibleValues = componentRecords.filter(a => a.endsWith('/')).map(a => a.replace('/', ''));
        return possibleValues.length
            ? { error: "Section name not found. Possible Section names are:", possibleValues: possibleValues}
            : { error: "No sections found"};
    }
    if (architecture === undefined){
        let archRecords = await getRecords(checkComponentLink);
        let possibleValues = archRecords.filter(a => a.endsWith('/') && a.startsWith('binary-')).map(a => a.replace('/', '').replace('binary-'));
        return possibleValues.length
            ? {success: "Repository offer few processor architectures. Please choose suitable for you CPU:", possibleValues: possibleValues}
            : {error: "No processor architectures found."};
    }else {
        let checkArchLink = checkComponentLink + '/' + 'binary-' + architecture;
        let checkArch = await checkStatus(checkArchLink);
        if (!checkArch) return {error: "Specified architecture not found in repository"};

        let checkPackageGzLink = checkArchLink + '/';
        console.log(checkPackageGzLink)
        let checkPackageGz = await checkStatus(checkPackageGzLink);
        if (!checkPackageGz) return {error: "Main file of repository not found"};
        return await downloadFile(checkPackageGzLink, 'Packages.gz', 'test')
    }
}

async function printData(){
    let res = await getDataFromExternal("ftp.debian.org/debian/", "buster", "main", 'arm64');
    console.log(res);
}

printData();


async function checkStatus(URL){
    const response = await fetch(URL);
    return response.status === 200;
}

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

async function downloadFile(URL, remoteFileName = 'Packages.gz', localFileName) {
    var parsed = urlParser.parse(URL);
    var lib = supportedLibraries[parsed.protocol];
    if (lib === undefined) return {error: "URL should start from http/https protocol"}
    let linkName = URL + remoteFileName;

    let fileName = localFileName + "+" + remoteFileName;
    console.log(fileName);

    const request = await lib.get(linkName, function (response) {
        const file = fs.createWriteStream(downloadFolder + fileName);
        /*console.log('statusCode:', response.statusCode);
        console.log('headers:', response.headers);*/
        console.log(request.statusCode)
        response.pipe(file);
        return response.statusCode
    });
}
