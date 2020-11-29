module.exports = {
    parsePackage
};

const PackageRecord = require('./PackageRecord')


function parsePackage(packageString) {
    let packageFieldsArray = packageString.split('\n');
    let garbidge = [];
    let packageRecord = new PackageRecord();
    const possibleKeys = Object.keys(packageRecord).map(key => key.replace('_', '-'));
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
            let sectionValueIdx = value.indexOf('/');
            value = value.substring(0, sectionValueIdx);
            packageRecord['Sub_Section'] = value.substring(sectionValueIdx+1);
        }
        packageRecord[key] = value;
    }
    return {packageRecord,  garbidge};
}
