package id.go.kalsel.siperbun.penangkar.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Typography

val GreenPrimary = Color(0xFF07844A)
val GreenDark = Color(0xFF056B3C)
val GreenSoft = Color(0xFFE8F7EF)
val Ink = Color(0xFF172033)
val Mute = Color(0xFF64748B)
val Canvas = Color(0xFFF3F6F4)
val Card = Color(0xFFFFFFFF)

private val colors = lightColorScheme(
    primary = GreenPrimary,
    onPrimary = Color.White,
    primaryContainer = GreenSoft,
    onPrimaryContainer = GreenDark,
    secondary = Color(0xFF0F766E),
    background = Canvas,
    surface = Card,
    onBackground = Ink,
    onSurface = Ink,
    outline = Color(0xFFE2E8F0),
    error = Color(0xFFB91C1C),
)

private val typography = Typography(
    headlineLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 28.sp, color = Ink),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Ink),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = Ink),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Ink),
    bodyLarge = TextStyle(fontSize = 16.sp, color = Ink),
    bodyMedium = TextStyle(fontSize = 14.sp, color = Ink),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 13.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, color = Mute),
)

@Composable
fun SiperbunTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, typography = typography, content = content)
}
