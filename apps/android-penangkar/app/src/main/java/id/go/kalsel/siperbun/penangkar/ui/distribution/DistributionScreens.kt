package id.go.kalsel.siperbun.penangkar.ui.distribution

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import id.go.kalsel.siperbun.penangkar.data.KalselDistricts
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import id.go.kalsel.siperbun.penangkar.data.api.CertificateItem
import id.go.kalsel.siperbun.penangkar.data.api.DistributionItem
import id.go.kalsel.siperbun.penangkar.ui.components.EmptyBox
import id.go.kalsel.siperbun.penangkar.ui.components.LoadingBox
import id.go.kalsel.siperbun.penangkar.ui.components.PrimaryButton
import id.go.kalsel.siperbun.penangkar.ui.components.SoftCard
import id.go.kalsel.siperbun.penangkar.ui.components.TwoLine
import id.go.kalsel.siperbun.penangkar.ui.components.formatCount
import id.go.kalsel.siperbun.penangkar.ui.theme.Canvas
import id.go.kalsel.siperbun.penangkar.ui.theme.GreenPrimary
import kotlinx.coroutines.launch
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DistributionScreen(repo: SiperbunRepository, onCreate: () -> Unit) {
    var loading by remember { mutableStateOf(true) }
    var items by remember { mutableStateOf<List<DistributionItem>>(emptyList()) }
    LaunchedEffect(Unit) {
        items = runCatching { repo.distributions() }.getOrDefault(emptyList())
        loading = false
    }
    Scaffold(
        containerColor = Canvas,
        topBar = { TopAppBar(title = { Text("Distribusi", fontWeight = FontWeight.Bold) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas)) },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreate, containerColor = GreenPrimary, contentColor = Color.White) {
                Icon(Icons.Outlined.Add, contentDescription = "Catat")
            }
        },
    ) { padding ->
        when {
            loading -> LoadingBox()
            items.isEmpty() -> Column(Modifier.padding(padding)) { EmptyBox("Belum ada distribusi", "Catat penjualan atau penyaluran bibit.") }
            else -> LazyColumn(Modifier.fillMaxSize().padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(items, key = { it.id }) { row ->
                    SoftCard {
                        TwoLine(
                            title = row.buyerName,
                            subtitle = "${row.destinationKab ?: "Kabupaten"} · ${formatCount(row.quantity)} bibit · ${row.distributedAt?.take(10) ?: ""}",
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DistributionCreateScreen(repo: SiperbunRepository, onBack: () -> Unit, onCreated: () -> Unit) {
    var buyer by remember { mutableStateOf("") }
    var district by remember { mutableStateOf("Banjarbaru") }
    var qty by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var certId by remember { mutableStateOf<String?>(null) }
    var certs by remember { mutableStateOf<List<CertificateItem>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { certs = runCatching { repo.certificates() }.getOrDefault(emptyList()) }

    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = { Text("Catat distribusi") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas),
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).padding(20.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedTextField(buyer, { buyer = it }, label = { Text("Nama pembeli") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(qty, { qty = it.filter(Char::isDigit) }, label = { Text("Jumlah bibit") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(note, { note = it }, label = { Text("No. surat jalan") }, modifier = Modifier.fillMaxWidth())
            Text("Kabupaten tujuan", fontWeight = FontWeight.SemiBold)
            KalselDistricts.forEach { name ->
                SoftCard(onClick = { district = name }) {
                    Text(name, fontWeight = if (district == name) FontWeight.Bold else FontWeight.Normal)
                }
            }
            if (certs.isNotEmpty()) {
                Text("Sertifikat (opsional)", fontWeight = FontWeight.SemiBold)
                certs.forEach { cert ->
                    SoftCard(onClick = { certId = cert.id }) {
                        Text(cert.certificateNumber, fontWeight = if (certId == cert.id) FontWeight.Bold else FontWeight.Normal)
                    }
                }
            }
            error?.let { Text(it, color = Color(0xFFB91C1C)) }
            PrimaryButton(if (loading) "Menyimpan..." else "Simpan distribusi", enabled = !loading) {
                scope.launch {
                    loading = true
                    runCatching {
                        repo.createDistribution(
                            buyerName = buyer,
                            destinationKab = district,
                            quantity = qty.toInt(),
                            distributedAt = LocalDate.now().toString(),
                            certificateId = certId,
                            deliveryNoteNo = note.ifBlank { null },
                            notes = null,
                        )
                    }.onSuccess { onCreated() }.onFailure { error = it.message }
                    loading = false
                }
            }
        }
    }
}
