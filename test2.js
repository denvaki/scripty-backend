const PackageRecord = require('./PackageRecord.js');
const {parsePackage} = require('./parsePackage.js');


function insert(tableName, packageObjectArr){
    const properties = Object.keys(new PackageRecord());
    if (tableName === undefined || !(Array.isArray(packageObjectArr)) || !packageObjectArr.every(obj => obj instanceof PackageRecord)) return [];

    const values = packageObjectArr.map(obj => {
        return '(' + properties.map(prop => {
            let val = obj[prop];
            val = val === undefined ? "NULL" : "'" + val.replace("'", "''") + "'";
            return val;
        }).join(', ') + ')'
    }).join(',\n');

    const query = `INSERT INTO ${tableName}(${properties.join(',')})
        VALUES ${values};`;
    console.log(query);
}



function main() {
    const packageString = `Package: crafty-books-medium
Version: 1.0.debian1-2
Installed-Size: 25592
Maintainer: Oliver Korff <ok@xynyx.de>
Architecture: all
Depends: crafty (>= 23.1)
Conflicts: crafty-books-large, crafty-books-medium, crafty-books'-small
Description: Medium size opening books for the crafty chess engine
Description-md5: 45b811e83f4d2d1ec04cb992131cabac
Tag: game::board, game::board:chess, role::app-data, role::program,
 use::gameplaying
Section: contrib/games
Priority: optional
Filename: pool/contrib/c/crafty-books-medium/crafty-books-medium_1.0.debian1-2_all.deb
Size: 12891934
MD5sum: ec8d271e3c77decab7d092a5f83bace3
SHA256: 21486e25a65bb8462131b7c867d5297fb037af2d44581272897915e2fe9f6146`;
    const package = parsePackage(packageString).packageRecord;
    insert("debian", [package])
}
main();
