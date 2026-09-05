package id.go.kalsel.siperbun.penangkar.ui.nav

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocalFlorist
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import id.go.kalsel.siperbun.penangkar.data.SiperbunRepository
import id.go.kalsel.siperbun.penangkar.data.api.AuthUser
import id.go.kalsel.siperbun.penangkar.ui.applications.ApplicationCreateScreen
import id.go.kalsel.siperbun.penangkar.ui.applications.ApplicationDetailScreen
import id.go.kalsel.siperbun.penangkar.ui.applications.ApplicationsScreen
import id.go.kalsel.siperbun.penangkar.ui.distribution.DistributionCreateScreen
import id.go.kalsel.siperbun.penangkar.ui.distribution.DistributionScreen
import id.go.kalsel.siperbun.penangkar.ui.home.HomeScreen
import id.go.kalsel.siperbun.penangkar.ui.production.ProductionCreateScreen
import id.go.kalsel.siperbun.penangkar.ui.production.ProductionScreen
import id.go.kalsel.siperbun.penangkar.ui.profile.CertificatesScreen
import id.go.kalsel.siperbun.penangkar.ui.profile.NotificationsScreen
import id.go.kalsel.siperbun.penangkar.ui.profile.PasswordScreen
import id.go.kalsel.siperbun.penangkar.ui.profile.ProfileScreen
import id.go.kalsel.siperbun.penangkar.ui.theme.GreenPrimary

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab("home", "Beranda", Icons.Outlined.Home),
    Tab("production", "Produksi", Icons.Outlined.LocalFlorist),
    Tab("applications", "Pengajuan", Icons.Outlined.Description),
    Tab("distribution", "Distribusi", Icons.Outlined.LocalShipping),
    Tab("profile", "Profil", Icons.Outlined.Person),
)

@Composable
fun MainShell(user: AuthUser?, repo: SiperbunRepository) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val showBar = tabs.any { it.route == route }

    Scaffold(
        containerColor = Color(0xFFF3F6F4),
        bottomBar = {
            if (showBar) {
                NavigationBar(containerColor = Color.White) {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = route == tab.route,
                            onClick = {
                                nav.navigate(tab.route) {
                                    popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = GreenPrimary,
                                selectedTextColor = GreenPrimary,
                                indicatorColor = Color(0xFFE8F7EF),
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(nav, startDestination = "home", modifier = Modifier.padding(padding)) {
            composable("home") {
                HomeScreen(
                    repo = repo,
                    user = user,
                    onOpenNotifications = { nav.navigate("notifications") },
                    onOpenApplication = { nav.navigate("application/$it") },
                    onShortcut = { key ->
                        when (key) {
                            "production_create" -> nav.navigate("production_create")
                            "application_create" -> nav.navigate("application_create")
                            "distribution_create" -> nav.navigate("distribution_create")
                            "certificates" -> nav.navigate("certificates")
                        }
                    },
                )
            }
            composable("production") { ProductionScreen(repo) { nav.navigate("production_create") } }
            composable("production_create") {
                ProductionCreateScreen(repo, onBack = { nav.popBackStack() }, onCreated = { nav.popBackStack() })
            }
            composable("applications") {
                ApplicationsScreen(repo, onOpen = { nav.navigate("application/$it") }, onCreate = { nav.navigate("application_create") })
            }
            composable("application_create") {
                ApplicationCreateScreen(repo, onBack = { nav.popBackStack() }, onCreated = { nav.popBackStack() })
            }
            composable("application/{id}") { back ->
                val id = back.arguments?.getString("id").orEmpty()
                ApplicationDetailScreen(id, repo) { nav.popBackStack() }
            }
            composable("distribution") { DistributionScreen(repo) { nav.navigate("distribution_create") } }
            composable("distribution_create") {
                DistributionCreateScreen(repo, onBack = { nav.popBackStack() }, onCreated = { nav.popBackStack() })
            }
            composable("profile") {
                ProfileScreen(
                    user = user,
                    repo = repo,
                    onCertificates = { nav.navigate("certificates") },
                    onNotifications = { nav.navigate("notifications") },
                    onPassword = { nav.navigate("password") },
                    onLogout = {},
                )
            }
            composable("certificates") { CertificatesScreen(repo) { nav.popBackStack() } }
            composable("notifications") { NotificationsScreen(repo) { nav.popBackStack() } }
            composable("password") { PasswordScreen(repo) { nav.popBackStack() } }
        }
    }
}
