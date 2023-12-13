package ftl.exchanges

import ftl.lib.Json
import ftl.lib.PostgresClient
import tbdex.sdk.protocol.models.Rfq
import xyz.block.ftl.Context
import xyz.block.ftl.Ingress
import xyz.block.ftl.Method
import xyz.block.ftl.Verb

data class SubmitRfqRequest(val rfq: String)
typealias SubmitRfqResponse = Unit // todo should include errors

class Exchanges {
    private var postgresClient = PostgresClient()

    @Verb
    @Ingress(Method.POST, "/exchanges/{exchangeId}/rfq")
    fun submitRfq(context: Context, req: SubmitRfqRequest): SubmitRfqResponse {
        // todo middleware validation from tbdex-kt/httpserver

        // insert into db
        // go ahead and create quote & insert into db
        try {
            println(req.rfq)
            val rfq = Json.parse(req.rfq, Rfq::class.java)

            val sql = """
                INSERT INTO exchange (exchangeid, messageid, subject, messagekind, message)
                VALUES (?, ?, ?, ?, ?::json)
            """.trimIndent()

            val pstmt = postgresClient.connection.prepareStatement(sql).apply {
                setString(1, rfq.metadata.exchangeId.toString())
                setString(2, rfq.metadata.id.toString())
                setString(3, rfq.metadata.from)
                setString(4, rfq.metadata.kind.toString())
                setString(5, Json.stringify(rfq))
            }

            pstmt.executeUpdate()
            println("Record inserted successfully.")
        } catch (ex: Exception) {
          println(ex)
        }
  }
}
