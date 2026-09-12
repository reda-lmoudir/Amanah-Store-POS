package com.amanahstore.pos.data.model

data class Product(
    val id: Long = 0,
    val name: String,
    val price: Double,
    val unit: ProductUnit,
    val barcode: String,
    val category: String,
    val imageResName: String = "tomatoes"
)
