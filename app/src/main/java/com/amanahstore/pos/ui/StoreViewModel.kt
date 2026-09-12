package com.amanahstore.pos.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.amanahstore.pos.data.model.CartItem
import com.amanahstore.pos.data.model.Invoice
import com.amanahstore.pos.data.model.PaymentStatus
import com.amanahstore.pos.data.model.Product
import com.amanahstore.pos.data.model.ProductUnit
import com.amanahstore.pos.data.repository.StoreRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class AppTab(val titleAr: String) {
    SALES("الرئيسية"),
    PRODUCTS("المنتجات"),
    INVOICES("الفواتير")
}

class StoreViewModel(
    private val repository: StoreRepository
) : ViewModel() {

    val allProducts: StateFlow<List<Product>> = repository.allProducts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allInvoices: StateFlow<List<Invoice>> = repository.allInvoices
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _activeTab = MutableStateFlow(AppTab.SALES)
    val activeTab: StateFlow<AppTab> = _activeTab.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow("الكل")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    private val _cart = MutableStateFlow<List<CartItem>>(emptyList())
    val cart: StateFlow<List<CartItem>> = _cart.asStateFlow()

    private val _selectedProductForDetail = MutableStateFlow<Product?>(null)
    val selectedProductForDetail: StateFlow<Product?> = _selectedProductForDetail.asStateFlow()

    private val _isCartModalOpen = MutableStateFlow(false)
    val isCartModalOpen: StateFlow<Boolean> = _isCartModalOpen.asStateFlow()

    private val _isScannerOpen = MutableStateFlow(false)
    val isScannerOpen: StateFlow<Boolean> = _isScannerOpen.asStateFlow()

    private val _isProductEditOpen = MutableStateFlow(false)
    val isProductEditOpen: StateFlow<Boolean> = _isProductEditOpen.asStateFlow()

    private val _productBeingEdited = MutableStateFlow<Product?>(null)
    val productBeingEdited: StateFlow<Product?> = _productBeingEdited.asStateFlow()

    private val _customerNameInput = MutableStateFlow("")
    val customerNameInput: StateFlow<String> = _customerNameInput.asStateFlow()

    private val _paymentStatusInput = MutableStateFlow(PaymentStatus.PAID)
    val paymentStatusInput: StateFlow<PaymentStatus> = _paymentStatusInput.asStateFlow()

    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    // Filtered products flow
    val filteredProducts: StateFlow<List<Product>> = combine(
        allProducts,
        _searchQuery,
        _selectedCategory
    ) { products, query, cat ->
        products.filter { p ->
            val matchCat = cat == "الكل" || p.category == cat
            val matchQuery = query.isBlank() || p.name.contains(query, ignoreCase = true) || p.barcode.contains(query)
            matchCat && matchQuery
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val cartTotal: StateFlow<Double> = combine(_cart) { cartItems ->
        cartItems[0].sumOf { it.total }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    val cartCount: StateFlow<Int> = combine(_cart) { cartItems ->
        cartItems[0].size
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun setActiveTab(tab: AppTab) {
        _activeTab.value = tab
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSelectedCategory(category: String) {
        _selectedCategory.value = category
    }

    fun openProductDetail(product: Product) {
        _selectedProductForDetail.value = product
    }

    fun closeProductDetail() {
        _selectedProductForDetail.value = null
    }

    fun addToCart(product: Product, amount: Double) {
        val validAmount = if (amount > 0) amount else 1.0
        val currentList = _cart.value.toMutableList()
        val existingIndex = currentList.indexOfFirst { it.product.id == product.id }

        if (existingIndex >= 0) {
            val existing = currentList[existingIndex]
            val newAmount = existing.amount + validAmount
            val newTotal = when (product.unit) {
                ProductUnit.GRAM -> (product.price * newAmount) / 1000.0
                ProductUnit.KG, ProductUnit.PIECE -> product.price * newAmount
            }
            currentList[existingIndex] = existing.copy(amount = newAmount, total = newTotal)
        } else {
            currentList.add(CartItem.create(product, validAmount))
        }

        _cart.value = currentList
        _selectedProductForDetail.value = null
        showToast("تمت إضافة ${product.name} إلى السلة")
    }

    fun removeFromCart(itemId: String) {
        _cart.value = _cart.value.filter { it.id != itemId }
    }

    fun clearCart() {
        _cart.value = emptyList()
    }

    fun openCart() {
        _isCartModalOpen.value = true
    }

    fun closeCart() {
        _isCartModalOpen.value = false
    }

    fun setCustomerName(name: String) {
        _customerNameInput.value = name
    }

    fun setPaymentStatus(status: PaymentStatus) {
        _paymentStatusInput.value = status
    }

    fun saveInvoice() {
        val currentCart = _cart.value
        if (currentCart.isEmpty()) return

        val total = currentCart.sumOf { it.total }
        val customer = _customerNameInput.value.trim().ifEmpty { "زبون نقدي" }
        val dateFormat = SimpleDateFormat("dd MMM - HH:mm", Locale.ENGLISH)
        val invoiceNo = "INV-${System.currentTimeMillis().toString().takeLast(6)}"
        val summary = currentCart.joinToString(", ") { "${it.product.name} (${it.amount} ${it.product.unit.shortAr})" }

        val invoice = Invoice(
            invoiceNumber = invoiceNo,
            customerName = customer,
            totalAmount = total,
            paymentStatus = _paymentStatusInput.value,
            itemCount = currentCart.size,
            summaryText = summary,
            createdAt = System.currentTimeMillis()
        )

        viewModelScope.launch {
            repository.insertInvoice(invoice)
            _cart.value = emptyList()
            _customerNameInput.value = ""
            _isCartModalOpen.value = false
            showToast("تم حفظ الفاتورة بنجاح: $invoiceNo")
        }
    }

    fun openScanner() {
        _isScannerOpen.value = true
    }

    fun closeScanner() {
        _isScannerOpen.value = false
    }

    fun onBarcodeScanned(barcode: String) {
        viewModelScope.launch {
            val product = repository.getProductByBarcode(barcode)
            _isScannerOpen.value = false
            if (product != null) {
                if (product.unit == ProductUnit.PIECE) {
                    addToCart(product, 1.0)
                } else {
                    openProductDetail(product)
                }
            } else {
                showToast("لم يتم العثور على منتج بالرمز: $barcode")
            }
        }
    }

    fun openAddProduct() {
        _productBeingEdited.value = null
        _isProductEditOpen.value = true
    }

    fun openEditProduct(product: Product) {
        _productBeingEdited.value = product
        _isProductEditOpen.value = true
    }

    fun closeProductEdit() {
        _isProductEditOpen.value = false
        _productBeingEdited.value = null
    }

    fun saveProduct(
        name: String,
        price: Double,
        unit: ProductUnit,
        barcode: String,
        category: String,
        imageResName: String
    ) {
        viewModelScope.launch {
            val editing = _productBeingEdited.value
            val cleanBarcode = barcode.trim().ifEmpty {
                "61113330${System.currentTimeMillis().toString().takeLast(4)}"
            }
            val product = Product(
                id = editing?.id ?: 0,
                name = name.trim(),
                price = price,
                unit = unit,
                barcode = cleanBarcode,
                category = category.trim().ifEmpty { "عام" },
                imageResName = imageResName
            )

            if (editing == null) {
                repository.insertProduct(product)
                showToast("تم إضافة المنتج بنجاح")
            } else {
                repository.updateProduct(product)
                showToast("تم تحديث المنتج بنجاح")
            }

            closeProductEdit()
        }
    }

    fun deleteProduct(product: Product) {
        viewModelScope.launch {
            repository.deleteProduct(product)
            showToast("تم حذف المنتج: ${product.name}")
        }
    }

    fun deleteInvoice(invoice: Invoice) {
        viewModelScope.launch {
            repository.deleteInvoice(invoice)
            showToast("تم حذف الفاتورة: ${invoice.invoiceNumber}")
        }
    }

    fun showToast(msg: String) {
        _toastMessage.value = msg
    }

    fun clearToast() {
        _toastMessage.value = null
    }

    class Factory(private val repository: StoreRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(StoreViewModel::class.java)) {
                return StoreViewModel(repository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
