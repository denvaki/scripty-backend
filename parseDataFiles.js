//'use strict';
require('dotenv').config();
const unpackDataFolder = process.env.UNPACK_FOLDER || './output/';
const { getData }= require('./updateData/fetchDataFiles.js')
const fs = require('fs');
const { parsePackage } = require('./parsePackage.js')





async function main() {
    console.time("updates");
    let fetchData = await getData();
        fetchData.on("finished", (arg) => {
            const file = arg.file;
            fs.readFile(unpackDataFolder + file, 'utf8', function (err, data) {
                if (err) {
                    console.error(err);
                    return;
                }
                let packages = data.split(/^\n/m);

                packages.forEach(p => {
                    if(p === '') return;

                    let parsed = parsePackage(p);
                    if (parsed.packageRecord.Enhances) console.log(parsed.packageRecord.Enhances)

                    //if(parsed.garbidge.length) console.log(parsed.garbidge);

                })

            });
        });

}

main();


