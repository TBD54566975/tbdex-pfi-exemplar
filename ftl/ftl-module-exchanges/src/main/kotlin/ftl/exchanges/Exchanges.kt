package ftl.exchanges

import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb

data class ExchangesRequest(val name: String)
data class ExchangesResponse(val message: String)

class Exchanges {
  @Verb
  fun echo(context: Context, req: ExchangesRequest): ExchangesResponse {
    return ExchangesResponse(message = "Hello, ${req.name}!")
  }
}
