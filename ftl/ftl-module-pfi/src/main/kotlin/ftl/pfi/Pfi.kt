package ftl.pfi

import com.nimbusds.jose.jwk.JWK
import ftl.lib.Json
import ftl.lib.PostgresClient
import tbdex.sdk.protocol.models.*
import web5.sdk.crypto.InMemoryKeyManager
import web5.sdk.dids.methods.key.DidKey
import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb
import java.time.OffsetDateTime

typealias GetOfferingsRequest = Unit
data class GetOfferingsResponse(val offerings: String)

data class SubmitRfqRequest(val rfq: String)
typealias SubmitRfqResponse = Unit // todo should include errors

typealias GetExchangesRequest = Unit
data class GetExchangesResponse(val exchanges: String)

data class SubmitOrderRequest(val order: String)
typealias SubmitOrderResponse = Unit // todo should include errors

class Pfi {
    private val postgresClient = PostgresClient()
    private val didKey: DidKey

    init {
        val keyManager = InMemoryKeyManager()
        // todo obv this shouldn't be in git
        keyManager.import(JWK.parse("""
            {
              "kty": "OKP",
              "d": "YGsM3HeGRu03nwAed-1BzBkVrcwqJ_YRwqvbOXTCM6g",
              "use": "sig",
              "crv": "Ed25519",
              "kid": "U-tdS83vLqXthjWKmDMYg9IOkpNtRI4XVEB_DIynKEU",
              "x": "sAT-reavVgGfzXnL-oLY7lqK1uBHkWAKkKqInBgUmAs",
              "alg": "EdDSA"
            }
        """.trimIndent()))
        didKey = DidKey.load("did:key:z6MkrJNDakwUm42f8rLM8FAqadBkzztnc1P6DRyAqC1U5ZLn", keyManager)
    }

    private fun insertExchange(message: Message) {
        val statement = postgresClient.connection.prepareStatement("""
            INSERT INTO exchange (exchangeid, messageid, subject, messagekind, message)
            VALUES (?, ?, ?, ?, ?::json)
        """.trimIndent())
            .apply {
                setString(1, message.metadata.exchangeId.toString())
                setString(2, message.metadata.id.toString())
                setString(3, message.metadata.from)
                setString(4, message.metadata.kind.toString())
                setString(5, Json.stringify(message))
            }
        statement.executeUpdate()
        statement.close()
    }

    @Verb
    @Ingress(Method.GET, "/offerings")
    fun getOfferings(context: Context, req: GetOfferingsRequest): GetOfferingsResponse {
        val offerings: MutableList<Offering> = mutableListOf()

        val selectStatement = postgresClient.connection.prepareStatement("SELECT * FROM offering")
        val resultSet = selectStatement.executeQuery()

        if (!resultSet.next()) {
            val offering = createOffering(didKey.uri)
            offering.sign(didKey)

            val insertStatement = postgresClient.connection.prepareStatement(
                "INSERT INTO offering (offeringid, payoutcurrency, payincurrency, offering) VALUES (?, ?, ?, ?::json)"
            ).apply {
                setString(1, offering.metadata.id.toString())
                setString(2, offering.data.payinCurrency.currencyCode)
                setString(3, offering.data.payoutCurrency.currencyCode)
                setString(4, Json.stringify(offering))
            }
            insertStatement.executeUpdate()
            insertStatement.close()

            offerings.add(offering)
        } else {
            do {
                val offering = Offering.parse(resultSet.getString("offering"))
                offerings.add(offering)
            } while (resultSet.next())
        }

        selectStatement.close()

        postgresClient.close()

        return GetOfferingsResponse(Json.stringify(offerings))
    }

    @Verb
    @Ingress(Method.POST, "/exchanges/{exchangeId}/rfq")
    fun submitRfq(context: Context, req: SubmitRfqRequest): SubmitRfqResponse {
        // todo middleware validation from tbdex-kt/httpserver

        val rfq = Json.parse(req.rfq, Rfq::class.java)
        insertExchange(rfq)

        val quote = Quote.create(
            rfq.metadata.from, didKey.uri, rfq.metadata.exchangeId,
            QuoteData(
                expiresAt = OffsetDateTime.now().plusDays(1),
                payin = QuoteDetails("AUD", "1000", "1"),
                payout = QuoteDetails("BTC", "12", "2"),
                paymentInstructions = PaymentInstructions(
                    payin = PaymentInstruction(
                        link = "https://block.xyz",
                        instruction = "payin instruction"
                    ),
                    payout = PaymentInstruction(
                        link = "https://block.xyz",
                        instruction = "payout instruction"
                    )
                )
            )
        )
        quote.sign(didKey)
        insertExchange(quote)

        postgresClient.close()
    }

    @Verb
    @Ingress(Method.GET, "/exchanges")
    fun getExchanges(context: Context, req: GetExchangesRequest): GetExchangesResponse {
        // todo client's DID is in the Authorization header's bearer token; used to filter exchanges only for the given client

        val messages = mutableMapOf<String, MutableList<Message>>()
        val statement = postgresClient.connection.prepareStatement(
            "SELECT exchangeid, message FROM exchange ORDER BY createdat ASC")

        val resultSet = statement.executeQuery()

        while (resultSet.next()) {
            val exchangeId = resultSet.getString("exchangeid")
            val message = resultSet.getString("message")
            messages.computeIfAbsent(exchangeId) { mutableListOf() }.add(Message.parse(message))
        }

        statement.close()
        postgresClient.close()

        return GetExchangesResponse(Json.stringify(messages.values.toList()))
    }

    @Verb
    @Ingress(Method.POST, "/exchanges/{exchangeId}/order")
    fun submitOrder(context: Context, req: SubmitOrderRequest): SubmitOrderResponse {
        // todo middleware validation from tbdex-kt/httpserver

        val order = Json.parse(req.order, Order::class.java)
        insertExchange(order)

        val orderStatus = OrderStatus.create(
            order.metadata.from, didKey.uri, order.metadata.exchangeId, OrderStatusData("COMPLETED"))
        orderStatus.sign(didKey)
        insertExchange(orderStatus)

        postgresClient.close()
    }
}
