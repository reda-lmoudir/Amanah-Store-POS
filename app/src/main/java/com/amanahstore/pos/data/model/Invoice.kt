package com.amanahstore.pos.data.model

enum class PaymentStatus(val code: String, val titleAr: String) {
    PAID("paid", "مدفوع"),
    CREDIT("credit", "كريدي / دين");

    companion object {
        fun fromCode(code: String): PaymentStatus {
            return entries.firstOrNull { it.code.equals(code, ignoreCase = true) } ?: PAID
        }
    }
}

data class Invoice(
    val id: Long = 0,
    val invoiceNumber: String,
    val customerName: String,
    val totalAmount: Double,
    val paymentStatus: PaymentStatus,
    val itemCount: Int,
    val summaryText: String,
    val createdAt: Long = System.currentTimeMillis()
)
