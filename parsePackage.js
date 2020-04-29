module.exports = {
    parsePackage
};

const PackageRecord = require('./PackageRecord')
const possibleKeys = ["Package", "Source", "Version", "Installed-Size", "Maintainer", "Architecture", "Depends", "Enhances", "Description", "Homepage", "Section", "Priority", "Filename", "Size", "Multi-Arch", "Tag", "Conflicts", "Breaks"];

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

        packageRecord[key] = value 
        
        
    }
    return {"packageRecord": packageRecord, "garbidge": garbidge}
}
