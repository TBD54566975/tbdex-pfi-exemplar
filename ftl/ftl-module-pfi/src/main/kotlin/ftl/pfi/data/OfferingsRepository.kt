package ftl.pfi.data

import ftl.pfi.Json
import ftl.pfi.clients.PostgresClient
import tbdex.sdk.protocol.models.Offering

class OfferingsRepository {
    private val postgresClient = PostgresClient()

    fun selectOfferings(): MutableList<Offering> {
        val offerings: MutableList<Offering> = mutableListOf()
        val connection = postgresClient.connect()

        val statement = connection.prepareStatement("SELECT * FROM offering")
        val resultSet = statement.executeQuery()

        while (resultSet.next()) {
            val offering = Offering.parse(resultSet.getString("offering"))
            offerings.add(offering)
        }

        connection.close()

        return offerings
    }

    fun insertOffering(offering: Offering) {
        val connection = postgresClient.connect()

        val statement = connection.prepareStatement(
            "INSERT INTO offering (offeringid, payoutcurrency, payincurrency, offering) VALUES (?, ?, ?, ?::json)"
        ).apply {
            setString(1, offering.metadata.id.toString())
            setString(2, offering.data.payinCurrency.currencyCode)
            setString(3, offering.data.payoutCurrency.currencyCode)
            setString(4, Json.stringify(offering))
        }
        statement.executeUpdate()
        statement.close()

        connection.close()
    }
}