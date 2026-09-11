import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Unit = 'piece' | 'kg' | 'g';
type Tab = 'sales' | 'products' | 'invoices';

type Product = {
  id: string;
  name: string;
  price: number;
  unit: Unit;
  barcode: string;
  image: number;
  category: string;
};

type CartItem = {
  product: Product;
  amount: number;
  total: number;
};

type Invoice = {
  id: string;
  customer: string;
  total: number;
  payment: 'paid' | 'credit';
  items: number;
  date: string;
};

const productImages = {
  apple: require('../../assets/images/apple.png'),
  tomatoes: require('../../assets/images/tomatoes.png'),
  milk: require('../../assets/images/milk.png'),
};

const initialProducts: Product[] = [
  { id: 'apple', name: 'تفاح أحمر', price: 25, unit: 'piece', barcode: '611133302222', image: productImages.apple, category: 'فواكه' },
  { id: 'tomatoes', name: 'طماطم', price: 14.5, unit: 'kg', barcode: '611133301110', image: productImages.tomatoes, category: 'خضروات' },
  { id: 'milk', name: 'حليب كامل الدسم', price: 12, unit: 'piece', barcode: '611133303333', image: productImages.milk, category: 'ألبان' },
  { id: 'banana', name: 'موز', price: 20, unit: 'kg', barcode: '611133304444', image: productImages.tomatoes, category: 'فواكه' },
  { id: 'orange', name: 'برتقال', price: 18, unit: 'kg', barcode: '611133305555', image: productImages.apple, category: 'فواكه' },
  { id: 'cucumber', name: 'خيار بلدي', price: 11, unit: 'kg', barcode: '611133306666', image: productImages.tomatoes, category: 'خضروات' },
];

const categories = ['الكل', 'خضروات', 'فواكه', 'ألبان', 'مخبز'];
const unitLabel: Record<Unit, string> = { piece: 'بالقطعة', kg: 'بالكيلوغرام', g: 'بالغرام' };
const unitShort: Record<Unit, string> = { piece: 'قطعة', kg: 'كغ', g: 'غ' };

export default function StoreHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('sales');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [category, setCategory] = useState('الكل');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toast, setToast] = useState('');
  const [customer, setCustomer] = useState('');
  const [payment, setPayment] = useState<'paid' | 'credit'>('paid');
  const [productAmount, setProductAmount] = useState('1');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('amanah-products'),
      AsyncStorage.getItem('amanah-invoices'),
    ]).then(([savedProducts, savedInvoices]) => {
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
    });
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = category === 'الكل' || product.category === category;
        const matchesSearch = !search.trim() || product.name.includes(search.trim());
        return matchesCategory && matchesSearch;
      }),
    [category, products, search],
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartCount = cart.length;

  const feedback = (message: string) => {
    setToast(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setTimeout(() => setToast(''), 2400);
  };

  const openProduct = (product: Product) => {
    setSelected(product);
    setProductAmount(product.unit === 'g' ? '500' : '1');
  };

  const addToCart = (product: Product, amount: number) => {
    const normalizedAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
    const total = product.unit === 'g' ? product.price * normalizedAmount / 1000 : product.price * normalizedAmount;
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (!existing) return [...current, { product, amount: normalizedAmount, total }];
      return current.map((item) =>
        item.product.id === product.id
          ? { ...item, amount: item.amount + normalizedAmount, total: item.total + total }
          : item,
      );
    });
    setSelected(null);
    feedback(`تمت إضافة ${product.name} إلى السلة`);
  };

  const removeFromCart = (id: string) => setCart((current) => current.filter((item) => item.product.id !== id));

  const saveInvoice = async () => {
    if (!cart.length) return;
    const invoice: Invoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      customer: customer.trim() || 'زبون نقدي',
      total: cartTotal,
      payment,
      items: cart.length,
      date: new Date().toLocaleDateString('ar-MA', { day: '2-digit', month: 'short' }),
    };
    const next = [invoice, ...invoices];
    setInvoices(next);
    await AsyncStorage.setItem('amanah-invoices', JSON.stringify(next));
    setCart([]);
    setCustomer('');
    setCartOpen(false);
    feedback('تم حفظ الفاتورة بنجاح');
  };

  const saveProduct = async (values: { name: string; price: string; unit: Unit; barcode: string }) => {
    if (!values.name.trim() || !Number(values.price)) {
      Alert.alert('بيانات ناقصة', 'أدخل اسم المنتج والسعر أولاً');
      return;
    }
    const image = editing?.image ?? productImages.tomatoes;
    const nextProduct: Product = {
      id: editing?.id ?? `product-${Date.now()}`,
      name: values.name.trim(),
      price: Number(values.price),
      unit: values.unit,
      barcode: values.barcode || `61113330${Date.now().toString().slice(-4)}`,
      image,
      category: editing?.category ?? 'خضروات',
    };
    const next = editing ? products.map((item) => item.id === editing.id ? nextProduct : item) : [nextProduct, ...products];
    setProducts(next);
    await AsyncStorage.setItem('amanah-products', JSON.stringify(next));
    setFormOpen(false);
    setEditing(null);
    feedback(editing ? 'تم تحديث المنتج' : 'تم حفظ المنتج');
  };

  const deleteProduct = (id: string) => {
    Alert.alert('حذف المنتج', 'هل تريد حذف هذا المنتج من القائمة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const next = products.filter((item) => item.id !== id);
        setProducts(next);
        await AsyncStorage.setItem('amanah-products', JSON.stringify(next));
        feedback('تم حذف المنتج');
      }},
    ]);
  };

  const scanResult = (data: string) => {
    const product = products.find((item) => item.barcode === data);
    setScannerOpen(false);
    if (product) openProduct(product);
    else Alert.alert('المنتج غير موجود', 'لم يتم العثور على منتج بهذا الباركود.');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        {tab === 'sales' && (
          <ShopHeader colors={colors} cartCount={cartCount} onCart={() => setCartOpen(true)} />
        )}
        {tab === 'products' && <PageHeader colors={colors} title="إدارة المنتجات" subtitle={`${products.length} منتجات محفوظة`} icon="package" />}
        {tab === 'invoices' && <PageHeader colors={colors} title="الفواتير" subtitle={`${invoices.length} فاتورة محفوظة`} icon="file-text" />}
      </View>

      {tab === 'sales' && (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: 128 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View style={styles.searchBox}>
                <Feather name="search" size={18} color={colors.mutedForeground} />
                <TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن منتج..." placeholderTextColor={colors.mutedForeground} style={styles.searchInput} textAlign="right" />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {categories.map((item) => (
                  <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryPill, category === item && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.categoryText, category === item && { color: colors.primaryForeground }]}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.promo}>
                <View>
                  <Text style={styles.promoTitle}>خصومات اليوم</Text>
                  <Text style={styles.promoCaption}>تصل إلى 20% على الخضروات الطازجة</Text>
                </View>
                <View style={styles.promoIcon}><Feather name="shopping-cart" size={22} color="#DDF5E7" /></View>
              </View>
            </View>
          }
          renderItem={({ item }) => <ProductCard product={item} colors={colors} onPress={() => openProduct(item)} onQuickAdd={() => addToCart(item, item.unit === 'g' ? 500 : 1)} />}
          ListEmptyComponent={<EmptyState colors={colors} text="لا توجد منتجات مطابقة" />}
        />
      )}

      {tab === 'products' && (
        <ProductsScreen colors={colors} products={products} onAdd={() => { setEditing(null); setFormOpen(true); }} onEdit={(product) => { setEditing(product); setFormOpen(true); }} onDelete={deleteProduct} />
      )}

      {tab === 'invoices' && <InvoicesScreen colors={colors} invoices={invoices} />}

      <BottomNav colors={colors} tab={tab} cartCount={cartCount} onChange={setTab} onScan={() => setScannerOpen(true)} insets={insets} />

      <ProductModal visible={!!selected} product={selected} colors={colors} amount={productAmount} onAmount={setProductAmount} onClose={() => setSelected(null)} onAdd={() => selected && addToCart(selected, Number(productAmount))} />
      <CartModal visible={cartOpen} colors={colors} cart={cart} total={cartTotal} customer={customer} payment={payment} onCustomer={setCustomer} onPayment={setPayment} onRemove={removeFromCart} onClose={() => setCartOpen(false)} onSave={saveInvoice} />
      <ScannerModal visible={scannerOpen} colors={colors} onClose={() => setScannerOpen(false)} onScan={scanResult} products={products} />
      <ProductFormModal visible={formOpen} colors={colors} product={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={saveProduct} />

      {!!toast && <View style={[styles.toast, { bottom: 112 + insets.bottom }]}><View style={styles.toastCheck}><Feather name="check" size={15} color="#fff" /></View><Text style={styles.toastText}>{toast}</Text></View>}
    </View>
  );
}

function ShopHeader({ colors, cartCount, onCart }: { colors: any; cartCount: number; onCart: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onCart} style={styles.cartButton}>
        <Feather name="shopping-cart" size={22} color="#163D29" />
        {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}
      </Pressable>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>متجر الأمانة</Text>
        <Text style={styles.brandSubtitle}>متجر البقالة</Text>
      </View>
      <View style={[styles.brandMark, { backgroundColor: colors.primary }]}><Feather name="shopping-bag" size={23} color="#fff" /></View>
    </View>
  );
}

function PageHeader({ colors, title, subtitle, icon }: { colors: any; title: string; subtitle: string; icon: keyof typeof Feather.glyphMap }) {
  return <View style={styles.pageHeader}><View style={styles.pageHeaderIcon}><Feather name={icon} size={21} color={colors.primary} /></View><View><Text style={styles.pageTitle}>{title}</Text><Text style={styles.pageSubtitle}>{subtitle}</Text></View></View>;
}

function ProductCard({ product, colors, onPress, onQuickAdd }: { product: Product; colors: any; onPress: () => void; onQuickAdd: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.88 }]}>
      <View style={styles.productImageWrap}><Image source={product.image} style={styles.productImage} /><View style={styles.unitBadge}><Text style={styles.unitBadgeText}>{unitShort[product.unit]}</Text></View><Pressable onPress={onQuickAdd} style={styles.addButton}><Feather name="plus" size={19} color={colors.primary} /></Pressable></View>
      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
      <View style={styles.priceRow}><Text style={styles.price}>{product.price.toFixed(2)}</Text><Text style={styles.currency}>د.م / {unitShort[product.unit]}</Text></View>
    </Pressable>
  );
}

function ProductModal({ visible, product, colors, amount, onAmount, onClose, onAdd }: { visible: boolean; product: Product | null; colors: any; amount: string; onAmount: (value: string) => void; onClose: () => void; onAdd: () => void }) {
  if (!product) return null;
  const numericAmount = Number(amount) || 0;
  const total = product.unit === 'g' ? product.price * numericAmount / 1000 : product.price * numericAmount;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.sheet}>
    <View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Pressable onPress={onClose} style={styles.closeCircle}><Feather name="x" size={18} color="#173128" /></Pressable><Text style={styles.sheetTitle}>تفاصيل المنتج</Text></View>
    <View style={styles.detailImageWrap}><Image source={product.image} style={styles.detailImage} /></View>
    <Text style={styles.detailName}>{product.name}</Text><Text style={styles.detailSub}>سعر {unitLabel[product.unit]}: <Text style={styles.greenText}>{product.price.toFixed(2)} د.م</Text></Text>
    <Text style={styles.sectionLabel}>نوع البيع والكمية</Text>
    <View style={styles.segment}><View style={[styles.segmentSelected, { backgroundColor: colors.card }]}><Text style={styles.segmentSelectedText}>{unitLabel[product.unit]}</Text></View><Text style={styles.segmentMuted}>الوحدة: {unitShort[product.unit]}</Text></View>
    <View style={styles.amountRow}><Pressable onPress={() => onAmount(String(Math.max(product.unit === 'g' ? 50 : 1, numericAmount - (product.unit === 'g' ? 50 : 1))))} style={styles.amountButton}><Feather name="minus" size={20} color="#173128" /></Pressable><View style={styles.amountInputWrap}><TextInput value={amount} onChangeText={onAmount} keyboardType="decimal-pad" style={styles.amountInput} textAlign="center" /><Text style={styles.amountUnit}>{unitShort[product.unit]}</Text></View><Pressable onPress={() => onAmount(String(numericAmount + (product.unit === 'g' ? 50 : 1)))} style={styles.amountButton}><Feather name="plus" size={20} color="#173128" /></Pressable></View>
    <View style={styles.totalBox}><Text style={styles.totalLabel}>المجموع ({product.price.toFixed(2)} × {amount})</Text><Text style={styles.totalValue}>{total.toFixed(2)} د.م</Text></View>
    <Pressable onPress={onAdd} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Feather name="shopping-cart" size={20} color="#fff" /><Text style={styles.primaryButtonText}>إضافة إلى السلة</Text></Pressable>
  </View></View></Modal>;
}

function CartModal({ visible, colors, cart, total, customer, payment, onCustomer, onPayment, onRemove, onClose, onSave }: { visible: boolean; colors: any; cart: CartItem[]; total: number; customer: string; payment: 'paid' | 'credit'; onCustomer: (value: string) => void; onPayment: (value: 'paid' | 'credit') => void; onRemove: (id: string) => void; onClose: () => void; onSave: () => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Pressable onPress={onClose} style={styles.closeCircle}><Feather name="x" size={18} color="#173128" /></Pressable><Text style={styles.sheetTitle}>سلة المشتريات <Text style={styles.countGreen}>({cart.length})</Text></Text></View>
    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 390 }}>
      {cart.length ? cart.map((item) => <View key={item.product.id} style={styles.cartItem}><Image source={item.product.image} style={styles.cartImage} /><View style={styles.cartInfo}><Text style={styles.cartName}>{item.product.name}</Text><Text style={styles.cartMeta}>{item.amount} {unitShort[item.product.unit]} · {item.product.price.toFixed(2)} د.م</Text></View><Text style={styles.cartPrice}>{item.total.toFixed(2)} د.م</Text><Pressable onPress={() => onRemove(item.product.id)} style={styles.deleteButton}><Feather name="trash-2" size={15} color="#D85656" /></Pressable></View>) : <EmptyState colors={colors} text="السلة فارغة" />}
    </ScrollView>
    <View style={styles.cartTotal}><Text style={styles.cartTotalLabel}>المجموع الكلي</Text><Text style={styles.cartTotalValue}>{total.toFixed(2)} د.م</Text></View>
    <Text style={styles.sectionLabel}>معلومات العملية</Text><View style={styles.inputWithIcon}><Feather name="user" size={18} color="#7A8B83" /><TextInput value={customer} onChangeText={onCustomer} placeholder="اسم صاحب الطلب / الزبون" placeholderTextColor="#84938C" style={styles.formInput} textAlign="right" /></View>
    <Text style={styles.sectionLabel}>حالة الدفع</Text><View style={styles.paymentRow}><Pressable onPress={() => onPayment('paid')} style={[styles.paymentOption, payment === 'paid' && styles.paymentOptionActive]}><View style={[styles.radio, payment === 'paid' && styles.radioActive]} /> <View><Text style={styles.paymentTitle}>مدفوع</Text><Text style={styles.paymentHint}>تم استلام المبلغ</Text></View></Pressable><Pressable onPress={() => onPayment('credit')} style={[styles.paymentOption, payment === 'credit' && styles.paymentOptionActive]}><View style={[styles.radio, payment === 'credit' && styles.radioActive]} /> <View><Text style={styles.paymentTitle}>كريدي / دين</Text><Text style={styles.paymentHint}>دفع لاحق</Text></View></Pressable></View>
    <Pressable disabled={!cart.length} onPress={onSave} style={[styles.primaryButton, { backgroundColor: colors.primary }, !cart.length && { opacity: 0.45 }]}><Feather name="check" size={20} color="#fff" /><Text style={styles.primaryButtonText}>حفظ وإضافة إلى صفحة الفواتير</Text></Pressable>
  </KeyboardAvoidingView></View></Modal>;
}

function ScannerModal({ visible, colors, onClose, onScan, products }: { visible: boolean; colors: any; onClose: () => void; onScan: (data: string) => void; products: Product[] }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  useEffect(() => { if (!visible) setScanned(false); }, [visible]);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={styles.scannerScreen}><View style={styles.scannerTop}><Pressable onPress={onClose} style={styles.scannerClose}><Feather name="x" size={20} color="#fff" /></Pressable><Text style={styles.scannerTitle}>مسح الباركود</Text><Feather name="zap" size={20} color="#fff" /></View>
    {Platform.OS === 'web' ? <View style={styles.cameraFallback}><Feather name="camera" size={50} color="#53E98A" /><Text style={styles.scannerHint}>المسح بالكاميرا متاح من تطبيق Expo Go على الهاتف</Text></View> : !permission?.granted ? <View style={styles.cameraFallback}><Feather name="camera-off" size={46} color="#53E98A" /><Text style={styles.scannerHint}>اسمح للكاميرا لمسح الباركود بسرعة</Text><Pressable onPress={requestPermission} style={styles.scannerAction}><Text style={styles.scannerActionText}>السماح بالكاميرا</Text></Pressable></View> : <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128'] }} onBarcodeScanned={scanned ? undefined : (event) => { setScanned(true); onScan(event.data); }}><View style={styles.scanFrame}><View style={styles.cornerTopLeft} /><View style={styles.cornerTopRight} /><View style={styles.cornerBottomLeft} /><View style={styles.cornerBottomRight} /></View><Text style={styles.scannerHint}>وجّه الكاميرا نحو الباركود</Text></CameraView>}
    <View style={styles.scannerBottom}><View style={styles.scanDetected}><Feather name="check" size={17} color="#8AF3AF" /><Text style={styles.detectedText}>يتم التعرف على المنتج تلقائياً</Text></View><Text style={styles.scannerHintSmall}>جرّب باركود المنتجات المحفوظة في المتجر</Text>{Platform.OS === 'web' && products.slice(0, 2).map((product) => <Pressable key={product.id} onPress={() => onScan(product.barcode)} style={styles.demoScan}><Text style={styles.demoScanText}>محاكاة مسح {product.name}</Text><Feather name="hash" size={18} color="#53E98A" /></Pressable>)}</View>
  </View></Modal>;
}

function ProductsScreen({ colors, products, onAdd, onEdit, onDelete }: { colors: any; products: Product[]; onAdd: () => void; onEdit: (product: Product) => void; onDelete: (id: string) => void }) {
  return <ScrollView contentContainerStyle={styles.managementContent} showsVerticalScrollIndicator={false}><Pressable onPress={onAdd} style={[styles.addProductCard, { borderColor: colors.primary }]}><View style={[styles.addProductIcon, { backgroundColor: colors.accent }]}><Feather name="plus" size={22} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.addProductTitle}>إضافة منتج جديد</Text><Text style={styles.addProductHint}>أضف منتجاً واحفظه في المتجر</Text></View><Feather name="chevron-left" size={20} color="#809087" /></Pressable><View style={styles.currentHeader}><Text style={styles.currentTitle}>المنتجات الحالية</Text><View style={styles.countPill}><Text style={styles.countPillText}>{products.length} منتجات</Text></View></View>{products.map((product) => <View key={product.id} style={styles.managementRow}><Image source={product.image} style={styles.managementImage} /><View style={styles.managementInfo}><Text style={styles.managementName}>{product.name}</Text><Text style={styles.managementMeta}>{product.price.toFixed(2)} د.م · {unitLabel[product.unit]}</Text><Text style={styles.barcodeText}>{product.barcode}</Text></View><Pressable onPress={() => onEdit(product)} style={styles.editCircle}><Feather name="edit-3" size={16} color="#71877A" /></Pressable><Pressable onPress={() => onDelete(product.id)} style={styles.deleteCircle}><Feather name="trash-2" size={16} color="#D85656" /></Pressable></View>)}</ScrollView>;
}

function InvoicesScreen({ colors, invoices }: { colors: any; invoices: Invoice[] }) {
  return <ScrollView contentContainerStyle={styles.managementContent} showsVerticalScrollIndicator={false}>{invoices.length ? invoices.map((invoice) => <View key={invoice.id} style={styles.invoiceCard}><View style={styles.invoiceTop}><View style={[styles.statusDot, { backgroundColor: invoice.payment === 'paid' ? '#18B957' : '#E3A92D' }]} /><View style={{ flex: 1 }}><Text style={styles.invoiceId}>{invoice.id}</Text><Text style={styles.invoiceDate}>{invoice.date} · {invoice.items} أصناف</Text></View><Text style={styles.invoiceTotal}>{invoice.total.toFixed(2)} د.م</Text></View><View style={styles.invoiceBottom}><Text style={styles.invoiceCustomer}>{invoice.customer}</Text><Text style={[styles.invoicePayment, { color: invoice.payment === 'paid' ? '#168345' : '#A37410' }]}>{invoice.payment === 'paid' ? 'مدفوع' : 'كريدي / دين'}</Text></View></View>) : <EmptyState colors={colors} text="لم تحفظ أي فواتير بعد" />}</ScrollView>;
}

function ProductFormModal({ visible, colors, product, onClose, onSave }: { visible: boolean; colors: any; product: Product | null; onClose: () => void; onSave: (values: { name: string; price: string; unit: Unit; barcode: string }) => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<Unit>('piece');
  const [barcode, setBarcode] = useState('');
  useEffect(() => { if (visible) { setName(product?.name ?? ''); setPrice(product?.price.toString() ?? ''); setUnit(product?.unit ?? 'piece'); setBarcode(product?.barcode ?? ''); } }, [visible, product]);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Pressable onPress={onClose} style={styles.closeCircle}><Feather name="x" size={18} color="#173128" /></Pressable><Text style={styles.sheetTitle}>{product ? 'تعديل المنتج' : 'إضافة منتج جديد'}</Text></View><ScrollView showsVerticalScrollIndicator={false}><Text style={styles.formLabel}>اسم المنتج</Text><View style={styles.formField}><TextInput value={name} onChangeText={setName} placeholder="مثال: طماطم" placeholderTextColor="#87968E" style={styles.formInput} textAlign="right" /></View><View style={styles.twoFields}><View style={{ flex: 1 }}><Text style={styles.formLabel}>السعر (د.م)</Text><View style={styles.formField}><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#87968E" style={styles.formInput} textAlign="right" /></View></View><View style={{ flex: 1 }}><Text style={styles.formLabel}>الباركود</Text><View style={styles.formField}><TextInput value={barcode} onChangeText={setBarcode} keyboardType="number-pad" placeholder="611..." placeholderTextColor="#87968E" style={styles.formInput} textAlign="right" /></View></View></View><Text style={styles.formLabel}>نوع البيع</Text><View style={styles.unitOptions}>{(['piece', 'kg', 'g'] as Unit[]).map((item) => <Pressable key={item} onPress={() => setUnit(item)} style={[styles.unitOption, unit === item && { borderColor: colors.primary, backgroundColor: colors.accent }]}><Text style={[styles.unitOptionText, unit === item && { color: colors.primary }]}>{unitLabel[item]}</Text></Pressable>)}</View><Pressable onPress={() => onSave({ name, price, unit, barcode })} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Feather name="check" size={20} color="#fff" /><Text style={styles.primaryButtonText}>حفظ المنتج</Text></Pressable></ScrollView></KeyboardAvoidingView></View></Modal>;
}

function BottomNav({ colors, tab, cartCount, onChange, onScan, insets }: { colors: any; tab: Tab; cartCount: number; onChange: (tab: Tab) => void; onScan: () => void; insets: { bottom: number } }) {
  return <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}><Pressable onPress={() => onChange('invoices')} style={styles.navItem}><Feather name="file-text" size={21} color={tab === 'invoices' ? colors.primary : '#7B8A83'} /><Text style={[styles.navText, tab === 'invoices' && { color: colors.primary }]}>الفواتير</Text></Pressable><Pressable onPress={onScan} style={styles.scanButton}><Feather name="hash" size={27} color="#fff" /><Text style={styles.scanText}>الماسح</Text>{cartCount > 0 && <View style={styles.scanBadge}><Text style={styles.badgeText}>{cartCount}</Text></View>}</Pressable><Pressable onPress={() => onChange('products')} style={styles.navItem}><Feather name="package" size={21} color={tab === 'products' ? colors.primary : '#7B8A83'} /><Text style={[styles.navText, tab === 'products' && { color: colors.primary }]}>المنتجات</Text></Pressable><Pressable onPress={() => onChange('sales')} style={styles.navItem}><Feather name="home" size={21} color={tab === 'sales' ? colors.primary : '#7B8A83'} /><Text style={[styles.navText, tab === 'sales' && { color: colors.primary }]}>الرئيسية</Text></Pressable></View>;
}

function EmptyState({ colors, text }: { colors: any; text: string }) {
  return <View style={styles.emptyState}><View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}><Feather name="inbox" size={24} color={colors.primary} /></View><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 92, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  brand: { flex: 1, alignItems: 'flex-end' },
  brandTitle: { color: '#10251B', fontSize: 23, fontWeight: '800' },
  brandSubtitle: { color: '#7B8A83', fontSize: 12, marginTop: 2 },
  brandMark: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cartButton: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#1B3B2A', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#E9585D', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F3F8F5' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  pageHeader: { height: 92, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', gap: 13 },
  pageHeaderIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#DDF5E7', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: '#10251B', fontSize: 23, fontWeight: '800', textAlign: 'right' },
  pageSubtitle: { color: '#7B8A83', fontSize: 12, textAlign: 'right', marginTop: 3 },
  listContent: { paddingHorizontal: 18 },
  searchBox: { height: 54, backgroundColor: '#fff', borderRadius: 17, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, gap: 10, borderWidth: 1, borderColor: '#E4EDE7', marginBottom: 17 },
  searchInput: { flex: 1, color: '#10251B', fontSize: 14 },
  categoryRow: { flexDirection: 'row-reverse', gap: 9, paddingBottom: 17 },
  categoryPill: { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 20, height: 43, justifyContent: 'center', borderWidth: 1, borderColor: '#E4EDE7' },
  categoryText: { color: '#40554A', fontWeight: '700', fontSize: 13 },
  promo: { backgroundColor: '#147A3D', borderRadius: 20, padding: 18, height: 92, marginBottom: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  promoTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'right' },
  promoCaption: { color: '#B9E4C7', fontSize: 12, marginTop: 5, textAlign: 'right' },
  promoIcon: { width: 49, height: 49, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  gridRow: { gap: 12, marginBottom: 12 },
  productCard: { flex: 1, backgroundColor: '#fff', borderRadius: 19, padding: 10, minHeight: 232, borderWidth: 1, borderColor: '#E3EDE7' },
  productImageWrap: { height: 138, backgroundColor: '#F4FAF6', borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  productImage: { width: '88%', height: '88%', resizeMode: 'contain' },
  unitBadge: { position: 'absolute', top: 9, right: 8, backgroundColor: '#EFFAF2', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  unitBadgeText: { color: '#21824B', fontSize: 11, fontWeight: '800' },
  addButton: { position: 'absolute', left: 8, top: 8, width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F7EB' },
  productName: { color: '#13231B', fontSize: 15, fontWeight: '800', textAlign: 'right', marginTop: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-start', gap: 4, marginTop: 11 },
  price: { color: '#128141', fontSize: 16, fontWeight: '800' },
  currency: { color: '#819087', fontSize: 10 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 86, backgroundColor: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: '#CFE9D8', flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 10 },
  navItem: { width: 66, alignItems: 'center', gap: 4 },
  navText: { color: '#7B8A83', fontSize: 11, fontWeight: '700' },
  scanButton: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#18B957', alignItems: 'center', justifyContent: 'center', marginTop: -33, borderWidth: 5, borderColor: '#F3F8F5', shadowColor: '#18B957', shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  scanText: { color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 1 },
  scanBadge: { position: 'absolute', top: -4, right: -3, backgroundColor: '#E9585D', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(16,37,27,0.52)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingBottom: 20, maxHeight: '92%' },
  sheetHandle: { width: 52, height: 5, borderRadius: 4, backgroundColor: '#D7E0DB', alignSelf: 'center', marginTop: 12, marginBottom: 15 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { color: '#10251B', fontSize: 22, fontWeight: '800', textAlign: 'right' },
  closeCircle: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#EFF5F1', alignItems: 'center', justifyContent: 'center' },
  detailImageWrap: { height: 220, backgroundColor: '#F1F8F3', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  detailImage: { width: '72%', height: '90%', resizeMode: 'contain' },
  detailName: { color: '#10251B', fontSize: 22, fontWeight: '800', textAlign: 'right', marginTop: 17 },
  detailSub: { color: '#7B8A83', textAlign: 'right', fontSize: 13, marginTop: 5 },
  greenText: { color: '#168345', fontWeight: '800' },
  sectionLabel: { color: '#7C8D83', fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 17, marginBottom: 8 },
  segment: { height: 54, backgroundColor: '#EDF4EF', borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', padding: 5, justifyContent: 'space-between' },
  segmentSelected: { height: 44, minWidth: '45%', borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#1B3B2A', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  segmentSelectedText: { color: '#168345', fontSize: 13, fontWeight: '800' },
  segmentMuted: { color: '#829187', fontSize: 12, marginHorizontal: 13 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 },
  amountButton: { width: 47, height: 47, borderRadius: 14, backgroundColor: '#EFF5F1', alignItems: 'center', justifyContent: 'center' },
  amountInputWrap: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#DBE7DF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  amountInput: { color: '#10251B', fontSize: 18, fontWeight: '800', width: 90 },
  amountUnit: { color: '#7B8A83', fontSize: 13 },
  totalBox: { backgroundColor: '#EFFAF2', borderRadius: 15, padding: 14, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderStyle: 'dashed', borderColor: '#B9DFC6' },
  totalLabel: { color: '#2C6544', fontSize: 12, textAlign: 'right' },
  totalValue: { color: '#168345', fontSize: 19, fontWeight: '800' },
  primaryButton: { height: 57, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 9, marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  countGreen: { color: '#168345' },
  cartItem: { minHeight: 72, borderBottomWidth: 1, borderBottomColor: '#EDF1EE', flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  cartImage: { width: 53, height: 53, borderRadius: 14, backgroundColor: '#F1F8F3' },
  cartInfo: { flex: 1, alignItems: 'flex-end' },
  cartName: { color: '#173128', fontSize: 14, fontWeight: '800' },
  cartMeta: { color: '#8A988F', fontSize: 11, marginTop: 4 },
  cartPrice: { color: '#173128', fontSize: 13, fontWeight: '800' },
  deleteButton: { width: 31, height: 31, borderRadius: 11, backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center' },
  cartTotal: { backgroundColor: '#145F34', borderRadius: 17, paddingHorizontal: 16, height: 65, marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartTotalLabel: { color: '#D3F0DB', fontSize: 13, fontWeight: '700' },
  cartTotalValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  inputWithIcon: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: '#DDE8E1', flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  formInput: { flex: 1, color: '#173128', fontSize: 14, height: 50 },
  paymentRow: { flexDirection: 'row', gap: 10 },
  paymentOption: { flex: 1, minHeight: 66, borderRadius: 15, borderWidth: 1, borderColor: '#DDE8E1', padding: 11, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  paymentOptionActive: { borderColor: '#18B957', backgroundColor: '#F0FBF3' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#C6D4CA' },
  radioActive: { borderColor: '#18B957', borderWidth: 6 },
  paymentTitle: { color: '#173128', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  paymentHint: { color: '#8A988F', fontSize: 10, marginTop: 3, textAlign: 'right' },
  toast: { position: 'absolute', left: 28, right: 28, minHeight: 58, borderRadius: 17, backgroundColor: '#092F20', paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, elevation: 8 },
  toastCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#18B957', alignItems: 'center', justifyContent: 'center' },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  scannerScreen: { flex: 1, backgroundColor: '#071F16', paddingTop: 45 },
  scannerTop: { height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  scannerClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#15372A', alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 45, gap: 20 },
  scanFrame: { width: 295, height: 205, position: 'relative' },
  cornerTopLeft: { position: 'absolute', left: 0, top: 0, width: 40, height: 40, borderLeftWidth: 4, borderTopWidth: 4, borderColor: '#53E98A', borderTopLeftRadius: 9 },
  cornerTopRight: { position: 'absolute', right: 0, top: 0, width: 40, height: 40, borderRightWidth: 4, borderTopWidth: 4, borderColor: '#53E98A', borderTopRightRadius: 9 },
  cornerBottomLeft: { position: 'absolute', left: 0, bottom: 0, width: 40, height: 40, borderLeftWidth: 4, borderBottomWidth: 4, borderColor: '#53E98A', borderBottomLeftRadius: 9 },
  cornerBottomRight: { position: 'absolute', right: 0, bottom: 0, width: 40, height: 40, borderRightWidth: 4, borderBottomWidth: 4, borderColor: '#53E98A', borderBottomRightRadius: 9 },
  scannerHint: { color: '#D5EFE0', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  scannerAction: { paddingHorizontal: 24, height: 48, borderRadius: 15, backgroundColor: '#18B957', alignItems: 'center', justifyContent: 'center' },
  scannerActionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  scannerBottom: { padding: 18, margin: 18, borderRadius: 22, backgroundColor: '#15372A', borderWidth: 1, borderColor: '#315645', gap: 10 },
  scanDetected: { alignSelf: 'flex-end', backgroundColor: '#1D5A40', paddingHorizontal: 12, height: 34, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  detectedText: { color: '#8AF3AF', fontSize: 12, fontWeight: '700' },
  scannerHintSmall: { color: '#B8D4C4', fontSize: 11, textAlign: 'right' },
  demoScan: { borderRadius: 13, borderWidth: 1, borderColor: '#3F7159', padding: 11, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  demoScanText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  managementContent: { padding: 18, paddingBottom: 120 },
  addProductCard: { minHeight: 82, backgroundColor: '#fff', borderRadius: 19, borderWidth: 1, borderStyle: 'dashed', padding: 15, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  addProductIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addProductTitle: { color: '#173128', textAlign: 'right', fontSize: 16, fontWeight: '800' },
  addProductHint: { color: '#84938B', textAlign: 'right', fontSize: 11, marginTop: 4 },
  currentHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  currentTitle: { color: '#173128', fontSize: 17, fontWeight: '800' },
  countPill: { backgroundColor: '#DDF5E7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  countPillText: { color: '#168345', fontSize: 11, fontWeight: '800' },
  managementRow: { minHeight: 83, backgroundColor: '#fff', borderRadius: 17, marginBottom: 9, padding: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E4EDE7' },
  managementImage: { width: 60, height: 60, borderRadius: 15, backgroundColor: '#F1F8F3' },
  managementInfo: { flex: 1, alignItems: 'flex-end' },
  managementName: { color: '#173128', fontSize: 14, fontWeight: '800' },
  managementMeta: { color: '#168345', fontSize: 11, marginTop: 4, fontWeight: '700' },
  barcodeText: { color: '#9AA79F', fontSize: 9, marginTop: 3 },
  editCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F4F1E7', alignItems: 'center', justifyContent: 'center' },
  deleteCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  invoiceCard: { backgroundColor: '#fff', borderRadius: 18, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E4EDE7' },
  invoiceTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  invoiceId: { color: '#173128', fontSize: 14, fontWeight: '800', textAlign: 'right' },
  invoiceDate: { color: '#84938B', fontSize: 11, textAlign: 'right', marginTop: 3 },
  invoiceTotal: { color: '#168345', fontSize: 16, fontWeight: '800' },
  invoiceBottom: { marginTop: 13, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF1EE', flexDirection: 'row-reverse', justifyContent: 'space-between' },
  invoiceCustomer: { color: '#65766C', fontSize: 12 },
  invoicePayment: { fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 75, gap: 13, width: '100%' },
  emptyIcon: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#7B8A83', fontSize: 14, fontWeight: '700' },
  formLabel: { color: '#66786D', fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 12, marginBottom: 7 },
  formField: { height: 51, borderRadius: 15, borderWidth: 1, borderColor: '#DDE8E1', paddingHorizontal: 13, justifyContent: 'center' },
  twoFields: { flexDirection: 'row', gap: 10 },
  unitOptions: { flexDirection: 'row-reverse', gap: 8 },
  unitOption: { flex: 1, borderWidth: 1, borderColor: '#DDE8E1', borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  unitOptionText: { color: '#687A70', fontSize: 11, fontWeight: '700' },
});