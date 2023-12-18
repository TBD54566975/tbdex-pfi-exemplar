package ftl.pfi

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.JsonDeserializer
import com.fasterxml.jackson.databind.JsonSerializer
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.databind.SerializerProvider
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import tbdex.sdk.protocol.serialization.TypeIdModule
import typeid.TypeID

class TypeIDToStringSerializer : JsonSerializer<TypeID>() {
    override fun serialize(value: TypeID, gen: JsonGenerator, serializers: SerializerProvider) {
        gen.writeString(value.toString())
    }
}

class StringToTypeIdDeserializer : JsonDeserializer<TypeID>() {
    override fun deserialize(p: JsonParser?, ctxt: DeserializationContext?): TypeID {
        return TypeID.fromString(p?.valueAsString).get()
    }
}

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

    fun <T> parse(jsonString: String, typeRef: TypeReference<T>): T {
        return jsonMapper.readValue(jsonString, typeRef)
    }
}
