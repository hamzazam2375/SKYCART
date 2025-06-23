const sql = require('mssql');        // Import Microsoft SQL Server library

class Database {
    constructor() {
        this.config = {
            user: "hamza",
            password: "1234",
            server: "HPi58",
            database: "Project",
            options: {
                encrypt: false,
                trustServerCertificate: true,
                enableArithAbort: true  // Enable arithmetic errors to be caught
            },
            port: 1433
        };
        this.poolPromise = null;
    }

    // ✅ Establish and reuse database connection
    async connect() {
        if (!this.poolPromise) {
            this.poolPromise = sql.connect(this.config);
            console.log("✅ Database connected!");
        }
        return this.poolPromise;
    }

    // ✅ Execute SQL queries dynamically
    async executeQuery(query, params = {}) {
        try {
            const pool = await this.connect();
            const request = pool.request();

            // Add parameters dynamically
            for (const key in params) {
                request.input(key, params[key].type, params[key].value);
            }

            const result = await request.query(query);
            return result.recordset || [];
        } catch (error) {
            console.error("❌ Database Query Error:", error);
            throw error;
        }
    }
}

module.exports = new Database();