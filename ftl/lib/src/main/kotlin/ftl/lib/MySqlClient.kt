package ftl.lib

import java.sql.Connection
import java.sql.DriverManager
import java.util.Properties

interface IMySqlClient {
    val connection: Connection
    fun ping()
    fun close()
}

class MySqlClient: IMySqlClient {
    override val connection: Connection

    init {
        // todo config these things
        val host = "localhost"
        val port = 3306
        val user = "root"
        val password = "tbd"
        val database = "didpay"
        val info = Properties()
        info["user"] = "root"
        info["password"] = "tbd"

        // Initialize MySQL connection using JDBC
        val url = "jdbc:mysql://${host}:${port}/${database}"
        this.connection = DriverManager.getConnection(url, info)
    }

    override fun ping() {
        println("Connecting to MySQL..")

        val stmt = connection.createStatement()
        val rs = stmt.executeQuery("SELECT 1")

        if (rs.next()) {
            println("Successfully pinged MySQL!")
        } else {
            throw Exception("Failed to ping MySQL.")
        }
    }

    override fun close() {
        if (this.connection.isClosed) {
            return
        }

        this.connection.close()
        println("Connection to MySQL closed.")
    }
}