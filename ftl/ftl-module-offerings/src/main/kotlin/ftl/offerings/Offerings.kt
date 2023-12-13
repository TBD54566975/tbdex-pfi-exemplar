package ftl.offerings

import ftl.lib.Json
import ftl.lib.PostgresClient
import tbdex.sdk.protocol.models.Offering
import xyz.block.ftl.Context
import xyz.block.ftl.Verb

data class OfferingsRequest(val name: String)
data class OfferingsResponse(val message: String)

typealias GetOfferingsRequest = Unit
data class GetOfferingsResponse(val offerings: String)

class Offerings {
  private var postgresClient = PostgresClient()

  @Verb
  fun getOfferings(context: Context, req: GetOfferingsRequest): GetOfferingsResponse {
    val offerings: MutableList<Offering> = mutableListOf()

    val stmt = postgresClient.connection.createStatement()
    val rs = stmt.executeQuery("SELECT * FROM offering")

    while (rs.next()) {
      val offering = Offering.parse(rs.getString("offering"))
      offerings.add(offering)
    }

    postgresClient.close()

    return GetOfferingsResponse(Json.stringify(offerings))
  }
}
