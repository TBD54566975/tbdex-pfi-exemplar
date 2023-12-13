package ftl.offerings

import ftl.lib.Json
import ftl.lib.PostgresClient
import tbdex.sdk.protocol.models.Offering
import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb

typealias GetOfferingsRequest = Unit
data class GetOfferingsResponse(val offerings: String)

class Offerings {
  private var postgresClient = PostgresClient()

  @Verb
  @Ingress(Method.GET, "/offerings")
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
