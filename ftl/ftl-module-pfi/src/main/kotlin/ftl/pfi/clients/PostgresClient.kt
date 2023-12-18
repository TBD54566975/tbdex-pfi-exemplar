package ftl.pfi.clients

import java.sql.Connection
import java.sql.DriverManager
import java.util.Properties

class PostgresClient {
    private var connection: Connection? = null

    fun connect(): Connection {
        val host = "localhost"
        val port = 5432 // Default PostgreSQL port
        val user = "postgres"
        val password = "tbd"
        val database = "mockpfi"

        val info = Properties()
        info["user"] = user
        info["password"] = password

        val url = "jdbc:postgresql://${host}:${port}/${database}"
        this.connection = DriverManager.getConnection(url, info)
        return this.connection!!
    }

    fun close() {
        if (this.connection == null || this.connection!!.isClosed) {
            return
        }

        this.connection!!.close()
        println("Connection to PostgreSQL closed.")
    }
}
