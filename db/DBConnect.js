// source: https://node-postgres.com/guides/project-structure#example
const {Pool} = require('pg')


module.exports = class DBConnect {

    constructor(databaseName) {
        const config = require('./dbConfig.json');
        config.database = databaseName
        this.pool = new Pool(config);
        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err)
            process.exit(-1)
        });
    }


    async query(text, params, callback) {

        const start = Date.now()
        return this.pool.query(text, params, (err, res) => {
            const duration = Date.now() - start;
            if (err) {
                console.error(err.stack);
                console.error('executed query', {text, params, duration})
            }

            callback(err, res)
        })
    }

    getClient(callback) {
        this.pool.connect((err, client, done) => {
            const query = client.query
            // monkey patch the query method to keep track of the last query executed
            client.query = (...args) => {
                client.lastQuery = args
                return query.apply(client, args)
            }
            // set a timeout of 5 seconds, after which we will log this client's last query
            const timeout = setTimeout(() => {
                console.error('A client has been checked out for more than 5 seconds!')
                console.error(`The last executed query on this client was: ${client.lastQuery}`)
            }, 5000)
            const release = (err) => {
                // call the actual 'done' method, returning this client to the pool
                done(err)
                // clear our timeout
                clearTimeout(timeout)
                // set the query method back to its old un-monkey-patched version
                client.query = query
            }
            callback(err, client, release)
        })
    }

    close(callback) {
        const result = this.pool.end();
        if (callback && callback instanceof Function) callback(result);
    }
}
