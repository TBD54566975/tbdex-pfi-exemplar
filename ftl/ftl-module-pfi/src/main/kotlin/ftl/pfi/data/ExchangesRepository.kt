package ftl.pfi.data

import ftl.pfi.clients.PostgresClient
import tbdex.sdk.protocol.models.Message

class ExchangesRepository {
    private val postgresClient = PostgresClient()

    fun insertExchange(message: Message) {
        val connection = postgresClient.connect()

        val statement = connection.prepareStatement("""
            INSERT INTO exchange (exchangeid, messageid, subject, messagekind, message)
            VALUES (?, ?, ?, ?, ?::json)
        """.trimIndent())
            .apply {
                setString(1, message.metadata.exchangeId.toString())
                setString(2, message.metadata.id.toString())
                setString(3, message.metadata.from)
                setString(4, message.metadata.kind.toString())
                setString(5, message.toString())
            }
        statement.executeUpdate()
        statement.close()

        // opening & closing connection for each execution b/c of current FTL limitations
        postgresClient.close()
    }

    fun selectExchanges(): MutableList<MutableList<Message>> {
        val connection = postgresClient.connect()

        val messages = mutableMapOf<String, MutableList<Message>>()
        val statement = connection.prepareStatement(
            "SELECT exchangeid, message FROM exchange ORDER BY createdat ASC")

        val resultSet = statement.executeQuery()

        while (resultSet.next()) {
            val exchangeId = resultSet.getString("exchangeid")
            val message = resultSet.getString("message")
            messages.computeIfAbsent(exchangeId) { mutableListOf() }.add(Message.parse(message))
        }

        statement.close()
        postgresClient.close()

        return messages.values.toMutableList()
    }
}