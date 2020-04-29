//'use strict';
const gunzip = require('gunzip-file');
const fs = require('fs');
const { parsePackage } = require('./parsePackage')

const sourceDataFolder = './zippedData/';
const destinationDataFolder = './output/';

/* let unpack = async () => {
    await fs.readdirSync(sourceDataFolder).forEach(async zippedFile => {
        //if(!file.match(/^(debian|ubuntu)\+.*\.gz$/)) return;
        let unzipedFile = zippedFile.replace(/\.gz$/, '');

        await gunzip(sourceDataFolder + zippedFile, destinationDataFolder + unzipedFile, () => {
            console.log(`gunzip of ${zippedFile} is done`);
        });
    });
    return true;
}; */


function main() {

    let unpecked = true;//await unpack();
    if (unpecked) {
        let parsedPackages = [];
        let garbide = [];
        let dirFiles = fs.readdirSync(destinationDataFolder);
        for (let i=0; i<10; i++){
            let file = dirFiles[i];
            fs.readFile(destinationDataFolder + file, 'utf8', function (err, data) {
                if (err) return console.err(err);
                let packages = data.split(/^\n/m);

                packages.forEach(p => {
                    if(p === '') return;
                    let parsed = parsePackage(p);
                    if(parsed.packageRecord.Breaks)console.log(parsed.packageRecord);
                    //if(parsed.garbidge.length) console.log(parsed.garbidge);
                    
                })
                
            });
        }
    }
}

main();


