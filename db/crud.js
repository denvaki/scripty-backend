const db = require('./index.js');
const PackageRecord = require('../PackageRecord.js');
const format = require('pg-format');

class Crud {

    constructor(dbObj) {
        this.dbObj = dbObj;
    }

    insertPackageRecords(tableName, packageObjectArr) {
        const properties = Object.keys(new PackageRecord());
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
            this.dbObj.query(query, [], (err, res) => {
                if (err) {
                    reject(err);
                } else resolve('success');
            });
        }
        );
    }


    insertContentsRecords(contentsObjectArr) {
        const values = contentsObjectArr.map(obj => {
           let {filename, packageName, section} = obj;

           filename = filename === undefined ? "NULL" : "'" + val.replace(/'/g, "''") + "'";
           packageName = packageName === undefined ? "NULL" : "'" + val.replace(/'/g, "''") + "'";
           section = section === undefined ? "NULL" : "'" + val.replace(/'/g, "''") + "'";

            return '(' + filename + ', ' + packageName + ', ' + section + ')';
        }).join(',\n');

        const query = `INSERT INTO contents(filename, package, section)
            VALUES ${values};`;


        return new Promise((resolve, reject) => {
            this.dbObj.query(query, [], (err, res) => {
                if (err) {
                    reject(err);
                } else resolve('success');
            });
        }
        );
    }





    selectPackageRows(tableName, packageNames, arch) {
        let archArg = '';
        let params = [packageNames];
        if (arch) {
            archArg = ", %L"
            params.push(arch);
        }
        let query = format.withArray(`select * from getRowsByPackageName_${tableName}(ARRAY [%L]${archArg});`, params)
        console.log(params);
        console.log(query);

        return new Promise((resolve, reject) => {
            this.dbObj.query(query, [], (err, res) => {
                if (err) {
                    reject(err);
                } else resolve(res.rows);
            });
        }
        );

    }

    checkPackageExisting(tableName, packageName, arch) {

        let query = format(`select isPackageExist_${tableName} as is_exist from isPackageExist_${tableName}(%L, %L)`, packageName, arch);
        console.log(query);
        return new Promise((resolve, reject) => {
            this.dbObj.query(query, [], (err, res) => {
                if (err) {
                    reject(err);
                } else resolve(res.rows);
            });
        }
        );
    }

}

module.exports = Crud;
