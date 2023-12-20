package ftl.pfi

import ftl.pfi.data.ExchangesRepository
import ftl.pfi.data.OfferingsRepository
import ftl.pfi.services.DidService
import ftl.pfi.services.SampleTbdexService
import tbdex.sdk.protocol.models.Offering
import tbdex.sdk.protocol.models.Order
import tbdex.sdk.protocol.models.Rfq
import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb

typealias GetOfferingsRequest = Unit
data class GetOfferingsResponse(val offerings: String)

data class SubmitRfqRequest(val rfq: String)
typealias SubmitRfqResponse = Unit // todo should include errors

typealias GetExchangesRequest = Unit
data class GetExchangesResponse(val exchanges: String)

data class SubmitOrderRequest(val order: String)
typealias SubmitOrderResponse = Unit // todo should include errors

class Pfi {
    val didService = DidService()
    val sampleTbdexService = SampleTbdexService()
    val exchangesRepository = ExchangesRepository()
    val offeringsRepository = OfferingsRepository()

    @Verb
    @Ingress(Method.GET, "/offerings")
    fun getOfferings(context: Context, req: GetOfferingsRequest): GetOfferingsResponse {
        val offerings: MutableList<Offering> = offeringsRepository.selectOfferings()

        if (offerings.isEmpty()) {
            val offering = sampleTbdexService.getOffering(didService.getUri())
            offering.sign(didService.getDid())
            offeringsRepository.insertOffering(offering)
            offerings.add(offering)
        }

        return GetOfferingsResponse(Json.stringify(offerings))
    }

    @Verb
    @Ingress(Method.POST, "/exchanges/{exchangeId}/rfq")
    fun submitRfq(context: Context, req: SubmitRfqRequest): SubmitRfqResponse {
        // todo middleware validation from tbdex-kt/httpserver

        val rfq = Json.parse(req.rfq, Rfq::class.java)
        exchangesRepository.insertExchange(rfq)

        val quote = sampleTbdexService.getQuote(didService.getDid(), rfq)
        quote.sign(didService.getDid())
        exchangesRepository.insertExchange(quote)
    }

    @Verb
    @Ingress(Method.GET, "/exchanges")
    fun getExchanges(context: Context, req: GetExchangesRequest): GetExchangesResponse {
        // todo client's DID is in the Authorization header's bearer token; used to filter exchanges only for the given client
        val exchanges = exchangesRepository.selectExchanges()
        return GetExchangesResponse(Json.stringify(exchanges))
    }

    @Verb
    @Ingress(Method.POST, "/exchanges/{exchangeId}/order")
    fun submitOrder(context: Context, req: SubmitOrderRequest): SubmitOrderResponse {
        // todo middleware validation from tbdex-kt/httpserver

        val order = Json.parse(req.order, Order::class.java)
        exchangesRepository.insertExchange(order)

        val orderStatus = sampleTbdexService.getOrderStatus(didService.getDid(), order)
        orderStatus.sign(didService.getDid())
        exchangesRepository.insertExchange(orderStatus)
    }
}
