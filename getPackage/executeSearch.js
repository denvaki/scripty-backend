const exec = require('child_process').exec;
const parsePackage = require('./parsePackage').parsePackage;
const EventEmitter = require('events');

function search(distribution, rootdir, release, component, architecture, queryData, mode, type="package") {
    const emitter = new EventEmitter();
    let query = 'sh getPackage/search.sh ';

    if(!distribution || !queryData){
        emitter.emit("finished", {"status": "error", "message": "distribution or searching data not specified"})
    }
    queryData = escapeRegExp(queryData);

    query += `-d "${distribution}" -q "${queryData}"`;
    if(rootdir) query += ` -e "${rootdir}"`;
    if(release) query += ` -r "${release}"`;
    if(component) query += ` -c "${component}"`;
    if(architecture) query += ` -a "${architecture}"`;
    if(mode) query += ` -m "${mode}"`;
    if(type) query += ` -t "${type}"`

    let response = {};
    let outputLines = '';
    console.log(query);
    const child = exec(query);
    child.stdout.on('data', (data) => {
        outputLines += data;
        
    });
    child.stderr.on('data', (data) => {
        console.error(data);
        response.message = data
    });

    child.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        response.status = code !== 0 ? "error" : "success";

        if(response.status === "success"){
            let result = [];
            if(outputLines){
                if(type === "filename"){
                    result = outputLines.split(/\n/).map(line => {
                        if(!line) return null;
                        line = line.trim();
                        
                        const filenamePackage = line.split(/\s+(?=\S+$)/);
                        if(filenamePackage.length !== 2 ) return null;
                        const filename = filenamePackage[0];
                        let packages =  filenamePackage[1].split(',');
                        
                        if(filename.length === 0 || packages.length === 0){
                            return null;
                        }
    
                        return { filename , packages };
                    }).filter(obj => obj)

                } else if (type === "package") {
                    result = outputLines.split(/\n\n(?=[^$])/).map(line => parsePackage(line).packageRecord).filter(p => p.Package);
                } 
                
            }
            response.result = result;
        }

        emitter.emit("finished", response);
    });

    return emitter;

}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
  

module.exports = {
    search
};


