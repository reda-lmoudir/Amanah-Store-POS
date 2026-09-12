package com.amanahstore.pos

import android.app.Application
import com.amanahstore.pos.data.local.AppDatabase
import com.amanahstore.pos.data.repository.StoreRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

class AmanahApplication : Application() {
    private val applicationScope = CoroutineScope(SupervisorJob())

    val database by lazy { AppDatabase.getDatabase(this, applicationScope) }
    val repository by lazy { StoreRepository(database.productDao(), database.invoiceDao()) }
}
