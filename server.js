require('dotenv').config();
const { rejects } = require('assert');
const express = require('express');
const app = express();
const mainRouter = express.Router();
var { ServerResponse } = require('http');
const { resolve } = require('path');
const PORT = process.env.PORT || 5999
const repoMap = require(process.env.PROJECT_ROOT + 'repositoriesMap.json');
const Crud = require('./db/crud.js');
const DBConnect = require('./db/DBConnect.js');
const { renderString, renderTemplateFile } = require('template-file');


ServerResponse.prototype.badRequest = function (response) {
    this.status(400);
    this.json({ status: "error", message: response })
}

ServerResponse.prototype.okResponse = function (response) {
    this.status(200);
    this.json({ status: "success", result: response })
}

ServerResponse.prototype.internalError = function (params) {
    this.status(500);
    this.json({ status: "server error", message: `Error occurs on server side, please contact administartor!\nPassed parameters: ${JSON.stringify(params)}` });
}

app.set('etag', false);

app.use('/api*', (req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,POST');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    res.append('Content-Type', 'application/json');
    //disabling cache
    res.setHeader('Surrogate-Control', 'no-store'); res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires', '0');
    next();
});

app.use('/api', mainRouter);

mainRouter.get('/search', async (req, res) => {
    console.log(req.query);
    let packages;
    let validatedRequest = validateRequest(req, res, ["distro", "release", "arch", "packages"]);
    if (validatedRequest.isValid === false) {
        res = validatedRequest.res;
        return res;
    } else {
        packages = validatedRequest.packages;
    }
    let { distro, release, arch } = req.query;

    await searchPackage(distro, release, packages, arch)
        .then(msg => res.okResponse(msg))
        .catch(msg => { res.internalError(req.query); console.error(msg) });
    return res;

});

mainRouter.get('/generate', async (req, res) => {
    console.log(req.query);
    let packages;
    let validatedRequest = validateRequest(req, res, ["distro", "release", "arch", "packages"], true);
    if (validatedRequest.isValid === false) {
        res = validatedRequest.res;
        return res;
    } else {
        packages = Array.from(new Set(validatedRequest.packages));
    }
    let { distro, release, arch } = req.query;
    let checkedPackages = await Promise.all(packages.map(async (pkg) => {
        let response = await checkPackageExist(distro, release, pkg, arch);
        let isExist = response[0].is_exist;
        return { name: pkg, isExist };
    }));

    let foundPackages = checkedPackages.filter(p => p && p.name && p.isExist).map(p => p.name);
    let notFoundPackages = checkedPackages.filter(p => p && p.name && p.isExist === false).map(p => p.name);
    let generatedScript = await generateScript(foundPackages, notFoundPackages)
    res.removeHeader('Content-Type');
    res.append('Content-Type', 'text/plain');

    res.send(generatedScript)
    return res;

})



mainRouter.get('/map', (req, res) => {
    res.okResponse(repoMap);
    return res;
});



/*
*  Helper functions
*/

app.listen(PORT, () => console.log(`listening on port ${PORT}, URL: http://localhost:${PORT}`));

async function checkPackageExist(database, table, package, architecture) {
    let dbConnect = new DBConnect(database);
    let crud = new Crud(dbConnect);
    return await crud.checkPackageExisting(table, package, architecture);
}



function searchPackage(database, table, packages, architecture) {
    let dbConnect = new DBConnect(database);
    let crud = new Crud(dbConnect);
    return crud.selectPackageRows(table, packages, architecture);

}


function isFilledArray(obj, arrName) {
    if (!obj[arrName] || !Array.isArray(obj[arrName]) || obj[arrName].length < 0) {
        return false;
    } return true;
}


function validateArgs(res, req, archRequired) {
    let { distro, release, arch, packages } = req.query;

    let result = { isValid: false, res }
    if (!distro || !release) {
        res.badRequest(`argument distro or release not specified`);
        result.res = res;
        return result;
    }


    if (!isFilledArray({ repoMap }, 'repoMap')) {
        res.badRequest(`Empty distributions map`);
        result.res = res;
        return result;
    }
    const filteredDistributions = repoMap.filter(d => d.distro && d.distro === distro);
    if (filteredDistributions.length === 0) {
        res.badRequest(`Distribution ${distro} not supported`);
        result.res = res;
        return result;
    }
    if (!isFilledArray(filteredDistributions[0], 'releaseNames')) {
        res.badRequest(`Empty release list for distribution ${distro}`);
        result.res = res;
        return result;
    }

    const filteredReleases = filteredDistributions[0].releaseNames.filter(r => r.release && r.release === release);
    if (filteredReleases.length === 0) {
        res.badRequest(`Release ${release} not supported`);
        result.res = res;
        return result;
    }
    if (!isFilledArray(filteredReleases[0], 'components')) {
        res.badRequest(`Empty components list for distibution ${distro} and it's release ${release}`);
        result.res = res;
        return result;
    }

    else if (arch) {
        const filteredComponents = filteredReleases[0].components.filter(c => c.archs && c.archs.includes(arch));
        if (filteredComponents.length === 0) {
            res.badRequest(`Architecture ${arch} not supported`);
            result.res = res;
            return result;
        }
    } else if (archRequired && !arch) {
        res.badRequest(`Architecture not specified`);
        result.res = res;
        return result;
    }

    if (!packages) {
        res.badRequest(`argument packages not specified`);
        result.res = res;
        return result;
    }

    try {

        packages = JSON.parse(packages);
        if (!Array.isArray(packages)) {
            res.badRequest(`Argument packages is not array`);
            result.res = res;
            return result;
        }
        packages = packages.filter(p => p && p.length);
        if (packages.length === 0) {
            res.badRequest(`Argument packages is empty array`);
            result.res = res;
            return result;
        }

        result.packages = packages
    } catch (error) {
        console.error(error);
        res.badRequest(`badly specified argument packages`)
        result.res = res;
        return result;
    }
    result.isValid = true;
    return result;
}

function checkArgs(allowedArgs, req, res) {
    let result = { isValid: false, res }
    let requestArgs = Object.keys(req.query);
    let listOfUnknownArgs = requestArgs.filter(arg => !allowedArgs.includes(arg));
    if (listOfUnknownArgs.length) {
        res.badRequest(`received unknown arguments: ${listOfUnknownArgs.join(', ')}. This entrypoint supports only ${allowedArgs.join(', ')}`)
        result.res = res;
    } else {
        result.isValid = true;
    }
    return result;
}

function validateRequest(req, res, allowedArgs, archRequired) {

    let result = { isValid: false, res }
    let checkedArgs = checkArgs(allowedArgs, req, res);
    if (checkedArgs.isValid === false) {
        result.res = checkedArgs.res;
        return result;
    }

    let validatedArgs = validateArgs(res, req, archRequired)

    if (validatedArgs.isValid && validatedArgs.packages) {
        result.packages = validatedArgs.packages;
        result.isValid = true;
        return result;

    } else {
        result.res = validatedArgs.res;
        return result;
    }
}

async function generateScript(foundPackages, notFoundPackages) {
    let packagesToInstall = ''
    if (foundPackages.length) {
        packagesToInstall = `apt -y install ${foundPackages.join(' ')}`
    }

    let notFoundPackagesMsg = '';
    if(notFoundPackages.length){
        notFoundPackagesMsg = `echo "following packages not found in repository: ${notFoundPackages.join(', ')}"`;
    }
    const data = {
        notFoundPackagesMsg,
        packagesToInstall: packagesToInstall
    }
    return await renderTemplateFile('./templateOfApt', data)
}