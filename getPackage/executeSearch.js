const exec = require('child_process').exec;
const parsePackage = require('./parsePackage').parsePackage;
const EventEmitter = require('events');
const { response } = require('express');

function search(distribution, rootdir, release, component, architecture, package, mode) {
    const emitter = new EventEmitter();
    let query = 'bash getPackage/searchPackage.sh ';

    if(!distribution || !package){
        emitter.emit("finished", {"status": "error", "message": "distribution or package not specified"})
    }
    package = escapeRegExp(package);

    query += `-d "${distribution}" -p "${package}"`;
    if(rootdir) query += ` -e "${rootdir}"`;
    if(release) query += ` -r "${release}"`;
    if(component) query += ` -c "${component}"`;
    if(architecture) query += ` -a "${architecture}"`;
    if(mode) query += ` -m "${mode}"`;

    let response = {};
    let packageLines = '';
    console.log(query);
    const child = exec(query);
    child.stdout.on('data', (data) => {
        packageLines += data;
        
    });
    child.stderr.on('data', (data) => {
        console.error(data);
        response.message = data
    });

    child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        response.status = code !== 0 ? "error" : "success";

        if(response.status === "success"){
            if(packageLines){
                let packageObjs = packageLines.split(/\n\n(?=[^$])/).map(line => parsePackage(line).packageRecord).filter(p => p.Package);
                response.result = packageObjs.length ? packageObjs : [];
            }
            else response.result = [];
        }

        emitter.emit("finished", response);
    });

    return emitter;

}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
  


// search('debian', '', '', '', 'amd64', '.*', 'strict').on("finished", (response) => {
//     console.log(response.result)
// })

module.exports = {
    search
};


