const db = require('./index.js');
const PackageRecord = require('../PackageRecord.js');


function insert(dbObj, tableName, packageObjectArr) {
    const properties = Object.keys(new PackageRecord());
    console.log("here")
    if (tableName === undefined || !(Array.isArray(packageObjectArr)) || !packageObjectArr.every(obj => obj instanceof PackageRecord)) return [];

    const values = packageObjectArr.map(obj => {
        return '(' + properties.map(prop => {
            let val = obj[prop];

            val = val === undefined ? "NULL" : "'" + val.replace(/'/g, "''") + "'";

            return val;
        }).join(', ') + ')'
    }).join(',\n');

    const query = `INSERT INTO ${tableName}(${properties.join(',')})
        VALUES ${values};`;


    return new Promise((resolve, reject) => {
            dbObj.query(query, [], (err, res) => {
                if (err) {
                    reject(err);
                } else resolve('success');
            });
        }
    );
}
module.exports = insert;
