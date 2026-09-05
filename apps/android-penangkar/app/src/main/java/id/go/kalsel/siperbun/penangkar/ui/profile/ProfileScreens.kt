package id.go.kalsel.siperbun.penangkar.ui.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.LockReset
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.unit.sp
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import id.go.kalsel.siperbun.penangkar.data.StatusLabels
import id.go.kalsel.siperbun.penangkar.data.api.AuthUser
import id.go.kalsel.siperbun.penangkar.data.api.CertificateItem
import id.go.kalsel.siperbun.penangkar.data.api.NotificationItem
import id.go.kalsel.siperbun.penangkar.ui.components.EmptyBox
import id.go.kalsel.siperbun.penangkar.ui.components.PrimaryButton
import id.go.kalsel.siperbun.penangkar.ui.components.SoftCard
import id.go.kalsel.siperbun.penangkar.ui.components.StatusChip
import id.go.kalsel.siperbun.penangkar.ui.components.TwoLine
import id.go.kalsel.siperbun.penangkar.ui.theme.Canvas
import id.go.kalsel.siperbun.penangkar.ui.theme.GreenPrimary
import id.go.kalsel.siperbun.penangkar.ui.theme.Mute
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    user: AuthUser?,
    repo: SiperbunRepository,
    onCertificates: () -> Unit,
    onNotifications: () -> Unit,
    onPassword: () -> Unit,
    onLogout: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    Scaffold(
        containerColor = Canvas,
        topBar = { TopAppBar(title = { Text("Profil", fontWeight = FontWeight.Bold) }, colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas)) },
    ) { padding ->
        Column(Modifier.padding(padding).padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SoftCard {
                Text(user?.name ?: "Penangkar", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text("Penangkar", color = GreenPrimary, fontWeight = FontWeight.Medium)
                Text(user?.email.orEmpty(), color = Mute, fontSize = 13.sp)
            }
            SoftCard(onClick = onCertificates) {
                ListItem(headlineContent = { Text("Sertifikat") }, leadingContent = { Icon(Icons.Outlined.EmojiEvents, null, tint = GreenPrimary) })
            }
            SoftCard(onClick = onNotifications) {
                ListItem(headlineContent = { Text("Notifikasi") }, leadingContent = { Icon(Icons.Outlined.Notifications, null, tint = GreenPrimary) })
            }
            SoftCard(onClick = onPassword) {
                ListItem(headlineContent = { Text("Ganti password") }, leadingContent = { Icon(Icons.Outlined.LockReset, null, tint = GreenPrimary) })
            }
            SoftCard(onClick = {
                scope.launch { repo.logout(); onLogout() }
            }) {
                ListItem(headlineContent = { Text("Keluar") }, leadingContent = { Icon(Icons.AutoMirrored.Outlined.Logout, null, tint = Color(0xFFB91C1C)) })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CertificatesScreen(repo: SiperbunRepository, onBack: () -> Unit) {
    var items by remember { mutableStateOf<List<CertificateItem>>(emptyList()) }
    LaunchedEffect(Unit) { items = runCatching { repo.certificates() }.getOrDefault(emptyList()) }
    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = { Text("Sertifikat") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas),
            )
        },
    ) { padding ->
        if (items.isEmpty()) {
            Column(Modifier.padding(padding)) { EmptyBox("Belum ada sertifikat", "Sertifikat muncul setelah pembayaran lunas dan penerbitan.") }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(items, key = { it.id }) { row ->
                    SoftCard {
                        TwoLine(
                            title = row.certificateNumber,
                            subtitle = row.application?.commodity?.name ?: "Sertifikat bibit",
                            trailing = { StatusChip(StatusLabels.certificate(row.status)) },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(repo: SiperbunRepository, onBack: () -> Unit) {
    var items by remember { mutableStateOf<List<NotificationItem>>(emptyList()) }
    LaunchedEffect(Unit) {
        items = runCatching { repo.notifications() }.getOrDefault(emptyList())
        repo.markNotificationsRead()
    }
    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = { Text("Notifikasi") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas),
            )
        },
    ) { padding ->
        if (items.isEmpty()) {
            Column(Modifier.padding(padding)) { EmptyBox("Tidak ada notifikasi", "Update invoice dan status pengajuan akan muncul di sini.") }
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(items, key = { it.id }) { row ->
                    SoftCard { TwoLine(row.title, row.body ?: row.createdAt?.take(10).orEmpty()) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PasswordScreen(repo: SiperbunRepository, onBack: () -> Unit) {
    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Scaffold(
        containerColor = Canvas,
        topBar = {
            TopAppBar(
                title = { Text("Ganti password") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, null) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Canvas),
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(current, { current = it }, label = { Text("Password saat ini") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(next, { next = it }, label = { Text("Password baru") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(confirm, { confirm = it }, label = { Text("Konfirmasi") }, modifier = Modifier.fillMaxWidth())
            message?.let { Text(it, color = GreenPrimary) }
            Spacer(Modifier.height(8.dp))
            PrimaryButton("Simpan password") {
                scope.launch {
                    runCatching { repo.changePassword(current, next, confirm) }
                        .onSuccess { message = "Password berhasil diganti"; onBack() }
                        .onFailure { message = it.message }
                }
            }
            TextButton(onClick = onBack) { Text("Batal") }
        }
    }
}
