package com.amanahstore.pos.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.amanahstore.pos.data.model.Product
import com.amanahstore.pos.data.model.ProductUnit

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val price: Double,
    val unitCode: String,
    val barcode: String,
    val category: String,
    val imageResName: String
) {
    fun toDomain(): Product {
        return Product(
            id = id,
            name = name,
            price = price,
            unit = ProductUnit.fromCode(unitCode),
            barcode = barcode,
            category = category,
            imageResName = imageResName
        )
    }

    companion object {
        fun fromDomain(product: Product): ProductEntity {
            return ProductEntity(
                id = product.id,
                name = product.name,
                price = product.price,
                unitCode = product.unit.code,
                barcode = product.barcode,
                category = product.category,
                imageResName = product.imageResName
            )
        }
    }
}
