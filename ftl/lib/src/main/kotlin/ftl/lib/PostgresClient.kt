package ftl.lib

import java.sql.Connection
import java.sql.DriverManager
import java.util.Properties

interface IPostgresClient {
  val connection: Connection?
  fun ping()
  fun close()
}

class PostgresClient: IPostgresClient {
  override val connection: Connection

  init {
    // Configuration parameters
    val host = "localhost"
    val port = 5432 // Default PostgreSQL port
    val user = "postgres"
    val password = "tbd" // Replace with your password
    val database = "mockpfi"

    val info = Properties()
    info["user"] = user
    info["password"] = password

    // Initialize PostgreSQL connection using JDBC
    val url = "jdbc:postgresql://${host}:${port}/${database}"
    this.connection = DriverManager.getConnection(url, info)
  }

  override fun ping() {
    println("Connecting to PostgreSQL...")

    val stmt = connection.createStatement()
    val rs = stmt.executeQuery("SELECT 1")

    if (rs.next()) {
      println("Successfully pinged PostgreSQL!")
    } else {
      throw Exception("Failed to ping PostgreSQL.")
    }
  }

  override fun close() {
    if (this.connection.isClosed) {
      return
    }

    this.connection.close()
    println("Connection to PostgreSQL closed.")
  }
}
