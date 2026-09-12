package com.amanahstore.pos.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.amanahstore.pos.data.model.Invoice
import com.amanahstore.pos.data.model.PaymentStatus

@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val invoiceNumber: String,
    val customerName: String,
    val totalAmount: Double,
    val paymentStatus: String,
    val itemCount: Int,
    val summaryText: String,
    val createdAt: Long = System.currentTimeMillis()
) {
    fun toDomain(): Invoice {
        return Invoice(
            id = id,
            invoiceNumber = invoiceNumber,
            customerName = customerName,
            totalAmount = totalAmount,
            paymentStatus = PaymentStatus.fromCode(paymentStatus),
            itemCount = itemCount,
            summaryText = summaryText,
            createdAt = createdAt
        )
    }

    companion object {
        fun fromDomain(invoice: Invoice): InvoiceEntity {
            return InvoiceEntity(
                id = invoice.id,
                invoiceNumber = invoice.invoiceNumber,
                customerName = invoice.customerName,
                totalAmount = invoice.totalAmount,
                paymentStatus = invoice.paymentStatus.code,
                itemCount = invoice.itemCount,
                summaryText = invoice.summaryText,
                createdAt = invoice.createdAt
            )
        }
    }
}
