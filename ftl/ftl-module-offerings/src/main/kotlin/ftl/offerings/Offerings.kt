package ftl.offerings

import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb

data class OfferingsRequest(val name: String)
data class OfferingsResponse(val message: String)

class Offerings {
  @Verb
  fun echo(context: Context, req: OfferingsRequest): OfferingsResponse {
    return OfferingsResponse(message = "Hello, ${req.name}!")
  }
}
