package id.go.kalsel.siperbun.penangkar

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import id.go.kalsel.siperbun.penangkar.ui.auth.LoginScreen
import id.go.kalsel.siperbun.penangkar.ui.nav.MainShell
import id.go.kalsel.siperbun.penangkar.ui.theme.SiperbunTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application.siperbun
        setContent {
            SiperbunTheme {
                Surface(Modifier.fillMaxSize()) {
                    val token by app.session.tokenFlow.collectAsState(initial = null)
                    val user by app.session.userFlow.collectAsState(initial = null)
                    if (token.isNullOrBlank() || user?.isPenangkar != true) {
                        LoginScreen(app.repository)
                    } else {
                        MainShell(user, app.repository)
                    }
                }
            }
        }
    }
}
