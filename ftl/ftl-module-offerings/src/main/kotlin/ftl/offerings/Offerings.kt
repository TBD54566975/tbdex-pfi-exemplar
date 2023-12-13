package ftl.offerings

import ftl.lib.PostgresClient
import xyz.block.ftl.Context
import xyz.block.ftl.Verb

data class OfferingsRequest(val name: String)
data class OfferingsResponse(val message: String)

class Offerings {
  private var postgresClient = PostgresClient()

  @Verb
  fun echo(context: Context, req: OfferingsRequest): OfferingsResponse {
    postgresClient.ping()
    postgresClient.close()
    return OfferingsResponse(message = "Hello, ${req.name}!")
  }
}
