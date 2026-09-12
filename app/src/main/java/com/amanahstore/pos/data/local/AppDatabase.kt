package com.amanahstore.pos.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [ProductEntity::class, InvoiceEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun invoiceDao(): InvoiceDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "amanah_store_db"
                )
                    .addCallback(DatabaseCallback(scope))
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(
            private val scope: CoroutineScope
        ) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    scope.launch(Dispatchers.IO) {
                        populateInitialData(database.productDao())
                    }
                }
            }

            private suspend fun populateInitialData(productDao: ProductDao) {
                if (productDao.getProductCount() == 0) {
                    val initialList = listOf(
                        ProductEntity(
                            name = "تفاح أحمر",
                            price = 25.00,
                            unitCode = "piece",
                            barcode = "611133302222",
                            category = "فواكه",
                            imageResName = "apple"
                        ),
                        ProductEntity(
                            name = "طماطم طازجة",
                            price = 14.50,
                            unitCode = "kg",
                            barcode = "611133301110",
                            category = "خضروات",
                            imageResName = "tomatoes"
                        ),
                        ProductEntity(
                            name = "حليب كامل الدسم",
                            price = 12.00,
                            unitCode = "piece",
                            barcode = "611133303333",
                            category = "ألبان",
                            imageResName = "milk"
                        ),
                        ProductEntity(
                            name = "موز ممتاز",
                            price = 20.00,
                            unitCode = "kg",
                            barcode = "611133304444",
                            category = "فواكه",
                            imageResName = "tomatoes"
                        ),
                        ProductEntity(
                            name = "برتقال حلو",
                            price = 18.00,
                            unitCode = "kg",
                            barcode = "611133305555",
                            category = "فواكه",
                            imageResName = "apple"
                        ),
                        ProductEntity(
                            name = "خيار بلدي",
                            price = 11.00,
                            unitCode = "kg",
                            barcode = "611133306666",
                            category = "خضروات",
                            imageResName = "tomatoes"
                        )
                    )
                    productDao.insertAll(initialList)
                }
            }
        }
    }
}
