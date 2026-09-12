package com.amanahstore.pos.data.repository

import com.amanahstore.pos.data.local.InvoiceDao
import com.amanahstore.pos.data.local.InvoiceEntity
import com.amanahstore.pos.data.local.ProductDao
import com.amanahstore.pos.data.local.ProductEntity
import com.amanahstore.pos.data.model.Invoice
import com.amanahstore.pos.data.model.Product
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class StoreRepository(
    private val productDao: ProductDao,
    private val invoiceDao: InvoiceDao
) {
    val allProducts: Flow<List<Product>> = productDao.getAllProducts().map { list ->
        list.map { it.toDomain() }
    }

    val allInvoices: Flow<List<Invoice>> = invoiceDao.getAllInvoices().map { list ->
        list.map { it.toDomain() }
    }

    suspend fun getProductByBarcode(barcode: String): Product? {
        return productDao.getProductByBarcode(barcode)?.toDomain()
    }

    suspend fun insertProduct(product: Product): Long {
        return productDao.insertProduct(ProductEntity.fromDomain(product))
    }

    suspend fun updateProduct(product: Product) {
        productDao.updateProduct(ProductEntity.fromDomain(product))
    }

    suspend fun deleteProduct(product: Product) {
        productDao.deleteProduct(ProductEntity.fromDomain(product))
    }

    suspend fun insertInvoice(invoice: Invoice): Long {
        return invoiceDao.insertInvoice(InvoiceEntity.fromDomain(invoice))
    }

    suspend fun deleteInvoice(invoice: Invoice) {
        invoiceDao.deleteInvoice(InvoiceEntity.fromDomain(invoice))
    }
}
