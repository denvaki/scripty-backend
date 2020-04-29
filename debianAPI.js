/*
*   Documentation of provided belove API sources described in https://sources.debian.org/doc/api/
*/

const fetch = require("node-fetch");
const BASE="https://sources.debian.org/api/";

module.exports = {
// #################### SEARCH ####################

/*
*   Package search
*/
packageSearch: async function (query) {
    let url = BASE+"search/"+query+'/';
    res = await basicGetRequest(url);
    //console.log(res);
    return res;
},

/*
*   File search by SHA-256 sum
*/
searchBySHA256: function (sha256, packageName){
    let url = BASE+"sha256/?checksum="+sha256;
    if (packageName) url += "&package="+packageName;
    return basicGetRequest(url);
},

/*
*   Search within the code through tags
*/
codeSearch: function (tag, packageName){
    let url = BASE+'ctag/?ctag='+tag;
    if (packageName) url += '&package=' + packageName;
    return basicGetRequest(url);
},


// #################### Package list ####################

/*
*   Get all packages list
*/
allPackages: function (){
    let url = BASE+'list';
    return basicGetRequest(url);
},

/*
*   Get packages list by prefix
*/
allPackagesByPrefix: function (prefix){
    let url = BASE+'prefix/'+prefix;
    return basicGetRequest(url);
},


// #################### Package information ####################

/*
*   List different versions of a package
*/
packageVers: function (packageName){
    let url = BASE+'src/'+packageName;
    return basicGetRequest(url);
},

/*
*   Package information, including metrics, suites where is present, PTS link
*/
packageInfo: function (packageName, version){
    if(version === 'latest'){
        packageVers(packageName).then(resp => version = resp.versions[resp.versions.length-1].version)
    }
    let url = `${BASE}info/package/${packageName}/${version}`;
    return basicGetRequest(url);
}


// #################### Navigation in source folders and files ####################

/*
*   List folders and files in a folder
*/

}

async function basicGetRequest(URL) {
    let request = await fetch(URL);
    let jsonResp = null;

    if (!request.ok) throw new Error('source not responding');

    try {
        jsonResp = await request.json();
    }catch (e) {
        throw new Error('not a json:' + e);
    }
    //console.log(jsonResp);
    return jsonResp;
}