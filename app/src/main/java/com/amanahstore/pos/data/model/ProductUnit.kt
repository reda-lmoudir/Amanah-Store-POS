package com.amanahstore.pos.data.model

enum class ProductUnit(val code: String, val titleAr: String, val shortAr: String) {
    PIECE("piece", "بالقطعة", "قطعة"),
    KG("kg", "بالكيلوغرام", "كغ"),
    GRAM("g", "بالغرام", "غ");

    companion object {
        fun fromCode(code: String): ProductUnit {
            return entries.firstOrNull { it.code.equals(code, ignoreCase = true) } ?: PIECE
        }
    }
}
