package com.amanahstore.pos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.amanahstore.pos.theme.AmanahTheme
import com.amanahstore.pos.theme.EmeraldLight
import com.amanahstore.pos.theme.EmeraldPrimary
import com.amanahstore.pos.theme.TextPrimary
import com.amanahstore.pos.theme.TextSecondary
import com.amanahstore.pos.ui.AppTab
import com.amanahstore.pos.ui.StoreViewModel
import com.amanahstore.pos.ui.components.BarcodeScannerDialog
import com.amanahstore.pos.ui.components.CartCheckoutDialog
import com.amanahstore.pos.ui.components.ProductDetailDialog
import com.amanahstore.pos.ui.components.ProductEditDialog
import com.amanahstore.pos.ui.screens.InvoicesScreen
import com.amanahstore.pos.ui.screens.MainShopScreen
import com.amanahstore.pos.ui.screens.ProductManagementScreen

class MainActivity : ComponentActivity() {

    private val viewModel: StoreViewModel by viewModels {
        val app = application as AmanahApplication
        StoreViewModel.Factory(app.repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            AmanahTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    val snackbarHostState = remember { SnackbarHostState() }
                    val toastMessage by viewModel.toastMessage.collectAsState()

                    LaunchedEffect(toastMessage) {
                        toastMessage?.let {
                            snackbarHostState.showSnackbar(it)
                            viewModel.clearToast()
                        }
                    }

                    MainAppContent(
                        viewModel = viewModel,
                        snackbarHostState = snackbarHostState
                    )
                }
            }
        }
    }
}

@Composable
fun MainAppContent(
    viewModel: StoreViewModel,
    snackbarHostState: SnackbarHostState
) {
    val activeTab by viewModel.activeTab.collectAsState()
    val filteredProducts by viewModel.filteredProducts.collectAsState()
    val allProducts by viewModel.allProducts.collectAsState()
    val allInvoices by viewModel.allInvoices.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val cart by viewModel.cart.collectAsState()
    val cartCount by viewModel.cartCount.collectAsState()
    val cartTotal by viewModel.cartTotal.collectAsState()

    val selectedProductForDetail by viewModel.selectedProductForDetail.collectAsState()
    val isCartModalOpen by viewModel.isCartModalOpen.collectAsState()
    val isScannerOpen by viewModel.isScannerOpen.collectAsState()
    val isProductEditOpen by viewModel.isProductEditOpen.collectAsState()
    val productBeingEdited by viewModel.productBeingEdited.collectAsState()
    val customerNameInput by viewModel.customerNameInput.collectAsState()
    val paymentStatusInput by viewModel.paymentStatusInput.collectAsState()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            CustomBottomBar(
                currentTab = activeTab,
                onTabSelect = { viewModel.setActiveTab(it) },
                onScanClick = { viewModel.openScanner() }
            )
        },
        containerColor = Color(0xFFF6F9F7)
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (activeTab) {
                AppTab.SALES -> {
                    MainShopScreen(
                        products = filteredProducts,
                        searchQuery = searchQuery,
                        onSearchChange = { viewModel.setSearchQuery(it) },
                        selectedCategory = selectedCategory,
                        onCategoryChange = { viewModel.setSelectedCategory(it) },
                        cartCount = cartCount,
                        onOpenCart = { viewModel.openCart() },
                        onProductClick = { viewModel.openProductDetail(it) },
                        onQuickAdd = { viewModel.addToCart(it, 1.0) }
                    )
                }
                AppTab.PRODUCTS -> {
                    ProductManagementScreen(
                        products = allProducts,
                        onAddProduct = { viewModel.openAddProduct() },
                        onEditProduct = { viewModel.openEditProduct(it) },
                        onDeleteProduct = { viewModel.deleteProduct(it) }
                    )
                }
                AppTab.INVOICES -> {
                    InvoicesScreen(
                        invoices = allInvoices,
                        onDeleteInvoice = { viewModel.deleteInvoice(it) }
                    )
                }
            }
        }
    }

    // Product Detail Modal
    selectedProductForDetail?.let { product ->
        ProductDetailDialog(
            product = product,
            onDismiss = { viewModel.closeProductDetail() },
            onAddToCart = { amount -> viewModel.addToCart(product, amount) }
        )
    }

    // Cart Modal
    if (isCartModalOpen) {
        CartCheckoutDialog(
            cartItems = cart,
            totalAmount = cartTotal,
            customerName = customerNameInput,
            onCustomerNameChange = { viewModel.setCustomerName(it) },
            paymentStatus = paymentStatusInput,
            onPaymentStatusChange = { viewModel.setPaymentStatus(it) },
            onRemoveItem = { viewModel.removeFromCart(it) },
            onCheckout = { viewModel.saveInvoice() },
            onDismiss = { viewModel.closeCart() }
        )
    }

    // Barcode Scanner Dialog
    if (isScannerOpen) {
        BarcodeScannerDialog(
            onBarcodeScanned = { barcode -> viewModel.onBarcodeScanned(barcode) },
            onDismiss = { viewModel.closeScanner() }
        )
    }

    // Product Add/Edit Dialog
    if (isProductEditOpen) {
        ProductEditDialog(
            initialProduct = productBeingEdited,
            onDismiss = { viewModel.closeProductEdit() },
            onSave = { name, price, unit, barcode, category, imageRes ->
                viewModel.saveProduct(name, price, unit, barcode, category, imageRes)
            }
        )
    }
}

@Composable
fun CustomBottomBar(
    currentTab: AppTab,
    onTabSelect: (AppTab) -> Unit,
    onScanClick: () -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 8.dp,
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(68.dp)
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tab 1: Sales
            BottomNavItem(
                icon = Icons.Default.Storefront,
                label = "الرئيسية",
                isSelected = currentTab == AppTab.SALES,
                onClick = { onTabSelect(AppTab.SALES) },
                tag = "nav_sales_tab"
            )

            // Tab 2: Products
            BottomNavItem(
                icon = Icons.Default.Inventory2,
                label = "المنتجات",
                isSelected = currentTab == AppTab.PRODUCTS,
                onClick = { onTabSelect(AppTab.PRODUCTS) },
                tag = "nav_products_tab"
            )

            // Center Elevated Barcode Scanner Button
            Box(
                modifier = Modifier
                    .offset(y = (-10).dp)
                    .size(56.dp)
                    .shadow(6.dp, CircleShape)
                    .clip(CircleShape)
                    .background(EmeraldPrimary)
                    .clickable(onClick = onScanClick)
                    .testTag("center_scan_barcode_button"),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.QrCodeScanner,
                    contentDescription = "مسح الباركود",
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
                )
            }

            // Tab 3: Invoices
            BottomNavItem(
                icon = Icons.Default.ReceiptLong,
                label = "الفواتير",
                isSelected = currentTab == AppTab.INVOICES,
                onClick = { onTabSelect(AppTab.INVOICES) },
                tag = "nav_invoices_tab"
            )
        }
    }
}

@Composable
fun BottomNavItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    tag: String
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .testTag(tag),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected) EmeraldPrimary else TextSecondary,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) EmeraldPrimary else TextSecondary
        )
    }
}
