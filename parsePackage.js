module.exports = {
    parsePackage
};

const PackageRecord = require('./PackageRecord')
const possibleKeys = ["Package", "Version", "Installed-Size", "Maintainer", "Architecture", "Depends", "Description", "Homepage", "Section", "Filename", "Size", "Conflicts"];

function parsePackage(packageString) {
    let packageFieldsArray = packageString.split('\n');
    let garbidge = [];

    let packageRecord = new PackageRecord();

    let previosProp;
    for (let f=0; f<packageFieldsArray.length; f++) {
        let field = packageFieldsArray[f];
        if(field === '') continue;
        
        if(field.match(/^\s\S+.*$/) && previosProp){
            packageRecord[previosProp] +=  field;
            continue;
        }

        let column = field.indexOf(': ');
        if (column === -1) {
            garbidge.push(field);
            continue;
        }

        let key = field.substring(0, column);
        let value = field.substring(column + 2);

        if (key === '' || value === '' || !possibleKeys.includes(key)) {
            garbidge.push(field);
            continue;
        }

        previosProp = key;
        key = key.replace(/-/g, '_');

        if (key === 'Section' && value.indexOf('/') !== -1){
            let values = value.split('/');
            value = values[0];
            packageRecord['Sub_Section'] = values[1];
        }
        packageRecord[key] = value;
    }
    return {"packageRecord": packageRecord, "garbidge": garbidge}
}
