package com.amanahstore.pos.data.model

data class CartItem(
    val id: String,
    val product: Product,
    val amount: Double,
    val total: Double
) {
    companion object {
        fun create(product: Product, amount: Double): CartItem {
            val validAmount = if (amount > 0) amount else 1.0
            val calculatedTotal = when (product.unit) {
                ProductUnit.GRAM -> (product.price * validAmount) / 1000.0
                ProductUnit.KG, ProductUnit.PIECE -> product.price * validAmount
            }
            return CartItem(
                id = "${product.id}_${System.currentTimeMillis()}",
                product = product,
                amount = validAmount,
                total = calculatedTotal
            )
        }
    }
}
