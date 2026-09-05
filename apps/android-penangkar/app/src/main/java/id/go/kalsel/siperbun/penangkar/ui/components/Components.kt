package id.go.kalsel.siperbun.penangkar.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.go.kalsel.siperbun.penangkar.data.StatusStyle
import id.go.kalsel.siperbun.penangkar.ui.theme.Card
import id.go.kalsel.siperbun.penangkar.ui.theme.GreenPrimary
import id.go.kalsel.siperbun.penangkar.ui.theme.Mute

@Composable
fun StatusChip(style: StatusStyle) {
    Surface(
        color = Color(style.container),
        contentColor = Color(style.content),
        shape = CircleShape,
    ) {
        Text(
            text = style.label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = Color(style.content),
        )
    }
}

@Composable
fun SoftCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val colors = CardDefaults.cardColors(containerColor = Card)
    val elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    val shape = RoundedCornerShape(22.dp)
    if (onClick != null) {
        Card(modifier = modifier.fillMaxWidth(), shape = shape, colors = colors, elevation = elevation, onClick = onClick) {
            Box(Modifier.padding(16.dp)) { content() }
        }
    } else {
        Card(modifier = modifier.fillMaxWidth(), shape = shape, colors = colors, elevation = elevation) {
            Box(Modifier.padding(16.dp)) { content() }
        }
    }
}

@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = GreenPrimary),
    ) {
        Text(text, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun LoadingBox() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = GreenPrimary)
    }
}

@Composable
fun EmptyBox(title: String, subtitle: String) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(title, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text(subtitle, color = Mute, fontSize = 13.sp)
    }
}

@Composable
fun MetricTile(label: String, value: String, tint: Color, modifier: Modifier = Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(22.dp))
            .background(tint.copy(alpha = 0.12f))
            .padding(16.dp),
    ) {
        Box(
            Modifier.size(32.dp).clip(CircleShape).background(tint),
            contentAlignment = Alignment.Center,
        ) {
            Text(label.take(1), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        }
        Spacer(Modifier.height(14.dp))
        Text(value, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text(label, color = Mute, fontSize = 12.sp)
    }
}

@Composable
fun ScreenPadding(padding: PaddingValues, content: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(padding)
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        content = { content() },
    )
}

@Composable
fun TwoLine(title: String, subtitle: String, trailing: @Composable (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = Mute, fontSize = 13.sp)
        }
        trailing?.invoke()
    }
}

fun formatCount(value: Double?): String {
    val number = value?.toLong() ?: 0
    return "%,d".format(number).replace(',', '.')
}
