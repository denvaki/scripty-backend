require('dotenv').config();
const express = require('express');
const app = express();
const mainRouter = express.Router();
var { ServerResponse } = require('http');
const PORT = process.env.PORT || 5999
const repoMap = require(process.env.PROJECT_ROOT + 'repositoriesMap.json');
const Crud = require('./db/crud.js');
const DBConnect = require('./db/DBConnect.js');
const { renderString, renderTemplateFile } = require('template-file');
const { search } = require('./getPackage/executeSearch.js');
const { response, json, query } = require('express');


ServerResponse.prototype.badRequest = function (response, query) {
    this.status(400);
    if(query)response.query = query;
    if(!response.status) response.status = 'error';
    this.json(response)
}

ServerResponse.prototype.okResponse = function (response, query) {
    this.status(200);
    if(query) response.query = query;
    if(!response.status) response.status = 'success'
    this.json(response)
}

ServerResponse.prototype.internalError = function (query) {
    this.status(500);
    this.json({ status: "server error", message: `Error occurs on server side, please contact administrator!`, query });
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
    let validatedRequest = validateRequest(req, res, ["distro", "release", "arch", "packages", "mode"]);
    if (validatedRequest.isValid === false) {
        res = validatedRequest.res;
        return res;
    } else {
        packages = validatedRequest.packages.map(p => p.replace(/"/g, '\"')).join('|');
        console.log(packages)
    }
    let { distro, release, arch, mode } = req.query;

    await search(distro, '', release, '', arch, packages, mode)
            .on("finished", (response) => {
                if(response.status === 'error'){
                    res.internalError(req.query); console.error(response)
                }else res.okResponse(response, req.query)
            });
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

    let generatedScript = await generateScript(packages)
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
    let query = req.query;
    let result = { isValid: false, res }
    if (!distro) {
        res.badRequest({message: `argument distro not specified`}, query);
        result.res = res;
        return result;
    }


    if (!isFilledArray({ repoMap }, 'repoMap')) {
        res.badRequest({message: `Empty distributions map`}, query);
        result.res = res;
        return result;
    }
    const filteredDistributions = repoMap.filter(d => d.distro && d.distro === distro);
    if (filteredDistributions.length === 0) {
        res.badRequest({message: `Distribution ${distro} not supported`}), query;
        result.res = res;
        return result;
    }
    if (!isFilledArray(filteredDistributions[0], 'releaseNames')) {
        res.badRequest({message: `Empty release list for distribution ${distro}`}, query);
        result.res = res;
        return result;
    }
    let filteredReleases;
    if(release){
        filteredReleases = filteredDistributions[0].releaseNames.filter(r => r.release && r.release === release);
    }else{
        filteredReleases = filteredDistributions[0].releaseNames.filter(r => r.release);
    }
    
    if (filteredReleases.length === 0) {
        res.badRequest({message: `Release ${release} not supported`}, query);
        result.res = res;
        return result;
    }
    if (!isFilledArray(filteredReleases[0], 'components')) {
        res.badRequest({message: `Empty components list for distibution ${distro} and it's release ${release}`}, query);
        result.res = res;
        return result;
    }

    else if (arch) {
        const filteredComponents = filteredReleases[0].components.filter(c => c.archs && c.archs.includes(arch));
        if (filteredComponents.length === 0) {
            res.badRequest({message: `Architecture ${arch} not supported`}, query);
            result.res = res;
            return result;
        }
    } else if (archRequired && !arch) {
        res.badRequest({message: `Architecture not specified`}, query);
        result.res = res;
        return result;
    }

    if (!packages) {
        res.badRequest({message: `argument packages not specified`}, query);
        result.res = res;
        return result;
    }

    try {

        packages = JSON.parse(packages);
        if (!Array.isArray(packages)) {
            res.badRequest({message: `Argument packages is not array`}, query);
            result.res = res;
            return result;
        }
        packages = packages.filter(p => p && p.length);
        if (packages.length === 0) {
            res.badRequest({message: `Argument packages is empty array`}, query);
            result.res = res;
            return result;
        }

        result.packages = packages
    } catch (error) {
        console.error(error);
        res.badRequest({message: `badly specified argument packages`}, query)
        result.res = res;
        return result;
    }
    result.isValid = true;
    return result;
}

function checkArgs(allowedArgs, req, res) {
    let result = { isValid: false, res }
    let query = req.query;
    let requestArgs = Object.keys(req.query);
    let listOfUnknownArgs = requestArgs.filter(arg => !allowedArgs.includes(arg));
    if (listOfUnknownArgs.length) {
        res.badRequest({message: `received unknown arguments: ${listOfUnknownArgs.join(', ')}. This entrypoint supports only ${allowedArgs.join(', ')}`}, query)
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

async function generateScript(foundPackages) {
    let packagesToInstall = ''
    foundPackages = Array.from(new Set(foundPackages));
    if (foundPackages.length) {
        packagesToInstall = `apt -y install ${foundPackages.join(' ')}`
    }
    const data = {
        packagesToInstall
    }
    return await renderTemplateFile('./templateOfApt', data)
}