package id.go.kalsel.siperbun.penangkar.ui.production

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import id.go.kalsel.siperbun.penangkar.data.StatusLabels
import id.go.kalsel.siperbun.penangkar.data.api.CommodityItem
import id.go.kalsel.siperbun.penangkar.data.api.ProductionItem
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductionScreen(repo: SiperbunRepository, onCreate: () -> Unit) {
    var loading by remember { mutableStateOf(true) }
    var items by remember { mutableStateOf<List<ProductionItem>>(emptyList()) }
    LaunchedEffect(Unit) {
        items = runCatching { repo.productions() }.getOrDefault(emptyList())
        loading = false
    }
    Scaffold(
        containerColor = Canvas,
        topBar = { TopAppBar(title = { Text("Produksi", fontWeight = FontWeight.Bold) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas)) },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreate, containerColor = GreenPrimary, contentColor = Color.White) {
                Icon(Icons.Outlined.Add, contentDescription = "Tambah")
            }
        },
    ) { padding ->
        when {
            loading -> LoadingBox()
            items.isEmpty() -> Column(Modifier.padding(padding)) { EmptyBox("Belum ada batch", "Catat produksi bibit Anda.") }
            else -> LazyColumn(Modifier.fillMaxSize().padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(items, key = { it.id }) { row ->
                    SoftCard {
                        TwoLine(
                            title = row.batchNumber,
                            subtitle = "${row.commodity?.name ?: "Komoditas"} · ${formatCount(row.activeCount)} aktif",
                            trailing = { StatusChip(StatusLabels.production(row.status)) },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductionCreateScreen(repo: SiperbunRepository, onBack: () -> Unit, onCreated: () -> Unit) {
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
                title = { Text("Tambah produksi") },
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
            OutlinedTextField(count, { count = it.filter(Char::isDigit) }, label = { Text("Jumlah awal") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(notes, { notes = it }, label = { Text("Catatan") }, modifier = Modifier.fillMaxWidth())
            error?.let { Text(it, color = Color(0xFFB91C1C)) }
            PrimaryButton(if (loading) "Menyimpan..." else "Simpan batch", enabled = !loading) {
                scope.launch {
                    loading = true
                    runCatching { repo.createProduction(commodityId, count.toInt(), notes.ifBlank { null }) }
                        .onSuccess { onCreated() }
                        .onFailure { error = it.message }
                    loading = false
                }
            }
        }
    }
}
