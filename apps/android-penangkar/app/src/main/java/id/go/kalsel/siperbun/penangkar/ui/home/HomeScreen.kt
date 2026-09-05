package id.go.kalsel.siperbun.penangkar.ui.home

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Eco
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PostAdd
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import id.go.kalsel.siperbun.penangkar.BuildConfig
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import id.go.kalsel.siperbun.penangkar.data.StatusLabels
import id.go.kalsel.siperbun.penangkar.data.api.AuthUser
import id.go.kalsel.siperbun.penangkar.data.api.DashboardBanner
import id.go.kalsel.siperbun.penangkar.data.api.DashboardSummary
import id.go.kalsel.siperbun.penangkar.data.api.RecentApplication
import id.go.kalsel.siperbun.penangkar.ui.components.EmptyBox
import id.go.kalsel.siperbun.penangkar.ui.components.LoadingBox
import id.go.kalsel.siperbun.penangkar.ui.components.MetricTile
import id.go.kalsel.siperbun.penangkar.ui.components.SoftCard
import id.go.kalsel.siperbun.penangkar.ui.components.StatusChip
import id.go.kalsel.siperbun.penangkar.ui.components.TwoLine
import id.go.kalsel.siperbun.penangkar.ui.components.formatCount
import id.go.kalsel.siperbun.penangkar.ui.theme.GreenDark
import id.go.kalsel.siperbun.penangkar.ui.theme.GreenPrimary
import id.go.kalsel.siperbun.penangkar.ui.theme.Mute

@Composable
fun HomeScreen(
    repo: SiperbunRepository,
    user: AuthUser?,
    onOpenNotifications: () -> Unit,
    onOpenApplication: (String) -> Unit,
    onShortcut: (String) -> Unit,
) {
    var loading by remember { mutableStateOf(true) }
    var summary by remember { mutableStateOf<DashboardSummary?>(null) }
    var apps by remember { mutableStateOf<List<RecentApplication>>(emptyList()) }
    var banners by remember { mutableStateOf<List<DashboardBanner>>(emptyList()) }

    LaunchedEffect(Unit) {
        runCatching { repo.dashboard() }
            .onSuccess {
                summary = it.first
                apps = it.second
                banners = it.third
            }
        loading = false
    }

    if (loading) {
        LoadingBox()
        return
    }

    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(GreenPrimary, GreenDark)))
                    .padding(start = 20.dp, end = 12.dp, top = 20.dp, bottom = 28.dp),
            ) {
                Column {
                    Text("Halo,", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(user?.name ?: "Penangkar", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                            Text(
                                "${formatCount(summary?.activeSeedlings)} bibit aktif di kebun Anda",
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 13.sp,
                            )
                        }
                        IconButton(onClick = onOpenNotifications) {
                            Icon(Icons.Outlined.Notifications, contentDescription = "Notifikasi", tint = Color.White)
                        }
                    }
                }
            }
        }
        item {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                banners.firstOrNull()?.let { banner ->
                    AsyncImage(
                        model = absoluteUrl(banner.imageUrl),
                        contentDescription = banner.title,
                        modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(22.dp)),
                        contentScale = ContentScale.Crop,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricTile("Lokasi", formatCount(summary?.nurseryLocations), Color(0xFF0F766E), Modifier.weight(1f))
                    MetricTile("Batch", formatCount(summary?.activeBatches), Color(0xFF65A30D), Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricTile("Pengajuan", formatCount(summary?.applicationsThisMonth), Color(0xFF0284C7), Modifier.weight(1f))
                    MetricTile("Sertifikat", formatCount(summary?.scannedCertificates), Color(0xFF7C3AED), Modifier.weight(1f))
                }
                Text("Aksi cepat", fontWeight = FontWeight.SemiBold)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    QuickAction("Produksi", Icons.Outlined.Eco) { onShortcut("production_create") }
                    QuickAction("Ajukan", Icons.Outlined.PostAdd) { onShortcut("application_create") }
                    QuickAction("Distribusi", Icons.Outlined.LocalShipping) { onShortcut("distribution_create") }
                    QuickAction("Sertifikat", Icons.Outlined.EmojiEvents) { onShortcut("certificates") }
                }
                Text("Pengajuan terbaru", fontWeight = FontWeight.SemiBold)
                if (apps.isEmpty()) {
                    EmptyBox("Belum ada pengajuan", "Ajukan sertifikasi bibit dari menu Pengajuan.")
                } else {
                    apps.take(5).forEach { row ->
                        SoftCard(onClick = { onOpenApplication(row.id) }) {
                            TwoLine(
                                title = row.applicationNumber,
                                subtitle = "${row.commodity ?: "Komoditas"} · ${formatCount(row.seedlingCount)} bibit",
                                trailing = { StatusChip(StatusLabels.application(row.status)) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickAction(label: String, icon: ImageVector, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick)) {
        Box(
            Modifier.size(56.dp).clip(CircleShape).background(Color(0xFFE8F7EF)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = label, tint = GreenPrimary)
        }
        Spacer(Modifier.height(6.dp))
        Text(label, fontSize = 11.sp, color = Mute, fontWeight = FontWeight.Medium)
    }
}

private fun absoluteUrl(url: String?): String? {
    if (url.isNullOrBlank()) return null
    if (url.startsWith("http")) return url
    val origin = (if (BuildConfig.DEBUG) BuildConfig.API_BASE_URL_DEBUG else BuildConfig.API_BASE_URL)
        .removeSuffix("/api/v1/")
        .removeSuffix("/")
    return origin + if (url.startsWith("/")) url else "/$url"
}
