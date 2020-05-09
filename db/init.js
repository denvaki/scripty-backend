const pgtools = require("pgtools");
const {distros} = require('../config.json')
const EventEmitter = require('events');
const repoMap = require('../repositoriesMap.json');
const DBConnect = require('./DBConnect.js');
const dbConfig = require('./dbConfig.json');

function initDataBases() {
    const dataBaseCreation = new EventEmitter();
    dbConfig.database = dbConfig.user;
    repoMap.forEach(distroObj => {
            pgtools.createdb(dbConfig, distroObj.distro, function (err, res) {
                if (err) {
                    console.error(err);
                    if (err.name !== "duplicate_database") process.exit(-1);
                }
                console.log(res);
                dataBaseCreation.emit('created', distroObj)
            });
        }
    );

    return dataBaseCreation;
}

function createTables(distroObj) {
    const database = distroObj.distro;
    let dbConnect = new DBConnect(database);
    const releases = distroObj.releaseNames.map(releaseName => releaseName.release);
    releases.forEach(release => {
        const createTableQuery =
            `CREATE TABLE IF NOT EXISTS ${release} (
                ID SERIAL PRIMARY KEY,
                Package varchar NOT NULL,
                Version varchar NOT NULL,
                Installed_Size int,
                Maintainer varchar NOT NULL,
                Architecture varchar NOT NULL,
                Depends varchar,
                Description varchar NOT NULL,
                Homepage varchar,
                Section varchar NOT NULL,
                Sub_Section varchar,
                Filename varchar,
                Size integer,
                Conflicts varchar
                )`;
        dbConnect.query(createTableQuery, (err, res) => {
            console.log(err, res)
        });
    });
}

function deleteTable(all, tableNameArr) {
    const dataBaseDeletion = new EventEmitter();
    if (all === undefined || typeof all !== "boolean") return {error: "first argument is not specified"};
    if (all === false && (tableNameArr === undefined || !Array.isArray(tableNameArr) || tableNameArr.length === 0)) return {error: "table name array is not specified or empty"};
    const dropAllTablesQuery =
        `DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;`;
    if (all) {
        db.query(dropAllTablesQuery, [], (err, res) => {
            if (err) {
                console.log(err);
            } else console.log('deleted all tables');
            db.close()
            dataBaseDeletion.emit('finished');
        });
    } else {
        const dropSpecificTablesQuery = `DROP TABLE ${tableNameArr.join(',')};`
        db.query(dropSpecificTablesQuery, [], (err, res) => {
            if (err) {
                console.log(err);
            } else console.log(`deleted ${tableNameArr.toString()} tables`);
            db.close()
            dataBaseDeletion.emit('finished');

        })
    }
    return dataBaseDeletion;
}

initDataBases().on('created', arg => createTables(arg));

//deleteTable(false, ["debian", "ubuntu"]).on('finished', createTables)





