package id.go.kalsel.siperbun.penangkar.ui.applications

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import id.go.kalsel.siperbun.penangkar.data.StatusLabels
import id.go.kalsel.siperbun.penangkar.data.api.ApplicationItem
import id.go.kalsel.siperbun.penangkar.data.api.CommodityItem
import id.go.kalsel.siperbun.penangkar.ui.components.EmptyBox
import id.go.kalsel.siperbun.penangkar.ui.components.LoadingBox
import id.go.kalsel.siperbun.penangkar.ui.components.PrimaryButton
import id.go.kalsel.siperbun.penangkar.ui.components.SoftCard
import id.go.kalsel.siperbun.penangkar.ui.components.StatusChip
import id.go.kalsel.siperbun.penangkar.ui.components.TwoLine
import id.go.kalsel.siperbun.penangkar.ui.components.formatCount
import id.go.kalsel.siperbun.penangkar.ui.theme.Canvas
import id.go.kalsel.siperbun.penangkar.ui.theme.GreenPrimary
import kotlinx.coroutines.launch
import java.io.File

private val filters = listOf(
    "" to "Semua",
    "WAITING_PAYMENT" to "Menunggu Pembayaran",
    "PAYMENT_VERIFICATION" to "Verifikasi Pembayaran",
    "PAYMENT_VERIFIED" to "Lunas",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApplicationsScreen(
    repo: SiperbunRepository,
    onOpen: (String) -> Unit,
    onCreate: () -> Unit,
) {
    var search by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var items by remember { mutableStateOf<List<ApplicationItem>>(emptyList()) }

    LaunchedEffect(search, status) {
        loading = true
        items = runCatching { repo.applications(search, status) }.getOrDefault(emptyList())
        loading = false
    }

    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = { Text("Pengajuan", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas),
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreate, containerColor = GreenPrimary, contentColor = Color.White) {
                Icon(Icons.Outlined.Add, contentDescription = "Ajukan")
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp)) {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Cari nomor pengajuan") },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
            )
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                filters.forEach { (value, label) ->
                    FilterChip(selected = status == value, onClick = { status = value }, label = { Text(label) })
                }
            }
            when {
                loading -> LoadingBox()
                items.isEmpty() -> EmptyBox("Belum ada pengajuan", "Buat pengajuan sertifikasi untuk memulai.")
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(items, key = { it.id }) { row ->
                        SoftCard(onClick = { onOpen(row.id) }) {
                            TwoLine(
                                title = row.applicationNumber,
                                subtitle = "${row.commodity?.name ?: "Komoditas"} · ${formatCount(row.seedlingCount)} bibit",
                                trailing = { StatusChip(StatusLabels.application(row.status)) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApplicationDetailScreen(id: String, repo: SiperbunRepository, onBack: () -> Unit) {
    var item by remember { mutableStateOf<ApplicationItem?>(null) }
    var loading by remember { mutableStateOf(true) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            scope.launch {
                runCatching {
                    val file = uriToFile(context, uri)
                    repo.uploadPayment(id, file, null)
                    item = repo.application(id)
                    message = "Bukti pembayaran terkirim"
                }.onFailure { message = it.message }
            }
        }
    }

    LaunchedEffect(id) {
        item = runCatching { repo.application(id) }.getOrNull()
        loading = false
    }

    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = { Text(item?.applicationNumber ?: "Detail") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas),
            )
        },
    ) { padding ->
        if (loading || item == null) {
            LoadingBox()
            return@Scaffold
        }
        val app = item!!
        Column(
            Modifier.fillMaxSize().padding(padding).padding(20.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            StatusChip(StatusLabels.application(app.status))
            SoftCard {
                TwoLine("Komoditas", app.commodity?.name ?: "—")
                TwoLine("Varietas", app.variety?.name ?: "—")
                TwoLine("Jumlah bibit", formatCount(app.seedlingCount))
                TwoLine("Lokasi", app.nursery?.name ?: "—")
            }
            app.invoice?.let { invoice ->
                SoftCard {
                    Text("LHP & Pembayaran", fontWeight = FontWeight.SemiBold)
                    TwoLine("Invoice", invoice.invoiceNumber ?: "—")
                    TwoLine("Nominal", "Rp ${formatCount(invoice.amount)}")
                    TwoLine("Batas bayar", invoice.dueDate?.take(10) ?: "—")
                    invoice.paymentInstructions?.let { Text(it, modifier = Modifier.padding(top = 8.dp)) }
                }
            }
            if (app.status == "WAITING_PAYMENT" || app.status == "PAYMENT_REJECTED") {
                PrimaryButton("Unggah bukti pembayaran") { picker.launch("image/*") }
            }
            message?.let { Text(it, color = GreenPrimary) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApplicationCreateScreen(repo: SiperbunRepository, onBack: () -> Unit, onCreated: () -> Unit) {
    var commodities by remember { mutableStateOf<List<CommodityItem>>(emptyList()) }
    var commodityId by remember { mutableStateOf("") }
    var count by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { commodities = runCatching { repo.commodities() }.getOrDefault(emptyList()) }

    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = { Text("Ajukan sertifikasi") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas),
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            commodities.forEach { item ->
                SoftCard(onClick = { commodityId = item.id }) {
                    Text(item.name, fontWeight = if (commodityId == item.id) FontWeight.Bold else FontWeight.Normal)
                }
            }
            OutlinedTextField(count, { count = it.filter(Char::isDigit) }, label = { Text("Jumlah bibit") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(notes, { notes = it }, label = { Text("Catatan") }, modifier = Modifier.fillMaxWidth())
            error?.let { Text(it, color = Color(0xFFB91C1C)) }
            PrimaryButton(if (loading) "Mengirim..." else "Kirim pengajuan", enabled = !loading) {
                scope.launch {
                    loading = true
                    error = null
                    runCatching {
                        repo.createAndSubmitApplication(commodityId, count.toInt(), notes.ifBlank { null })
                    }.onSuccess { onCreated() }.onFailure { error = it.message }
                    loading = false
                }
            }
        }
    }
}

private fun uriToFile(context: Context, uri: Uri): File {
    val stream = context.contentResolver.openInputStream(uri) ?: error("File tidak dapat dibaca")
    val file = File(context.cacheDir, "payment-${System.currentTimeMillis()}.jpg")
    file.outputStream().use { out -> stream.copyTo(out) }
    return file
}
