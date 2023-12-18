package ftl.pfi

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import tbdex.sdk.protocol.serialization.TypeIdModule

object Json {
    val jsonMapper: ObjectMapper = ObjectMapper()
        .registerKotlinModule()
        .findAndRegisterModules()
        .registerModule(TypeIdModule())
        .setSerializationInclusion(JsonInclude.Include.NON_NULL)
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

    fun stringify(obj: Any): String {
        return jsonMapper.writeValueAsString(obj)
    }

    fun <T> parse(jsonString: String, c: Class<T>): T {
        return jsonMapper.readValue(jsonString, c)
    }
}
